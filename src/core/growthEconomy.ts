import { getGrowthBuildingDefinition, getGrowthTraitDefinition } from "./buildingGrowth";
import type { BuildingGrowthContent } from "./buildingGrowth";
import type { BuildingState } from "./types";

function traitStacks(building: BuildingState, traitId: "lumber_flat" | "lumber_output" | "lumber_upgrade_discount" | "lumber_wave_stockpile"): number {
  return Math.max(0, building.traits?.find((trait) => trait.definitionId === traitId)?.stacks ?? 0);
}

export function getGrowthLumberyardProduction(content: BuildingGrowthContent, building: BuildingState): number {
  if (building.model !== "growth" || building.kind !== "lumberyard" || building.growthDefinitionId !== "lumberyard") return 0;
  const definition = getGrowthBuildingDefinition(content, "lumberyard");
  const base = definition?.baseProductionPerSecond?.[Math.max(0, Math.min(4, building.level - 1))] ?? 0;
  const flatEffect = getGrowthTraitDefinition(content, "lumber_flat")?.effect;
  const outputEffect = getGrowthTraitDefinition(content, "lumber_output")?.effect;
  const flat = flatEffect?.kind === "lumber_flat_income" ? flatEffect.amountPerSecond * traitStacks(building, "lumber_flat") : 0;
  const outputMultiplier = outputEffect?.kind === "lumber_output_percent" ? 1 + outputEffect.amount * traitStacks(building, "lumber_output") : 1;
  return (base + flat) * outputMultiplier;
}

export function getGrowthLumberyardUpgradeDiscount(content: BuildingGrowthContent, building: BuildingState): number {
  if (building.model !== "growth" || building.growthDefinitionId !== "lumberyard") return 0;
  const effect = getGrowthTraitDefinition(content, "lumber_upgrade_discount")?.effect;
  if (effect?.kind !== "lumber_upgrade_discount") return 0;
  return Math.min(effect.cap, effect.amount * traitStacks(building, "lumber_upgrade_discount"));
}

export function getGrowthLumberyardWaveStockpile(content: BuildingGrowthContent, building: BuildingState): number {
  const effect = getGrowthTraitDefinition(content, "lumber_wave_stockpile")?.effect;
  if (building.model !== "growth" || building.growthDefinitionId !== "lumberyard" || effect?.kind !== "lumber_wave_stockpile") return 0;
  return effect.amount * traitStacks(building, "lumber_wave_stockpile");
}
