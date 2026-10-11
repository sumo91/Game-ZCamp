import type { BattleSession } from "../core/battleSession";
import type { GrowthTraitId } from "../core/buildingGrowth";
import { starterCatalog, type ContentCatalog } from "../core/content";
import type { GameCommand } from "../core/types";

/** Independent, validated development content. Formal wave counts/timelines are retained. */
export const ARCANE_DEMO_CATALOG: ContentCatalog = {
  ...starterCatalog,
  enemies: starterCatalog.enemies.map((enemy) => ({ ...enemy, maxHp: enemy.id === "walker" ? 600 : enemy.maxHp, wallDamage: 0 })),
  levelWaves: Object.fromEntries(Object.entries(starterCatalog.levelWaves).map(([id, waves]) => [id, waves.map((wave) => ({ ...wave, spawnEvents: wave.spawnEvents.map((event) => ({ ...event })) }))])),
};

export const ARCANE_DEMO_RESOURCES = { wood: 6000, gold: 100 };

/** Explicit development fixture: real commands/combat, granted resources and durable targets.
 * Never selected by the normal player URL; no formal content/rules are modified.
 */
export function prepareArcaneDemo(session: BattleSession): void {
  const state = session.getState();
  const apply = (command: GameCommand) => {
    const result = session.dispatch(command);
    if (!result.accepted) throw new Error(`寒霜/雷电演示准备失败：${result.reason}`);
  };
  const towers = [
    { slotId: "slot-r1-c2", family: "frost", level: 1 },
    { slotId: "slot-r1-c4", family: "electric", level: 1 },
    { slotId: "slot-r2-c2", family: "frost", level: 3 },
    { slotId: "slot-r2-c4", family: "electric", level: 3 },
    { slotId: "slot-r3-c2", family: "frost", level: 5 },
    { slotId: "slot-r3-c4", family: "electric", level: 5 },
  ] as const;
  for (const tower of towers) {
    apply({ type: "build_building", slotId: tower.slotId, definitionId: "arrow_tower" });
    const building = state.buildings.find((candidate) => candidate.slotId === tower.slotId)!;
    apply({ type: "transform_tower", buildingId: building.id, targetTowerId: tower.family });
    const preferred: GrowthTraitId = tower.family === "frost" ? "frost_deep" : "electric_chain";
    while (building.level < tower.level) {
      apply({ type: "upgrade_building", buildingId: building.id });
      const options = state.pendingTraitDraft!.options;
      apply({ type: "choose_building_trait", buildingId: building.id, traitDefinitionId: options.includes(preferred) ? preferred : options[0] });
    }
  }
  apply({ type: "pause" });
}
