import { describe, expect, it } from "vitest";
import { createSiegeDemoSession, prepareSiegeDemo } from "../../src/three/siegeDemo";

describe("siege product demonstration through BattleSession", () => {
  it("rebuilds the same paid three-tier demonstration after an ordinary restart", () => {
    const session = createSiegeDemoSession();
    const initial = structuredClone(session.getState());
    expect(session.dispatch({ type: "restart" }).accepted).toBe(true);
    expect(session.getState().phase).toBe("OPENING_COUNTDOWN");
    expect(session.getState().buildings).not.toEqual(initial.buildings);
    prepareSiegeDemo(session);
    expect(session.getState()).toEqual(initial);
    session.dispose();
  });

  it("replays paid transformations and three-tier growth, then fights and freezes real mixed waves", () => {
    const session = createSiegeDemoSession();
    const initial = session.getState();
    expect(initial.phase).toBe("TACTICAL_PAUSE");
    expect(initial.wallHp).toBeGreaterThan(0);
    expect(initial.buildings.filter((building) => building.growthDefinitionId === "machine_gun").map((building) => building.level)).toEqual([1, 3, 5]);
    expect(initial.buildings.filter((building) => building.growthDefinitionId === "cannon").map((building) => building.level)).toEqual([1, 3, 5]);
    expect(initial.gold).toBeGreaterThanOrEqual(0);
    expect(initial.wood).toBeGreaterThanOrEqual(0);
    session.dispatch({ type: "resume" });
    const events = [];
    for (let step = 0; step < 30*20; step += 1) { session.advance(1/30); events.push(...session.drainEvents()); }
    expect(events).toContainEqual(expect.objectContaining({ type: "tower_attack", towerDefinitionId: "machine_gun" }));
    expect(events).toContainEqual(expect.objectContaining({ type: "tower_attack", towerDefinitionId: "cannon" }));
    expect(events).toContainEqual(expect.objectContaining({ type: "tower_special", effect: "穿透" }));
    expect(events).toContainEqual(expect.objectContaining({ type: "enemy_burned" }));
    session.dispatch({ type: "pause" });
    const frozen = structuredClone(session.getState());
    session.advance(10);
    expect(session.getState()).toEqual(frozen);
    expect(session.drainEvents()).toEqual([]);
    session.dispose();
  });
});
