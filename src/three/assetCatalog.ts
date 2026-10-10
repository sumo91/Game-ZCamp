import type { GrowthBuildingId } from "../core/buildingGrowth";
import { starterCatalog, type EnemyDefinition } from "../core/content";

export type AssetId = "arrow_low" | "arrow_medium" | "arrow_high" | "ballista_low" | "ballista_medium" | "ballista_high" | "cannon_low" | "cannon_medium" | "cannon_high" | "frost_low" | "frost_medium" | "frost_high" | "electric_low" | "electric_medium" | "electric_high" | "lumber_low" | "lumber_medium" | "lumber_high" | "main_city" | "wall" | "tree" | "rocks" | "plot" | "skeleton";
export type AnimationSemantic = "walk" | "attack" | "hit" | "death";
export interface PresentationAsset {
  id: AssetId;
  file: string;
  /** Visual metres only; never a simulation radius or range. */
  maximumSize: readonly [number, number, number];
  anchors: readonly string[];
  clips: readonly AnimationSemantic[];
}

export const SAMPLE_ASSETS: readonly PresentationAsset[] = [
  { id: "ballista_low", file: "ballista_tower_low.glb", maximumSize: [1.8, 2.15, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "ballista_medium", file: "ballista_tower_medium.glb", maximumSize: [1.8, 2.15, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "ballista_high", file: "ballista_tower_high.glb", maximumSize: [1.8, 2.15, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "cannon_low", file: "cannon_tower_low.glb", maximumSize: [1.8, 2.15, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "cannon_medium", file: "cannon_tower_medium.glb", maximumSize: [1.8, 2.15, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "cannon_high", file: "cannon_tower_high.glb", maximumSize: [1.8, 2.15, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "arrow_low", file: "arrow_tower_low.glb", maximumSize: [1.8, 2.15, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "arrow_medium", file: "arrow_tower_medium.glb", maximumSize: [1.8, 2.15, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "arrow_high", file: "arrow_tower_high.glb", maximumSize: [1.8, 2.15, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "frost_low", file: "frost_tower_low.glb", maximumSize: [1.8, 2.2, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "frost_medium", file: "frost_tower_medium.glb", maximumSize: [1.8, 2.2, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "frost_high", file: "frost_tower_high.glb", maximumSize: [1.8, 2.2, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "electric_low", file: "electric_tower_low.glb", maximumSize: [1.8, 2.2, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "electric_medium", file: "electric_tower_medium.glb", maximumSize: [1.8, 2.2, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "electric_high", file: "electric_tower_high.glb", maximumSize: [1.8, 2.2, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "skeleton", file: "skeleton_infantry.glb", maximumSize: [1.15, 1.6, .65], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: ["walk", "attack", "hit", "death"] },
  { id: "lumber_low", file: "lumberyard_low.glb", maximumSize: [1.8, 1.85, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "lumber_medium", file: "lumberyard_medium.glb", maximumSize: [1.8, 1.85, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "lumber_high", file: "lumberyard_high.glb", maximumSize: [1.8, 1.85, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "main_city", file: "main_city.glb", maximumSize: [1.85, 2.2, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "wall", file: "wall_segment.glb", maximumSize: [1.95, 1.3, .8], anchors: ["hit_anchor", "label_anchor"], clips: [] },
  { id: "tree", file: "pine_tree.glb", maximumSize: [1.4, 2.3, 1.4], anchors: ["label_anchor"], clips: [] },
  { id: "rocks", file: "rock_cluster.glb", maximumSize: [1, .5, .9], anchors: ["label_anchor"], clips: [] },
  { id: "plot", file: "camp_plot.glb", maximumSize: [1.9, .1, 1.65], anchors: ["label_anchor"], clips: [] },
];

export const SAMPLE_COVERAGE = "精修：箭塔/连弩/火炮/寒霜塔/雷电塔/木材厂三档、主城、城墙、骷髅、树岩；英雄及其余敌人是开发占位";

type BuildingContentId = GrowthBuildingId | "main_city";
const BUILDING_ASSETS: Readonly<Partial<Record<BuildingContentId, readonly [AssetId, AssetId, AssetId]>>> = {
  machine_gun: ["ballista_low", "ballista_medium", "ballista_high"],
  cannon: ["cannon_low", "cannon_medium", "cannon_high"],
  arrow_tower: ["arrow_low", "arrow_medium", "arrow_high"],
  frost: ["frost_low", "frost_medium", "frost_high"],
  electric: ["electric_low", "electric_medium", "electric_high"],
  lumberyard: ["lumber_low", "lumber_medium", "lumber_high"],
  main_city: ["main_city", "main_city", "main_city"],
};

/** Only walker has a finished enemy model in this sample. Other IDs use development geometry. */
const ENEMY_ASSETS: ReadonlyMap<EnemyDefinition["id"], AssetId> = new Map([["walker", "skeleton"]]);

/** Validate the declared sample coverage before requesting any model files. */
export function validateSampleCatalog(): void {
  const assets = new Set(SAMPLE_ASSETS.map((asset) => asset.id));
  const references = [...Object.values(BUILDING_ASSETS).flat(), ...ENEMY_ASSETS.values()];
  for (const id of references) if (!assets.has(id)) throw new Error(`样板目录引用未登记的模型：${id}`);
  for (const id of ENEMY_ASSETS.keys()) {
    if (!starterCatalog.enemies.some((enemy) => enemy.id === id)) throw new Error(`样板目录引用未知敌人：${id}`);
  }
}

export function enemyAsset(id: EnemyDefinition["id"]): AssetId | null {
  return ENEMY_ASSETS.get(id) ?? null;
}

/** The tier is a display mapping of the real level, not another growth rule. */
export function buildingAsset(id: BuildingContentId, level: number): AssetId | null {
  return BUILDING_ASSETS[id]?.[level <= 2 ? 0 : level <= 4 ? 1 : 2] ?? null;
}
