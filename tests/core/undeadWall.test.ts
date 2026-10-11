import { expect, it } from "vitest";
import { BattleSession } from "../../src/core/battleSession";
import { starterCatalog } from "../../src/core/content";

it("reports each mixed undead wall strike once after the unchanged shield and wall settlement", () => {
  const session = new BattleSession();
  for (let step = 0; step < 150; step += 1) session.advance(1 / 30);
  const state = session.getState();
  state.waveSpawnProgress = starterCatalog.levelWaves.first_defense!.map((wave) => wave.spawnEvents.length);
  state.wallShield = 10;
  state.enemies = ["walker", "runner", "tank", "armored", "brute"].map((id) => {
    const definition = starterCatalog.enemies.find((enemy) => enemy.id === id)!;
    return {
      id: `mixed-${id}`, definitionId: id, wave: 1, position: 1,
      hp: definition.maxHp, maxHp: definition.maxHp, atWall: true,
      attackCooldownSeconds: 0, abilityCooldownSeconds: 99,
      chargeWarningRemainingSeconds: 0, chargeRemainingSeconds: 0, chargeTargetPosition: 0,
    };
  });
  session.drainEvents();
  session.advance(1 / 30);
  expect(session.drainEvents().filter((event: { type: string }) => event.type === "enemy_wall_attack")).toEqual([
    { type: "enemy_wall_attack", enemyId: "mixed-walker", definitionId: "walker", position: 1, damage: 1.25, intervalSeconds: 0.8 },
    { type: "enemy_wall_attack", enemyId: "mixed-runner", definitionId: "runner", position: 1, damage: 1, intervalSeconds: 0.75 },
    { type: "enemy_wall_attack", enemyId: "mixed-tank", definitionId: "tank", position: 1, damage: 3, intervalSeconds: 1 },
    { type: "enemy_wall_attack", enemyId: "mixed-armored", definitionId: "armored", position: 1, damage: 4, intervalSeconds: 0.9 },
    { type: "enemy_wall_attack", enemyId: "mixed-brute", definitionId: "brute", position: 1, damage: 9, intervalSeconds: 1.1 },
  ]);
  expect(state.wallShield).toBe(0);
  expect(state.wallHp).toBe(91.75);
  session.advance(1 / 30);
  expect(session.drainEvents()).toEqual([]);
  session.dispatch({ type: "pause" });
  const frozen = structuredClone(state);
  session.advance(10);
  expect(state).toEqual(frozen);
  expect(session.drainEvents()).toEqual([]);
});
