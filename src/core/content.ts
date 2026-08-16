import type { EnemyTier } from "./types";
import { starterBuildingGrowthContent, validateBuildingGrowthContent } from "./buildingGrowth";
import type { BuildingGrowthContent } from "./buildingGrowth";
import { starterHeroContent } from "./hero";
import type { LevelId } from "./hero";

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
  /** Wave timelines per level id; the selected level drives spawn progress and victory. */
  levelWaves: Readonly<Partial<Record<LevelId, readonly WaveDefinition[]>>>;
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
export const CROWD_PULSE_WINDOW_SECONDS = 0.4;
const MID_BOSS_SPAWN_SECONDS = 37;
const FINAL_BOSS_SPAWN_SECONDS = 39.5;
const CONTENT_EPSILON = 0.000001;

function createWave(wave: number, composition: Record<string, number>, pulseIntervalSeconds: number, finalBossId?: string, midBossId?: string): WaveDefinition {
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
  if (midBossId) spawnEvents.push({ atSeconds: MID_BOSS_SPAWN_SECONDS, enemyId: midBossId });
  if (finalBossId) spawnEvents.push({ atSeconds: FINAL_BOSS_SPAWN_SECONDS, enemyId: finalBossId });
  return { wave, startSeconds: (wave - 1) * 60, pulseIntervalSeconds, spawnEvents };
}

const firstDefenseWaves: WaveDefinition[] = [
  createWave(1, { walker: 28 }, 3.2),
  createWave(2, { walker: 30, runner: 14 }, 3),
  createWave(3, { walker: 30, runner: 22, tank: 8 }, 2.8),
  createWave(4, { walker: 40, runner: 32, tank: 12 }, 2.6),
  createWave(5, { walker: 32, runner: 24, tank: 16, armored: 2 }, 2.6, "charger_boss"),
  createWave(6, { walker: 48, runner: 40, tank: 20 }, 2.6),
  createWave(7, { walker: 40, runner: 32, tank: 24, armored: 4 }, 2.6),
  createWave(8, { walker: 48, runner: 48, tank: 24, brute: 2 }, 2.6),
  createWave(9, { walker: 56, runner: 48, tank: 32, armored: 2, brute: 2 }, 2.6),
  createWave(10, { walker: 48, runner: 40, tank: 40, armored: 2, brute: 2 }, 2.6, "overlord_boss"),
];

const brokenValleyWaves: WaveDefinition[] = [
  createWave(1, { walker: 32 }, 2.8),
  createWave(2, { walker: 32, runner: 18 }, 2.6),
  createWave(3, { walker: 34, runner: 26, tank: 10 }, 2.6),
  createWave(4, { walker: 44, runner: 34, tank: 14 }, 2.4),
  createWave(5, { walker: 36, runner: 26, tank: 18, armored: 3 }, 2.4),
  createWave(6, { walker: 52, runner: 42, tank: 22 }, 2.4, undefined, "charger_boss"),
  createWave(7, { walker: 44, runner: 36, tank: 26, armored: 5 }, 2.4),
  createWave(8, { walker: 52, runner: 50, tank: 26, brute: 3 }, 2.4),
  createWave(9, { walker: 60, runner: 52, tank: 34, armored: 3, brute: 3 }, 2.4),
  createWave(10, { walker: 56, runner: 48, tank: 42, armored: 4, brute: 3 }, 2.4),
  createWave(11, { walker: 64, runner: 56, tank: 44, armored: 4, brute: 4 }, 2.4),
  createWave(12, { walker: 56, runner: 52, tank: 48, armored: 4, brute: 4 }, 2.4, "overlord_boss"),
];

const kingsMarchWaves: WaveDefinition[] = [
  createWave(1, { walker: 34 }, 2.6),
  createWave(2, { walker: 34, runner: 20 }, 2.4),
  createWave(3, { walker: 36, runner: 28, tank: 12 }, 2.4),
  createWave(4, { walker: 46, runner: 36, tank: 16, armored: 2 }, 2.2),
  createWave(5, { walker: 38, runner: 28, tank: 20, armored: 4 }, 2.2),
  createWave(6, { walker: 54, runner: 44, tank: 24 }, 2.2, undefined, "charger_boss"),
  createWave(7, { walker: 46, runner: 38, tank: 28, armored: 6 }, 2.2),
  createWave(8, { walker: 54, runner: 52, tank: 28, brute: 4 }, 2.2),
  createWave(9, { walker: 62, runner: 54, tank: 36, armored: 4, brute: 4 }, 2.2),
  createWave(10, { walker: 58, runner: 50, tank: 44, armored: 4, brute: 4 }, 2.2, undefined, "charger_boss"),
  createWave(11, { walker: 66, runner: 58, tank: 46, armored: 6, brute: 4 }, 2.2),
  createWave(12, { walker: 70, runner: 62, tank: 50, armored: 6, brute: 6 }, 2.2),
  createWave(13, { walker: 72, runner: 64, tank: 54, armored: 6, brute: 6 }, 2.2),
  createWave(14, { walker: 76, runner: 68, tank: 58, armored: 8, brute: 6 }, 2.2),
  createWave(15, { walker: 68, runner: 62, tank: 60, armored: 8, brute: 8 }, 2.2, "overlord_boss", "charger_boss"),
];

export const starterCatalog: ContentCatalog = {
  enemies,
  levelWaves: {
    first_defense: firstDefenseWaves,
    broken_valley: brokenValleyWaves,
    kings_march: kingsMarchWaves,
  },
  buildingGrowth: starterBuildingGrowthContent,
};

export const EXPECTED_WAVE_COUNTS_BY_LEVEL: Readonly<Record<LevelId, Array<Record<string, number>>>> = {
  first_defense: [
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
  ],
  broken_valley: [
    { walker: 32 },
    { walker: 32, runner: 18 },
    { walker: 34, runner: 26, tank: 10 },
    { walker: 44, runner: 34, tank: 14 },
    { walker: 36, runner: 26, tank: 18, armored: 3 },
    { walker: 52, runner: 42, tank: 22, charger_boss: 1 },
    { walker: 44, runner: 36, tank: 26, armored: 5 },
    { walker: 52, runner: 50, tank: 26, brute: 3 },
    { walker: 60, runner: 52, tank: 34, armored: 3, brute: 3 },
    { walker: 56, runner: 48, tank: 42, armored: 4, brute: 3 },
    { walker: 64, runner: 56, tank: 44, armored: 4, brute: 4 },
    { walker: 56, runner: 52, tank: 48, armored: 4, brute: 4, overlord_boss: 1 },
  ],
  kings_march: [
    { walker: 34 },
    { walker: 34, runner: 20 },
    { walker: 36, runner: 28, tank: 12 },
    { walker: 46, runner: 36, tank: 16, armored: 2 },
    { walker: 38, runner: 28, tank: 20, armored: 4 },
    { walker: 54, runner: 44, tank: 24, charger_boss: 1 },
    { walker: 46, runner: 38, tank: 28, armored: 6 },
    { walker: 54, runner: 52, tank: 28, brute: 4 },
    { walker: 62, runner: 54, tank: 36, armored: 4, brute: 4 },
    { walker: 58, runner: 50, tank: 44, armored: 4, brute: 4, charger_boss: 1 },
    { walker: 66, runner: 58, tank: 46, armored: 6, brute: 4 },
    { walker: 70, runner: 62, tank: 50, armored: 6, brute: 6 },
    { walker: 72, runner: 64, tank: 54, armored: 6, brute: 6 },
    { walker: 76, runner: 68, tank: 58, armored: 8, brute: 6 },
    { walker: 68, runner: 62, tank: 60, armored: 8, brute: 8, charger_boss: 1, overlord_boss: 1 },
  ],
};

export const EXPECTED_WAVE_PULSE_INTERVALS_BY_LEVEL: Readonly<Record<LevelId, number[]>> = {
  first_defense: firstDefenseWaves.map((wave) => wave.pulseIntervalSeconds),
  broken_valley: brokenValleyWaves.map((wave) => wave.pulseIntervalSeconds),
  kings_march: kingsMarchWaves.map((wave) => wave.pulseIntervalSeconds),
};

function assertUniqueIds(ids: string[], label: string): void {
  if (new Set(ids).size !== ids.length) throw new Error(label + " contains duplicate ids.");
}

export function validateCatalog(catalog: ContentCatalog): void {
  validateBuildingGrowthContent(catalog.buildingGrowth);
  if (catalog.enemies.length === 0) throw new Error("Content catalog must contain enemies.");
  assertUniqueIds(catalog.enemies.map((item) => item.id), "Enemies");
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

  for (const level of starterHeroContent.levels) {
    const waves = catalog.levelWaves[level.id];
    if (!waves || waves.length === 0) throw new Error("Level " + level.id + " has no wave timeline.");
    if (waves.length !== level.waveCount) throw new Error("Level " + level.id + " requires exactly " + level.waveCount + " waves.");
    const expectedPulseIntervals = EXPECTED_WAVE_PULSE_INTERVALS_BY_LEVEL[level.id];
    const expectedCounts = EXPECTED_WAVE_COUNTS_BY_LEVEL[level.id];
    for (const [index, wave] of waves.entries()) {
      const expectedWave = index + 1;
      if (wave.wave !== expectedWave || wave.startSeconds !== index * 60 || wave.spawnEvents.length === 0) throw new Error("Level " + level.id + " wave " + expectedWave + " has an invalid fixed-timeline start.");
      if (wave.pulseIntervalSeconds !== expectedPulseIntervals[index]) throw new Error("Level " + level.id + " wave " + expectedWave + " has an invalid pulse interval.");
      const levelWaveCounts = expectedCounts[index]!;
      for (const event of wave.spawnEvents) if (!catalog.enemies.some((enemy) => enemy.id === event.enemyId)) throw new Error("Level " + level.id + " wave " + wave.wave + " references unknown enemy " + event.enemyId + ".");
      const actualCounts = wave.spawnEvents.reduce((counts, event) => { counts[event.enemyId] = (counts[event.enemyId] ?? 0) + 1; return counts; }, {} as Record<string, number>);
      if (Object.keys(levelWaveCounts).some((id) => actualCounts[id] !== levelWaveCounts[id]) || Object.keys(actualCounts).some((id) => actualCounts[id] !== levelWaveCounts[id])) throw new Error("Level " + level.id + " wave " + wave.wave + " does not match its formal composition.");
      let previousAtSeconds = -Infinity;
      for (const event of wave.spawnEvents) {
        const maximumSpawnTime = event.enemyId.endsWith("_boss") ? 40 : wave.pulseIntervalSeconds * (CROWD_PULSE_COUNT - 1) + CROWD_PULSE_WINDOW_SECONDS;
        if (event.atSeconds < 0 || event.atSeconds > maximumSpawnTime || event.atSeconds < previousAtSeconds) throw new Error("Level " + level.id + " wave " + wave.wave + " contains an invalid spawn time.");
        previousAtSeconds = event.atSeconds;
      }
      if (index === waves.length - 1 && wave.spawnEvents.at(-1)?.enemyId !== finalBossId) throw new Error("The final boss must be the last spawn event of level " + level.id + "'s final wave.");
      const crowdEvents = wave.spawnEvents.filter((event) => !event.enemyId.endsWith("_boss"));
      const pulseGroups = new Map<number, SpawnEvent[]>();
      for (const event of crowdEvents) {
        const pulseIndex = Math.round(event.atSeconds / wave.pulseIntervalSeconds);
        const group = pulseGroups.get(pulseIndex) ?? [];
        group.push(event);
        pulseGroups.set(pulseIndex, group);
      }
      if (pulseGroups.size !== CROWD_PULSE_COUNT || [...pulseGroups.keys()].some((pulseIndex) => pulseIndex < 0 || pulseIndex >= CROWD_PULSE_COUNT)) throw new Error("Level " + level.id + " wave " + wave.wave + " must use exactly " + CROWD_PULSE_COUNT + " crowd pulses.");
      for (const [pulseIndex, group] of pulseGroups) {
        const first = group[0]!.atSeconds;
        const last = group.at(-1)!.atSeconds;
        const anchor = pulseIndex * wave.pulseIntervalSeconds;
        if (first < anchor || last > anchor + CROWD_PULSE_WINDOW_SECONDS + CONTENT_EPSILON) throw new Error("Level " + level.id + " wave " + wave.wave + " contains a crowd pulse outside its micro-window.");
      }
      const finalCrowdAnchor = wave.pulseIntervalSeconds * (CROWD_PULSE_COUNT - 1);
      if (crowdEvents.length === 0 || crowdEvents.at(-1)!.atSeconds < finalCrowdAnchor || crowdEvents.at(-1)!.atSeconds > finalCrowdAnchor + CROWD_PULSE_WINDOW_SECONDS + CONTENT_EPSILON) throw new Error("Level " + level.id + " wave " + wave.wave + " crowd must reach its final pulse.");
    }
  }
}

validateCatalog(starterCatalog);
