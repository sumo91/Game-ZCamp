import { describe, expect, it } from "vitest";
import {
  CROWD_PULSE_COUNT,
  CROWD_PULSE_INTERVAL_SECONDS,
  CROWD_PULSE_WINDOW_SECONDS,
  EXPECTED_WAVE_COUNTS,
  starterCatalog,
  validateCatalog,
} from "../../src/core/content";

describe("growth candidate content", () => {
  it("contains only the deterministic ten-wave growth timeline", () => {
    expect(() => validateCatalog(starterCatalog)).not.toThrow();
    expect(starterCatalog.waves).toHaveLength(10);
    for (const [index, wave] of starterCatalog.waves.entries()) {
      const counts = wave.spawnEvents.reduce((result, event) => {
        result[event.enemyId] = (result[event.enemyId] ?? 0) + 1;
        return result;
      }, {} as Record<string, number>);
      expect(counts).toEqual(EXPECTED_WAVE_COUNTS[index]);
      const crowd = wave.spawnEvents.filter((event) => !event.enemyId.endsWith("_boss"));
      expect(new Set(crowd.map((event) => Math.floor(event.atSeconds / 10))).size).toBe(4);
      expect(crowd.at(-1)!.atSeconds).toBeGreaterThanOrEqual(39);
      const pulses = new Map<number, number[]>();
      for (const event of crowd) {
        const pulseIndex = Math.round(event.atSeconds / CROWD_PULSE_INTERVAL_SECONDS);
        const times = pulses.get(pulseIndex) ?? [];
        times.push(event.atSeconds);
        pulses.set(pulseIndex, times);
      }
      expect(pulses.size).toBe(CROWD_PULSE_COUNT);
      for (const [pulseIndex, times] of pulses) {
        expect(Math.max(...times) - Math.min(...times)).toBeLessThanOrEqual(CROWD_PULSE_WINDOW_SECONDS + 0.000001);
        expect(Math.min(...times)).toBeGreaterThanOrEqual(pulseIndex * CROWD_PULSE_INTERVAL_SECONDS);
      }
      expect(wave.spawnEvents.every((event, eventIndex) => event.atSeconds >= 0 && event.atSeconds <= 40 && (eventIndex === 0 || event.atSeconds >= wave.spawnEvents[eventIndex - 1]!.atSeconds))).toBe(true);
    }
    expect(starterCatalog.waves[4]!.spawnEvents.at(-1)).toEqual({ atSeconds: 39.5, enemyId: "charger_boss" });
    expect(starterCatalog.waves[9]!.spawnEvents.at(-1)).toEqual({ atSeconds: 39.5, enemyId: "overlord_boss" });
  });

  it("keeps ordinary enemy budgets halved while elite and boss values stay fixed", () => {
    const baselineCounts: Array<Record<string, number>> = [
      { walker: 17 }, { walker: 16, runner: 8 }, { walker: 16, runner: 12, tank: 4 },
      { walker: 20, runner: 16, tank: 6 }, { walker: 16, runner: 12, tank: 8, armored: 2, charger_boss: 1 },
      { walker: 24, runner: 20, tank: 10 }, { walker: 20, runner: 16, tank: 12, armored: 4 },
      { walker: 24, runner: 24, tank: 12, brute: 2 }, { walker: 28, runner: 24, tank: 16, armored: 2, brute: 2 },
      { walker: 24, runner: 20, tank: 20, armored: 2, brute: 2, overlord_boss: 1 },
    ];
    const baselineStats: Record<string, [number, number, number, number]> = {
      walker: [18, 2.5, 0.5, 0.5], runner: [12, 2, 0.5, 0.5], tank: [55, 6, 1, 1.5],
      armored: [45, 4, 3, 1.5], brute: [70, 9, 3, 2.5], charger_boss: [280, 28, 20, 12], overlord_boss: [720, 48, 0, 24],
    };
    const currentStats = Object.fromEntries(starterCatalog.enemies.map((enemy) => [enemy.id, [enemy.maxHp, enemy.wallDamage, enemy.goldReward, enemy.xpReward]])) as Record<string, [number, number, number, number]>;
    const total = (counts: Record<string, number>, stats: Record<string, [number, number, number, number]>, index: number) => Object.entries(counts).reduce((sum, [id, count]) => sum + stats[id]![index] * count, 0);
    for (const [waveIndex, counts] of EXPECTED_WAVE_COUNTS.entries()) {
      expect(Object.values(counts).reduce((sum, value) => sum + value, 0)).toBeGreaterThanOrEqual(Object.values(baselineCounts[waveIndex]!).reduce((sum, value) => sum + value, 0) * 1.9);
      for (let statIndex = 0; statIndex < 4; statIndex += 1) {
        const ratio = total(counts, currentStats, statIndex) / total(baselineCounts[waveIndex]!, baselineStats, statIndex);
        expect(ratio).toBeGreaterThanOrEqual(0.95);
        expect(ratio).toBeLessThanOrEqual(1.05);
      }
    }
    expect(Object.fromEntries(starterCatalog.enemies.filter((enemy) => enemy.tier !== "normal").map((enemy) => [enemy.id, [enemy.maxHp, enemy.wallDamage, enemy.goldReward, enemy.xpReward]]))).toEqual({
      armored: [45, 4, 3, 1.5], brute: [70, 9, 3, 2.5], charger_boss: [280, 28, 20, 12], overlord_boss: [720, 48, 0, 24],
    });
  });

  it("rejects unknown enemy references and shifted wave starts", () => {
    const wave = starterCatalog.waves[0]!;
    expect(() => validateCatalog({ ...starterCatalog, waves: starterCatalog.waves.map((candidate, index) => index === 0 ? { ...candidate, spawnEvents: candidate.spawnEvents.map((event, eventIndex) => eventIndex === 0 ? { ...event, enemyId: "missing" } : event) } : candidate) })).toThrow("references unknown enemy");
    expect(() => validateCatalog({ ...starterCatalog, waves: starterCatalog.waves.map((candidate, index) => index === 1 ? { ...candidate, startSeconds: 61 } : candidate) })).toThrow("invalid fixed-timeline start");
    expect(() => validateCatalog({ ...starterCatalog, waves: starterCatalog.waves.slice(0, 9) })).toThrow("exactly 10 waves");
    expect(wave.spawnEvents.length).toBeGreaterThan(0);
  });
});
