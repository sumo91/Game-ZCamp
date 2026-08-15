import { describe, expect, it } from "vitest";
import { AMBIENT_NOTICE_MIN_INTERVAL_SECONDS, ThrottleGate, coinFlightLabel, decideResourcePulse, decideWallImpact, deriveWaveBanner, isBossEntrance, mapTowerProjectileStyle, routeBattleNotice, shouldShowDamageNumber } from "../../src/phaser/feedback";

describe("routeBattleNotice", () => {
  it("routes crowd-critical events to the always-on global channel", () => {
    expect(routeBattleNotice({ type: "wave_started", wave: 3 })).toMatchObject({ channel: "global" });
    expect(routeBattleNotice({ type: "overlord_inspire", enemyId: "overlord_boss-1", targetIds: [], durationSeconds: 4, multiplier: 1.25 })).toMatchObject({ channel: "global" });
  });

  it("routes charge events to the warning channel", () => {
    expect(routeBattleNotice({ type: "enemy_charge_warning", enemyId: "charger_boss-1", position: 0.4, durationSeconds: 2 })).toMatchObject({ channel: "warning" });
    expect(routeBattleNotice({ type: "enemy_charge_impact", enemyId: "charger_boss-1", position: 1 })).toMatchObject({ channel: "warning" });
  });

  it("routes high-frequency combat text to the throttled ambient channel with stable keys", () => {
    expect(routeBattleNotice({ type: "enemy_burned", enemyId: "walker-1", position: 0.5, damagePerSecond: 7, durationSeconds: 3, areaRadius: 0.18 })).toMatchObject({ channel: "ambient", throttleKey: "burn" });
    expect(routeBattleNotice({ type: "tower_special", buildingId: "growth-slot-r1-c1", effect: "弹射", targetId: "walker-1" })).toMatchObject({ channel: "ambient", throttleKey: "special:弹射" });
  });

  it("keeps per-hit noise out of the notice channels", () => {
    expect(routeBattleNotice({ type: "tower_attack", buildingId: "growth-slot-r1-c1", towerDefinitionId: "arrow_tower", targetId: "walker-1", targetPosition: 0.5 })).toBeNull();
    expect(routeBattleNotice({ type: "enemy_hit", enemyId: "walker-1", position: 0.5, damage: 3, remainingHp: 5 })).toBeNull();
    expect(routeBattleNotice({ type: "enemy_defeated", enemyId: "walker-1", position: 0.5 })).toBeNull();
  });
});

describe("ThrottleGate", () => {
  it("allows the first hit and blocks repeats inside the interval", () => {
    const gate = new ThrottleGate();
    expect(gate.allow("burn", 10, AMBIENT_NOTICE_MIN_INTERVAL_SECONDS)).toBe(true);
    expect(gate.allow("burn", 10.5, AMBIENT_NOTICE_MIN_INTERVAL_SECONDS)).toBe(false);
  });

  it("allows again once the interval has passed and tracks keys independently", () => {
    const gate = new ThrottleGate();
    expect(gate.allow("burn", 10, 0.9)).toBe(true);
    expect(gate.allow("special:溅射", 10.2, 0.9)).toBe(true);
    expect(gate.allow("burn", 10.91, 0.9)).toBe(true);
  });
});

describe("decideWallImpact", () => {
  it("ignores non-damage", () => {
    expect(decideWallImpact(0, 100)).toBeNull();
    expect(decideWallImpact(-1, 100)).toBeNull();
  });

  it("scales feedback tiers with damage relative to wall durability", () => {
    expect(decideWallImpact(1, 100)).toMatchObject({ tier: "light", shakeIntensity: 0 });
    expect(decideWallImpact(9, 100)).toMatchObject({ tier: "heavy" });
    expect(decideWallImpact(28, 100)).toMatchObject({ tier: "critical", shakeIntensity: expect.any(Number) });
    expect(decideWallImpact(9, 100)!.shakeIntensity).toBeGreaterThan(decideWallImpact(1, 100)!.shakeIntensity);
  });
});

describe("decideResourcePulse", () => {
  it("ignores continuous lumber income deltas per frame", () => {
    expect(decideResourcePulse(120, 120.08)).toBeNull();
    expect(decideResourcePulse(120.4, 120)).toBeNull();
  });

  it("detects spends and big gains", () => {
    expect(decideResourcePulse(120, 80)).toBe("spend");
    expect(decideResourcePulse(0, 20)).toBe("gain");
  });
});

describe("mapTowerProjectileStyle", () => {
  it("gives each tower family a distinct motion language", () => {
    expect(mapTowerProjectileStyle("cannon")).toBe("arc");
    expect(mapTowerProjectileStyle("electric")).toBe("bolt");
    expect(mapTowerProjectileStyle("frost")).toBe("shard");
    expect(mapTowerProjectileStyle("arrow_tower")).toBe("tracer");
    expect(mapTowerProjectileStyle("machine_gun")).toBe("tracer");
  });
});

describe("combat text thresholds", () => {
  it("shows damage numbers only for heavy hits", () => {
    expect(shouldShowDamageNumber(7)).toBe(false);
    expect(shouldShowDamageNumber(35)).toBe(true);
  });

  it("labels coin flights only for meaningful rewards", () => {
    expect(coinFlightLabel(0.25)).toBeNull();
    expect(coinFlightLabel(3)).toBe("+3");
  });
});

describe("deriveWaveBanner", () => {
  it("styles normal, boss, and final waves differently", () => {
    expect(deriveWaveBanner(1, 10)).toMatchObject({ isBossWave: false, color: "#f6c453" });
    expect(deriveWaveBanner(5, 10)).toMatchObject({ isBossWave: true, color: "#f28b37" });
    expect(deriveWaveBanner(10, 10)).toMatchObject({ isBossWave: true, color: "#f06a6a", text: expect.stringContaining("最终决战") });
  });

  it("rejects out-of-range waves", () => {
    expect(deriveWaveBanner(0, 10)).toBeNull();
    expect(deriveWaveBanner(11, 10)).toBeNull();
  });
});

describe("isBossEntrance", () => {
  it("matches only catalog boss ids", () => {
    expect(isBossEntrance("charger_boss", ["charger_boss", "overlord_boss"])).toBe(true);
    expect(isBossEntrance("walker", ["charger_boss", "overlord_boss"])).toBe(false);
  });
});
