import { describe, expect, it } from "vitest";
import { battlePressureCatalog, createBattlePressureSession } from "../../src/three/battlePressureConfig";
import { validateCatalog } from "../../src/core/content";

describe("mixed battle pressure through BattleSession", () => {
  it("keeps exactly 200 live formal enemies and 15 occupied plots under real sustained attacks", () => {
    const session = createBattlePressureSession(200);
    const events = [];
    for (let step = 0; step < 900; step += 1) {
      session.advance(1 / 30);
      events.push(...session.drainEvents());
    }
    const state = session.getState();
    expect(state.enemies).toHaveLength(200);
    expect(state.buildings).toHaveLength(15);
    expect(new Set(state.enemies.map((enemy) => enemy.definitionId))).toEqual(new Set(["walker", "runner", "tank", "armored", "brute", "charger_boss", "overlord_boss"]));
    expect(state.phase).toBe("RUNNING");
    expect(events.some((event) => event.type === "tower_attack")).toBe(true);
    expect(events.some((event) => event.type === "enemy_wall_attack")).toBe(true);
    expect(events.some((event) => event.type === "enemy_charge_warning")).toBe(true);
    expect(events.some((event) => event.type === "overlord_inspire")).toBe(true);
    expect(events.some((event) => event.type === "tower_special" && event.effect === "弹射")).toBe(true);
    expect(state.enemies.some((enemy) => enemy.growthSlowStates?.length)).toBe(true);
  });
  it("retains all requested 100/300 units, freezes without backlog and restores the same state across display frame rates", () => {
    for (const count of [100, 300] as const) {
      const slow = createBattlePressureSession(count), fast = createBattlePressureSession(count);
      for (let step = 0; step < 300; step += 1) { slow.advance(1 / 30); fast.advance(1 / 60); fast.advance(1 / 60); }
      expect(slow.getState().enemies).toHaveLength(count);
      expect(fast.getState()).toEqual(slow.getState());
      expect(fast.drainEvents()).toEqual(slow.drainEvents());
      fast.dispatch({ type: "pause" }); fast.dispatch({ type: "system_pause" });
      const frozen = structuredClone(fast.getState());
      fast.advanceFrame(500_000); fast.advance(600);
      expect(fast.getState()).toEqual(frozen);
      fast.dispatch({ type: "system_resume" });
      expect(fast.getState().phase).toBe("TACTICAL_PAUSE");
      fast.dispatch({ type: "resume" });
      expect(fast.advanceFrame(600_000)).toBe(0);
      slow.advance(1 / 30); fast.advanceFrame(600_034);
      expect(fast.getState()).toEqual(slow.getState());
    }
  });
  it("keeps formal composition validation mandatory without the explicit pressure marker", () => {
    const catalog = battlePressureCatalog(100);
    delete catalog.developmentPressure;
    expect(() => validateCatalog(catalog)).toThrow(/requires exactly 10 waves/);
  });
});
