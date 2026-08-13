import {
  getGrowthBuildingDefinition,
  getGrowthTowerDefinition,
  getGrowthTraitDefinition,
  getGrowthUpgradeCost,
  type BuildingGrowthContent,
  type GrowthBuildingId,
  type GrowthSpecialTowerId,
  type GrowthTowerId,
  type GrowthTraitId,
} from "../core/buildingGrowth";
import { getGrowthLumberyardProduction, getGrowthLumberyardUpgradeDiscount } from "../core/growthEconomy";
import { getGrowthTowerAttackProfile } from "../core/growthCombat";
import type { BuildingState, GameCommand, GamePhase, GameState, PendingTraitDraft } from "../core/types";

export type GrowthResource = "wood" | "gold";
type BuildableGrowthId = "arrow_tower" | "lumberyard";

export interface GrowthActionView {
  kind: "build" | "upgrade";
  label: string;
  definitionId: GrowthBuildingId;
  buildingId?: string;
  cost: number | null;
  resource: "wood";
  affordable: boolean;
  reason: string;
  command: Extract<GameCommand, { type: "build_building" | "upgrade_building" }> | null;
}

export interface GrowthStatsView {
  kind: "tower" | "lumberyard";
  damage?: number;
  attackIntervalSeconds?: number;
  range?: number;
  woodPerSecond?: number;
}

export interface GrowthTraitView {
  id: GrowthTraitId;
  name: string;
  role: string;
  categoryLabel: string;
  currentStacks: number;
  nextStacks: number;
  repeatable: boolean;
}

export interface GrowthBuildingDetailView {
  buildingId: string;
  definitionId: GrowthBuildingId;
  name: string;
  role: string;
  level: number;
  maxLevel: number;
  current: GrowthStatsView;
  next: GrowthStatsView | null;
  upgrade: GrowthActionView;
  traits: GrowthTraitView[];
  canTransform: boolean;
}

export interface GrowthTransformView {
  targetTowerId: GrowthSpecialTowerId;
  name: string;
  role: string;
  goldCost: number;
  affordable: boolean;
  reason: string;
  command: Extract<GameCommand, { type: "transform_tower" }>;
}

export interface GrowthTraitOptionView {
  id: GrowthTraitId;
  name: string;
  role: string;
  categoryLabel: string;
  currentStacks: number;
  nextStacks: number;
  effectText: string;
}

export type GrowthInputPriority = "result" | "system_pause" | "trait_draft" | "transform" | "building" | "none";

function difference(resource: number, cost: number): string {
  return "还差 " + Math.max(1, Math.ceil(cost - resource)) + " 木材";
}

function getTraitStacks(building: BuildingState, traitId: GrowthTraitId): number {
  return Math.max(0, building.traits?.find((trait) => trait.definitionId === traitId)?.stacks ?? 0);
}

function cloneAtLevel(building: BuildingState, level: number): BuildingState {
  return { ...building, level };
}

function getStats(content: BuildingGrowthContent, building: BuildingState): GrowthStatsView {
  if (building.kind === "lumberyard") {
    return { kind: "lumberyard", woodPerSecond: getGrowthLumberyardProduction(content, building) };
  }
  const profile = getGrowthTowerAttackProfile(content, building);
  return {
    kind: "tower",
    damage: profile?.baseAttackDamage ?? 0,
    attackIntervalSeconds: profile?.attackIntervalSeconds ?? 0,
    range: profile?.range ?? 0,
  };
}

function categoryLabel(content: BuildingGrowthContent, source: string): string {
  if (source === "common") return "通用 · 本塔生效";
  if (source === "lumberyard") return "木材厂专属";
  return (getGrowthTowerDefinition(content, source as GrowthSpecialTowerId)?.displayName ?? source) + "专属";
}

export function formatGrowthTraitEffect(content: BuildingGrowthContent, traitId: GrowthTraitId): string {
  return getGrowthTraitDefinition(content, traitId)?.role ?? "当前建筑专属效果";
}

function makeBuildAction(content: BuildingGrowthContent, state: GameState, slotId: string, definitionId: BuildableGrowthId): GrowthActionView {
  const definition = getGrowthBuildingDefinition(content, definitionId)!;
  const affordable = state.wood >= definition.buildCost;
  return {
    kind: "build",
    label: "建造" + definition.displayName + "｜木材 " + definition.buildCost,
    definitionId,
    cost: definition.buildCost,
    resource: "wood",
    affordable,
    reason: affordable ? "可建造" : difference(state.wood, definition.buildCost),
    command: { type: "build_building", slotId, definitionId },
  };
}

export function deriveEmptySlotActions(content: BuildingGrowthContent, state: GameState, slotId: string): GrowthActionView[] {
  return (["arrow_tower", "lumberyard"] as const).map((definitionId) => makeBuildAction(content, state, slotId, definitionId));
}

export function deriveBuildingDetail(content: BuildingGrowthContent, state: GameState, building: BuildingState): GrowthBuildingDetailView | null {
  if (building.model !== "growth" || !building.growthDefinitionId) return null;
  const definition = getGrowthBuildingDefinition(content, building.growthDefinitionId);
  const towerDefinition = building.kind === "tower" ? getGrowthTowerDefinition(content, building.growthDefinitionId as GrowthTowerId) : undefined;
  if (!definition && !towerDefinition) return null;
  const isLumberyard = definition?.kind === "lumberyard";
  const maxLevel = definition?.maxLevel ?? getGrowthBuildingDefinition(content, "arrow_tower")?.maxLevel ?? 5;
  const current = getStats(content, building);
  const next = building.level < maxLevel ? getStats(content, cloneAtLevel(building, building.level + 1)) : null;
  const discount = getGrowthLumberyardUpgradeDiscount(content, building);
  const cost = getGrowthUpgradeCost(content, building.growthDefinitionId, building.level, discount);
  const affordable = cost !== null && state.wood >= cost;
  const upgradeReason = cost === null ? "已满级" : affordable ? "可升级" : difference(state.wood, cost);
  const traits = (building.traits ?? []).map((trait) => {
    const traitDefinition = getGrowthTraitDefinition(content, trait.definitionId);
    return {
      id: trait.definitionId,
      name: traitDefinition?.displayName ?? trait.definitionId,
      role: traitDefinition?.role ?? "当前建筑专属效果",
      categoryLabel: categoryLabel(content, traitDefinition?.source ?? "common"),
      currentStacks: trait.stacks,
      nextStacks: trait.stacks + 1,
      repeatable: traitDefinition?.repeatable ?? true,
    };
  });
  return {
    buildingId: building.id,
    definitionId: building.growthDefinitionId,
    name: isLumberyard ? definition!.displayName : towerDefinition!.displayName,
    role: isLumberyard ? "持续生产木材" : towerDefinition!.role,
    level: building.level,
    maxLevel,
    current,
    next,
    upgrade: {
      kind: "upgrade",
      label: cost === null ? "已满级" : "升级至 Lv." + (building.level + 1) + "｜木材 " + cost,
      definitionId: building.growthDefinitionId,
      buildingId: building.id,
      cost,
      resource: "wood",
      affordable: cost !== null && affordable,
      reason: upgradeReason,
      command: cost === null ? null : { type: "upgrade_building", buildingId: building.id },
    },
    traits,
    canTransform: building.growthDefinitionId === "arrow_tower",
  };
}

export function deriveTransformOptions(content: BuildingGrowthContent, state: GameState, building: BuildingState): GrowthTransformView[] {
  if (building.model !== "growth" || building.growthDefinitionId !== "arrow_tower") return [];
  return content.transformations.map((route) => {
    const tower = getGrowthTowerDefinition(content, route.to);
    const affordable = state.gold >= route.goldCost;
    return {
      targetTowerId: route.to,
      name: tower?.displayName ?? route.to,
      role: tower?.role ?? "特殊塔",
      goldCost: route.goldCost,
      affordable,
      reason: affordable ? "可改造" : "还差 " + Math.max(1, Math.ceil(route.goldCost - state.gold)) + " 金币",
      command: { type: "transform_tower", buildingId: building.id, targetTowerId: route.to },
    };
  });
}

export function deriveTraitOptions(content: BuildingGrowthContent, state: GameState, draft: PendingTraitDraft | null): GrowthTraitOptionView[] {
  if (!draft) return [];
  const building = state.buildings.find((candidate) => candidate.id === draft.buildingId);
  if (!building) return [];
  return draft.options.map((traitId) => {
    const definition = getGrowthTraitDefinition(content, traitId);
    const currentStacks = getTraitStacks(building, traitId);
    return {
      id: traitId,
      name: definition?.displayName ?? traitId,
      role: definition?.role ?? "当前建筑专属效果",
      categoryLabel: categoryLabel(content, definition?.source ?? "common"),
      currentStacks,
      nextStacks: currentStacks + 1,
      effectText: formatGrowthTraitEffect(content, traitId),
    };
  });
}

export function getGrowthInputPriority(phase: GamePhase, transformOpen: boolean): GrowthInputPriority {
  if (phase === "VICTORY" || phase === "DEFEAT") return "result";
  if (phase === "SYSTEM_PAUSE") return "system_pause";
  if (phase === "TRAIT_DRAFT") return "trait_draft";
  if (transformOpen) return "transform";
  if (phase === "OPENING_COUNTDOWN" || phase === "RUNNING" || phase === "TACTICAL_PAUSE") return "building";
  return "none";
}

export function decideGrowthAction(action: GrowthActionView): { kind: "dispatch"; command: NonNullable<GrowthActionView["command"]> } | { kind: "blocked"; reason: string } {
  if (!action.affordable || !action.command) return { kind: "blocked", reason: action.reason };
  return { kind: "dispatch", command: action.command };
}

export function decideGrowthTransform(option: GrowthTransformView): { kind: "dispatch"; command: GrowthTransformView["command"] } | { kind: "blocked"; reason: string } {
  if (!option.affordable) return { kind: "blocked", reason: option.reason };
  return { kind: "dispatch", command: option.command };
}

export function decideGrowthTrait(option: GrowthTraitOptionView, buildingId: string, locked: boolean): { kind: "dispatch"; command: Extract<GameCommand, { type: "choose_building_trait" }> } | { kind: "blocked"; reason: string } {
  if (locked) return { kind: "blocked", reason: "正在处理词条选择" };
  return { kind: "dispatch", command: { type: "choose_building_trait", buildingId, traitDefinitionId: option.id } };
}
