import { starterCatalog, type ContentCatalog } from "./content";
import type { GameState } from "./types";

export const MAIN_CITY_WOOD_INCOME = 0.5;
export const LUMBERYARD_INCOME = [0, 1, 1.8, 3] as const;

type WoodIncomeState = Pick<GameState, "buildings" | "permanentApplications">;

/** The single source of truth for the wood production shown and settled by the game. */
export function getWoodProductionPerSecond(state: WoodIncomeState, catalog: ContentCatalog = starterCatalog): number {
  const lumberyardIncome = state.buildings
    .filter((building) => building.kind === "lumberyard" && building.model !== "growth")
    .reduce((total, building) => total + (LUMBERYARD_INCOME[building.level] ?? 0), 0);
  const incomeCard = catalog.cards.find((card) => card.category === "permanent" && card.effect.kind === "wood_income");
  const woodBuffs = incomeCard?.effect.kind === "wood_income"
    ? (state.permanentApplications[incomeCard.id] ?? 0) * incomeCard.effect.amountPerSecond
    : 0;
  return MAIN_CITY_WOOD_INCOME + lumberyardIncome + woodBuffs;
}
