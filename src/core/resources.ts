import { starterCatalog } from "./content";
import { getGrowthLumberyardProduction } from "./growthEconomy";
import type { ContentCatalog } from "./content";
import type { GameState } from "./types";

export const MAIN_CITY_WOOD_INCOME = 0.5;

type WoodIncomeState = Pick<GameState, "buildings">;

/** The single source of truth for the wood production shown and settled by the game. */
export function getWoodProductionPerSecond(state: WoodIncomeState, catalog: ContentCatalog = starterCatalog): number {
  const growthLumberyardIncome = state.buildings.reduce((total, building) => total + getGrowthLumberyardProduction(catalog.buildingGrowth, building), 0);
  return MAIN_CITY_WOOD_INCOME + growthLumberyardIncome;
}
