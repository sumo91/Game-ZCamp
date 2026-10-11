import { expect, it } from "vitest";
import { BattleSession } from "../../src/core/battleSession";
import { starterCatalog } from "../../src/core/content";

it("reports the actual charge direction and duration while pause preserves the warning", () => {
  const session = new BattleSession({ catalog: {
    ...starterCatalog,
    enemies: starterCatalog.enemies.map((enemy) => ({ ...enemy, wallDamage: 0 })),
  } });
  let warning;
  for (let step = 0; step < 9000; step += 1) {
    session.advance(1 / 30);
    warning = session.drainEvents().find((event) => event.type === "enemy_charge_warning");
    if (warning) break;
  }
  expect(warning).toMatchObject({ type: "enemy_charge_warning", durationSeconds: 2, targetPosition: 1 });
  const before = structuredClone(session.getState());
  session.dispatch({ type: "pause" });
  session.dispatch({ type: "system_pause" });
  session.advance(600);
  expect(session.getState().enemies).toEqual(before.enemies);
  expect(session.drainEvents()).toEqual([]);
  session.dispatch({ type: "system_resume" });
  expect(session.getState().phase).toBe("TACTICAL_PAUSE");
  session.dispatch({ type: "resume" });
  const events = [];
  for (let step = 0; step < 61; step += 1) {
    session.advance(1 / 30);
    events.push(...session.drainEvents());
  }
  expect(events.find((event) => event.type === "enemy_charge_started")).toMatchObject({ targetPosition: 1, durationSeconds: .8 });
  expect(session.getState().enemies.find((enemy) => enemy.definitionId === "charger_boss")!.chargeRemainingSeconds).toBeGreaterThan(0);
});

it("reports the Boss attack that actually deducts wall durability", () => {
  const session = new BattleSession({ catalog: {
    ...starterCatalog,
    enemies: starterCatalog.enemies.map((enemy) => ({ ...enemy, wallDamage: enemy.id === "charger_boss" ? enemy.wallDamage : 0 })),
  } });
  let attack;
  for (let step = 0; step < 9200; step += 1) {
    session.advance(1 / 30);
    attack = session.drainEvents().find((event) => event.type === "enemy_wall_attack" && event.damage > 0);
    if (attack) break;
  }
  expect(attack).toMatchObject({ type: "enemy_wall_attack", damage: 28, position: 1 });
  expect(session.getState().wallHp).toBe(72);
});
