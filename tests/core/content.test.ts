import { describe, expect, it } from "vitest";
import {
  EXPECTED_WAVE_COUNTS,
  FIRST_BATCH_CARD_IDS,
  CROWD_PULSE_COUNT,
  CROWD_PULSE_INTERVAL_SECONDS,
  CROWD_PULSE_WINDOW_SECONDS,
  SUPPLY_CATEGORY_PATTERN,
  starterCatalog,
  validateCatalog,
} from "../../src/core/content";

describe("third-stage content catalog", () => {
  it("accepts the exact 22-card pool and formal ten-wave timeline", () => {
    expect(() => validateCatalog(starterCatalog)).not.toThrow();
    expect(starterCatalog.waves).toHaveLength(10);
    expect(starterCatalog.cards).toHaveLength(22);
    expect(starterCatalog.cards.filter((card) => card.category === "base")).toHaveLength(6);
    expect(starterCatalog.cards.filter((card) => card.category === "permanent")).toHaveLength(12);
    expect(starterCatalog.cards.filter((card) => card.category === "tactical")).toHaveLength(4);
    expect(new Set(starterCatalog.cards.map((card) => card.id)).size).toBe(22);
    expect(SUPPLY_CATEGORY_PATTERN).toHaveLength(12);
    expect(FIRST_BATCH_CARD_IDS.slice(0, 4)).toEqual(["machine_gun", "cannon", "lumberyard", "frost"]);

    for (const [index, wave] of starterCatalog.waves.entries()) {
      const counts = wave.spawnEvents.reduce((result, event) => {
        result[event.enemyId] = (result[event.enemyId] ?? 0) + 1;
        return result;
      }, {} as Record<string, number>);
      expect(counts).toEqual(EXPECTED_WAVE_COUNTS[index]);
      const buckets = new Set(wave.spawnEvents.map((event) => event.atSeconds < 10 ? 0 : event.atSeconds < 20 ? 1 : event.atSeconds < 30 ? 2 : 3));
      const times = wave.spawnEvents.map((event) => event.atSeconds);
      expect(buckets.size).toBe(4);
      expect(Math.max(...times)).toBeGreaterThanOrEqual(30);
      expect(Math.max(...times)).toBeLessThanOrEqual(40);
      expect(times.every((time, eventIndex) => time >= 0 && time <= 40 && (eventIndex === 0 || time >= times[eventIndex - 1]!))).toBe(true);
      const gaps = times.slice(1).map((time, eventIndex) => time - times[eventIndex]!);
      expect(Math.max(...gaps)).toBeLessThanOrEqual(CROWD_PULSE_INTERVAL_SECONDS);
      const nonBossEvents = wave.spawnEvents.filter((event) => !event.enemyId.endsWith("_boss"));
      expect(nonBossEvents.at(-1)!.atSeconds).toBeGreaterThanOrEqual(39);
      expect(nonBossEvents.at(-1)!.atSeconds).toBeLessThan(39.5);
      const pulses = new Map<number, number[]>();
      for (const event of nonBossEvents) {
        const pulseIndex = Math.round(event.atSeconds / CROWD_PULSE_INTERVAL_SECONDS);
        const pulse = pulses.get(pulseIndex) ?? [];
        pulse.push(event.atSeconds);
        pulses.set(pulseIndex, pulse);
      }
      expect([...pulses.keys()]).toEqual(Array.from({ length: CROWD_PULSE_COUNT }, (_, pulseIndex) => pulseIndex));
      for (const [pulseIndex, pulseTimes] of pulses) {
        expect(Math.max(...pulseTimes) - Math.min(...pulseTimes)).toBeLessThanOrEqual(CROWD_PULSE_WINDOW_SECONDS + 0.000001);
        expect(Math.min(...pulseTimes)).toBeGreaterThanOrEqual(pulseIndex * CROWD_PULSE_INTERVAL_SECONDS);
      }
      for (const intervalStart of [0, 10, 20, 30]) {
        expect(nonBossEvents.some((event) => event.atSeconds >= intervalStart && event.atSeconds < intervalStart + 10)).toBe(true);
      }
      if (index === 0) {
        expect([...pulses.values()].map((pulseTimes) => pulseTimes.length)).toEqual([3, 3, ...Array.from({ length: 14 }, () => 2)]);
      }
    }
    expect(starterCatalog.waves[4]?.spawnEvents.at(-1)).toMatchObject({ enemyId: "charger_boss", atSeconds: 39.5 });
    expect(starterCatalog.waves[9]?.spawnEvents.at(-1)).toMatchObject({ enemyId: "overlord_boss", atSeconds: 39.5 });
  });

  it("locks third-stage costs, rewards, and effect parameters", () => {
    const cards = new Map(starterCatalog.cards.map((card) => [card.id, card]));
    expect(Object.fromEntries(["machine_gun", "cannon", "frost", "electric", "lumberyard", "repair_shop"].map((id) => [id, cards.get(id)!.cost]))).toEqual({ machine_gun: 40, cannon: 65, frost: 55, electric: 85, lumberyard: 60, repair_shop: 60 });
    for (const id of ["wood_efficiency", "wall_reinforcement", "repair_mastery", "tower_synergy"]) expect(cards.get(id)!.cost).toBe(24);
    for (const card of starterCatalog.cards.filter((card) => card.category === "permanent" && "towerId" in card.effect)) expect(card.cost).toBe(18);
    for (const card of starterCatalog.cards.filter((card) => card.category === "tactical")) expect(card.cost).toBeGreaterThanOrEqual(8);
    for (const card of starterCatalog.cards.filter((card) => card.category === "tactical")) expect(card.cost).toBeLessThanOrEqual(12);
    expect(starterCatalog.enemies.map((enemy) => [enemy.id, enemy.goldReward])).toEqual([["walker", 0.25], ["runner", 0.25], ["tank", 0.5], ["armored", 3], ["brute", 3], ["charger_boss", 20], ["overlord_boss", 0]]);
    expect(cards.get("machine_boss_damage")!.effect).toMatchObject({ kind: "tower_boss_damage", amount: 0.35 });
    expect(cards.get("focus_fire")!.effect).toMatchObject({ kind: "focus_fire", damageMultiplier: 0.5 });
  });

  it("runs the second crowd-density experiment without changing wave budgets", () => {
    const baselineCounts: Array<Record<string, number>> = [
      { walker: 17 }, { walker: 16, runner: 8 }, { walker: 16, runner: 12, tank: 4 },
      { walker: 20, runner: 16, tank: 6 }, { walker: 16, runner: 12, tank: 8, armored: 2, charger_boss: 1 },
      { walker: 24, runner: 20, tank: 10 }, { walker: 20, runner: 16, tank: 12, armored: 4 },
      { walker: 24, runner: 24, tank: 12, brute: 2 }, { walker: 28, runner: 24, tank: 16, armored: 2, brute: 2 },
      { walker: 24, runner: 20, tank: 20, armored: 2, brute: 2, overlord_boss: 1 },
    ];
    const baselineStats: Record<string, { hp: number; wall: number; gold: number; xp: number }> = {
      walker: { hp: 18, wall: 2.5, gold: 0.5, xp: 0.5 }, runner: { hp: 12, wall: 2, gold: 0.5, xp: 0.5 }, tank: { hp: 55, wall: 6, gold: 1, xp: 1.5 },
      armored: { hp: 45, wall: 4, gold: 3, xp: 1.5 }, brute: { hp: 70, wall: 9, gold: 3, xp: 2.5 },
      charger_boss: { hp: 280, wall: 28, gold: 20, xp: 12 }, overlord_boss: { hp: 720, wall: 48, gold: 0, xp: 24 },
    };
    const experimentStats = Object.fromEntries(starterCatalog.enemies.map((enemy) => [enemy.id, { hp: enemy.maxHp, wall: enemy.wallDamage, gold: enemy.goldReward, xp: enemy.xpReward }]));
    const total = (counts: Record<string, number>, stats: Record<string, { hp: number; wall: number; gold: number; xp: number }>, key: "hp" | "wall" | "gold" | "xp") =>
      Object.entries(counts).reduce((sum, [id, count]) => sum + stats[id]![key] * count, 0);
    for (const [index, experimentCounts] of EXPECTED_WAVE_COUNTS.entries()) {
      expect(Object.values(experimentCounts).reduce((sum, count) => sum + count, 0)).toBeGreaterThanOrEqual(Object.values(baselineCounts[index]!).reduce((sum, count) => sum + count, 0) * 1.9);
      for (const key of ["hp", "wall", "gold", "xp"] as const) {
        const ratio = total(experimentCounts, experimentStats, key) / total(baselineCounts[index]!, baselineStats, key);
        expect(ratio).toBeGreaterThanOrEqual(0.95);
        expect(ratio).toBeLessThanOrEqual(1.05);
      }
    }
    expect(Object.fromEntries(starterCatalog.enemies.filter((enemy) => enemy.tier !== "normal").map((enemy) => [enemy.id, [enemy.maxHp, enemy.wallDamage, enemy.goldReward, enemy.xpReward]]))).toEqual({
      armored: [45, 4, 3, 1.5], brute: [70, 9, 3, 2.5], charger_boss: [280, 28, 20, 12], overlord_boss: [720, 48, 0, 24],
    });
  });

  it("rejects unknown enemy references before composition checks", () => {
    const wave = starterCatalog.waves[0]!;
    expect(() => validateCatalog({ ...starterCatalog, waves: starterCatalog.waves.map((candidate, index) => index === 0 ? { ...candidate, spawnEvents: candidate.spawnEvents.map((event, eventIndex) => eventIndex === 0 ? { ...event, enemyId: "missing" } : event) } : candidate) })).toThrow("references unknown enemy");
  });

  it("rejects non-ten-wave timelines and shifted starts", () => {
    expect(() => validateCatalog({ ...starterCatalog, waves: starterCatalog.waves.slice(0, 9) })).toThrow("exactly 10 waves");
    expect(() => validateCatalog({ ...starterCatalog, waves: starterCatalog.waves.map((wave, index) => index === 1 ? { ...wave, startSeconds: 61 } : wave) })).toThrow("invalid fixed-timeline start");
  });

  it("rejects category and effect-family mismatches", () => {
    expect(() => validateCatalog({ ...starterCatalog, cards: starterCatalog.cards.map((card) => card.id === "wood_efficiency" ? { ...card, effect: { kind: "wall_shield", amount: 30, durationSeconds: 12 } } : card) })).toThrow("Permanent card wood_efficiency");
    expect(() => validateCatalog({ ...starterCatalog, cards: starterCatalog.cards.map((card) => card.id === "wall_shield" ? { ...card, effect: { kind: "wood_income", amountPerSecond: 0.5 } } : card) })).toThrow("Tactical card wall_shield");
    expect(() => validateCatalog({ ...starterCatalog, cards: starterCatalog.cards.map((card) => card.id === "machine_gun" ? { ...card, effect: { kind: "wood_income", amountPerSecond: 0.5 } } : card) })).toThrow("Base card machine_gun");
  });

  it("rejects duplicate effect families and invisible card content", () => {
    expect(() => validateCatalog({ ...starterCatalog, cards: starterCatalog.cards.map((card) => card.id === "machine_boss_damage" ? { ...card, effect: { kind: "tower_penetration", towerId: "machine_gun", amount: 1 } } : card) })).toThrow("Permanent card effects");
    expect(() => validateCatalog({ ...starterCatalog, cards: starterCatalog.cards.map((card) => card.id === "focus_fire" ? { ...card, role: " " } : card) })).toThrow("visible name and role");
  });

  it("rejects invalid enemy signature abilities", () => {
    expect(() => validateCatalog({ ...starterCatalog, enemies: starterCatalog.enemies.map((enemy) => enemy.id === "overlord_boss" ? { ...enemy, damageMultiplier: 0.5 } : enemy) })).toThrow("Only armored elite");
    expect(() => validateCatalog({ ...starterCatalog, enemies: starterCatalog.enemies.map((enemy) => enemy.id === "brute" ? { ...enemy, damageMultiplier: 0.5 } : enemy) })).toThrow("Only armored elite");
  });

  it("rejects a final boss that is not the last wave-ten event", () => {
    const finalWave = starterCatalog.waves[9]!;
    const first = finalWave.spawnEvents[0]!;
    const last = finalWave.spawnEvents.at(-1)!;
    const swappedEvents = [{ ...first, enemyId: last.enemyId }, ...finalWave.spawnEvents.slice(1, -1), { ...last, enemyId: first.enemyId }];
    expect(() => validateCatalog({ ...starterCatalog, waves: starterCatalog.waves.map((wave, index) => index === 9 ? { ...wave, spawnEvents: swappedEvents } : wave) })).toThrow("final boss must be the last");
  });
});
