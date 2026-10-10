import { describe, expect, it } from "vitest";
import { BattleFeedback } from "../../src/three/BattleFeedback";
import { createSiegeDemoSession } from "../../src/three/siegeDemo";

describe("Three.js battle feedback from real session frames", () => {
  it("shows heavy siege hits and classified effects, then freezes them with the session", () => {
    const session = createSiegeDemoSession();
    const feedback = new BattleFeedback();
    session.dispatch({ type: "resume" });
    let sawDamage = false;
    let sawBurn = false;
    let sawPenetration = false;
    for (let step = 0; step < 30 * 20; step += 1) {
      const steps = session.advance(1 / 30);
      const events = session.drainEvents();
      feedback.advance(events, steps / 30, session.getState().phase);
      const view = feedback.view();
      for (const number of view.numbers) {
        expect(number.damage).toBeGreaterThanOrEqual(15);
        sawDamage ||= events.some((event) => event.type === "enemy_hit" && event.enemyId === number.enemyId && event.damage === number.damage);
      }
      sawBurn ||= view.notices.some((notice) => notice.text.startsWith("燃烧"));
      sawPenetration ||= view.notices.some((notice) => notice.text === "穿透命中");
    }
    expect([sawDamage, sawBurn, sawPenetration]).toEqual([true, true, true]);
    session.dispatch({ type: "pause" });
    const frozen = feedback.view();
    feedback.advance(session.drainEvents(), session.advance(60) / 30, session.getState().phase);
    expect(feedback.view()).toEqual(frozen);
    feedback.reset();
    expect(feedback.view()).toEqual({ numbers: [], notices: [] });
    session.dispose();
  });

  it("throttles ambient repeats without suppressing wave and charge warnings, and clears the terminal screen", () => {
    const feedback = new BattleFeedback();
    const burn = { type: "enemy_burned", enemyId: "walker-1", position: .5, damagePerSecond: 7, durationSeconds: 3, areaRadius: .18 } as const;
    feedback.advance([burn], 0, "RUNNING");
    const first = feedback.view().notices[0]!.id;
    feedback.advance([burn, { type: "wave_started", wave: 3 }, { type: "enemy_charge_warning", enemyId: "boss", position: .4, durationSeconds: 2, targetPosition: .95 }], .5, "RUNNING");
    expect(feedback.view().notices.map((notice) => notice.channel).sort()).toEqual(["ambient", "global", "warning"]);
    expect(feedback.view().notices.find((notice) => notice.channel === "ambient")!.id).toBe(first);
    feedback.advance([burn], .41, "RUNNING");
    expect(feedback.view().notices.find((notice) => notice.channel === "ambient")!.id).not.toBe(first);
    feedback.advance([], 0, "DEFEAT");
    expect(feedback.view()).toEqual({ numbers: [], notices: [] });
  });
});
