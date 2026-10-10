import type { BuildingGrowthContent } from "../core/buildingGrowth";

/** Presentation vocabulary only; prices, IDs and simulation content stay unchanged. */
export function fantasyArcanePresentation(content: BuildingGrowthContent): BuildingGrowthContent {
  return {
    ...content,
    presentations: content.presentations.map((building) => building.id === "frost"
      ? { ...building, displayName: "寒霜塔", role: "冰晶减速控制" }
      : building.id === "electric"
        ? { ...building, displayName: "雷电塔", role: "符文链式压制" }
        : building),
  };
}
