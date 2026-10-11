import { BattleSession, type BattleSessionOptions } from "../core/battleSession";
import { starterHeroContent } from "../core/hero";
import { deriveVictoryRewards, type VictoryRewards } from "../core/progression";
import { clearedLevelIdSet, ProgressionStore } from "../platform/progressionStore";
import { decideLobbyAction, deriveLobbyView, type LobbyIntent, type LobbySelection } from "./lobbyUi";
import { fantasyHeroContent } from "./fantasyHeroPresentation";

export interface CampaignResult { victory: boolean; rewards: VictoryRewards }

/** One campaign owns the selected cards and at most one live battle. */
export class Campaign {
  private selection: LobbySelection;
  private battle: BattleSession | null = null;
  private settled: CampaignResult | null = null;
  private disposed = false;
  public constructor(private readonly progress = new ProgressionStore(), private readonly battleOptions: Omit<BattleSessionOptions, "config"> = {}) {
    const saved = progress.load();
    this.selection = { heroId: saved.lastHeroId ?? undefined, levelId: saved.lastLevelId ?? undefined };
  }
  public view() { return deriveLobbyView(fantasyHeroContent, clearedLevelIdSet(this.progress.load()), this.selection); }
  public choose(intent: Exclude<LobbyIntent, { kind: "start" }>): string {
    if (this.battle || this.disposed) return "当前无法更换出战配置";
    const decision = decideLobbyAction(starterHeroContent, clearedLevelIdSet(this.progress.load()), intent, this.selection);
    if (decision.kind === "blocked") return decision.reason;
    if (decision.kind === "select_hero") { this.selection.heroId = decision.heroId; this.progress.recordSelection(decision.heroId, undefined); }
    if (decision.kind === "select_level") { this.selection.levelId = decision.levelId; this.progress.recordSelection(undefined, decision.levelId); }
    return "";
  }
  public start(): BattleSession | null {
    if (this.battle || this.disposed) return null;
    const view = this.view();
    const config = { heroId: view.selectedHeroId, levelId: view.selectedLevelId };
    this.selection = { ...config };
    this.progress.recordSelection(config.heroId, config.levelId);
    this.battle = new BattleSession({ ...this.battleOptions, config });
    this.settled = null;
    return this.battle;
  }
  public result(): CampaignResult | null {
    const state = this.battle?.getState();
    if (!state || (state.phase !== "VICTORY" && state.phase !== "DEFEAT")) return null;
    if (!this.settled) {
      const victory = state.phase === "VICTORY";
      const levelId = this.view().selectedLevelId;
      const rewards = victory ? deriveVictoryRewards(starterHeroContent, levelId, clearedLevelIdSet(this.progress.load())) : { newlyUnlockedHeroes: [], newlyUnlockedLevels: [] };
      if (victory) this.progress.recordLevelClear(levelId);
      this.settled = { victory, rewards };
    }
    return this.settled;
  }
  public retry(): boolean {
    if (!this.battle || !this.result()) return false;
    this.battle.dispatch({ type: "restart" });
    this.settled = null;
    return true;
  }
  public returnToLobby(): void {
    this.result();
    this.battle?.dispose();
    this.battle = null;
    this.settled = null;
  }
  public dispose(): void { this.returnToLobby(); this.disposed = true; }
}
