export type GamePhase = "SHOP" | "COUNTDOWN" | "COMBAT" | "PAUSED" | "VICTORY" | "DEFEAT";

export type ActivePhase = Exclude<GamePhase, "PAUSED">;

export const CAMP_ROWS = 3;
export const CAMP_COLUMNS = 5;
export const CAMP_SLOT_IDS = Array.from({ length: CAMP_ROWS }, (_, row) =>
  Array.from({ length: CAMP_COLUMNS }, (_, column) => `slot-r${row + 1}-c${column + 1}`),
).flat();

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
  countdownRemainingSeconds: number;
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

export type GameEvent =
  | {
      type: "tower_attack";
      buildingId: string;
      towerDefinitionId: string;
      targetId: string;
      targetPosition: number;
    }
  | {
      type: "enemy_hit";
      enemyId: string;
      position: number;
      damage: number;
      remainingHp: number;
    }
  | {
      type: "enemy_defeated";
      enemyId: string;
      position: number;
    };

export type GameCommand =
  | { type: "complete_prep" }
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
