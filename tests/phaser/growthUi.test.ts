import { describe, expect, it } from "vitest";
import { starterCatalog } from "../../src/core/content";
import { GameSimulation } from "../../src/core/game";
import { deriveBuildingDetail, deriveEmptySlotActions, deriveTraitOptions, deriveTransformOptions, decideGrowthAction, decideGrowthTrait, decideGrowthTransform, getGrowthInputPriority } from "../../src/phaser/growthUi";

function build(game: GameSimulation, slotId: string, definitionId: "arrow_tower" | "lumberyard"): string {
  const result = game.dispatch({ type: "build_building", slotId, definitionId });
  expect(result.accepted).toBe(true);
  return result.buildingId!;
}

describe("growth UI derivation and input", () => {
  it("derives both empty-slot build actions and exact wood difference", () => {
    const game = new GameSimulation();
    const actions = deriveEmptySlotActions(starterCatalog.buildingGrowth, game.getState(), "slot-r1-c1");
    expect(actions.map((action) => action.label)).toEqual(["建造箭塔｜木材 40", "建造木材厂｜木材 60"]);
    expect(actions.every((action) => action.affordable)).toBe(true);
    game.getState().wood = 39;
    const short = deriveEmptySlotActions(starterCatalog.buildingGrowth, game.getState(), "slot-r1-c1")[0]!;
    expect(short.affordable).toBe(false);
    expect(short.reason).toBe("还差 1 木材");
    expect(decideGrowthAction(short)).toEqual({ kind: "blocked", reason: "还差 1 木材" });
  });

  it("derives current and next building stats, traits, exact upgrade states, and max level", () => {
    const game = new GameSimulation();
    const buildingId = build(game, "slot-r1-c1", "arrow_tower");
    const building = game.getState().buildings.find((candidate) => candidate.id === buildingId)!;
    building.traits = [{ definitionId: "tower_damage", stacks: 2, acquiredAtLevel: 2 }];
    const detail = deriveBuildingDetail(starterCatalog.buildingGrowth, game.getState(), building)!;
    expect(detail.current).toMatchObject({ kind: "tower", damage: 8.68, attackIntervalSeconds: 1, range: 0.6 });
    expect(detail.next).toMatchObject({ damage: 10.416, attackIntervalSeconds: 0.9090909090909091 });
    expect(detail.traits[0]).toMatchObject({ name: "猛攻", currentStacks: 2, nextStacks: 3, categoryLabel: "通用 · 本塔生效" });
    game.getState().wood = 49;
    expect(deriveBuildingDetail(starterCatalog.buildingGrowth, game.getState(), building)!.upgrade.reason).toBe("还差 1 木材");
    game.getState().wood = 50;
    expect(deriveBuildingDetail(starterCatalog.buildingGrowth, game.getState(), building)!.upgrade.affordable).toBe(true);
    building.level = 5;
    const maxed = deriveBuildingDetail(starterCatalog.buildingGrowth, game.getState(), building)!;
    expect(maxed.upgrade).toMatchObject({ label: "已满级", affordable: false, reason: "已满级", command: null });
  });

  it("derives lumberyard production from the current building only", () => {
    const game = new GameSimulation();
    const buildingId = build(game, "slot-r1-c1", "lumberyard");
    const building = game.getState().buildings.find((candidate) => candidate.id === buildingId)!;
    building.level = 2;
    building.traits = [{ definitionId: "lumber_flat", stacks: 1, acquiredAtLevel: 2 }];
    const detail = deriveBuildingDetail(starterCatalog.buildingGrowth, game.getState(), building)!;
    expect(detail.current).toMatchObject({ kind: "lumberyard", woodPerSecond: 2 });
    expect(detail.next).toMatchObject({ woodPerSecond: 2.8 });
    expect(detail.role).toBe("持续生产木材");
  });

  it("derives all four transformation routes and blocks one gold short", () => {
    const game = new GameSimulation();
    const buildingId = build(game, "slot-r1-c1", "arrow_tower");
    const building = game.getState().buildings.find((candidate) => candidate.id === buildingId)!;
    const options = deriveTransformOptions(starterCatalog.buildingGrowth, game.getState(), building);
    expect(options.map((option) => option.targetTowerId)).toEqual(["machine_gun", "cannon", "frost", "electric"]);
    game.getState().gold = 9;
    expect(options.every((option) => !option.affordable)).toBe(true);
    expect(decideGrowthTransform({ ...options[0]!, affordable: false, reason: "还差 1 金币" })).toEqual({ kind: "blocked", reason: "还差 1 金币" });
    game.getState().gold = 10;
    expect(deriveTransformOptions(starterCatalog.buildingGrowth, game.getState(), building)[0]!.affordable).toBe(true);
  });

  it("keeps pending trait order and blocks double selection", () => {
    const game = new GameSimulation();
    const buildingId = build(game, "slot-r1-c1", "arrow_tower");
    game.getState().gold = 10;
    expect(game.dispatch({ type: "transform_tower", buildingId, targetTowerId: "cannon" }).accepted).toBe(true);
    const building = game.getState().buildings.find((candidate) => candidate.id === buildingId)!;
    expect(deriveBuildingDetail(starterCatalog.buildingGrowth, game.getState(), building)).toMatchObject({ name: "炮塔", role: "范围清怪", canTransform: false, maxLevel: 5 });
    game.getState().pendingTraitDraft = {
      buildingId,
      options: ["cannon_burn", "tower_damage", "cannon_blast"],
      createdAtLevel: 2,
      returnPhase: "TACTICAL_PAUSE",
    };
    const options = deriveTraitOptions(starterCatalog.buildingGrowth, game.getState(), game.getState().pendingTraitDraft);
    expect(options.map((option) => option.id)).toEqual(["cannon_burn", "tower_damage", "cannon_blast"]);
    expect(options[0]).toMatchObject({ categoryLabel: "炮塔专属", currentStacks: 0, nextStacks: 1 });
    expect(decideGrowthTrait(options[0]!, building.id, false)).toEqual({ kind: "dispatch", command: { type: "choose_building_trait", buildingId, traitDefinitionId: "cannon_burn" } });
    expect(decideGrowthTrait(options[0]!, building.id, true)).toEqual({ kind: "blocked", reason: "正在处理词条选择" });
  });

  it("enforces result, system, trait, transform, then building input priority", () => {
    expect(getGrowthInputPriority("VICTORY", false)).toBe("result");
    expect(getGrowthInputPriority("SYSTEM_PAUSE", true)).toBe("system_pause");
    expect(getGrowthInputPriority("TRAIT_DRAFT", true)).toBe("trait_draft");
    expect(getGrowthInputPriority("RUNNING", true)).toBe("transform");
    expect(getGrowthInputPriority("TACTICAL_PAUSE", false)).toBe("building");
    expect(getGrowthInputPriority("OPENING_COUNTDOWN", false)).toBe("building");
  });
});
