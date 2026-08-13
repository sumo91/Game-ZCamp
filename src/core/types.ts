import type { GrowthBuildingId, GrowthTraitId } from "./buildingGrowth";

export type EnemyTier = "normal" | "elite" | "boss" | "challenge";

export type PlayPhase = "OPENING_COUNTDOWN" | "RUNNING" | "TACTICAL_PAUSE";
export type GamePhase = PlayPhase | "TRAIT_DRAFT" | "SYSTEM_PAUSE" | "VICTORY" | "DEFEAT";

export const CAMP_ROWS = 3;
export const CAMP_COLUMNS = 5;
export const CAMP_SLOT_IDS = Array.from({ length: CAMP_ROWS }, (_, row) =>
  Array.from({ length: CAMP_COLUMNS }, (_, column) => "slot-r" + (row + 1) + "-c" + (column + 1)),
).flat();

export type BuildingKind = "tower" | "lumberyard" | "main_city";

export interface BuildingState {
  id: string;
  slotId: string;
  kind: BuildingKind;
  definitionId: string;
  growthDefinitionId?: GrowthBuildingId;
  level: number;
  lanePosition: number;
  attackCooldownSeconds: number;
  traits?: BuildingTraitState[];
}

export interface BuildingTraitState {
  definitionId: GrowthTraitId;
  stacks: number;
  acquiredAtLevel: number;
}

export interface PendingTraitDraft {
  buildingId: string;
  options: [GrowthTraitId, GrowthTraitId, GrowthTraitId];
  createdAtLevel: number;
  returnPhase: PlayPhase;
}

export interface EnemyRuntimeState {
  id: string;
  definitionId: string;
  wave: number;
  position: number;
  hp: number;
  maxHp: number;
  atWall: boolean;
  attackCooldownSeconds: number;
  abilityCooldownSeconds: number;
  growthSlowStates?: GrowthSlowState[];
  growthBurnStates?: GrowthBurnState[];
  chargeWarningRemainingSeconds: number;
  chargeRemainingSeconds: number;
  chargeTargetPosition: number;
}

export interface GrowthSlowState {
  sourceBuildingId: string;
  multiplier: number;
  remainingSeconds: number;
}

export interface GrowthBurnState {
  sourceBuildingId: string;
  damagePerSecond: number;
  remainingSeconds: number;
}

export interface GameState {
  phase: GamePhase;
  pausedFromPhase: PlayPhase | null;
  systemPausedFromPhase: GamePhase | null;
  wave: number;
  maxWave: number;
  effectiveBattleTimeSeconds: number;
  nextWaveTimeRemainingSeconds: number;
  openingCountdownRemainingSeconds: number;
  waveSpawnProgress: number[];
  spawnedEnemies: number;
  defeatedEnemies: number;
  wood: number;
  gold: number;
  wallHp: number;
  wallMaxHp: number;
  overlordInspireRemainingSeconds: number;
  overlordInspireMultiplier: number;
  seed: number;
  buildings: BuildingState[];
  enemies: EnemyRuntimeState[];
  pendingTraitDraft: PendingTraitDraft | null;
}

export type GameEvent =
  | { type: "tower_attack"; buildingId: string; towerDefinitionId: string; targetId: string; targetPosition: number }
  | { type: "tower_special"; buildingId: string; effect: string; targetId: string }
  | { type: "enemy_hit"; enemyId: string; position: number; damage: number; remainingHp: number }
  | { type: "enemy_defeated"; enemyId: string; position: number }
  | { type: "wave_started"; wave: number }
  | { type: "enemy_spawned"; enemyId: string; definitionId: string; wave: number }
  | { type: "enemy_charge_warning"; enemyId: string; position: number; durationSeconds: number }
  | { type: "enemy_charge_started"; enemyId: string; position: number; targetPosition: number }
  | { type: "enemy_charge_impact"; enemyId: string; position: number }
  | { type: "enemy_burned"; enemyId: string; position: number; damagePerSecond: number; durationSeconds: number; areaRadius: number; sourceBuildingId?: string }
  | { type: "overlord_inspire"; enemyId: string; targetIds: string[]; durationSeconds: number; multiplier: number }
  | { type: "building_built"; buildingId: string; slotId: string; definitionId: string }
  | { type: "building_upgraded"; buildingId: string; level: number }
  | { type: "building_destroyed"; buildingId: string; slotId: string }
  | { type: "building_trait_draft_created"; buildingId: string; optionDefinitionIds: GrowthTraitId[]; level: number }
  | { type: "building_trait_chosen"; buildingId: string; traitDefinitionId: GrowthTraitId; level: number }
  | { type: "tower_transformed"; buildingId: string; fromTowerId: "arrow_tower"; toTowerId: Exclude<GrowthBuildingId, "arrow_tower" | "lumberyard"> };

export type GameCommand =
  | { type: "build_building"; slotId: string; definitionId: "arrow_tower" | "lumberyard" }
  | { type: "upgrade_building"; buildingId: string }
  | { type: "choose_building_trait"; buildingId: string; traitDefinitionId: GrowthTraitId }
  | { type: "transform_tower"; buildingId: string; targetTowerId: "machine_gun" | "cannon" | "frost" | "electric" }
  | { type: "destroy_building"; slotId: string }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "system_pause" }
  | { type: "system_resume" }
  | { type: "restart" };

export interface CommandResult {
  accepted: boolean;
  reason?: string;
  buildingId?: string;
}
