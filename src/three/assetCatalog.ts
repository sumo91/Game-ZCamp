import type { GrowthBuildingId } from "../core/buildingGrowth";

export type AssetId = "arrow_low" | "arrow_medium" | "arrow_high" | "lumber_low" | "lumber_medium" | "lumber_high" | "main_city" | "wall" | "tree" | "rocks" | "plot" | "skeleton";
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
  { id: "arrow_low", file: "arrow_tower_low.glb", maximumSize: [1.8, 2.15, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "arrow_medium", file: "arrow_tower_medium.glb", maximumSize: [1.8, 2.15, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
  { id: "arrow_high", file: "arrow_tower_high.glb", maximumSize: [1.8, 2.15, 1.55], anchors: ["attack_anchor", "hit_anchor", "label_anchor"], clips: [] },
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

export const SAMPLE_COVERAGE = "精修：箭塔/木材厂三档、主城、城墙、骷髅、树岩；英雄、特殊塔及其余敌人是开发占位";

/** The tier is a display mapping of the real level, not another growth rule. */
export function buildingAsset(id: GrowthBuildingId | "main_city", level: number): AssetId | null {
  if (id === "arrow_tower") return level <= 2 ? "arrow_low" : level <= 4 ? "arrow_medium" : "arrow_high";
  if (id === "lumberyard") return level <= 2 ? "lumber_low" : level <= 4 ? "lumber_medium" : "lumber_high";
  if (id === "main_city") return "main_city";
  return null;
}
