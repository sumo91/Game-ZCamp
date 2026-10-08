import { describe, expect, it } from "vitest";
import { BattleSession } from "../../src/core/battleSession";
import { GameSimulation } from "../../src/core/game";

describe("BattleSession", () => {
  it("charges one arrow tower once when a build click is repeated", () => {
    const session = new BattleSession({ seed: 1337 });
    const command = { type: "build_building", slotId: "slot-r1-c1", definitionId: "arrow_tower" } as const;
    expect(session.dispatch(command).accepted).toBe(true);
    expect(session.dispatch(command).accepted).toBe(false);
    expect(session.getState().wood).toBe(80);
    expect(session.getState().buildings.map((building) => building.slotId)).toEqual(["slot-r3-c3", "slot-r1-c1"]);
    expect(session.drainEvents()).toEqual([
      { type: "building_built", buildingId: "growth-slot-r1-c1", slotId: "slot-r1-c1", definitionId: "arrow_tower" },
    ]);
    expect(session.drainEvents()).toEqual([]);
  });

  it("replays the same commands at the same fixed steps across display frame rates", () => {
    const slow = new BattleSession({ seed: 41, config: { heroId: "camp_warden", levelId: "first_defense" } });
    const fast = new BattleSession({ seed: 41, config: { heroId: "camp_warden", levelId: "first_defense" } });
    const baseline = new GameSimulation(undefined, 41, { heroId: "camp_warden", levelId: "first_defense" });
    for (const session of [slow, fast, baseline]) {
      session.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "arrow_tower" });
    }
    for (let index = 0; index < 900; index += 1) {
      slow.advance(1 / 30);
      fast.advance(1 / 60);
      fast.advance(1 / 60);
      baseline.tick(1 / 30);
      if (index === 300) {
        for (const session of [slow, fast, baseline]) session.dispatch({ type: "build_building", slotId: "slot-r2-c5", definitionId: "lumberyard" });
      }
    }
    expect(slow.getStepIndex()).toBe(900);
    expect(fast.getState()).toEqual(slow.getState());
    expect(slow.getState()).toEqual(baseline.getState());
    const events = slow.drainEvents();
    expect(events.some((event) => event.type === "tower_attack")).toBe(true);
    expect(events.some((event) => event.type === "enemy_defeated")).toBe(true);
    expect(slow.getState().gold).toBeGreaterThan(0);
    expect(fast.drainEvents()).toEqual(events);
    expect(baseline.drainEvents()).toEqual(events);
  });

  it("freezes resources and steps through tactical/background pause and discards partial time", () => {
    const session = new BattleSession();
    for (let index = 0; index < 180; index += 1) session.advance(1 / 30);
    session.advance(1 / 60);
    session.dispatch({ type: "pause" });
    const paused = structuredClone(session.getState());
    expect(session.advance(60)).toBe(0);
    expect(session.getStepIndex()).toBe(180);
    expect(session.getState()).toEqual(paused);
    // Building is still allowed in tactical pause and incurs the normal cost.
    expect(session.dispatch({ type: "build_building", slotId: "slot-r2-c1", definitionId: "arrow_tower" }).accepted).toBe(true);
    session.dispatch({ type: "system_pause" });
    const hidden = structuredClone(session.getState());
    session.advance(600);
    expect(session.getState()).toEqual(hidden);
    expect(session.dispatch({ type: "build_building", slotId: "slot-r2-c2", definitionId: "arrow_tower" }).accepted).toBe(false);
    session.dispatch({ type: "system_resume" });
    expect(session.getState().phase).toBe("TACTICAL_PAUSE");
    session.dispatch({ type: "resume" });
    expect(session.advance(1 / 60)).toBe(0);
    expect(session.getStepIndex()).toBe(180);
    expect(session.advance(1 / 60)).toBe(1);
  });

  it("limits a stalled frame to five steps and starts background return from a fresh timestamp", () => {
    const session = new BattleSession();
    expect(session.advanceFrame(1000)).toBe(0);
    expect(session.advanceFrame(31000)).toBe(5);
    expect(session.getState().openingCountdownRemainingSeconds).toBeCloseTo(4 + 5 / 6);
    session.dispatch({ type: "system_pause" });
    session.advanceFrame(50000);
    session.dispatch({ type: "system_resume" });
    expect(session.advanceFrame(90000)).toBe(0);
    expect(session.getStepIndex()).toBe(5);
    expect(session.advanceFrame(90034)).toBe(1);
    expect(session.getStepIndex()).toBe(6);
  });

  it("resumes the trait draft after background return and clears old battle work on restart/dispose", () => {
    const session = new BattleSession();
    const built = session.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "arrow_tower" });
    session.dispatch({ type: "upgrade_building", buildingId: built.buildingId! });
    const draft = structuredClone(session.getState().pendingTraitDraft!);
    session.dispatch({ type: "system_pause" });
    session.advance(30);
    session.dispatch({ type: "system_resume" });
    expect(session.getState().phase).toBe("TRAIT_DRAFT");
    expect(session.getState().pendingTraitDraft).toEqual(draft);
    session.dispatch({ type: "choose_building_trait", buildingId: draft.buildingId, traitDefinitionId: draft.options[0] });
    expect(session.getState().phase).toBe("OPENING_COUNTDOWN");
    session.advance(1 / 30);
    session.dispatch({ type: "restart" });
    expect(session.getStepIndex()).toBe(0);
    expect(session.drainEvents()).toEqual([]);
    expect(session.getState().wood).toBe(120);
    session.dispose();
    expect(session.advance(1)).toBe(0);
    expect(session.dispatch({ type: "restart" }).accepted).toBe(false);
  });
});
