import { GameSimulation } from "./game";
import type { GameInitialResources } from "./game";
import { FixedStepClock } from "./clock";
import { starterCatalog } from "./content";
import type { ContentCatalog } from "./content";
import type { BattleConfig } from "./battleConfig";
import type { CommandResult, GameCommand, GameEvent, GameState } from "./types";

export interface BattleSessionOptions {
  catalog?: ContentCatalog;
  seed?: number;
  config?: BattleConfig;
  /** Explicit development setup only; omitted by the normal player entry. */
  initialResources?: GameInitialResources;
}

/** Shared battle ownership. Renderers read state and send commands here. */
export class BattleSession {
  private readonly simulation: GameSimulation;
  private readonly clock = new FixedStepClock();
  private stepIndex = 0;
  private lastFrameMilliseconds: number | null = null;
  private disposed = false;

  public constructor(options: BattleSessionOptions = {}) {
    this.simulation = new GameSimulation(options.catalog ?? starterCatalog, options.seed ?? 1337, options.config, options.initialResources);
  }

  public getState(): GameState {
    return this.simulation.getState();
  }

  public dispatch(command: GameCommand): CommandResult {
    if (this.disposed) return { accepted: false, reason: "战斗会话已结束" };
    const previousPhase = this.getState().phase;
    const result = this.simulation.dispatch(command);
    if (result.accepted && (command.type === "restart" || this.getState().phase !== previousPhase)) {
      this.clock.reset();
      this.lastFrameMilliseconds = null;
    }
    if (result.accepted && command.type === "restart") this.stepIndex = 0;
    return result;
  }

  /** Commands are applied at the current completed step, including while paused. */
  public getStepIndex(): number {
    return this.stepIndex;
  }

  public advance(deltaSeconds: number): number {
    if (!Number.isFinite(deltaSeconds) || !this.isAdvancing()) return 0;
    let steps = 0;
    this.clock.advance(deltaSeconds, (step) => {
      if (this.isAdvancing()) {
        this.simulation.tick(step);
        this.stepIndex += 1;
        steps += 1;
      }
    });
    if (!this.isAdvancing()) this.clock.reset();
    return steps;
  }

  /** Browser/engine timestamps share this reset-on-pause clock boundary. */
  public advanceFrame(timestampMilliseconds: number): number {
    if (!Number.isFinite(timestampMilliseconds)) return 0;
    const previous = this.lastFrameMilliseconds;
    this.lastFrameMilliseconds = this.isAdvancing() ? timestampMilliseconds : null;
    return previous === null ? 0 : this.advance(Math.max(0, timestampMilliseconds - previous) / 1000);
  }

  private isAdvancing(): boolean {
    if (this.disposed) return false;
    const phase = this.getState().phase;
    return phase === "OPENING_COUNTDOWN" || phase === "RUNNING";
  }

  public drainEvents(): GameEvent[] {
    return this.simulation.drainEvents();
  }

  public dispose(): void {
    this.disposed = true;
    this.clock.reset();
    this.lastFrameMilliseconds = null;
    this.simulation.drainEvents();
  }
}
