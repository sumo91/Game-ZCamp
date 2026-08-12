import type { EnemyTier } from "./types";

export type TowerIconKey = "machine_gun" | "cannon" | "frost" | "electric";

export type EnemySignature =
  | { kind: "charger"; warningSeconds: number; chargeDistance: number; chargeDurationSeconds: number; initialCooldownSeconds: number; cooldownSeconds: number }
  | { kind: "overlord"; inspireDurationSeconds: number; inspireMultiplier: number; initialCooldownSeconds: number; cooldownSeconds: number };

export type EnemyBehavior =
  | "walker"
  | "runner"
  | "tank"
  | "splitter"
  | "screamer"
  | "volatile"
  | "armored"
  | "regenerator"
  | "burrower"
  | "brute"
  | "charger"
  | "summoner"
  | "fortress"
  | "overlord";

export interface TowerDefinition {
  id: string;
  displayName: string;
  role: string;
  iconKey: TowerIconKey;
  accentColor: string;
  buildCost: number;
  maxLevel: number;
  damage: number;
  attackIntervalSeconds: number;
  range: number;
  attackType: "single" | "splash" | "slow" | "chain";
  splashRadius?: number;
  slowMultiplier?: number;
  slowDurationSeconds?: number;
  chainTargets?: number;
}

export interface EnemyDefinition {
  id: string;
  displayName: string;
  role: string;
  tier: EnemyTier;
  behavior: EnemyBehavior;
  maxHp: number;
  moveSpeed: number;
  wallDamage: number;
  wallAttackIntervalSeconds: number;
  goldReward: number;
  xpReward: number;
  damageMultiplier?: number;
  regenPerSecond?: number;
  untargetableUntil?: number;
  splitInto?: { enemyId: string; count: number };
  onDeathWallDamage?: number;
  isFinalBoss?: boolean;
  signature?: EnemySignature;
}

export interface SpawnEvent {
  atSeconds: number;
  enemyId: string;
}

export interface WaveDefinition {
  wave: number;
  startSeconds: number;
  spawnEvents: SpawnEvent[];
}

export type CardCategory = "base" | "permanent" | "tactical";
export type BaseTargetKind = "tower" | "lumberyard" | "repair_shop";

export type CardEffect =
  | { kind: "base"; targetKind: BaseTargetKind; definitionId: string }
  | { kind: "tower_penetration"; towerId: string; amount: number }
  | { kind: "tower_boss_damage"; towerId: string; amount: number }
  | { kind: "tower_blast_radius"; towerId: string; amount: number }
  | { kind: "tower_burn"; towerId: string; damagePerSecond: number; durationSeconds: number }
  | { kind: "tower_slow"; towerId: string; slowMultiplier: number; durationSeconds: number }
  | { kind: "tower_vulnerability"; towerId: string; amount: number }
  | { kind: "tower_chain"; towerId: string; extraTargets: number }
  | { kind: "tower_overload"; towerId: string; amount: number }
  | { kind: "wood_income"; amountPerSecond: number }
  | { kind: "wall_reinforcement"; amount: number }
  | { kind: "repair_mastery"; amount: number }
  | { kind: "tower_synergy"; amount: number }
  | { kind: "wall_shield"; amount: number; durationSeconds: number }
  | { kind: "global_freeze"; durationSeconds: number }
  | { kind: "focus_fire"; durationSeconds: number; damageMultiplier: number }
  | { kind: "wood_drop"; amount: number };

export interface CardDefinition {
  id: string;
  displayName: string;
  role: string;
  category: CardCategory;
  cost: number;
  repeatable: boolean;
  maxApplications?: number;
  accentColor: string;
  effect: CardEffect;
}

export interface ContentCatalog {
  towers: TowerDefinition[];
  enemies: EnemyDefinition[];
  waves: WaveDefinition[];
  cards: CardDefinition[];
}

const towers: TowerDefinition[] = [
  {
    id: "machine_gun",
    displayName: "机枪塔",
    role: "快速单体输出",
    iconKey: "machine_gun",
    accentColor: "#F6C453",
    buildCost: 40,
    maxLevel: 3,
    damage: 12,
    attackIntervalSeconds: 0.75,
    range: 0.6,
    attackType: "single",
  },
  {
    id: "cannon",
    displayName: "炮塔",
    role: "范围清怪",
    iconKey: "cannon",
    accentColor: "#F07B28",
    buildCost: 65,
    maxLevel: 3,
    damage: 35,
    attackIntervalSeconds: 2.1,
    range: 0.65,
    attackType: "splash",
    splashRadius: 0.18,
  },
  {
    id: "frost",
    displayName: "冰冻塔",
    role: "减速控制",
    iconKey: "frost",
    accentColor: "#42D3F3",
    buildCost: 55,
    maxLevel: 3,
    damage: 4,
    attackIntervalSeconds: 1,
    range: 0.65,
    attackType: "slow",
    slowMultiplier: 0.52,
    slowDurationSeconds: 1.4,
  },
  {
    id: "electric",
    displayName: "电磁塔",
    role: "链式压制",
    iconKey: "electric",
    accentColor: "#D06CFF",
    buildCost: 85,
    maxLevel: 3,
    damage: 12,
    attackIntervalSeconds: 1.4,
    range: 0.62,
    attackType: "chain",
    chainTargets: 3,
  },
];

const enemies: EnemyDefinition[] = [
  { id: "walker", displayName: "行尸", role: "基础推进", tier: "normal", behavior: "walker", maxHp: 36, moveSpeed: 0.14, wallDamage: 5, wallAttackIntervalSeconds: 0.8, goldReward: 1, xpReward: 1 },
  { id: "runner", displayName: "疾行尸", role: "高速突破", tier: "normal", behavior: "runner", maxHp: 24, moveSpeed: 0.28, wallDamage: 4, wallAttackIntervalSeconds: 0.75, goldReward: 1, xpReward: 1 },
  { id: "tank", displayName: "重装尸", role: "高生命推进", tier: "normal", behavior: "tank", maxHp: 110, moveSpeed: 0.08, wallDamage: 12, wallAttackIntervalSeconds: 1, goldReward: 2, xpReward: 3 },
  { id: "armored", displayName: "装甲精英", role: "固定减伤推进", tier: "elite", behavior: "armored", maxHp: 90, moveSpeed: 0.1, wallDamage: 8, wallAttackIntervalSeconds: 0.9, goldReward: 6, xpReward: 3, damageMultiplier: 0.55 },
  { id: "brute", displayName: "攻城精英", role: "高额攻墙", tier: "elite", behavior: "brute", maxHp: 140, moveSpeed: 0.07, wallDamage: 18, wallAttackIntervalSeconds: 1.1, goldReward: 6, xpReward: 5 },
  { id: "charger_boss", displayName: "冲锋领主", role: "预警冲锋", tier: "boss", behavior: "charger", maxHp: 280, moveSpeed: 0.11, wallDamage: 28, wallAttackIntervalSeconds: 0.9, goldReward: 20, xpReward: 12, signature: { kind: "charger", warningSeconds: 2, chargeDistance: 0.55, chargeDurationSeconds: 0.8, initialCooldownSeconds: 5, cooldownSeconds: 8 } },
  { id: "overlord_boss", displayName: "尸潮君王", role: "鼓舞残余尸潮", tier: "boss", behavior: "overlord", maxHp: 720, moveSpeed: 0.07, wallDamage: 48, wallAttackIntervalSeconds: 1.1, goldReward: 0, xpReward: 24, isFinalBoss: true, signature: { kind: "overlord", inspireDurationSeconds: 4, inspireMultiplier: 1.25, initialCooldownSeconds: 3, cooldownSeconds: 8 } },
];
function createWave(
  wave: number,
  groups: Array<{ enemyId: string; count: number; intervalSeconds: number; startSeconds: number }>,
): WaveDefinition {
  const spawnEvents: SpawnEvent[] = [];
  for (const group of groups) {
    for (let index = 0; index < group.count; index += 1) {
      spawnEvents.push({ atSeconds: group.startSeconds + index * group.intervalSeconds, enemyId: group.enemyId });
    }
  }
  spawnEvents.sort((left, right) => left.atSeconds - right.atSeconds);
  return { wave, startSeconds: (wave - 1) * 60, spawnEvents };
}

const waves: WaveDefinition[] = [
  createWave(1, [
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 0 },
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 10 },
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 20 },
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 30 },
  ]),
  createWave(2, [
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 0 },
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 10 },
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 20 },
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 30 },
    { enemyId: "runner", count: 1, intervalSeconds: 1, startSeconds: 5 },
    { enemyId: "runner", count: 1, intervalSeconds: 1, startSeconds: 15 },
    { enemyId: "runner", count: 1, intervalSeconds: 1, startSeconds: 25 },
    { enemyId: "runner", count: 1, intervalSeconds: 1, startSeconds: 35 },
  ]),
  createWave(3, [
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 0 },
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 10 },
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 20 },
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 30 },
    { enemyId: "runner", count: 2, intervalSeconds: 1, startSeconds: 5 },
    { enemyId: "runner", count: 2, intervalSeconds: 1, startSeconds: 15 },
    { enemyId: "runner", count: 2, intervalSeconds: 1, startSeconds: 25 },
    { enemyId: "tank", count: 1, intervalSeconds: 1, startSeconds: 35 },
    { enemyId: "tank", count: 1, intervalSeconds: 1, startSeconds: 39 },
  ]),
  createWave(4, [
    { enemyId: "walker", count: 3, intervalSeconds: 1, startSeconds: 0 },
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 10 },
    { enemyId: "walker", count: 3, intervalSeconds: 1, startSeconds: 20 },
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 30 },
    { enemyId: "runner", count: 2, intervalSeconds: 1, startSeconds: 5 },
    { enemyId: "runner", count: 2, intervalSeconds: 1, startSeconds: 15 },
    { enemyId: "runner", count: 2, intervalSeconds: 1, startSeconds: 25 },
    { enemyId: "runner", count: 2, intervalSeconds: 1, startSeconds: 35 },
    { enemyId: "tank", count: 1, intervalSeconds: 1, startSeconds: 12 },
    { enemyId: "tank", count: 1, intervalSeconds: 1, startSeconds: 38 },
    { enemyId: "tank", count: 1, intervalSeconds: 1, startSeconds: 39 },
  ]),
  createWave(5, [
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 0 },
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 10 },
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 20 },
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 30 },
    { enemyId: "runner", count: 2, intervalSeconds: 1, startSeconds: 5 },
    { enemyId: "runner", count: 2, intervalSeconds: 1, startSeconds: 15 },
    { enemyId: "runner", count: 2, intervalSeconds: 1, startSeconds: 25 },
    { enemyId: "tank", count: 1, intervalSeconds: 1, startSeconds: 12 },
    { enemyId: "tank", count: 1, intervalSeconds: 1, startSeconds: 22 },
    { enemyId: "tank", count: 1, intervalSeconds: 1, startSeconds: 32 },
    { enemyId: "tank", count: 1, intervalSeconds: 1, startSeconds: 36 },
    { enemyId: "armored", count: 1, intervalSeconds: 1, startSeconds: 38 },
    { enemyId: "charger_boss", count: 1, intervalSeconds: 1, startSeconds: 39.5 },
  ]),
  createWave(6, [
    { enemyId: "walker", count: 3, intervalSeconds: 1, startSeconds: 0 },
    { enemyId: "walker", count: 3, intervalSeconds: 1, startSeconds: 10 },
    { enemyId: "walker", count: 3, intervalSeconds: 1, startSeconds: 20 },
    { enemyId: "walker", count: 3, intervalSeconds: 1, startSeconds: 30 },
    { enemyId: "runner", count: 2, intervalSeconds: 1, startSeconds: 5 },
    { enemyId: "runner", count: 3, intervalSeconds: 1, startSeconds: 15 },
    { enemyId: "runner", count: 2, intervalSeconds: 1, startSeconds: 25 },
    { enemyId: "runner", count: 3, intervalSeconds: 1, startSeconds: 35 },
    { enemyId: "tank", count: 1, intervalSeconds: 1, startSeconds: 12 },
    { enemyId: "tank", count: 1, intervalSeconds: 1, startSeconds: 22 },
    { enemyId: "tank", count: 1, intervalSeconds: 1, startSeconds: 32 },
    { enemyId: "tank", count: 2, intervalSeconds: 1, startSeconds: 37 },
  ]),
  createWave(7, [
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 0 },
    { enemyId: "walker", count: 3, intervalSeconds: 1, startSeconds: 10 },
    { enemyId: "walker", count: 2, intervalSeconds: 1, startSeconds: 20 },
    { enemyId: "walker", count: 3, intervalSeconds: 1, startSeconds: 30 },
    { enemyId: "runner", count: 2, intervalSeconds: 1, startSeconds: 5 },
    { enemyId: "runner", count: 2, intervalSeconds: 1, startSeconds: 15 },
    { enemyId: "runner", count: 2, intervalSeconds: 1, startSeconds: 25 },
    { enemyId: "runner", count: 2, intervalSeconds: 1, startSeconds: 35 },
    { enemyId: "tank", count: 1, intervalSeconds: 1, startSeconds: 12 },
    { enemyId: "tank", count: 2, intervalSeconds: 1, startSeconds: 22 },
    { enemyId: "tank", count: 1, intervalSeconds: 1, startSeconds: 32 },
    { enemyId: "tank", count: 2, intervalSeconds: 1, startSeconds: 36 },
    { enemyId: "armored", count: 1, intervalSeconds: 1, startSeconds: 38 },
    { enemyId: "armored", count: 1, intervalSeconds: 1, startSeconds: 39 },
  ]),
  createWave(8, [
    { enemyId: "walker", count: 3, intervalSeconds: 1, startSeconds: 0 },
    { enemyId: "walker", count: 3, intervalSeconds: 1, startSeconds: 10 },
    { enemyId: "walker", count: 3, intervalSeconds: 1, startSeconds: 20 },
    { enemyId: "walker", count: 3, intervalSeconds: 1, startSeconds: 30 },
    { enemyId: "runner", count: 3, intervalSeconds: 1, startSeconds: 5 },
    { enemyId: "runner", count: 3, intervalSeconds: 1, startSeconds: 15 },
    { enemyId: "runner", count: 3, intervalSeconds: 1, startSeconds: 25 },
    { enemyId: "runner", count: 3, intervalSeconds: 1, startSeconds: 35 },
    { enemyId: "tank", count: 1, intervalSeconds: 1, startSeconds: 12 },
    { enemyId: "tank", count: 2, intervalSeconds: 1, startSeconds: 22 },
    { enemyId: "tank", count: 1, intervalSeconds: 1, startSeconds: 32 },
    { enemyId: "tank", count: 2, intervalSeconds: 1, startSeconds: 36 },
    { enemyId: "brute", count: 1, intervalSeconds: 1, startSeconds: 39 },
  ]),
  createWave(9, [
    { enemyId: "walker", count: 4, intervalSeconds: 1, startSeconds: 0 },
    { enemyId: "walker", count: 3, intervalSeconds: 1, startSeconds: 10 },
    { enemyId: "walker", count: 4, intervalSeconds: 1, startSeconds: 20 },
    { enemyId: "walker", count: 3, intervalSeconds: 1, startSeconds: 30 },
    { enemyId: "runner", count: 3, intervalSeconds: 1, startSeconds: 5 },
    { enemyId: "runner", count: 3, intervalSeconds: 1, startSeconds: 15 },
    { enemyId: "runner", count: 3, intervalSeconds: 1, startSeconds: 25 },
    { enemyId: "runner", count: 3, intervalSeconds: 1, startSeconds: 35 },
    { enemyId: "tank", count: 2, intervalSeconds: 1, startSeconds: 12 },
    { enemyId: "tank", count: 2, intervalSeconds: 1, startSeconds: 22 },
    { enemyId: "tank", count: 2, intervalSeconds: 1, startSeconds: 32 },
    { enemyId: "tank", count: 2, intervalSeconds: 1, startSeconds: 36 },
    { enemyId: "armored", count: 1, intervalSeconds: 1, startSeconds: 38 },
    { enemyId: "brute", count: 1, intervalSeconds: 1, startSeconds: 39 },
  ]),
  createWave(10, [
    { enemyId: "walker", count: 3, intervalSeconds: 1, startSeconds: 0 },
    { enemyId: "walker", count: 3, intervalSeconds: 1, startSeconds: 10 },
    { enemyId: "walker", count: 3, intervalSeconds: 1, startSeconds: 20 },
    { enemyId: "walker", count: 3, intervalSeconds: 1, startSeconds: 30 },
    { enemyId: "runner", count: 2, intervalSeconds: 1, startSeconds: 5 },
    { enemyId: "runner", count: 3, intervalSeconds: 1, startSeconds: 15 },
    { enemyId: "runner", count: 2, intervalSeconds: 1, startSeconds: 25 },
    { enemyId: "runner", count: 3, intervalSeconds: 1, startSeconds: 35 },
    { enemyId: "tank", count: 2, intervalSeconds: 1, startSeconds: 12 },
    { enemyId: "tank", count: 2, intervalSeconds: 1, startSeconds: 22 },
    { enemyId: "tank", count: 3, intervalSeconds: 1, startSeconds: 32 },
    { enemyId: "tank", count: 3, intervalSeconds: 1, startSeconds: 36 },
    { enemyId: "armored", count: 1, intervalSeconds: 1, startSeconds: 37 },
    { enemyId: "brute", count: 1, intervalSeconds: 1, startSeconds: 39 },
    { enemyId: "overlord_boss", count: 1, intervalSeconds: 1, startSeconds: 39.5 },
  ]),
];
const cards: CardDefinition[] = [
  { id: "machine_gun", displayName: "机枪塔", role: "基地 · 快速单体输出", category: "base", cost: 40, repeatable: true, accentColor: "#F6C453", effect: { kind: "base", targetKind: "tower", definitionId: "machine_gun" } },
  { id: "cannon", displayName: "火炮塔", role: "基地 · 范围清怪", category: "base", cost: 65, repeatable: true, accentColor: "#F07B28", effect: { kind: "base", targetKind: "tower", definitionId: "cannon" } },
  { id: "frost", displayName: "冰冻塔", role: "基地 · 减速控制", category: "base", cost: 55, repeatable: true, accentColor: "#42D3F3", effect: { kind: "base", targetKind: "tower", definitionId: "frost" } },
  { id: "electric", displayName: "电磁塔", role: "基地 · 链式压制", category: "base", cost: 85, repeatable: true, accentColor: "#D06CFF", effect: { kind: "base", targetKind: "tower", definitionId: "electric" } },
  { id: "lumberyard", displayName: "伐木场", role: "基地 · 木材生产", category: "base", cost: 60, repeatable: true, accentColor: "#6FCE8B", effect: { kind: "base", targetKind: "lumberyard", definitionId: "lumberyard" } },
  { id: "repair_shop", displayName: "工程/修理", role: "基地 · 维修与护盾", category: "base", cost: 60, repeatable: true, accentColor: "#8FB5FF", effect: { kind: "base", targetKind: "repair_shop", definitionId: "repair_shop" } },

  { id: "machine_penetration", displayName: "机枪·穿透", role: "永久 · 子弹穿透 +1", category: "permanent", cost: 18, repeatable: false, maxApplications: 1, accentColor: "#F6C453", effect: { kind: "tower_penetration", towerId: "machine_gun", amount: 1 } },
  { id: "machine_boss_damage", displayName: "机枪·猎杀", role: "永久 · 对精英/Boss 增伤 35%", category: "permanent", cost: 18, repeatable: false, maxApplications: 1, accentColor: "#F6C453", effect: { kind: "tower_boss_damage", towerId: "machine_gun", amount: 0.35 } },
  { id: "cannon_blast", displayName: "火炮·扩爆", role: "永久 · 爆炸范围 +0.10", category: "permanent", cost: 18, repeatable: false, maxApplications: 1, accentColor: "#F07B28", effect: { kind: "tower_blast_radius", towerId: "cannon", amount: 0.1 } },
  { id: "cannon_burn", displayName: "火炮·燃烧", role: "永久 · 命中留下燃烧区域", category: "permanent", cost: 18, repeatable: false, maxApplications: 1, accentColor: "#F07B28", effect: { kind: "tower_burn", towerId: "cannon", damagePerSecond: 6, durationSeconds: 4 } },
  { id: "frost_slow", displayName: "冰冻·深寒", role: "永久 · 减速强化至 35%", category: "permanent", cost: 18, repeatable: false, maxApplications: 1, accentColor: "#42D3F3", effect: { kind: "tower_slow", towerId: "frost", slowMultiplier: 0.35, durationSeconds: 2.2 } },
  { id: "frost_vulnerability", displayName: "冰冻·易伤", role: "永久 · 冰冻目标受到 +25% 伤害", category: "permanent", cost: 18, repeatable: false, maxApplications: 1, accentColor: "#42D3F3", effect: { kind: "tower_vulnerability", towerId: "frost", amount: 0.25 } },
  { id: "electric_chain", displayName: "电磁·跳跃", role: "永久 · 额外跳跃目标 +1", category: "permanent", cost: 18, repeatable: false, maxApplications: 1, accentColor: "#D06CFF", effect: { kind: "tower_chain", towerId: "electric", extraTargets: 1 } },
  { id: "electric_overload", displayName: "电磁·过载", role: "永久 · 对精英/Boss 增伤 30%", category: "permanent", cost: 18, repeatable: false, maxApplications: 1, accentColor: "#D06CFF", effect: { kind: "tower_overload", towerId: "electric", amount: 0.3 } },
  { id: "wood_efficiency", displayName: "伐木效率", role: "全局发展 · 木材 +0.5/秒", category: "permanent", cost: 24, repeatable: true, maxApplications: 3, accentColor: "#F6C453", effect: { kind: "wood_income", amountPerSecond: 0.5 } },
  { id: "wall_reinforcement", displayName: "城墙强化", role: "全局发展 · 城墙上限 +20", category: "permanent", cost: 24, repeatable: true, maxApplications: 2, accentColor: "#F06A6A", effect: { kind: "wall_reinforcement", amount: 20 } },
  { id: "repair_mastery", displayName: "维修强化", role: "全局发展 · 维修量 +10", category: "permanent", cost: 24, repeatable: true, maxApplications: 3, accentColor: "#8FB5FF", effect: { kind: "repair_mastery", amount: 10 } },
  { id: "tower_synergy", displayName: "全塔协同", role: "全局发展 · 三种塔后全塔 +10% 伤害", category: "permanent", cost: 24, repeatable: false, maxApplications: 1, accentColor: "#C7A4FF", effect: { kind: "tower_synergy", amount: 0.1 } },

  { id: "wall_shield", displayName: "临时城墙护盾", role: "战术 · 立即获得护盾", category: "tactical", cost: 10, repeatable: true, accentColor: "#62D7E8", effect: { kind: "wall_shield", amount: 30, durationSeconds: 12 } },
  { id: "global_freeze", displayName: "全场短冻", role: "战术 · 敌停塔不停", category: "tactical", cost: 12, repeatable: true, accentColor: "#8CE8FF", effect: { kind: "global_freeze", durationSeconds: 5 } },
  { id: "focus_fire", displayName: "集中火力", role: "战术 · 标记目标并增伤 50%", category: "tactical", cost: 10, repeatable: true, accentColor: "#FFB45C", effect: { kind: "focus_fire", durationSeconds: 8, damageMultiplier: 0.5 } },
  { id: "wood_drop", displayName: "木材空投", role: "战术 · 紧急供给 +40", category: "tactical", cost: 8, repeatable: true, accentColor: "#6FCE8B", effect: { kind: "wood_drop", amount: 40 } },
];

export const FIRST_BATCH_CARD_IDS = [
  "machine_gun", "cannon", "lumberyard", "frost",
  "machine_gun", "electric", "repair_shop",
  "wood_efficiency", "wall_reinforcement", "machine_penetration",
  "wall_shield", "wood_drop",
] as const;;

export const SUPPLY_CATEGORY_PATTERN: CardCategory[] = [
  "base", "base", "permanent", "base", "tactical", "base",
  "permanent", "base", "tactical", "base", "permanent", "base",
];
export const starterCatalog: ContentCatalog = { towers, enemies, waves, cards };

export const EXPECTED_WAVE_COUNTS: Array<Record<string, number>> = [
  { walker: 8 },
  { walker: 8, runner: 4 },
  { walker: 8, runner: 6, tank: 2 },
  { walker: 10, runner: 8, tank: 3 },
  { walker: 8, runner: 6, tank: 4, armored: 1, charger_boss: 1 },
  { walker: 12, runner: 10, tank: 5 },
  { walker: 10, runner: 8, tank: 6, armored: 2 },
  { walker: 12, runner: 12, tank: 6, brute: 1 },
  { walker: 14, runner: 12, tank: 8, armored: 1, brute: 1 },
  { walker: 12, runner: 10, tank: 10, armored: 1, brute: 1, overlord_boss: 1 },
];

function assertUniqueIds(ids: string[], label: string): void {
  if (new Set(ids).size !== ids.length) {
    throw new Error(label + " contains duplicate ids.");
  }
}

export function validateCatalog(catalog: ContentCatalog): void {
  if (catalog.towers.length === 0 || catalog.enemies.length === 0 || catalog.waves.length === 0 || catalog.cards.length === 0) {
    throw new Error("Content catalog must contain towers, enemies, waves, and cards.");
  }

  assertUniqueIds(catalog.towers.map((item) => item.id), "Towers");
  assertUniqueIds(catalog.towers.map((item) => item.iconKey), "Tower icons");
  assertUniqueIds(catalog.enemies.map((item) => item.id), "Enemies");
  assertUniqueIds(catalog.waves.map((item) => String(item.wave)), "Waves");
  assertUniqueIds(catalog.cards.map((item) => item.id), "Cards");

  for (const tower of catalog.towers) {
    if (tower.buildCost < 0 || tower.maxLevel < 1 || !/^#[0-9A-Fa-f]{6}$/.test(tower.accentColor)) {
      throw new Error("Tower " + tower.id + " contains invalid card content.");
    }
  }

  if (catalog.waves.length !== 10) {
    throw new Error("Continuous timeline requires exactly 10 waves.");
  }

  const normalEnemies = catalog.enemies.filter((enemy) => enemy.tier === "normal");
  const eliteEnemies = catalog.enemies.filter((enemy) => enemy.tier === "elite");
  const bossEnemies = catalog.enemies.filter((enemy) => enemy.tier === "boss");
  if (normalEnemies.length !== 3 || eliteEnemies.length !== 2 || bossEnemies.length !== 2) {
    throw new Error("Enemy catalog must contain exactly 3 normal, 2 elite, and 2 boss definitions.");
  }
  const expectedEnemyIds = new Set(["walker", "runner", "tank", "armored", "brute", "charger_boss", "overlord_boss"]);
  if (catalog.enemies.some((enemy) => !expectedEnemyIds.has(enemy.id))) {
    throw new Error("Enemy catalog contains an out-of-scope enemy.");
  }
  for (const enemy of catalog.enemies) {
    if (enemy.maxHp <= 0 || enemy.moveSpeed < 0 || enemy.wallDamage < 0 || enemy.goldReward < 0) {
      throw new Error("Enemy " + enemy.id + " contains invalid combat values.");
    }
  }
  const expectedNormalBehaviors: Record<string, EnemyBehavior> = { walker: "walker", runner: "runner", tank: "tank" };
  if (normalEnemies.some((enemy) => expectedNormalBehaviors[enemy.id] !== enemy.behavior || enemy.damageMultiplier !== undefined || enemy.regenPerSecond !== undefined || enemy.untargetableUntil !== undefined || enemy.splitInto !== undefined || enemy.onDeathWallDamage !== undefined || enemy.isFinalBoss !== undefined || enemy.signature !== undefined)) {
    throw new Error("Normal enemies must keep their exact responsibilities and have no optional skills.");
  }
  if (catalog.enemies.some((enemy) => enemy.damageMultiplier !== undefined && enemy.id !== "armored")) {
    throw new Error("Only armored elite may use fixed damage reduction.");
  }
  if (catalog.enemies.find((enemy) => enemy.id === "armored")?.behavior !== "armored" || catalog.enemies.find((enemy) => enemy.id === "brute")?.behavior !== "brute") {
    throw new Error("Elite enemy signature mechanics are invalid.");
  }
  const charger = catalog.enemies.find((enemy) => enemy.id === "charger_boss");
  const overlord = catalog.enemies.find((enemy) => enemy.id === "overlord_boss");
  if (charger?.behavior !== "charger" || charger.signature?.kind !== "charger" || overlord?.behavior !== "overlord" || overlord.signature?.kind !== "overlord") {
    throw new Error("Boss signature mechanics are invalid.");
  }
  if (charger.signature.warningSeconds <= 0 || charger.signature.chargeDistance <= 0 || charger.signature.chargeDurationSeconds <= 0 || charger.signature.initialCooldownSeconds < 0 || charger.signature.cooldownSeconds <= 0 || overlord.signature.inspireDurationSeconds <= 0 || overlord.signature.inspireMultiplier < 1 || overlord.signature.initialCooldownSeconds < 0 || overlord.signature.cooldownSeconds <= 0) {
    throw new Error("Boss signature mechanic values are invalid.");
  }
  const expectedGoldRewards: Record<string, number> = { walker: 1, runner: 1, tank: 2, armored: 6, brute: 6, charger_boss: 20, overlord_boss: 0 };
  for (const enemy of catalog.enemies) {
    if (enemy.goldReward !== expectedGoldRewards[enemy.id]) {
      throw new Error("Enemy " + enemy.id + " has an invalid gold reward.");
    }
  }

  const finalBosses = catalog.enemies.filter((enemy) => enemy.isFinalBoss);
  if (finalBosses.length !== 1) {
    throw new Error("Content catalog must define exactly one final boss.");
  }

  for (const [index, wave] of catalog.waves.entries()) {
    const expectedWave = index + 1;
    if (wave.wave !== expectedWave || wave.startSeconds !== index * 60 || wave.spawnEvents.length === 0) {
      throw new Error("Wave " + expectedWave + " has an invalid fixed-timeline start.");
    }
    const expectedCounts = EXPECTED_WAVE_COUNTS[index]!;
    for (const spawnEvent of wave.spawnEvents) {
      if (!catalog.enemies.some((enemy) => enemy.id === spawnEvent.enemyId)) {
        throw new Error("Wave " + wave.wave + " references unknown enemy " + spawnEvent.enemyId + ".");
      }
    }
    const actualCounts = wave.spawnEvents.reduce((counts, event) => {
      counts[event.enemyId] = (counts[event.enemyId] ?? 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    if (Object.keys(expectedCounts).some((enemyId) => actualCounts[enemyId] !== expectedCounts[enemyId]) ||
      Object.keys(actualCounts).some((enemyId) => actualCounts[enemyId] !== expectedCounts[enemyId])) {
      throw new Error("Wave " + wave.wave + " does not match the formal ten-wave composition.");
    }
    let previousAtSeconds = -Infinity;
    for (const spawnEvent of wave.spawnEvents) {
      if (spawnEvent.atSeconds < 0 || spawnEvent.atSeconds > 40 || spawnEvent.atSeconds < previousAtSeconds) {
        throw new Error("Wave " + wave.wave + " contains an invalid spawn time.");
      }
      previousAtSeconds = spawnEvent.atSeconds;
    }
  }

  const finalWave = catalog.waves[9]!;
  if (finalWave.spawnEvents.at(-1)?.enemyId !== finalBosses[0]!.id) {
    throw new Error("The final boss must be the last spawn event of wave 10.");
  }

  for (const enemy of catalog.enemies) {
    if (enemy.splitInto && !catalog.enemies.some((candidate) => candidate.id === enemy.splitInto!.enemyId)) {
      throw new Error("Enemy " + enemy.id + " references an unknown split target.");
    }
  }

  const towerIds = new Set(catalog.towers.map((tower) => tower.id));
  const cardIds = new Set(catalog.cards.map((card) => card.id));
  const baseCards = catalog.cards.filter((card) => card.category === "base");
  const permanentCards = catalog.cards.filter((card) => card.category === "permanent");
  const tacticalCards = catalog.cards.filter((card) => card.category === "tactical");
  if (baseCards.length !== 6 || permanentCards.length !== 12 || tacticalCards.length !== 4) {
    throw new Error("Complete card pool must contain 6 base, 12 permanent, and 4 tactical cards.");
  }
  for (const card of catalog.cards) {
    if (card.cost <= 0 || !/^#[0-9A-Fa-f]{6}$/.test(card.accentColor)) {
      throw new Error("Card " + card.id + " contains invalid cost or color.");
    }
    if (!card.displayName.trim() || !card.role.trim()) {
      throw new Error("Card " + card.id + " must have a visible name and role.");
    }
    if (!card.repeatable && (!card.maxApplications || card.maxApplications !== 1)) {
      throw new Error("Non-repeatable card " + card.id + " must have one application.");
    }
    const validPermanentEffects = new Set([
      "tower_penetration", "tower_boss_damage", "tower_blast_radius", "tower_burn",
      "tower_slow", "tower_vulnerability", "tower_chain", "tower_overload",
      "wood_income", "wall_reinforcement", "repair_mastery", "tower_synergy",
    ]);
    const validTacticalEffects = new Set([ "wall_shield", "global_freeze", "focus_fire", "wood_drop" ]);
    const globalPermanentEffects = new Set([ "wood_income", "wall_reinforcement", "repair_mastery", "tower_synergy" ]);
    if (card.category === "base" && card.effect.kind !== "base") {
      throw new Error("Base card " + card.id + " must have a base effect.");
    }
    if (card.category === "permanent" && !validPermanentEffects.has(card.effect.kind)) {
      throw new Error("Permanent card " + card.id + " must have a permanent development effect.");
    }
    if (card.category === "tactical" && !validTacticalEffects.has(card.effect.kind)) {
      throw new Error("Tactical card " + card.id + " must have a tactical effect.");
    }
    if (card.category !== "base" && card.effect.kind === "base") {
      throw new Error("Non-base card " + card.id + " cannot have a base effect.");
    }
    if (card.category === "permanent" && card.cost !== (globalPermanentEffects.has(card.effect.kind) ? 24 : 18)) {
      throw new Error("Permanent card " + card.id + " has an invalid cost baseline.");
    }
    if (card.category === "tactical" && (card.cost < 8 || card.cost > 12)) {
      throw new Error("Tactical card " + card.id + " has an invalid cost.");
    }
    if (card.effect.kind !== "base" && "towerId" in card.effect && !towerIds.has(card.effect.towerId)) {
      throw new Error("Card " + card.id + " references unknown tower " + card.effect.towerId + ".");
    }

    if (card.effect.kind === "base" && card.effect.targetKind === "tower" && !towerIds.has(card.effect.definitionId)) {
      throw new Error("Card " + card.id + " references unknown tower " + card.effect.definitionId + ".");
    }
    if (card.effect.kind === "base" && card.effect.targetKind !== "tower" && !["lumberyard", "repair_shop"].includes(card.effect.definitionId)) {
      throw new Error("Card " + card.id + " references unknown building " + card.effect.definitionId + ".");
    }
  }
  const effectKey = (effect: CardEffect): string => "towerId" in effect ? effect.kind + ":" + effect.towerId : effect.kind;
  const expectedPermanentEffectKeys = new Set([
    "tower_penetration:machine_gun", "tower_boss_damage:machine_gun",
    "tower_blast_radius:cannon", "tower_burn:cannon",
    "tower_slow:frost", "tower_vulnerability:frost",
    "tower_chain:electric", "tower_overload:electric",
    "wood_income", "wall_reinforcement", "repair_mastery", "tower_synergy",
  ]);
  const permanentEffectKeys = permanentCards.map((card) => effectKey(card.effect));
  if (permanentEffectKeys.length !== expectedPermanentEffectKeys.size || new Set(permanentEffectKeys).size !== permanentEffectKeys.length || !permanentEffectKeys.every((key) => expectedPermanentEffectKeys.has(key))) {
    throw new Error("Permanent card effects must uniquely cover the complete third-stage effect contract.");
  }
  const expectedTacticalEffectKeys = new Set(["wall_shield", "global_freeze", "focus_fire", "wood_drop"]);
  const tacticalEffectKeys = tacticalCards.map((card) => effectKey(card.effect));
  if (tacticalEffectKeys.length !== expectedTacticalEffectKeys.size || new Set(tacticalEffectKeys).size !== tacticalEffectKeys.length || !tacticalEffectKeys.every((key) => expectedTacticalEffectKeys.has(key))) {
    throw new Error("Tactical card effects must uniquely cover the complete third-stage effect contract.");
  }
  const expectedBaseIds = new Set(["machine_gun", "cannon", "frost", "electric", "lumberyard", "repair_shop"]);
  if (baseCards.length !== expectedBaseIds.size || !baseCards.every((card) => expectedBaseIds.has(card.id))) {
    throw new Error("Base card pool must cover the six fixed building cards.");
  }

  for (const id of FIRST_BATCH_CARD_IDS) {
    if (!cardIds.has(id)) throw new Error("First batch references unknown card " + id + ".");
  }
  if (FIRST_BATCH_CARD_IDS.slice(0, 4).join(",") !== "machine_gun,cannon,lumberyard,frost") {
    throw new Error("First batch fixed hand is invalid.");
  }
}
