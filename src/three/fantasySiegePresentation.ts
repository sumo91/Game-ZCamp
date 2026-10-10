import type { BuildingGrowthContent } from "../core/buildingGrowth";

/** Theme-only labels. Stable IDs, prices, statistics and trait effects are preserved. */
export function withFantasySiegePresentation(content: BuildingGrowthContent): BuildingGrowthContent {
  return {
    ...content,
    presentations: content.presentations.map((entry) => entry.id === "machine_gun"
      ? { ...entry, displayName: "连弩塔", role: "速射连弩 · 词条可穿透" }
      : entry.id === "cannon" ? { ...entry, displayName: "火炮塔", role: "范围炮击 · 词条可燃烧" } : entry),
    traits: content.traits.map((entry) => entry.id === "machine_penetration"
      ? { ...entry, displayName: "穿透弩箭", role: "穿透目标 +1；后续目标承受本次伤害的 70%" } : entry),
  };
}
