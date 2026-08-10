export type GamePhase = "PREPARE" | "COMBAT" | "UPGRADE" | "PAUSED" | "VICTORY" | "DEFEAT";

export type ActivePhase = Exclude<GamePhase, "PAUSED">;

export type BuildingKind = "tower";

export type EnemyTier = "normal" | "elite" | "boss" | "challenge";

export interface BuildingState {
  id: string;
  slotId: string;
  kind: BuildingKind;
  definitionId: string;
  level: number;
  lanePosition: number;
  attackCooldownSeconds: number;
}

export interface EnemyRuntimeState {
  id: string;
  definitionId: string;
  position: number;
  hp: number;
  maxHp: number;
  atWall: boolean;
  attackCooldownSeconds: number;
  slowMultiplier: number;
  slowRemainingSeconds: number;
  abilityCooldownSeconds: number;
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
  waveElapsedSeconds: number;
  nextSpawnEventIndex: number;
  spawnedEnemies: number;
  defeatedEnemies: number;
  xp: number;
  level: number;
  xpToNextLevel: number;
  upgradeIds: string[];
  pendingUpgradeChoices: string[];
  seed: number;
  buildings: BuildingState[];
  enemies: EnemyRuntimeState[];
}

export type GameCommand =
  | { type: "start_wave" }
  | { type: "build_tower"; definitionId: string; slotId: string }
  | { type: "upgrade_tower"; slotId: string }
  | { type: "choose_upgrade"; upgradeId: string }
  | { type: "repair_wall" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "restart" };

export interface CommandResult {
  accepted: boolean;
  reason?: string;
}
