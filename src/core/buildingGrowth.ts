export type GrowthTowerId = "arrow_tower" | "machine_gun" | "cannon" | "frost" | "electric";
export type GrowthBuildingId = GrowthTowerId | "lumberyard";
export type GrowthSpecialTowerId = Exclude<GrowthTowerId, "arrow_tower">;
export type GrowthTraitId =
  | "tower_damage"
  | "tower_attack_speed"
  | "tower_range"
  | "tower_elite_damage"
  | "tower_wall_guard"
  | "tower_finisher"
  | "machine_penetration"
  | "machine_hunter"
  | "cannon_blast"
  | "cannon_burn"
  | "frost_deep"
  | "frost_vulnerability"
  | "electric_chain"
  | "electric_overload"
  | "lumber_output"
  | "lumber_flat"
  | "lumber_upgrade_discount"
  | "lumber_wave_stockpile";

export type GrowthAttackType = "single" | "splash" | "slow" | "chain";

export interface GrowthBuildingDefinition {
  id: GrowthBuildingId;
  displayName: string;
  kind: "tower" | "lumberyard";
  buildable: boolean;
  buildCost: number;
  upgradeCosts: readonly [number, number, number, number];
  maxLevel: 5;
  baseProductionPerSecond?: readonly [number, number, number, number, number];
}

export interface GrowthTowerDefinition {
  id: GrowthTowerId;
  displayName: string;
  role: string;
  baseDamage: number;
  baseAttackIntervalSeconds: number;
  range: number;
  attackType: GrowthAttackType;
  splashRadius?: number;
  splashDamageMultiplier?: number;
  slowMultiplier?: number;
  slowDurationSeconds?: number;
  chainTargets?: number;
  chainDamageMultiplier?: number;
  levelDamageMultiplier: 0.2;
  levelAttackSpeedMultiplier: 0.1;
}

export interface GrowthTransformationRoute {
  from: "arrow_tower";
  to: GrowthSpecialTowerId;
  goldCost: 10;
}

export type GrowthTraitSource = "common" | "lumberyard" | GrowthSpecialTowerId;
export type GrowthTraitPool = "common_tower" | "special_tower" | "lumberyard";

export type GrowthTraitEffect =
  | { kind: "tower_damage_percent"; amount: 0.12 }
  | { kind: "tower_attack_speed_percent"; amount: 0.15 }
  | { kind: "tower_range_percent"; amount: 0.1 }
  | { kind: "tower_elite_damage_percent"; amount: 0.25 }
  | { kind: "tower_wall_damage_percent"; amount: 0.2 }
  | { kind: "tower_finisher_damage_percent"; amount: 0.2; healthThreshold: 0.3 }
  | { kind: "tower_penetration"; extraTargets: 1; carryMultiplier: 0.7 }
  | { kind: "tower_elite_damage_percent"; amount: 0.3 }
  | { kind: "tower_splash_radius_percent"; amount: 0.2 }
  | { kind: "tower_burn"; durationSeconds: 3; damagePercent: 0.2 }
  | { kind: "tower_slow_depth"; durationSeconds: 0.5; extraSlowMultiplier: 0.05 }
  | { kind: "tower_vulnerability_percent"; amount: 0.25 }
  | { kind: "tower_chain"; extraTargets: 1 }
  | { kind: "lumber_output_percent"; amount: 0.25 }
  | { kind: "lumber_flat_income"; amountPerSecond: 0.4 }
  | { kind: "lumber_upgrade_discount"; amount: 0.15; cap: 0.35 }
  | { kind: "lumber_wave_stockpile"; amount: 5 };

export interface GrowthTraitDefinition {
  id: GrowthTraitId;
  displayName: string;
  role: string;
  pool: GrowthTraitPool;
  source: GrowthTraitSource;
  repeatable: boolean;
  effect: GrowthTraitEffect;
}

export interface GrowthTraitPlacement {
  pool: GrowthTraitPool;
  source: GrowthTraitSource;
}

export interface BuildingGrowthContent {
  buildings: readonly GrowthBuildingDefinition[];
  towers: readonly GrowthTowerDefinition[];
  transformations: readonly GrowthTransformationRoute[];
  traits: readonly GrowthTraitDefinition[];
}

const GROWTH_BUILDINGS: readonly GrowthBuildingDefinition[] = [
  {
    id: "arrow_tower",
    displayName: "箭塔",
    kind: "tower",
    buildable: true,
    buildCost: 40,
    upgradeCosts: [50, 70, 100, 140],
    maxLevel: 5,
  },
  {
    id: "lumberyard",
    displayName: "木材厂",
    kind: "lumberyard",
    buildable: true,
    buildCost: 60,
    upgradeCosts: [70, 100, 145, 205],
    maxLevel: 5,
    baseProductionPerSecond: [1, 1.6, 2.4, 3.4, 4.6],
  },
];

const GROWTH_TOWERS: readonly GrowthTowerDefinition[] = [
  { id: "arrow_tower", displayName: "箭塔", role: "基础单体防御", baseDamage: 7, baseAttackIntervalSeconds: 1, range: 0.6, attackType: "single", levelDamageMultiplier: 0.2, levelAttackSpeedMultiplier: 0.1 },
  { id: "machine_gun", displayName: "机枪塔", role: "快速单体输出", baseDamage: 12, baseAttackIntervalSeconds: 0.75, range: 0.6, attackType: "single", levelDamageMultiplier: 0.2, levelAttackSpeedMultiplier: 0.1 },
  { id: "cannon", displayName: "炮塔", role: "范围清怪", baseDamage: 35, baseAttackIntervalSeconds: 2.1, range: 0.65, attackType: "splash", splashRadius: 0.18, splashDamageMultiplier: 0.45, levelDamageMultiplier: 0.2, levelAttackSpeedMultiplier: 0.1 },
  { id: "frost", displayName: "冰冻塔", role: "减速控制", baseDamage: 4, baseAttackIntervalSeconds: 1, range: 0.65, attackType: "slow", slowMultiplier: 0.52, slowDurationSeconds: 1.4, levelDamageMultiplier: 0.2, levelAttackSpeedMultiplier: 0.1 },
  { id: "electric", displayName: "电磁塔", role: "链式压制", baseDamage: 12, baseAttackIntervalSeconds: 1.4, range: 0.62, attackType: "chain", chainTargets: 3, chainDamageMultiplier: 0.55, levelDamageMultiplier: 0.2, levelAttackSpeedMultiplier: 0.1 },
];

const COMMON_TOWER_TRAITS: readonly GrowthTraitDefinition[] = [
  { id: "tower_damage", displayName: "猛攻", role: "该塔伤害 +12%", pool: "common_tower", source: "common", repeatable: true, effect: { kind: "tower_damage_percent", amount: 0.12 } },
  { id: "tower_attack_speed", displayName: "急射", role: "该塔攻击速度 +15%", pool: "common_tower", source: "common", repeatable: true, effect: { kind: "tower_attack_speed_percent", amount: 0.15 } },
  { id: "tower_range", displayName: "远射", role: "该塔射程 +10%", pool: "common_tower", source: "common", repeatable: true, effect: { kind: "tower_range_percent", amount: 0.1 } },
  { id: "tower_elite_damage", displayName: "聚能", role: "该塔对精英和 Boss 伤害 +25%", pool: "common_tower", source: "common", repeatable: true, effect: { kind: "tower_elite_damage_percent", amount: 0.25 } },
  { id: "tower_wall_guard", displayName: "守线", role: "敌人贴墙时，该塔对其伤害 +20%", pool: "common_tower", source: "common", repeatable: true, effect: { kind: "tower_wall_damage_percent", amount: 0.2 } },
  { id: "tower_finisher", displayName: "收割", role: "目标生命低于 30% 时，该塔伤害 +20%", pool: "common_tower", source: "common", repeatable: true, effect: { kind: "tower_finisher_damage_percent", amount: 0.2, healthThreshold: 0.3 } },
];

const SPECIAL_TOWER_TRAITS: readonly GrowthTraitDefinition[] = [
  { id: "machine_penetration", displayName: "穿透弹", role: "穿透目标 +1；后续目标承受本次伤害的 70%", pool: "special_tower", source: "machine_gun", repeatable: true, effect: { kind: "tower_penetration", extraTargets: 1, carryMultiplier: 0.7 } },
  { id: "machine_hunter", displayName: "猎杀", role: "对精英和 Boss 额外伤害 +30%", pool: "special_tower", source: "machine_gun", repeatable: true, effect: { kind: "tower_elite_damage_percent", amount: 0.3 } },
  { id: "cannon_blast", displayName: "扩爆", role: "爆炸半径 +20%", pool: "special_tower", source: "cannon", repeatable: true, effect: { kind: "tower_splash_radius_percent", amount: 0.2 } },
  { id: "cannon_burn", displayName: "燃烧", role: "命中使目标燃烧 3 秒", pool: "special_tower", source: "cannon", repeatable: true, effect: { kind: "tower_burn", durationSeconds: 3, damagePercent: 0.2 } },
  { id: "frost_deep", displayName: "深寒", role: "减速持续时间 +0.5 秒，减速倍率额外降低 0.05", pool: "special_tower", source: "frost", repeatable: true, effect: { kind: "tower_slow_depth", durationSeconds: 0.5, extraSlowMultiplier: 0.05 } },
  { id: "frost_vulnerability", displayName: "冰霜标记", role: "该塔对正被自己减速的目标伤害 +25%", pool: "special_tower", source: "frost", repeatable: true, effect: { kind: "tower_vulnerability_percent", amount: 0.25 } },
  { id: "electric_chain", displayName: "弹射", role: "该塔弹射目标 +1", pool: "special_tower", source: "electric", repeatable: true, effect: { kind: "tower_chain", extraTargets: 1 } },
  { id: "electric_overload", displayName: "过载", role: "该塔对精英和 Boss 伤害 +30%", pool: "special_tower", source: "electric", repeatable: true, effect: { kind: "tower_elite_damage_percent", amount: 0.3 } },
];

const LUMBERYARD_TRAITS: readonly GrowthTraitDefinition[] = [
  { id: "lumber_output", displayName: "精细采伐", role: "该木材厂产量 +25%", pool: "lumberyard", source: "lumberyard", repeatable: true, effect: { kind: "lumber_output_percent", amount: 0.25 } },
  { id: "lumber_flat", displayName: "双班制", role: "该木材厂固定产量 +0.4 / 秒", pool: "lumberyard", source: "lumberyard", repeatable: true, effect: { kind: "lumber_flat_income", amountPerSecond: 0.4 } },
  { id: "lumber_upgrade_discount", displayName: "工具维护", role: "该木材厂后续升级木材费 -15%", pool: "lumberyard", source: "lumberyard", repeatable: true, effect: { kind: "lumber_upgrade_discount", amount: 0.15, cap: 0.35 } },
  { id: "lumber_wave_stockpile", displayName: "波次储备", role: "每次新波开始时，该木材厂提供木材 5", pool: "lumberyard", source: "lumberyard", repeatable: true, effect: { kind: "lumber_wave_stockpile", amount: 5 } },
];

export const starterBuildingGrowthContent: BuildingGrowthContent = {
  buildings: GROWTH_BUILDINGS,
  towers: GROWTH_TOWERS,
  transformations: [
    { from: "arrow_tower", to: "machine_gun", goldCost: 10 },
    { from: "arrow_tower", to: "cannon", goldCost: 10 },
    { from: "arrow_tower", to: "frost", goldCost: 10 },
    { from: "arrow_tower", to: "electric", goldCost: 10 },
  ],
  traits: [...COMMON_TOWER_TRAITS, ...SPECIAL_TOWER_TRAITS, ...LUMBERYARD_TRAITS],
};

export const EXPECTED_GROWTH_TRAIT_PLACEMENTS: Readonly<Record<GrowthTraitId, GrowthTraitPlacement>> = {
  tower_damage: { pool: "common_tower", source: "common" },
  tower_attack_speed: { pool: "common_tower", source: "common" },
  tower_range: { pool: "common_tower", source: "common" },
  tower_elite_damage: { pool: "common_tower", source: "common" },
  tower_wall_guard: { pool: "common_tower", source: "common" },
  tower_finisher: { pool: "common_tower", source: "common" },
  machine_penetration: { pool: "special_tower", source: "machine_gun" },
  machine_hunter: { pool: "special_tower", source: "machine_gun" },
  cannon_blast: { pool: "special_tower", source: "cannon" },
  cannon_burn: { pool: "special_tower", source: "cannon" },
  frost_deep: { pool: "special_tower", source: "frost" },
  frost_vulnerability: { pool: "special_tower", source: "frost" },
  electric_chain: { pool: "special_tower", source: "electric" },
  electric_overload: { pool: "special_tower", source: "electric" },
  lumber_output: { pool: "lumberyard", source: "lumberyard" },
  lumber_flat: { pool: "lumberyard", source: "lumberyard" },
  lumber_upgrade_discount: { pool: "lumberyard", source: "lumberyard" },
  lumber_wave_stockpile: { pool: "lumberyard", source: "lumberyard" },
};

export function getGrowthBuildingDefinition(content: BuildingGrowthContent, id: GrowthBuildingId): GrowthBuildingDefinition | undefined {
  return content.buildings.find((definition) => definition.id === id);
}

export function getGrowthTowerDefinition(content: BuildingGrowthContent, id: GrowthTowerId): GrowthTowerDefinition | undefined {
  return content.towers.find((definition) => definition.id === id);
}

export function getGrowthTraitDefinition(content: BuildingGrowthContent, id: GrowthTraitId): GrowthTraitDefinition | undefined {
  return content.traits.find((definition) => definition.id === id);
}

export function getUpgradeWoodCost(content: BuildingGrowthContent, buildingId: GrowthBuildingId, currentLevel: number): number | null {
  const costDefinitionId = buildingId === "lumberyard" ? "lumberyard" : "arrow_tower";
  const definition = getGrowthBuildingDefinition(content, costDefinitionId);
  if (!definition || !Number.isInteger(currentLevel) || currentLevel < 1 || currentLevel >= definition.maxLevel) return null;
  return definition.upgradeCosts[currentLevel - 1] ?? null;
}

export function getGrowthUpgradeCost(content: BuildingGrowthContent, buildingId: GrowthBuildingId, currentLevel: number, discount = 0): number | null {
  const baseCost = getUpgradeWoodCost(content, buildingId, currentLevel);
  if (baseCost === null) return null;
  const boundedDiscount = Math.max(0, Math.min(0.35, discount));
  return Math.round(baseCost * (1 - boundedDiscount));
}

export function getTraitCandidates(content: BuildingGrowthContent, buildingId: GrowthBuildingId): readonly GrowthTraitDefinition[] {
  const definition = getGrowthBuildingDefinition(content, buildingId);
  if (buildingId === "lumberyard" || definition?.kind === "lumberyard") return content.traits.filter((trait) => trait.pool === "lumberyard");
  if (buildingId === "arrow_tower") return content.traits.filter((trait) => trait.pool === "common_tower");
  if (!definition && !["machine_gun", "cannon", "frost", "electric"].includes(buildingId)) return [];
  return content.traits.filter((trait) => trait.pool === "common_tower" || trait.source === buildingId);
}

export function selectTraitOptions(
  content: BuildingGrowthContent,
  buildingId: GrowthBuildingId,
  nextRandomInt: (maxExclusive: number) => number,
): readonly [GrowthTraitId, GrowthTraitId, GrowthTraitId] | null {
  const candidates = [...getTraitCandidates(content, buildingId)];
  if (candidates.length < 3) return null;
  const selected: GrowthTraitDefinition[] = [];
  const specialCandidates = candidates.filter((trait) => trait.pool === "special_tower");
  if (buildingId !== "arrow_tower" && buildingId !== "lumberyard" && specialCandidates.length > 0) {
    selected.push(specialCandidates[nextRandomInt(specialCandidates.length)]!);
  }
  while (selected.length < 3) {
    const remaining = candidates.filter((candidate) => !selected.some((trait) => trait.id === candidate.id));
    selected.push(remaining[nextRandomInt(remaining.length)]!);
  }
  return [selected[0]!.id, selected[1]!.id, selected[2]!.id];
}

export function validateBuildingGrowthContent(content: BuildingGrowthContent): void {
  const assertUnique = (ids: readonly string[], label: string): void => {
    if (new Set(ids).size !== ids.length) throw new Error("Growth " + label + " must have unique IDs.");
  };
  const expectedBuildableKinds = { arrow_tower: "tower", lumberyard: "lumberyard" } as const;
  const expectedBuildableIds = new Set(Object.keys(expectedBuildableKinds));
  if (content.buildings.length !== expectedBuildableIds.size || content.buildings.some((definition) => !definition.buildable || !expectedBuildableIds.has(definition.id) || expectedBuildableKinds[definition.id as keyof typeof expectedBuildableKinds] !== definition.kind)) {
    throw new Error("Growth content must contain exactly the arrow_tower and lumberyard buildable definitions.");
  }
  assertUnique(content.buildings.map((definition) => definition.id), "building definitions");
  assertUnique(content.towers.map((definition) => definition.id), "tower definitions");
  assertUnique(content.traits.map((definition) => definition.id), "trait definitions");
  assertUnique(content.transformations.map((route) => route.to), "transformation routes");
  for (const definition of content.buildings) {
    if (!definition.buildable || definition.maxLevel !== 5 || definition.buildCost <= 0 || definition.upgradeCosts.length !== 4 || definition.upgradeCosts.some((cost) => cost <= 0)) {
      throw new Error("Growth building " + definition.id + " has invalid build or upgrade costs.");
    }
    if (definition.kind === "lumberyard" && definition.baseProductionPerSecond?.length !== 5) throw new Error("Lumberyard growth production table must contain five levels.");
    if (definition.kind === "tower" && definition.baseProductionPerSecond !== undefined) throw new Error("Tower growth definitions cannot contain lumber production.");
  }
  const ids = new Set(content.towers.map((definition) => definition.id));
  if ((["arrow_tower", "machine_gun", "cannon", "frost", "electric"] as const).some((id) => !ids.has(id))) throw new Error("Growth tower content is incomplete.");
  for (const tower of content.towers) {
    if (!tower.displayName.trim() || !tower.role.trim() || tower.baseDamage <= 0 || tower.baseAttackIntervalSeconds <= 0 || tower.range <= 0 || tower.levelDamageMultiplier !== 0.2 || tower.levelAttackSpeedMultiplier !== 0.1) {
      throw new Error("Growth tower " + tower.id + " has invalid base attributes.");
    }
    if (tower.attackType === "splash" && (tower.splashDamageMultiplier === undefined || tower.splashDamageMultiplier <= 0 || tower.chainDamageMultiplier !== undefined)) throw new Error("Growth splash tower " + tower.id + " has invalid secondary damage content.");
    if (tower.attackType === "chain" && (tower.chainDamageMultiplier === undefined || tower.chainDamageMultiplier <= 0 || tower.splashDamageMultiplier !== undefined)) throw new Error("Growth chain tower " + tower.id + " has invalid secondary damage content.");
    if (tower.attackType !== "splash" && tower.attackType !== "chain" && (tower.splashDamageMultiplier !== undefined || tower.chainDamageMultiplier !== undefined)) throw new Error("Growth tower " + tower.id + " has unexpected secondary damage content.");
  }
  if (content.transformations.length !== 4 || content.transformations.some((route) => route.from !== "arrow_tower" || route.goldCost !== 10 || !ids.has(route.to))) throw new Error("Growth transformations must expose four ten-gold arrow tower routes.");
  const traitIds = new Set(content.traits.map((trait) => trait.id));
  const expectedTraitIds = Object.keys(EXPECTED_GROWTH_TRAIT_PLACEMENTS) as GrowthTraitId[];
  if (traitIds.size !== expectedTraitIds.length || expectedTraitIds.some((id) => !traitIds.has(id))) throw new Error("Growth trait content is incomplete.");
  for (const trait of content.traits) {
    const expectedPlacement = EXPECTED_GROWTH_TRAIT_PLACEMENTS[trait.id];
    if (!expectedPlacement || !trait.displayName.trim() || !trait.role.trim() || trait.pool !== expectedPlacement.pool || trait.source !== expectedPlacement.source) {
      throw new Error("Growth trait " + trait.id + " has an invalid pool or visible content.");
    }
  }
  if (getTraitCandidates(content, "arrow_tower").length < 3 || getTraitCandidates(content, "lumberyard").length < 3) throw new Error("Growth basic trait pools must contain three distinct options.");
  for (const towerId of ["machine_gun", "cannon", "frost", "electric"] as const) {
    const candidates = getTraitCandidates(content, towerId);
    if (candidates.filter((trait) => trait.source === towerId).length < 1 || candidates.length < 3) throw new Error("Growth special tower " + towerId + " must have a guaranteed exclusive trait option.");
  }
}

validateBuildingGrowthContent(starterBuildingGrowthContent);
