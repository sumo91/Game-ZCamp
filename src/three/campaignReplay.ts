import type { BattleSession } from "../core/battleSession";
import type { GameCommand } from "../core/types";

/** Explicit development demonstration: unchanged catalog, earned resources, legal commands.
 * No synthetic win, imported save, injected enemies, or presentation-side state writes. */
export function replayCampaignBattle(session: BattleSession, outcome: "victory" | "defeat") {
  const commands: Array<{ step: number; command: GameCommand }> = [];
  let peakLiveUnits = 0, peakStep = 0, peakEffectiveSeconds = 0;
  const send = (command: GameCommand) => {
    const accepted = session.dispatch(command).accepted;
    if (accepted) commands.push({ step: session.getStepIndex(), command });
    return accepted;
  };
  send({ type: "restart" });
  const yards = ["slot-r3-c1", "slot-r3-c2", "slot-r3-c4", "slot-r3-c5"];
  const towers = Array.from({ length: 10 }, (_, index) => `slot-r${Math.floor(index / 5) + 1}-c${index % 5 + 1}`);
  if (outcome === "victory") {
    send({ type: "build_building", slotId: towers[0]!, definitionId: "arrow_tower" });
    send({ type: "build_building", slotId: yards[0]!, definitionId: "lumberyard" });
  }
  for (let step = 0; step < 30 * 1200; step += 1) {
    const state = session.getState();
    if (state.enemies.length > peakLiveUnits) { peakLiveUnits = state.enemies.length; peakStep = session.getStepIndex(); peakEffectiveSeconds = state.effectiveBattleTimeSeconds; }
    if (state.phase === "VICTORY" || state.phase === "DEFEAT") return { outcome, seed: state.seed, maxWave: state.maxWave, finalWave: state.wave, peakLiveUnits, peakStep, peakEffectiveSeconds, commands };
    const draft = state.pendingTraitDraft;
    if (draft) {
      const owner = state.buildings.find((building) => building.id === draft.buildingId)!;
      const preference = owner.kind === "lumberyard" ? ["lumber_output", "lumber_flat", "lumber_upgrade_discount"]
        : ["cannon_burn", "cannon_blast", "tower_damage", "tower_attack_speed", "tower_elite_damage"];
      send({ type: "choose_building_trait", buildingId: draft.buildingId, traitDefinitionId: preference.find((id) => draft.options.includes(id as typeof draft.options[number])) as typeof draft.options[number] ?? draft.options[0] });
    }
    // Resume any tactical pause through the same public command as the player.
    if (state.phase === "TACTICAL_PAUSE") send({ type: "resume" });
    if (outcome === "victory" && step % 30 === 0) {
      const defenders = state.buildings.filter((building) => building.kind === "tower");
      const economyReady = yards.every((slot) => state.buildings.some((building) => building.slotId === slot && building.level >= 3));
      for (const slot of towers.slice(0, economyReady ? 10 : 3)) {
        if (!state.buildings.some((building) => building.slotId === slot)) send({ type: "build_building", slotId: slot, definitionId: "arrow_tower" });
      }
      for (const tower of defenders) {
        if (tower.growthDefinitionId === "arrow_tower") send({ type: "transform_tower", buildingId: tower.id, targetTowerId: "cannon" });
      }
      if (defenders.length >= 3 && !state.pendingTraitDraft) {
        for (const slot of yards) if (!state.buildings.some((building) => building.slotId === slot)) send({ type: "build_building", slotId: slot, definitionId: "lumberyard" });
        const yard = state.buildings.find((building) => building.kind === "lumberyard" && building.level < 3);
        if (yard) send({ type: "upgrade_building", buildingId: yard.id });
      }
      if (economyReady && !state.pendingTraitDraft) {
        const tower = state.buildings.filter((building) => building.kind === "tower" && building.level < 5).sort((a, b) => a.level - b.level)[0];
        if (tower) send({ type: "upgrade_building", buildingId: tower.id });
      }
    }
    session.advance(1 / 30);
    session.drainEvents();
  }
  throw new Error("战役演示在限定时间内未到达终局");
}
