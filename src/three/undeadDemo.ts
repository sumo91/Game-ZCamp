import type { BattleSession } from "../core/battleSession";
import { getGrowthUpgradeCost } from "../core/buildingGrowth";
import { starterCatalog } from "../core/content";
import type { GameCommand } from "../core/types";

/** Development-only replay of ordinary commands on the unchanged first-defense timeline. */
export function prepareUndeadDemo(session: BattleSession): void {
  const command = (value: GameCommand) => session.dispatch(value);
  for (const slotId of ["slot-r3-c1", "slot-r3-c2"]) {
    command({ type: "build_building", slotId, definitionId: "lumberyard" });
  }
  const towerSlots = ["slot-r1-c1", "slot-r1-c2", "slot-r1-c3", "slot-r1-c4", "slot-r1-c5", "slot-r2-c1", "slot-r2-c2", "slot-r2-c3", "slot-r2-c4", "slot-r2-c5"];
  for (let step = 0; step < 18500 && session.getState().phase !== "DEFEAT"; step += 1) {
    const state = session.getState();
    if (state.pendingTraitDraft) {
      const draft = state.pendingTraitDraft;
      const preference = ["tower_damage", "tower_attack_speed", "tower_elite_damage", "tower_wall_guard"];
      const trait = preference.map((id) => draft.options.find((option) => option === id)).find(Boolean) ?? draft.options[0];
      command({ type: "choose_building_trait", buildingId: draft.buildingId, traitDefinitionId: trait });
    }
    if (step % 30 === 0 && state.effectiveBattleTimeSeconds < 570) {
      const vacant = towerSlots.find((slot) => !state.buildings.some((building) => building.slotId === slot));
      if (vacant && state.wood >= 40) command({ type: "build_building", slotId: vacant, definitionId: "arrow_tower" });
      else {
        const tower = state.buildings.filter((building) => building.kind === "tower" && building.level < 5)
          .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id))[0];
        if (tower) {
          const cost = getGrowthUpgradeCost(starterCatalog.buildingGrowth, "arrow_tower", tower.level);
          if (cost !== null && state.wood >= cost) command({ type: "upgrade_building", buildingId: tower.id });
        }
      }
    }
    // Remove towers through the same zero-refund command so wave 10 gathers visibly.
    if (state.effectiveBattleTimeSeconds >= 570 && state.effectiveBattleTimeSeconds < 571) {
      for (const tower of state.buildings.filter((building) => building.kind === "tower")) {
        command({ type: "destroy_building", slotId: tower.slotId });
      }
    }
    session.advance(1 / 30);
    session.drainEvents();
    if (state.wave === 10 && ["walker", "runner", "tank", "armored", "brute"].every((id) => state.enemies.some((enemy) => enemy.definitionId === id)) && state.enemies.some((enemy) => enemy.atWall)) break;
  }
  command({ type: "pause" });
}
