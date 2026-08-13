import type { EnemyTier } from "./types";
import { starterBuildingGrowthContent, validateBuildingGrowthContent } from "./buildingGrowth";
import type { BuildingGrowthContent } from "./buildingGrowth";

export type EnemySignature =
  | { kind: "charger"; warningSeconds: number; chargeDistance: number; chargeDurationSeconds: number; initialCooldownSeconds: number; cooldownSeconds: number }
  | { kind: "overlord"; inspireDurationSeconds: number; inspireMultiplier: number; initialCooldownSeconds: number; cooldownSeconds: number };

export type EnemyBehavior =
  | "walker"
  | "runner"
  | "tank"
  | "armored"
  | "brute"
  | "charger"
  | "overlord";

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
  pulseIntervalSeconds: number;
  spawnEvents: SpawnEvent[];
}

export interface ContentCatalog {
  enemies: EnemyDefinition[];
  waves: WaveDefinition[];
  buildingGrowth: BuildingGrowthContent;
}

const enemies: EnemyDefinition[] = [
  { id: "walker", displayName: "行尸", role: "基础推进", tier: "normal", behavior: "walker", maxHp: 9, moveSpeed: 0.14, wallDamage: 1.25, wallAttackIntervalSeconds: 0.8, goldReward: 0.25, xpReward: 0.25 },
  { id: "runner", displayName: "疾行尸", role: "高速突破", tier: "normal", behavior: "runner", maxHp: 6, moveSpeed: 0.28, wallDamage: 1, wallAttackIntervalSeconds: 0.75, goldReward: 0.25, xpReward: 0.25 },
  { id: "tank", displayName: "重装尸", role: "高生命推进", tier: "normal", behavior: "tank", maxHp: 28, moveSpeed: 0.08, wallDamage: 3, wallAttackIntervalSeconds: 1, goldReward: 0.5, xpReward: 0.75 },
  { id: "armored", displayName: "装甲精英", role: "固定减伤推进", tier: "elite", behavior: "armored", maxHp: 45, moveSpeed: 0.1, wallDamage: 4, wallAttackIntervalSeconds: 0.9, goldReward: 3, xpReward: 1.5, damageMultiplier: 0.55 },
  { id: "brute", displayName: "攻城精英", role: "高额攻墙", tier: "elite", behavior: "brute", maxHp: 70, moveSpeed: 0.07, wallDamage: 9, wallAttackIntervalSeconds: 1.1, goldReward: 3, xpReward: 2.5 },
  { id: "charger_boss", displayName: "冲锋领主", role: "预警冲锋", tier: "boss", behavior: "charger", maxHp: 280, moveSpeed: 0.11, wallDamage: 28, wallAttackIntervalSeconds: 0.9, goldReward: 20, xpReward: 12, signature: { kind: "charger", warningSeconds: 2, chargeDistance: 0.55, chargeDurationSeconds: 0.8, initialCooldownSeconds: 5, cooldownSeconds: 8 } },
  { id: "overlord_boss", displayName: "尸潮君王", role: "鼓舞残余尸潮", tier: "boss", behavior: "overlord", maxHp: 720, moveSpeed: 0.07, wallDamage: 48, wallAttackIntervalSeconds: 1.1, goldReward: 0, xpReward: 24, isFinalBoss: true, signature: { kind: "overlord", inspireDurationSeconds: 4, inspireMultiplier: 1.25, initialCooldownSeconds: 3, cooldownSeconds: 8 } },
];

export const CROWD_PULSE_COUNT = 16;
export const EXPECTED_WAVE_PULSE_INTERVAL_SECONDS = [3.2, 3, 2.8, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6] as const;
export const CROWD_PULSE_WINDOW_SECONDS = 0.4;
const CONTENT_EPSILON = 0.000001;

function createWave(wave: number, composition: Record<string, number>, pulseIntervalSeconds: number, finalBossId?: string): WaveDefinition {
  const normalIds = ["walker", "runner", "tank"];
  const eliteIds = ["armored", "brute"];
  const spawnIds: string[] = [];
  const remaining = { ...composition };
  const appendRoundRobin = (ids: string[]): void => {
    while (ids.some((id) => (remaining[id] ?? 0) > 0)) {
      for (const id of ids) {
        if ((remaining[id] ?? 0) <= 0) continue;
        spawnIds.push(id);
        remaining[id]!--;
      }
    }
  };
  appendRoundRobin(normalIds);
  appendRoundRobin(eliteIds);
  const spawnEvents: SpawnEvent[] = [];
  let cursor = 0;
  for (let pulseIndex = 0; pulseIndex < CROWD_PULSE_COUNT; pulseIndex += 1) {
    const remainingCount = spawnIds.length - cursor;
    const remainingPulses = CROWD_PULSE_COUNT - pulseIndex;
    const pulseSize = Math.ceil(remainingCount / remainingPulses);
    const pulseIds = spawnIds.slice(cursor, cursor + pulseSize);
    cursor += pulseIds.length;
    const microInterval = pulseIds.length > 1 ? CROWD_PULSE_WINDOW_SECONDS / (pulseIds.length - 1) : 0;
    for (const [microIndex, enemyId] of pulseIds.entries()) {
      spawnEvents.push({ atSeconds: pulseIndex * pulseIntervalSeconds + microIndex * microInterval, enemyId });
    }
  }
  if (finalBossId) spawnEvents.push({ atSeconds: 39.5, enemyId: finalBossId });
  return { wave, startSeconds: (wave - 1) * 60, pulseIntervalSeconds, spawnEvents };
}

const waves: WaveDefinition[] = [
  createWave(1, { walker: 28 }, EXPECTED_WAVE_PULSE_INTERVAL_SECONDS[0]),
  createWave(2, { walker: 30, runner: 14 }, EXPECTED_WAVE_PULSE_INTERVAL_SECONDS[1]),
  createWave(3, { walker: 30, runner: 22, tank: 8 }, EXPECTED_WAVE_PULSE_INTERVAL_SECONDS[2]),
  createWave(4, { walker: 40, runner: 32, tank: 12 }, EXPECTED_WAVE_PULSE_INTERVAL_SECONDS[3]),
  createWave(5, { walker: 32, runner: 24, tank: 16, armored: 2 }, EXPECTED_WAVE_PULSE_INTERVAL_SECONDS[4], "charger_boss"),
  createWave(6, { walker: 48, runner: 40, tank: 20 }, EXPECTED_WAVE_PULSE_INTERVAL_SECONDS[5]),
  createWave(7, { walker: 40, runner: 32, tank: 24, armored: 4 }, EXPECTED_WAVE_PULSE_INTERVAL_SECONDS[6]),
  createWave(8, { walker: 48, runner: 48, tank: 24, brute: 2 }, EXPECTED_WAVE_PULSE_INTERVAL_SECONDS[7]),
  createWave(9, { walker: 56, runner: 48, tank: 32, armored: 2, brute: 2 }, EXPECTED_WAVE_PULSE_INTERVAL_SECONDS[8]),
  createWave(10, { walker: 48, runner: 40, tank: 40, armored: 2, brute: 2 }, EXPECTED_WAVE_PULSE_INTERVAL_SECONDS[9], "overlord_boss"),
];

export const starterCatalog: ContentCatalog = {
  enemies,
  waves,
  buildingGrowth: starterBuildingGrowthContent,
};

export const EXPECTED_WAVE_COUNTS: Array<Record<string, number>> = [
  { walker: 28 },
  { walker: 30, runner: 14 },
  { walker: 30, runner: 22, tank: 8 },
  { walker: 40, runner: 32, tank: 12 },
  { walker: 32, runner: 24, tank: 16, armored: 2, charger_boss: 1 },
  { walker: 48, runner: 40, tank: 20 },
  { walker: 40, runner: 32, tank: 24, armored: 4 },
  { walker: 48, runner: 48, tank: 24, brute: 2 },
  { walker: 56, runner: 48, tank: 32, armored: 2, brute: 2 },
  { walker: 48, runner: 40, tank: 40, armored: 2, brute: 2, overlord_boss: 1 },
];

function assertUniqueIds(ids: string[], label: string): void {
  if (new Set(ids).size !== ids.length) throw new Error(label + " contains duplicate ids.");
}

export function validateCatalog(catalog: ContentCatalog): void {
  validateBuildingGrowthContent(catalog.buildingGrowth);
  if (catalog.enemies.length === 0 || catalog.waves.length === 0) throw new Error("Content catalog must contain enemies and waves.");
  assertUniqueIds(catalog.enemies.map((item) => item.id), "Enemies");
  assertUniqueIds(catalog.waves.map((item) => String(item.wave)), "Waves");

  if (catalog.waves.length !== 10) throw new Error("Continuous timeline requires exactly 10 waves.");
  const normalEnemies = catalog.enemies.filter((enemy) => enemy.tier === "normal");
  const eliteEnemies = catalog.enemies.filter((enemy) => enemy.tier === "elite");
  const bossEnemies = catalog.enemies.filter((enemy) => enemy.tier === "boss");
  if (normalEnemies.length !== 3 || eliteEnemies.length !== 2 || bossEnemies.length !== 2) throw new Error("Enemy catalog must contain exactly 3 normal, 2 elite, and 2 boss definitions.");
  const expectedEnemyIds = new Set(["walker", "runner", "tank", "armored", "brute", "charger_boss", "overlord_boss"]);
  if (catalog.enemies.some((enemy) => !expectedEnemyIds.has(enemy.id))) throw new Error("Enemy catalog contains an out-of-scope enemy.");
  for (const enemy of catalog.enemies) {
    if (enemy.maxHp <= 0 || enemy.moveSpeed < 0 || enemy.wallDamage < 0 || enemy.goldReward < 0 || enemy.xpReward < 0) throw new Error("Enemy " + enemy.id + " contains invalid combat values.");
  }
  const expectedNormalBehaviors: Record<string, EnemyBehavior> = { walker: "walker", runner: "runner", tank: "tank" };
  if (normalEnemies.some((enemy) => expectedNormalBehaviors[enemy.id] !== enemy.behavior || enemy.damageMultiplier !== undefined || enemy.isFinalBoss !== undefined || enemy.signature !== undefined)) throw new Error("Normal enemies must keep their exact responsibilities and have no optional skills.");
  if (catalog.enemies.some((enemy) => enemy.damageMultiplier !== undefined && enemy.id !== "armored")) throw new Error("Only armored elite may use fixed damage reduction.");
  if (catalog.enemies.find((enemy) => enemy.id === "armored")?.behavior !== "armored" || catalog.enemies.find((enemy) => enemy.id === "brute")?.behavior !== "brute") throw new Error("Elite enemy signature mechanics are invalid.");
  const charger = catalog.enemies.find((enemy) => enemy.id === "charger_boss");
  const overlord = catalog.enemies.find((enemy) => enemy.id === "overlord_boss");
  if (charger?.behavior !== "charger" || charger.signature?.kind !== "charger" || overlord?.behavior !== "overlord" || overlord.signature?.kind !== "overlord") throw new Error("Boss signature mechanics are invalid.");
  if (charger.signature.warningSeconds <= 0 || charger.signature.chargeDistance <= 0 || charger.signature.chargeDurationSeconds <= 0 || charger.signature.initialCooldownSeconds < 0 || charger.signature.cooldownSeconds <= 0 || overlord.signature.inspireDurationSeconds <= 0 || overlord.signature.inspireMultiplier < 1 || overlord.signature.initialCooldownSeconds < 0 || overlord.signature.cooldownSeconds <= 0) throw new Error("Boss signature mechanic values are invalid.");
  const expectedGoldRewards: Record<string, number> = { walker: 0.25, runner: 0.25, tank: 0.5, armored: 3, brute: 3, charger_boss: 20, overlord_boss: 0 };
  for (const enemy of catalog.enemies) if (enemy.goldReward !== expectedGoldRewards[enemy.id]) throw new Error("Enemy " + enemy.id + " has an invalid gold reward.");
  const finalBosses = catalog.enemies.filter((enemy) => enemy.isFinalBoss);
  if (finalBosses.length !== 1) throw new Error("Content catalog must define exactly one final boss.");
  const finalBossId = finalBosses[0]!.id;

  for (const [index, wave] of catalog.waves.entries()) {
    const expectedWave = index + 1;
    const expectedPulseInterval = EXPECTED_WAVE_PULSE_INTERVAL_SECONDS[index];
    if (wave.wave !== expectedWave || wave.startSeconds !== index * 60 || wave.spawnEvents.length === 0) throw new Error("Wave " + expectedWave + " has an invalid fixed-timeline start.");
    if (wave.pulseIntervalSeconds !== expectedPulseInterval) throw new Error("Wave " + expectedWave + " has an invalid pulse interval.");
    const expectedCounts = EXPECTED_WAVE_COUNTS[index]!;
    for (const event of wave.spawnEvents) if (!catalog.enemies.some((enemy) => enemy.id === event.enemyId)) throw new Error("Wave " + wave.wave + " references unknown enemy " + event.enemyId + ".");
    const actualCounts = wave.spawnEvents.reduce((counts, event) => { counts[event.enemyId] = (counts[event.enemyId] ?? 0) + 1; return counts; }, {} as Record<string, number>);
    if (Object.keys(expectedCounts).some((id) => actualCounts[id] !== expectedCounts[id]) || Object.keys(actualCounts).some((id) => actualCounts[id] !== expectedCounts[id])) throw new Error("Wave " + wave.wave + " does not match the formal ten-wave composition.");
    let previousAtSeconds = -Infinity;
    for (const event of wave.spawnEvents) {
      const maximumSpawnTime = event.enemyId.endsWith("_boss") ? 40 : wave.pulseIntervalSeconds * (CROWD_PULSE_COUNT - 1) + CROWD_PULSE_WINDOW_SECONDS;
      if (event.atSeconds < 0 || event.atSeconds > maximumSpawnTime || event.atSeconds < previousAtSeconds) throw new Error("Wave " + wave.wave + " contains an invalid spawn time.");
      previousAtSeconds = event.atSeconds;
    }
    if (wave.wave === 10 && wave.spawnEvents.at(-1)?.enemyId !== finalBossId) throw new Error("The final boss must be the last spawn event of wave 10.");
    const crowdEvents = wave.spawnEvents.filter((event) => !event.enemyId.endsWith("_boss"));
    const pulseGroups = new Map<number, SpawnEvent[]>();
    for (const event of crowdEvents) {
      const pulseIndex = Math.round(event.atSeconds / wave.pulseIntervalSeconds);
      const group = pulseGroups.get(pulseIndex) ?? [];
      group.push(event);
      pulseGroups.set(pulseIndex, group);
    }
    if (pulseGroups.size !== CROWD_PULSE_COUNT || [...pulseGroups.keys()].some((pulseIndex) => pulseIndex < 0 || pulseIndex >= CROWD_PULSE_COUNT)) throw new Error("Wave " + wave.wave + " must use exactly " + CROWD_PULSE_COUNT + " crowd pulses.");
    for (const [pulseIndex, group] of pulseGroups) {
      const first = group[0]!.atSeconds;
      const last = group.at(-1)!.atSeconds;
      const anchor = pulseIndex * wave.pulseIntervalSeconds;
      if (first < anchor || last > anchor + CROWD_PULSE_WINDOW_SECONDS + CONTENT_EPSILON) throw new Error("Wave " + wave.wave + " contains a crowd pulse outside its micro-window.");
    }
    const finalCrowdAnchor = wave.pulseIntervalSeconds * (CROWD_PULSE_COUNT - 1);
    if (crowdEvents.at(-1)!.atSeconds < finalCrowdAnchor || crowdEvents.at(-1)!.atSeconds > finalCrowdAnchor + CROWD_PULSE_WINDOW_SECONDS + CONTENT_EPSILON) throw new Error("Wave " + wave.wave + " crowd must reach its final pulse.");
  }
}

validateCatalog(starterCatalog);
