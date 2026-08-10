import { starterCatalog, validateCatalog, type ContentCatalog } from "./content";
import { SeededRandom } from "./random";
import type { CommandResult, GameCommand, GameState } from "./types";

export const MAX_WAVE = 20;
export const WALL_MAX_HP = 100;
export const INITIAL_WOOD = 120;
export const INITIAL_GOLD = 0;

export class GameSimulation {
  private readonly random: SeededRandom;
  private readonly catalog: ContentCatalog;
  private readonly state: GameState;

  public constructor(catalog: ContentCatalog = starterCatalog, seed = 0x5ec0de) {
    validateCatalog(catalog);
    this.catalog = catalog;
    this.random = new SeededRandom(seed);
    this.state = {
      phase: "PREPARE",
      pausedFromPhase: null,
      wave: 0,
      maxWave: MAX_WAVE,
      wood: INITIAL_WOOD,
      gold: INITIAL_GOLD,
      wallHp: WALL_MAX_HP,
      wallMaxHp: WALL_MAX_HP,
      waveTimeRemainingSeconds: 0,
      defeatedEnemies: 0,
      seed,
      buildings: [],
    };
  }

  public getState(): Readonly<GameState> {
    return this.state;
  }

  public dispatch(command: GameCommand): CommandResult {
    switch (command.type) {
      case "start_wave":
        return this.startWave();
      case "build_tower":
        return this.buildTower(command.definitionId, command.slotId);
      case "pause":
        return this.pause();
      case "resume":
        return this.resume();
      case "restart":
        return this.restart();
    }
  }

  public tick(deltaSeconds: number): void {
    if (this.state.phase !== "COMBAT" || deltaSeconds <= 0) {
      return;
    }

    this.state.waveTimeRemainingSeconds = Math.max(
      0,
      this.state.waveTimeRemainingSeconds - deltaSeconds,
    );

    if (this.state.waveTimeRemainingSeconds === 0) {
      this.finishWave();
    }
  }

  public damageWall(amount: number): void {
    if (this.state.phase !== "COMBAT" || amount <= 0) {
      return;
    }

    this.state.wallHp = Math.max(0, this.state.wallHp - amount);
    if (this.state.wallHp === 0) {
      this.state.phase = "DEFEAT";
      this.state.waveTimeRemainingSeconds = 0;
    }
  }

  public nextRandomInt(minInclusive: number, maxExclusive: number): number {
    return this.random.nextInt(minInclusive, maxExclusive);
  }

  private startWave(): CommandResult {
    if (this.state.phase !== "PREPARE") {
      return { accepted: false, reason: "Waves can only start during preparation." };
    }

    if (this.state.wave >= this.state.maxWave) {
      return { accepted: false, reason: "All waves are complete." };
    }

    this.state.wave += 1;
    this.state.phase = "COMBAT";
    this.state.waveTimeRemainingSeconds = this.getWaveDuration(this.state.wave);
    return { accepted: true };
  }

  private buildTower(definitionId: string, slotId: string): CommandResult {
    if (this.state.phase !== "PREPARE" && this.state.phase !== "COMBAT") {
      return { accepted: false, reason: "Towers can only be built during preparation or combat." };
    }

    if (this.state.buildings.some((building) => building.slotId === slotId)) {
      return { accepted: false, reason: "That building slot is occupied." };
    }

    const definition = this.catalog.towers.find((tower) => tower.id === definitionId);
    if (!definition) {
      return { accepted: false, reason: `Unknown tower: ${definitionId}.` };
    }

    if (this.state.wood < definition.buildCost) {
      return { accepted: false, reason: "Not enough wood." };
    }

    this.state.wood -= definition.buildCost;
    this.state.buildings.push({
      id: `${definitionId}-${this.state.buildings.length + 1}`,
      slotId,
      kind: "tower",
      definitionId,
      level: 1,
    });
    return { accepted: true };
  }

  private pause(): CommandResult {
    if (this.state.phase !== "PREPARE" && this.state.phase !== "COMBAT") {
      return { accepted: false, reason: "Only an active game can be paused." };
    }

    this.state.pausedFromPhase = this.state.phase;
    this.state.phase = "PAUSED";
    return { accepted: true };
  }

  private resume(): CommandResult {
    if (this.state.phase !== "PAUSED" || this.state.pausedFromPhase === null) {
      return { accepted: false, reason: "The game is not paused." };
    }

    this.state.phase = this.state.pausedFromPhase;
    this.state.pausedFromPhase = null;
    return { accepted: true };
  }

  private restart(): CommandResult {
    this.state.phase = "PREPARE";
    this.state.pausedFromPhase = null;
    this.state.wave = 0;
    this.state.wood = INITIAL_WOOD;
    this.state.gold = INITIAL_GOLD;
    this.state.wallHp = WALL_MAX_HP;
    this.state.waveTimeRemainingSeconds = 0;
    this.state.defeatedEnemies = 0;
    this.state.buildings = [];
    return { accepted: true };
  }

  private finishWave(): void {
    if (this.state.wave >= this.state.maxWave) {
      this.state.phase = "VICTORY";
      return;
    }

    this.state.phase = "PREPARE";
  }

  private getWaveDuration(wave: number): number {
    const configuredWave = this.catalog.waves.find((definition) => definition.wave === wave);
    return configuredWave?.durationSeconds ?? this.catalog.waves.at(-1)?.durationSeconds ?? 5;
  }
}
