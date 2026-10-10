import { BattleSession } from "../core/battleSession";
import { starterCatalog } from "../core/content";

/** Explicit development example: real final-wave spawns/commands, no state writes.
 * Its zero wall damage and one-HP ordinary units are never used by the player catalog.
 * Boss HP, movement, warning, charge and inspire values are the formal definitions.
 */
export function createBossDemo(): BattleSession {
  const session = new BattleSession({ seed: 1337, config: { heroId: "camp_warden", levelId: "kings_march" }, catalog: {
    ...starterCatalog,
    enemies: starterCatalog.enemies.map((enemy) => ({ ...enemy, wallDamage: 0, maxHp: enemy.tier === "boss" ? enemy.maxHp : 1 })),
  } });
  session.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "arrow_tower" });
  session.dispatch({ type: "build_building", slotId: "slot-r1-c5", definitionId: "arrow_tower" });
  // Begin at the final wave's second Boss spawn. Remaining ability time is real.
  for (let step = 0; step < 26535; step += 1) session.advance(1 / 30);
  session.drainEvents();
  // Preserve only the current warning/inspire events, then use normal tactical pause.
  for (let step = 0; step < 92; step += 1) session.advance(1 / 30);
  session.dispatch({ type: "pause" });
  return session;
}
