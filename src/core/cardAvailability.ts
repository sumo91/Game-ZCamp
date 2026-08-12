import { starterCatalog, type CardDefinition, type ContentCatalog } from "./content";
import { getUpgradeCost } from "./costs";
import { CAMP_SLOT_IDS } from "./types";
import type { BuildingState, CardTarget, GamePhase, GameState } from "./types";

export type CardReadinessKind = "usable" | "insufficient" | "blocked";

export interface BaseCardAction {
  target: CardTarget;
  cost: number;
}

export interface CardUseReadiness {
  usable: boolean;
  kind: CardReadinessKind;
  hint: string;
  minimumCost: number | null;
  shortfall: number;
  actions: readonly BaseCardAction[];
}

type CardReadinessState = Pick<GameState, "buildings" | "wallHp" | "wallMaxHp" | "wood"> &
  Partial<Pick<GameState, "gold" | "permanentApplications">>;

export type WoodProgress =
  | { kind: "neutral"; ratio: 0; targetCost: null; shortfall: 0; label: string }
  | { kind: "target"; ratio: number; targetCost: number; shortfall: number; label: string }
  | { kind: "ready"; ratio: 1; targetCost: null; shortfall: 0; label: string };

export function getBaseCardActions(
  definition: CardDefinition,
  state: Pick<GameState, "buildings" | "wallHp" | "wallMaxHp">,
): BaseCardAction[] {
  if (definition.category !== "base" || definition.effect.kind !== "base") return [];

  const actions: BaseCardAction[] = [];
  for (const slotId of CAMP_SLOT_IDS) {
    const building = state.buildings.find((candidate) => candidate.slotId === slotId);
    if (!building) {
      actions.push({ target: { kind: "slot", slotId }, cost: definition.cost });
      continue;
    }
    if (building.kind === "main_city") continue;
    if (building.kind !== definition.effect.targetKind || building.definitionId !== definition.effect.definitionId) continue;
    if (building.level >= 3) continue;
    actions.push({ target: { kind: "slot", slotId }, cost: getUpgradeCost(definition.cost, building.level) });
  }

  if (definition.effect.targetKind === "repair_shop") {
    // A full wall is still a legal repair-shop action because the core turns
    // it into a temporary shield without changing the card's base cost.
    actions.push({ target: { kind: "wall" }, cost: definition.cost });
  }
  return actions;
}

export function getCardUseReadiness(
  definition: CardDefinition,
  state: CardReadinessState,
  _catalog: ContentCatalog = starterCatalog,
): CardUseReadiness {
  if (definition.category === "base") {
    const actions = getBaseCardActions(definition, state);
    const minimumCost = actions.length > 0 ? Math.min(...actions.map((action) => action.cost)) : null;
    if (minimumCost === null) {
      return { usable: false, kind: "blocked", hint: "暂无合法目标", minimumCost: null, shortfall: 0, actions };
    }
    if (state.wood < minimumCost) {
      const shortfall = Math.ceil(minimumCost - state.wood);
      return { usable: false, kind: "insufficient", hint: "还差 " + shortfall + " 木材", minimumCost, shortfall, actions };
    }
    return { usable: true, kind: "usable", hint: "可支付", minimumCost, shortfall: 0, actions };
  }

  const applications = state.permanentApplications?.[definition.id] ?? 0;
  if (definition.category === "permanent" && definition.maxApplications !== undefined && applications >= definition.maxApplications) {
    return { usable: false, kind: "blocked", hint: "已达上限", minimumCost: null, shortfall: 0, actions: [] };
  }
  const gold = state.gold ?? 0;
  if (gold < definition.cost) {
    const shortfall = Math.ceil(definition.cost - gold);
    return { usable: false, kind: "insufficient", hint: "还差 " + shortfall + " 金币", minimumCost: definition.cost, shortfall, actions: [] };
  }
  return { usable: true, kind: "usable", hint: "可支付", minimumCost: definition.cost, shortfall: 0, actions: [] };
}

export function getWoodProgress(
  hand: readonly { definitionId: string }[],
  state: Pick<GameState, "buildings" | "wallHp" | "wallMaxHp" | "wood">,
  catalog: ContentCatalog = starterCatalog,
): WoodProgress {
  const legalBaseReadiness = hand
    .map((card) => catalog.cards.find((definition) => definition.id === card.definitionId))
    .filter((definition): definition is CardDefinition => definition?.category === "base")
    .map((definition) => getCardUseReadiness(definition, state))
    .filter((readiness) => readiness.actions.length > 0);

  if (legalBaseReadiness.length === 0) {
    return { kind: "neutral", ratio: 0, targetCost: null, shortfall: 0, label: "暂无合法基地目标" };
  }

  const unaffordableCosts = legalBaseReadiness
    .map((readiness) => readiness.minimumCost)
    .filter((cost): cost is number => cost !== null && state.wood < cost);
  if (unaffordableCosts.length === 0) {
    return { kind: "ready", ratio: 1, targetCost: null, shortfall: 0, label: "基地牌可支付" };
  }

  const targetCost = Math.min(...unaffordableCosts);
  const shortfall = Math.ceil(targetCost - state.wood);
  return {
    kind: "target",
    ratio: Math.max(0, Math.min(1, state.wood / targetCost)),
    targetCost,
    shortfall,
    label: "距可建还差 " + shortfall,
  };
}

export function isGameplayInputPhase(phase: GamePhase): boolean {
  return phase === "OPENING_COUNTDOWN" || phase === "RUNNING" || phase === "TACTICAL_PAUSE";
}

export function findBaseAction(
  readiness: CardUseReadiness,
  target: CardTarget,
): BaseCardAction | undefined {
  return readiness.actions.find((action) => action.target.kind === target.kind && (target.kind === "wall" || action.target.kind === "slot" && action.target.slotId === target.slotId));
}

export function buildingMatchesBaseAction(
  building: BuildingState | undefined,
  definition: CardDefinition,
): boolean {
  return Boolean(
    building &&
      definition.category === "base" &&
      definition.effect.kind === "base" &&
      building.kind !== "main_city" &&
      building.kind === definition.effect.targetKind &&
      building.definitionId === definition.effect.definitionId,
  );
}
