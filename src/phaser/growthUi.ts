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
import { CAMP_SLOT_LAYOUTS, GROWTH_CONTEXT_ACTION_BOUNDS, GROWTH_TRANSFORM_CLOSE_BOUNDS, GROWTH_TRANSFORM_OPTION_BOUNDS, type LogicalBounds } from "./layout";

export type GrowthResource = "wood" | "gold";
type BuildableGrowthId = "arrow_tower" | "lumberyard";

export interface GrowthActionView {
  kind: "build" | "upgrade";
  label: string;
  definitionId: GrowthBuildingId;
  buildingId?: string;
  cost: number | null;
  resource: "wood";
  resourceLabel: string;
  description: string;
  statusLabel: string;
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
  transformCostLabel: string | null;
  transformCost: number | null;
  transformResourceLabel: string;
  transformStatusLabel: string;
  transformAffordable: boolean;
  transformReason: string;
}

export interface GrowthTransformView {
  targetTowerId: GrowthSpecialTowerId;
  name: string;
  role: string;
  goldCost: number;
  resourceLabel: string;
  statusLabel: string;
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

export type GrowthPointerHit =
  | { kind: "slot"; slotId: string }
  | { kind: "action"; index: number }
  | { kind: "transform_option"; index: number }
  | { kind: "transform_close" }
  | { kind: "trait_option"; index: number }
  | { kind: "result_restart" }
  | { kind: "none" };

export function formatGrowthShortfall(resource: GrowthResource, current: number, cost: number): string {
  const label = resource === "wood" ? "木材" : "金币";
  return "还差 " + Math.max(1, Math.ceil(cost - current)) + " " + label;
}

function resourceLabel(resource: GrowthResource): string {
  return resource === "wood" ? "木材" : "金币";
}

function statusLabel(kind: GrowthActionView["kind"], affordable: boolean, cost: number | null, resource: GrowthResource): string {
  if (cost === null) return "已满级";
  if (!affordable) return resourceLabel(resource) + "不足";
  return kind === "build" ? "可建造" : "可升级";
}

function pointInBounds(x: number, y: number, bounds: LogicalBounds): boolean {
  return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
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

export function formatGrowthTraitEffect(content: BuildingGrowthContent, traitId: GrowthTraitId, nextStacks = 1): string {
  return formatGrowthTraitEffectAtStacks(content, traitId, nextStacks);
}

function formatGrowthNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatGrowthPercent(value: number): string {
  return formatGrowthNumber(value * 100) + "%";
}

export function formatGrowthTraitEffectAtStacks(content: BuildingGrowthContent, traitId: GrowthTraitId, nextStacks: number): string {
  const definition = getGrowthTraitDefinition(content, traitId);
  if (!definition) return "当前建筑专属效果";
  const stacks = Math.max(1, nextStacks);
  const effect = definition.effect;
  switch (effect.kind) {
    case "tower_damage_percent":
      return "该塔伤害累计 +" + formatGrowthPercent(effect.amount * stacks);
    case "tower_attack_speed_percent":
      return "该塔攻击速度累计 +" + formatGrowthPercent(effect.amount * stacks);
    case "tower_range_percent":
      return "该塔射程累计 +" + formatGrowthPercent(effect.amount * stacks);
    case "tower_elite_damage_percent":
      return "该塔对精英和 Boss 伤害累计 +" + formatGrowthPercent(effect.amount * stacks);
    case "tower_wall_damage_percent":
      return "敌人贴墙时，该塔伤害累计 +" + formatGrowthPercent(effect.amount * stacks);
    case "tower_finisher_damage_percent":
      return "目标低于 " + formatGrowthPercent(effect.healthThreshold) + " 时，该塔伤害累计 +" + formatGrowthPercent(effect.amount * stacks);
    case "tower_penetration":
      return "穿透目标 +" + effect.extraTargets * stacks + "；后续目标承受本次伤害的 " + formatGrowthPercent(effect.carryMultiplier);
    case "tower_splash_radius_percent":
      return "爆炸半径累计 +" + formatGrowthPercent(effect.amount * stacks);
    case "tower_burn":
      return "命中使目标燃烧 " + formatGrowthNumber(effect.durationSeconds) + " 秒；燃烧伤害倍率 ×" + formatGrowthNumber(Math.pow(effect.stackMultiplier, stacks - 1));
    case "tower_slow_depth":
      return "减速持续时间累计 +" + formatGrowthNumber(effect.durationSeconds * stacks) + " 秒；减速倍率额外降低 " + formatGrowthNumber(effect.extraSlowMultiplier * stacks);
    case "tower_vulnerability_percent":
      return "该塔对正被自己减速的目标伤害累计 +" + formatGrowthPercent(effect.amount * stacks);
    case "tower_chain":
      return "弹射目标 +" + effect.extraTargets * stacks;
    case "lumber_output_percent":
      return "该木材厂产量累计 +" + formatGrowthPercent(effect.amount * stacks);
    case "lumber_flat_income":
      return "该木材厂固定产量累计 +" + formatGrowthNumber(effect.amountPerSecond * stacks) + "/秒";
    case "lumber_upgrade_discount":
      return "后续升级木材费累计 -" + formatGrowthPercent(Math.min(effect.cap, effect.amount * stacks)) + "（上限 " + formatGrowthPercent(effect.cap) + "）";
    case "lumber_wave_stockpile":
      return "每次新波开始，该木材厂提供木材 " + formatGrowthNumber(effect.amount * stacks);
  }
}

function makeBuildAction(content: BuildingGrowthContent, state: GameState, slotId: string, definitionId: BuildableGrowthId): GrowthActionView {
  const definition = getGrowthBuildingDefinition(content, definitionId);
  if (!definition) {
    return {
      kind: "build",
      label: "建造项不可用",
      definitionId,
      cost: null,
      resource: "wood",
      resourceLabel: resourceLabel("wood"),
      description: "成长内容缺失",
      statusLabel: "暂无合法目标",
      affordable: false,
      reason: "暂无合法目标",
      command: null,
    };
  }
  const affordable = state.wood >= definition.buildCost;
  return {
    kind: "build",
    label: "建造" + definition.displayName + "｜木材 " + definition.buildCost,
    definitionId,
    cost: definition.buildCost,
    resource: "wood",
    resourceLabel: resourceLabel("wood"),
    description: definition.role,
    statusLabel: statusLabel("build", affordable, definition.buildCost, "wood"),
    affordable,
    reason: affordable ? "可建造" : formatGrowthShortfall("wood", state.wood, definition.buildCost),
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
  const isLumberyard = building.kind === "lumberyard";
  if ((isLumberyard && !definition) || (!isLumberyard && !towerDefinition)) return null;
  const maxLevelDefinition = definition ?? getGrowthBuildingDefinition(content, "arrow_tower");
  if (!maxLevelDefinition) return null;
  const maxLevel = maxLevelDefinition.maxLevel;
  const current = getStats(content, building);
  const next = building.level < maxLevel ? getStats(content, cloneAtLevel(building, building.level + 1)) : null;
  const discount = getGrowthLumberyardUpgradeDiscount(content, building);
  const cost = getGrowthUpgradeCost(content, building.growthDefinitionId, building.level, discount);
  const affordable = cost !== null && state.wood >= cost;
  const upgradeReason = cost === null ? "已满级" : affordable ? "可升级" : formatGrowthShortfall("wood", state.wood, cost);
  const transformCosts = content.transformations.filter((route) => route.from === "arrow_tower").map((route) => route.goldCost);
  const transformCost = transformCosts.length > 0 ? Math.min(...transformCosts) : null;
  const transformCostLabel = transformCosts.length > 0 ? [...new Set(transformCosts)].sort((left, right) => left - right).join("/") : null;
  const transformAffordable = transformCost !== null && state.gold >= transformCost;
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
    name: isLumberyard ? definition!.displayName : definition?.displayName ?? towerDefinition!.displayName,
    role: isLumberyard ? definition!.role : definition?.role ?? towerDefinition!.role,
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
      resourceLabel: resourceLabel("wood"),
      description: "升级当前建筑",
      statusLabel: statusLabel("upgrade", cost !== null && affordable, cost, "wood"),
      affordable: cost !== null && affordable,
      reason: upgradeReason,
      command: cost === null ? null : { type: "upgrade_building", buildingId: building.id },
    },
    traits,
    canTransform: building.growthDefinitionId === "arrow_tower" && transformCostLabel !== null,
    transformCostLabel,
    transformCost,
    transformResourceLabel: resourceLabel("gold"),
    transformStatusLabel: transformCost === null ? "暂无合法目标" : transformAffordable ? "可改造" : "金币不足",
    transformAffordable,
    transformReason: transformCost === null ? "暂无合法目标" : transformAffordable ? "打开四路改造选择" : formatGrowthShortfall("gold", state.gold, transformCost),
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
      resourceLabel: resourceLabel("gold"),
      statusLabel: affordable ? "可改造" : "金币不足",
      affordable,
      reason: affordable ? "可改造" : formatGrowthShortfall("gold", state.gold, route.goldCost),
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
      effectText: formatGrowthTraitEffect(content, traitId, currentStacks + 1),
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

export function hitGrowthPointer(x: number, y: number): GrowthPointerHit {
  if (pointInBounds(x, y, GROWTH_TRANSFORM_CLOSE_BOUNDS)) return { kind: "transform_close" };
  const transformIndex = GROWTH_TRANSFORM_OPTION_BOUNDS.findIndex((bounds) => pointInBounds(x, y, bounds));
  if (transformIndex >= 0) return { kind: "transform_option", index: transformIndex };
  const actionIndex = GROWTH_CONTEXT_ACTION_BOUNDS.findIndex((bounds) => pointInBounds(x, y, bounds));
  if (actionIndex >= 0) return { kind: "action", index: actionIndex };
  const slot = CAMP_SLOT_LAYOUTS.find((candidate) => pointInBounds(x, y, candidate));
  if (slot) return { kind: "slot", slotId: slot.id };
  return { kind: "none" };
}

function pointerPriority(kind: GrowthPointerHit["kind"]): GrowthInputPriority {
  if (kind === "result_restart") return "result";
  if (kind === "trait_option") return "trait_draft";
  if (kind === "transform_option" || kind === "transform_close") return "transform";
  if (kind === "slot" || kind === "action") return "building";
  return "none";
}

export function decideGrowthPointer(priority: GrowthInputPriority, hit: GrowthPointerHit): { kind: "dispatch"; hit: GrowthPointerHit } | { kind: "blocked"; reason: string } {
  const required = pointerPriority(hit.kind);
  if (required === priority && required !== "none") return { kind: "dispatch", hit };
  if (priority === "result") return { kind: "blocked", reason: "结算中，其他操作已锁定" };
  if (priority === "system_pause") return { kind: "blocked", reason: "系统暂停中，输入已锁定" };
  if (priority === "trait_draft") return { kind: "blocked", reason: "请先完成当前建筑词条选择" };
  if (priority === "transform") return { kind: "blocked", reason: "改造面板打开时只能操作改造面板" };
  if (priority === "building" && required !== "building") return { kind: "blocked", reason: "当前操作层未开启" };
  return { kind: "blocked", reason: "当前状态不可操作" };
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
