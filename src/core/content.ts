import type { EnemyTier } from "./types";

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
}

export interface SpawnEvent {
  atSeconds: number;
  enemyId: string;
}

export interface WaveDefinition {
  wave: number;
  durationSeconds: number;
  spawnEvents: SpawnEvent[];
}

export type UpgradeEffect =
  | { kind: "tower_damage"; towerId: string; amount: number }
  | { kind: "tower_attack_speed"; towerId: string; multiplier: number }
  | { kind: "tower_range"; towerId: string; amount: number }
  | { kind: "tower_splash_radius"; towerId: string; amount: number }
  | { kind: "tower_slow"; towerId: string; amount: number }
  | { kind: "all_tower_damage"; amount: number }
  | { kind: "all_tower_attack_speed"; multiplier: number }
  | { kind: "wood_income"; amount: number }
  | { kind: "gold_multiplier"; amount: number }
  | { kind: "wall_max_hp"; amount: number }
  | { kind: "wall_repair"; amount: number }
  | { kind: "wall_damage_reduction"; amount: number };

export interface UpgradeDefinition {
  id: string;
  title: string;
  description: string;
  effect: UpgradeEffect;
}

export interface ContentCatalog {
  towers: TowerDefinition[];
  enemies: EnemyDefinition[];
  waves: WaveDefinition[];
  upgrades: UpgradeDefinition[];
}

const towers: TowerDefinition[] = [
  {
    id: "machine_gun",
    displayName: "机枪塔",
    role: "快速单体输出",
    buildCost: 40,
    maxLevel: 3,
    damage: 25,
    attackIntervalSeconds: 0.7,
    range: 0.75,
    attackType: "single",
  },
  {
    id: "cannon",
    displayName: "炮塔",
    role: "范围清怪",
    buildCost: 65,
    maxLevel: 3,
    damage: 45,
    attackIntervalSeconds: 1.8,
    range: 0.8,
    attackType: "splash",
    splashRadius: 0.18,
  },
  {
    id: "frost",
    displayName: "冰冻塔",
    role: "减速控制",
    buildCost: 55,
    maxLevel: 3,
    damage: 5,
    attackIntervalSeconds: 0.8,
    range: 0.85,
    attackType: "slow",
    slowMultiplier: 0.52,
    slowDurationSeconds: 1.4,
  },
  {
    id: "electric",
    displayName: "电磁塔",
    role: "链式压制",
    buildCost: 85,
    maxLevel: 3,
    damage: 18,
    attackIntervalSeconds: 1.2,
    range: 0.8,
    attackType: "chain",
    chainTargets: 3,
  },
];

const enemies: EnemyDefinition[] = [
  { id: "walker", displayName: "行尸", role: "基础推进", tier: "normal", behavior: "walker", maxHp: 20, moveSpeed: 0.42, wallDamage: 5, wallAttackIntervalSeconds: 0.8, goldReward: 2, xpReward: 1 },
  { id: "runner", displayName: "疾行者", role: "高速突破", tier: "normal", behavior: "runner", maxHp: 12, moveSpeed: 0.8, wallDamage: 4, wallAttackIntervalSeconds: 0.75, goldReward: 2, xpReward: 1 },
  { id: "tank", displayName: "重装尸", role: "高生命推进", tier: "normal", behavior: "tank", maxHp: 80, moveSpeed: 0.2, wallDamage: 12, wallAttackIntervalSeconds: 1, goldReward: 6, xpReward: 3 },
  { id: "splitter", displayName: "裂变尸", role: "死亡分裂", tier: "normal", behavior: "splitter", maxHp: 30, moveSpeed: 0.32, wallDamage: 6, wallAttackIntervalSeconds: 0.8, goldReward: 4, xpReward: 2, splitInto: { enemyId: "runner", count: 2 } },
  { id: "screamer", displayName: "尖啸者", role: "尸潮加速", tier: "normal", behavior: "screamer", maxHp: 35, moveSpeed: 0.3, wallDamage: 4, wallAttackIntervalSeconds: 0.8, goldReward: 5, xpReward: 2 },
  { id: "volatile", displayName: "爆裂尸", role: "死亡冲击", tier: "normal", behavior: "volatile", maxHp: 18, moveSpeed: 0.55, wallDamage: 5, wallAttackIntervalSeconds: 0.7, goldReward: 4, xpReward: 2, onDeathWallDamage: 8 },
  { id: "armored", displayName: "装甲精英", role: "减伤推进", tier: "elite", behavior: "armored", maxHp: 55, moveSpeed: 0.28, wallDamage: 8, wallAttackIntervalSeconds: 0.9, goldReward: 8, xpReward: 3, damageMultiplier: 0.55 },
  { id: "regenerator", displayName: "再生精英", role: "持续回复", tier: "elite", behavior: "regenerator", maxHp: 65, moveSpeed: 0.25, wallDamage: 7, wallAttackIntervalSeconds: 0.8, goldReward: 9, xpReward: 4, regenPerSecond: 4 },
  { id: "burrower", displayName: "潜行精英", role: "接近后显形", tier: "elite", behavior: "burrower", maxHp: 40, moveSpeed: 0.7, wallDamage: 6, wallAttackIntervalSeconds: 0.8, goldReward: 9, xpReward: 4, untargetableUntil: 0.55 },
  { id: "brute", displayName: "攻城精英", role: "高额攻墙", tier: "elite", behavior: "brute", maxHp: 110, moveSpeed: 0.18, wallDamage: 18, wallAttackIntervalSeconds: 1.1, goldReward: 12, xpReward: 5 },
  { id: "charger_boss", displayName: "冲锋领主", role: "周期冲锋", tier: "boss", behavior: "charger", maxHp: 260, moveSpeed: 0.24, wallDamage: 28, wallAttackIntervalSeconds: 0.9, goldReward: 28, xpReward: 12 },
  { id: "summoner_boss", displayName: "巢穴领主", role: "死亡召唤", tier: "boss", behavior: "summoner", maxHp: 300, moveSpeed: 0.2, wallDamage: 24, wallAttackIntervalSeconds: 0.9, goldReward: 32, xpReward: 14, splitInto: { enemyId: "runner", count: 4 } },
  { id: "fortress_boss", displayName: "壁垒领主", role: "极高减伤", tier: "boss", behavior: "fortress", maxHp: 520, moveSpeed: 0.12, wallDamage: 38, wallAttackIntervalSeconds: 1.2, goldReward: 40, xpReward: 18, damageMultiplier: 0.35 },
  { id: "overlord_boss", displayName: "尸潮君王", role: "全场统御", tier: "boss", behavior: "overlord", maxHp: 680, moveSpeed: 0.16, wallDamage: 48, wallAttackIntervalSeconds: 1.1, goldReward: 60, xpReward: 24, damageMultiplier: 0.5 },
];

function createWave(
  wave: number,
  groups: Array<{ enemyId: string; count: number; intervalSeconds: number; startSeconds?: number }>,
): WaveDefinition {
  const spawnEvents: SpawnEvent[] = [];
  for (const group of groups) {
    const startSeconds = group.startSeconds ?? 0;
    for (let index = 0; index < group.count; index += 1) {
      spawnEvents.push({
        atSeconds: startSeconds + index * group.intervalSeconds,
        enemyId: group.enemyId,
      });
    }
  }
  spawnEvents.sort((left, right) => left.atSeconds - right.atSeconds);
  const lastSpawn = spawnEvents.at(-1)?.atSeconds ?? 0;
  return { wave, durationSeconds: Math.max(8, lastSpawn + 8), spawnEvents };
}

const waves: WaveDefinition[] = [
  createWave(1, [{ enemyId: "walker", count: 5, intervalSeconds: 0.8 }]),
  createWave(2, [{ enemyId: "walker", count: 4, intervalSeconds: 0.7 }, { enemyId: "runner", count: 3, intervalSeconds: 1, startSeconds: 1 }]),
  createWave(3, [{ enemyId: "walker", count: 8, intervalSeconds: 0.55 }]),
  createWave(4, [{ enemyId: "runner", count: 6, intervalSeconds: 0.65 }, { enemyId: "tank", count: 2, intervalSeconds: 2, startSeconds: 1 }]),
  createWave(5, [{ enemyId: "walker", count: 6, intervalSeconds: 0.55 }, { enemyId: "armored", count: 2, intervalSeconds: 2, startSeconds: 2 }]),
  createWave(6, [{ enemyId: "splitter", count: 4, intervalSeconds: 1.2 }, { enemyId: "runner", count: 6, intervalSeconds: 0.6, startSeconds: 2 }]),
  createWave(7, [{ enemyId: "screamer", count: 2, intervalSeconds: 3 }, { enemyId: "walker", count: 10, intervalSeconds: 0.5 }]),
  createWave(8, [{ enemyId: "regenerator", count: 3, intervalSeconds: 2 }, { enemyId: "runner", count: 8, intervalSeconds: 0.55 }]),
  createWave(9, [{ enemyId: "burrower", count: 5, intervalSeconds: 1 }, { enemyId: "tank", count: 3, intervalSeconds: 2, startSeconds: 1 }]),
  createWave(10, [{ enemyId: "charger_boss", count: 1, intervalSeconds: 1, startSeconds: 1 }, { enemyId: "runner", count: 10, intervalSeconds: 0.55 }]),
  createWave(11, [{ enemyId: "armored", count: 4, intervalSeconds: 1.5 }, { enemyId: "splitter", count: 5, intervalSeconds: 1, startSeconds: 2 }]),
  createWave(12, [{ enemyId: "brute", count: 2, intervalSeconds: 2 }, { enemyId: "runner", count: 10, intervalSeconds: 0.55 }]),
  createWave(13, [{ enemyId: "volatile", count: 7, intervalSeconds: 0.8 }, { enemyId: "walker", count: 8, intervalSeconds: 0.5 }]),
  createWave(14, [{ enemyId: "regenerator", count: 3, intervalSeconds: 1.8 }, { enemyId: "burrower", count: 4, intervalSeconds: 1, startSeconds: 1 }, { enemyId: "armored", count: 3, intervalSeconds: 2, startSeconds: 2 }]),
  createWave(15, [{ enemyId: "summoner_boss", count: 1, intervalSeconds: 1, startSeconds: 1 }, { enemyId: "runner", count: 12, intervalSeconds: 0.5 }]),
  createWave(16, [{ enemyId: "tank", count: 4, intervalSeconds: 1.6 }, { enemyId: "brute", count: 2, intervalSeconds: 2.5, startSeconds: 1 }, { enemyId: "screamer", count: 2, intervalSeconds: 3, startSeconds: 2 }]),
  createWave(17, [{ enemyId: "fortress_boss", count: 1, intervalSeconds: 1, startSeconds: 1 }, { enemyId: "armored", count: 5, intervalSeconds: 1.2 }]),
  createWave(18, [{ enemyId: "overlord_boss", count: 1, intervalSeconds: 1, startSeconds: 1 }, { enemyId: "runner", count: 14, intervalSeconds: 0.45 }]),
  createWave(19, [{ enemyId: "brute", count: 4, intervalSeconds: 1.7 }, { enemyId: "regenerator", count: 4, intervalSeconds: 1.4 }, { enemyId: "volatile", count: 8, intervalSeconds: 0.55 }]),
  createWave(20, [{ enemyId: "overlord_boss", count: 1, intervalSeconds: 1, startSeconds: 2 }, { enemyId: "fortress_boss", count: 1, intervalSeconds: 1, startSeconds: 4 }, { enemyId: "runner", count: 16, intervalSeconds: 0.4 }]),
];

const upgrades: UpgradeDefinition[] = [
  { id: "mg_piercing", title: "穿甲弹头", description: "机枪塔伤害 +8。", effect: { kind: "tower_damage", towerId: "machine_gun", amount: 8 } },
  { id: "mg_overclock", title: "机枪超频", description: "机枪塔攻击间隔缩短 12%。", effect: { kind: "tower_attack_speed", towerId: "machine_gun", multiplier: 0.88 } },
  { id: "mg_longbarrel", title: "加长枪管", description: "机枪塔射程 +0.18。", effect: { kind: "tower_range", towerId: "machine_gun", amount: 0.18 } },
  { id: "mg_heavy_round", title: "重型弹药", description: "机枪塔伤害 +12，但攻击间隔增加 5%。", effect: { kind: "tower_damage", towerId: "machine_gun", amount: 12 } },
  { id: "cannon_shell", title: "高爆弹头", description: "炮塔伤害 +18。", effect: { kind: "tower_damage", towerId: "cannon", amount: 18 } },
  { id: "cannon_radius", title: "扩散装药", description: "炮塔爆炸范围 +0.1。", effect: { kind: "tower_splash_radius", towerId: "cannon", amount: 0.1 } },
  { id: "cannon_reload", title: "快速装填", description: "炮塔攻击间隔缩短 14%。", effect: { kind: "tower_attack_speed", towerId: "cannon", multiplier: 0.86 } },
  { id: "cannon_frag", title: "集束破片", description: "炮塔伤害 +10，爆炸范围 +0.05。", effect: { kind: "tower_damage", towerId: "cannon", amount: 10 } },
  { id: "frost_core", title: "深寒核心", description: "冰冻塔额外降低敌人速度。", effect: { kind: "tower_slow", towerId: "frost", amount: 0.1 } },
  { id: "frost_damage", title: "霜刃", description: "冰冻塔伤害 +8。", effect: { kind: "tower_damage", towerId: "frost", amount: 8 } },
  { id: "frost_range", title: "冷凝透镜", description: "冰冻塔射程 +0.2。", effect: { kind: "tower_range", towerId: "frost", amount: 0.2 } },
  { id: "frost_cycle", title: "冰晶循环", description: "冰冻塔攻击间隔缩短 15%。", effect: { kind: "tower_attack_speed", towerId: "frost", multiplier: 0.85 } },
  { id: "electric_voltage", title: "增压线圈", description: "电磁塔伤害 +10。", effect: { kind: "tower_damage", towerId: "electric", amount: 10 } },
  { id: "electric_chain", title: "多级跳弧", description: "电磁塔额外连接一个目标。", effect: { kind: "tower_damage", towerId: "electric", amount: 6 } },
  { id: "electric_cycle", title: "脉冲压缩", description: "电磁塔攻击间隔缩短 12%。", effect: { kind: "tower_attack_speed", towerId: "electric", multiplier: 0.88 } },
  { id: "electric_range", title: "导电天线", description: "电磁塔射程 +0.2。", effect: { kind: "tower_range", towerId: "electric", amount: 0.2 } },
  { id: "all_calibration", title: "统一校准", description: "所有防御塔伤害 +6。", effect: { kind: "all_tower_damage", amount: 6 } },
  { id: "all_targeting", title: "协同索敌", description: "所有防御塔攻击间隔缩短 8%。", effect: { kind: "all_tower_attack_speed", multiplier: 0.92 } },
  { id: "wood_sawmill", title: "高效锯片", description: "战斗中木材产出 +1/秒。", effect: { kind: "wood_income", amount: 1 } },
  { id: "wood_shift", title: "轮班伐木", description: "战斗中木材产出 +1.5/秒。", effect: { kind: "wood_income", amount: 1.5 } },
  { id: "gold_bounty", title: "赏金标记", description: "击杀金币提高 18%。", effect: { kind: "gold_multiplier", amount: 0.18 } },
  { id: "gold_scavenger", title: "战场搜集", description: "击杀金币提高 25%。", effect: { kind: "gold_multiplier", amount: 0.25 } },
  { id: "wall_reinforce", title: "加固墙体", description: "城墙最大耐久 +30。", effect: { kind: "wall_max_hp", amount: 30 } },
  { id: "wall_reinforce_2", title: "双层砌墙", description: "城墙最大耐久 +45。", effect: { kind: "wall_max_hp", amount: 45 } },
  { id: "wall_repair", title: "快速维修", description: "战斗中城墙每秒修复 1 点耐久。", effect: { kind: "wall_repair", amount: 1 } },
  { id: "wall_repair_2", title: "应急维修", description: "战斗中城墙每秒修复 2 点耐久。", effect: { kind: "wall_repair", amount: 2 } },
  { id: "wall_guard", title: "冲击缓冲", description: "城墙受到的伤害降低 10%。", effect: { kind: "wall_damage_reduction", amount: 0.1 } },
  { id: "wall_guard_2", title: "复合护板", description: "城墙受到的伤害再降低 12%。", effect: { kind: "wall_damage_reduction", amount: 0.12 } },
  { id: "global_damage_1", title: "火力学说", description: "所有防御塔伤害 +10。", effect: { kind: "all_tower_damage", amount: 10 } },
  { id: "global_damage_2", title: "集中火网", description: "所有防御塔伤害 +14。", effect: { kind: "all_tower_damage", amount: 14 } },
  { id: "global_speed_1", title: "统一供能", description: "所有防御塔攻击间隔缩短 6%。", effect: { kind: "all_tower_attack_speed", multiplier: 0.94 } },
  { id: "global_speed_2", title: "过载供能", description: "所有防御塔攻击间隔缩短 10%。", effect: { kind: "all_tower_attack_speed", multiplier: 0.9 } },
  { id: "economy_wall", title: "营地配给", description: "战斗中木材产出 +2/秒。", effect: { kind: "wood_income", amount: 2 } },
  { id: "economy_gold", title: "战利品分配", description: "击杀金币提高 35%。", effect: { kind: "gold_multiplier", amount: 0.35 } },
  { id: "last_stand", title: "背水一战", description: "城墙最大耐久 +60。", effect: { kind: "wall_max_hp", amount: 60 } },
  { id: "field_medic", title: "战地修复组", description: "战斗中城墙每秒修复 3 点耐久。", effect: { kind: "wall_repair", amount: 3 } },
];

export const starterCatalog: ContentCatalog = { towers, enemies, waves, upgrades };

function assertUniqueIds(ids: string[], label: string): void {
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${label} contains duplicate ids.`);
  }
}

export function validateCatalog(catalog: ContentCatalog): void {
  if (catalog.towers.length === 0 || catalog.enemies.length === 0 || catalog.waves.length === 0 || catalog.upgrades.length === 0) {
    throw new Error("Content catalog must contain towers, enemies, waves, and upgrades.");
  }

  assertUniqueIds(catalog.towers.map((item) => item.id), "Towers");
  assertUniqueIds(catalog.enemies.map((item) => item.id), "Enemies");
  assertUniqueIds(catalog.waves.map((item) => String(item.wave)), "Waves");
  assertUniqueIds(catalog.upgrades.map((item) => item.id), "Upgrades");

  for (const wave of catalog.waves) {
    if (wave.durationSeconds <= 0 || wave.spawnEvents.length === 0) {
      throw new Error(`Wave ${wave.wave} must define a positive duration and at least one spawn event.`);
    }

    for (const spawnEvent of wave.spawnEvents) {
      if (spawnEvent.atSeconds < 0) {
        throw new Error(`Wave ${wave.wave} contains a spawn event before the wave starts.`);
      }

      if (!catalog.enemies.some((enemy) => enemy.id === spawnEvent.enemyId)) {
        throw new Error(`Wave ${wave.wave} references unknown enemy ${spawnEvent.enemyId}.`);
      }
    }
  }

  for (const upgrade of catalog.upgrades) {
    if (upgrade.title.trim() === "" || upgrade.description.trim() === "") {
      throw new Error(`Upgrade ${upgrade.id} must have visible text.`);
    }
  }
}
