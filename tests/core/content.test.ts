import { describe, expect, it } from "vitest";
import {
  CROWD_PULSE_COUNT,
  CROWD_PULSE_WINDOW_SECONDS,
  EXPECTED_WAVE_COUNTS_BY_LEVEL,
  EXPECTED_WAVE_PULSE_INTERVALS_BY_LEVEL,
  starterCatalog,
  validateCatalog,
} from "../../src/core/content";
import { starterHeroContent } from "../../src/core/hero";
import type { LevelId } from "../../src/core/hero";

const LEVEL_IDS: LevelId[] = ["first_defense", "broken_valley", "kings_march"];

describe("growth candidate content", () => {
  it("contains a deterministic timeline and declared pulse cadence for every level", () => {
    expect(() => validateCatalog(starterCatalog)).not.toThrow();
    for (const levelId of LEVEL_IDS) {
      const waves = starterCatalog.levelWaves[levelId]!;
      const declared = starterHeroContent.levels.find((level) => level.id === levelId)!.waveCount;
      expect(waves).toHaveLength(declared);
      for (const [index, wave] of waves.entries()) {
        expect(wave.pulseIntervalSeconds).toBe(EXPECTED_WAVE_PULSE_INTERVALS_BY_LEVEL[levelId]![index]);
        const counts = wave.spawnEvents.reduce((result, event) => {
          result[event.enemyId] = (result[event.enemyId] ?? 0) + 1;
          return result;
        }, {} as Record<string, number>);
        expect(counts).toEqual(EXPECTED_WAVE_COUNTS_BY_LEVEL[levelId]![index]);
        const crowd = wave.spawnEvents.filter((event) => !event.enemyId.endsWith("_boss"));
        expect(new Set(crowd.map((event) => Math.floor(event.atSeconds / 10))).size).toBeGreaterThanOrEqual(4);
        const pulses = new Map<number, number[]>();
        for (const event of crowd) {
          const pulseIndex = Math.round(event.atSeconds / wave.pulseIntervalSeconds);
          const times = pulses.get(pulseIndex) ?? [];
          times.push(event.atSeconds);
          pulses.set(pulseIndex, times);
        }
        expect(pulses.size).toBe(CROWD_PULSE_COUNT);
        for (const [pulseIndex, times] of pulses) {
          expect(Math.max(...times) - Math.min(...times)).toBeLessThanOrEqual(CROWD_PULSE_WINDOW_SECONDS + 0.000001);
          expect(Math.min(...times)).toBeGreaterThanOrEqual(pulseIndex * wave.pulseIntervalSeconds);
        }
        expect(Math.min(...pulses.get(CROWD_PULSE_COUNT - 1)!)).toBeCloseTo(wave.pulseIntervalSeconds * (CROWD_PULSE_COUNT - 1), 8);
        const maximumCrowdTime = wave.pulseIntervalSeconds * (CROWD_PULSE_COUNT - 1) + CROWD_PULSE_WINDOW_SECONDS;
        expect(wave.spawnEvents.every((event, eventIndex) => event.atSeconds >= 0 && event.atSeconds <= (event.enemyId.endsWith("_boss") ? 40 : maximumCrowdTime) && (eventIndex === 0 || event.atSeconds >= wave.spawnEvents[eventIndex - 1]!.atSeconds))).toBe(true);
      }
      expect(waves.at(-1)!.spawnEvents.at(-1)).toEqual({ atSeconds: 39.5, enemyId: "overlord_boss" });
    }
    expect(starterCatalog.levelWaves.first_defense![4]!.spawnEvents.at(-1)).toEqual({ atSeconds: 39.5, enemyId: "charger_boss" });
    expect(starterCatalog.levelWaves.broken_valley![5]!.spawnEvents.filter((event) => event.enemyId === "charger_boss")).toEqual([{ atSeconds: 37, enemyId: "charger_boss" }]);
    expect(starterCatalog.levelWaves.kings_march![14]!.spawnEvents.filter((event) => event.enemyId.endsWith("_boss"))).toEqual([{ atSeconds: 37, enemyId: "charger_boss" }, { atSeconds: 39.5, enemyId: "overlord_boss" }]);
  });

  it("keeps the first-defense ten-wave baseline byte-for-byte unchanged", () => {
    expect(EXPECTED_WAVE_COUNTS_BY_LEVEL.first_defense).toEqual([
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
    ]);
    expect(starterCatalog.levelWaves.first_defense!.slice(3).map((wave) => wave.pulseIntervalSeconds)).toEqual([2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6]);
  });

  it("escalates pressure across the three levels", () => {
    const totals = LEVEL_IDS.map((levelId) => EXPECTED_WAVE_COUNTS_BY_LEVEL[levelId]!.reduce((sum, counts) => sum + Object.values(counts).reduce((inner, value) => inner + value, 0), 0));
    expect(totals[1]!).toBeGreaterThan(totals[0]!);
    expect(totals[2]!).toBeGreaterThan(totals[1]!);
    const walkSpeed = LEVEL_IDS.map((levelId) => EXPECTED_WAVE_PULSE_INTERVALS_BY_LEVEL[levelId]!.reduce((sum, interval) => sum + interval, 0) / EXPECTED_WAVE_PULSE_INTERVALS_BY_LEVEL[levelId]!.length);
    expect(walkSpeed[1]!).toBeLessThan(walkSpeed[0]!);
    expect(walkSpeed[2]!).toBeLessThan(walkSpeed[1]!);
    for (const levelId of ["broken_valley", "kings_march"] as const) {
      const midBossWaves = starterCatalog.levelWaves[levelId]!.filter((wave) => wave.spawnEvents.some((event) => event.enemyId === "charger_boss"));
      expect(midBossWaves.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps ordinary enemy budgets halved while elite and boss values stay fixed", () => {
    type Budget = { hp: number; wallDamage: number; gold: number; xp: number };
    const baselineCounts: Array<Record<string, number>> = [
      { walker: 20, runner: 16, tank: 6 }, { walker: 16, runner: 12, tank: 8, armored: 2, charger_boss: 1 },
      { walker: 24, runner: 20, tank: 10 }, { walker: 20, runner: 16, tank: 12, armored: 4 },
      { walker: 24, runner: 24, tank: 12, brute: 2 }, { walker: 28, runner: 24, tank: 16, armored: 2, brute: 2 },
      { walker: 24, runner: 20, tank: 20, armored: 2, brute: 2, overlord_boss: 1 },
    ];
    const baselineStats: Record<string, Budget> = {
      walker: { hp: 18, wallDamage: 2.5, gold: 0.5, xp: 0.5 }, runner: { hp: 12, wallDamage: 2, gold: 0.5, xp: 0.5 }, tank: { hp: 55, wallDamage: 6, gold: 1, xp: 1.5 },
      armored: { hp: 45, wallDamage: 4, gold: 3, xp: 1.5 }, brute: { hp: 70, wallDamage: 9, gold: 3, xp: 2.5 }, charger_boss: { hp: 280, wallDamage: 28, gold: 20, xp: 12 }, overlord_boss: { hp: 720, wallDamage: 48, gold: 0, xp: 24 },
    };
    const currentStats = Object.fromEntries(starterCatalog.enemies.map((enemy) => [enemy.id, { hp: enemy.maxHp, wallDamage: enemy.wallDamage, gold: enemy.goldReward, xp: enemy.xpReward }])) as Record<string, Budget>;
    const total = (counts: Record<string, number>, stats: Record<string, Budget>, key: keyof Budget) => Object.entries(counts).reduce((sum, [id, count]) => sum + stats[id]![key] * count, 0);
    const formalBudgets: Budget[] = [
      { hp: 252, wallDamage: 35, gold: 7, xp: 7 },
      { hp: 354, wallDamage: 51.5, gold: 11, xp: 11 },
      { hp: 626, wallDamage: 83.5, gold: 17, xp: 19 },
    ];
    for (const [waveIndex, expected] of formalBudgets.entries()) {
      for (const key of ["hp", "wallDamage", "gold", "xp"] as const) expect(total(EXPECTED_WAVE_COUNTS_BY_LEVEL.first_defense![waveIndex]!, currentStats, key)).toBe(expected[key]);
    }
    for (const [offset, counts] of EXPECTED_WAVE_COUNTS_BY_LEVEL.first_defense!.slice(3).entries()) {
      const waveIndex = offset + 3;
      expect(Object.values(counts).reduce((sum, value) => sum + value, 0)).toBeGreaterThanOrEqual(Object.values(baselineCounts[offset]!).reduce((sum, value) => sum + value, 0) * 1.9);
      for (const key of ["hp", "wallDamage", "gold", "xp"] as const) {
        const ratio = total(counts, currentStats, key) / total(baselineCounts[offset]!, baselineStats, key);
        expect(ratio).toBeGreaterThanOrEqual(0.95);
        expect(ratio).toBeLessThanOrEqual(1.05);
      }
    }
    expect(Object.fromEntries(starterCatalog.enemies.filter((enemy) => enemy.tier !== "normal").map((enemy) => [enemy.id, currentStats[enemy.id]]))).toEqual({
      armored: { hp: 45, wallDamage: 4, gold: 3, xp: 1.5 }, brute: { hp: 70, wallDamage: 9, gold: 3, xp: 2.5 }, charger_boss: { hp: 280, wallDamage: 28, gold: 20, xp: 12 }, overlord_boss: { hp: 720, wallDamage: 48, gold: 0, xp: 24 },
    });
  });

  it("derives the final-wave tail from the catalog's unique final boss flag", () => {
    const reassignedFinalBoss = starterCatalog.enemies.map((enemy) => {
      if (enemy.id === "overlord_boss") return { ...enemy, isFinalBoss: undefined };
      if (enemy.id === "charger_boss") return { ...enemy, isFinalBoss: true };
      return enemy;
    });
    expect(() => validateCatalog({ ...starterCatalog, enemies: reassignedFinalBoss })).toThrow("final boss");
  });

  it("rejects unknown references, shifted starts, drifted pulse intervals, and broken level timelines", () => {
    const first = starterCatalog.levelWaves.first_defense!;
    const wave = first[0]!;
    const replaceLevel = (mutate: (waves: typeof first) => typeof first) => ({ ...starterCatalog, levelWaves: { ...starterCatalog.levelWaves, first_defense: mutate(first) } });
    expect(() => validateCatalog(replaceLevel((waves) => waves.map((candidate, index) => index === 0 ? { ...candidate, spawnEvents: candidate.spawnEvents.map((event, eventIndex) => eventIndex === 0 ? { ...event, enemyId: "missing" } : event) } : candidate)))).toThrow("references unknown enemy");
    expect(() => validateCatalog(replaceLevel((waves) => waves.map((candidate, index) => index === 1 ? { ...candidate, startSeconds: 61 } : candidate)))).toThrow("invalid fixed-timeline start");
    expect(() => validateCatalog(replaceLevel((waves) => waves.map((candidate, index) => index === 0 ? { ...candidate, pulseIntervalSeconds: 2.6 } : candidate)))).toThrow("pulse interval");
    expect(() => validateCatalog(replaceLevel((waves) => waves.slice(0, 9)))).toThrow("exactly 10 waves");
    expect(() => validateCatalog({ ...starterCatalog, levelWaves: { ...starterCatalog.levelWaves, broken_valley: [] } })).toThrow("no wave timeline");
    expect(wave.spawnEvents.length).toBeGreaterThan(0);
  });
});
