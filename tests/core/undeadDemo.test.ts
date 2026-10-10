import { expect, it } from "vitest";
import { BattleSession } from "../../src/core/battleSession";
import { prepareUndeadDemo } from "../../src/three/undeadDemo";

it("replays ordinary construction into a paused formal mixed-undead wave without state mutation", () => {
  const session = new BattleSession({ seed: 1337, config: { heroId: "camp_warden", levelId: "first_defense" } });
  prepareUndeadDemo(session);
  const state = session.getState();
  expect(state.phase).toBe("TACTICAL_PAUSE");
  expect(state.wave).toBe(10);
  expect(new Set(state.enemies.map((enemy) => enemy.definitionId))).toEqual(new Set(["walker", "runner", "tank", "armored", "brute"]));
  expect(state.enemies.some((enemy) => enemy.atWall)).toBe(true);
  expect(state.wallHp).toBeGreaterThan(0);
  session.dispatch({ type: "resume" });
  const events = [];
  for (let step = 0; step < 180; step += 1) {
    session.advance(1 / 30);
    events.push(...session.drainEvents());
  }
  expect(events.some((event) => event.type === "enemy_wall_attack")).toBe(true);
  expect(events.some((event) => event.type === "enemy_hit")).toBe(true);
  expect(events.some((event) => event.type === "enemy_defeated")).toBe(true);
});
