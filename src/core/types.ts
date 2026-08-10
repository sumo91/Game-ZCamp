export type GamePhase = "PREPARE" | "COMBAT" | "PAUSED" | "VICTORY" | "DEFEAT";

export type ActivePhase = Exclude<GamePhase, "PAUSED">;

export type BuildingKind = "tower";

export interface BuildingState {
  id: string;
  slotId: string;
  kind: BuildingKind;
  definitionId: string;
  level: number;
}

export interface GameState {
  phase: GamePhase;
  pausedFromPhase: ActivePhase | null;
  wave: number;
  maxWave: number;
  wood: number;
  gold: number;
  wallHp: number;
  wallMaxHp: number;
  waveTimeRemainingSeconds: number;
  defeatedEnemies: number;
  seed: number;
  buildings: BuildingState[];
}

export type GameCommand =
  | { type: "start_wave" }
  | { type: "build_tower"; definitionId: string; slotId: string }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "restart" };

export interface CommandResult {
  accepted: boolean;
  reason?: string;
}
