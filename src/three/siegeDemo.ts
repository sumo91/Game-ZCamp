import { BattleSession } from "../core/battleSession";
import type { GameCommand } from "../core/types";

export const SIEGE_DEMO_LABEL = "连弩与火炮 · 三档开发演示";

const towers = [
  { slot: "slot-r1-c1", kind: "machine_gun", level: 1 },
  { slot: "slot-r1-c3", kind: "machine_gun", level: 3 },
  { slot: "slot-r1-c5", kind: "machine_gun", level: 5 },
  { slot: "slot-r2-c1", kind: "cannon", level: 1 },
  { slot: "slot-r2-c3", kind: "cannon", level: 3 },
  { slot: "slot-r2-c5", kind: "cannon", level: 5 },
] as const;
const yards = ["slot-r3-c1", "slot-r3-c2", "slot-r3-c4", "slot-r3-c5"];

/** Explicit development entry. It earns every resource with the unchanged simulation,
 * and builds/transforms/upgrades only by public commands; no injected battle state. */
export function createSiegeDemoSession(): BattleSession {
  const session = new BattleSession({ seed: 6, config: { heroId: "vanguard_gunner", levelId: "first_defense" } });
  const send = (command: GameCommand) => session.dispatch(command).accepted;
  send({ type: "build_building", slotId: towers[0].slot, definitionId: "arrow_tower" });
  send({ type: "build_building", slotId: yards[0]!, definitionId: "lumberyard" });
  for (let step = 0; step < 30*500; step += 1) {
    const state = session.getState();
    if (state.phase === "DEFEAT" || state.phase === "VICTORY") throw new Error("连弩火炮演示重放未形成防线");
    const draft = state.pendingTraitDraft;
    if (draft) {
      const owner = state.buildings.find((building) => building.id === draft.buildingId)!;
      const desired = owner.growthDefinitionId === "machine_gun" ? "machine_penetration" : owner.growthDefinitionId === "cannon" ? "cannon_burn" : "lumber_output";
      send({ type: "choose_building_trait", buildingId: draft.buildingId, traitDefinitionId: draft.options.find((option) => option === desired) ?? draft.options[0] });
    }
    const economyReady = yards.every((slot) => state.buildings.some((building) => building.slotId === slot && building.level >= 3));
    // Establish three defenders, invest in production, then finish the cannon row.
    for (const target of towers) {
      if (target.kind === "cannon" && !economyReady) continue;
      const building = state.buildings.find((item) => item.slotId === target.slot);
      if (!building) send({ type: "build_building", slotId: target.slot, definitionId: "arrow_tower" });
      else if (building.growthDefinitionId === "arrow_tower") send({ type: "transform_tower", buildingId: building.id, targetTowerId: target.kind });
    }
    if (!state.pendingTraitDraft) {
      for (const slot of yards) if (!state.buildings.some((item) => item.slotId === slot)) send({ type: "build_building", slotId: slot, definitionId: "lumberyard" });
      const yard = state.buildings.find((item) => item.growthDefinitionId === "lumberyard" && item.level < 3);
      if (yard) send({ type: "upgrade_building", buildingId: yard.id });
    }
    if (!state.pendingTraitDraft && economyReady) {
      for (const target of towers) {
        const building = state.buildings.find((item) => item.slotId === target.slot);
        if (building?.growthDefinitionId === target.kind && building.level < target.level) {
          if (send({ type: "upgrade_building", buildingId: building.id })) break;
        }
      }
    }
    const ready = !state.pendingTraitDraft && towers.every((target) => state.buildings.some((building) => building.slotId === target.slot && building.growthDefinitionId === target.kind && building.level === target.level));
    if (ready) {
      send({ type: "pause" });
      session.drainEvents();
      return session;
    }
    session.advance(1/30);
    session.drainEvents();
  }
  throw new Error("连弩火炮演示重放超时");
}
