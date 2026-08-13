import { describe, expect, it } from "vitest";
import { starterCatalog } from "../../src/core/content";
import { GameSimulation } from "../../src/core/game";
import { deriveBuildingDetail, deriveEmptySlotActions, deriveTraitOptions, deriveTransformOptions, decideGrowthAction, decideGrowthPointer, decideGrowthTrait, decideGrowthTransform, formatGrowthTraitEffect, getGrowthInputPriority, hitGrowthPointer } from "../../src/phaser/growthUi";
import { GROWTH_CONTEXT_ACTION_BOUNDS, GROWTH_TRANSFORM_CLOSE_BOUNDS, GROWTH_TRANSFORM_OPTION_BOUNDS } from "../../src/phaser/layout";

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
    expect(actions.map((action) => [action.description, action.resourceLabel, action.statusLabel])).toEqual([
      ["基础单体防御", "木材", "可建造"],
      ["持续生产木材", "木材", "可建造"],
    ]);
    expect(actions.every((action) => action.affordable)).toBe(true);
    game.getState().wood = 39;
    const short = deriveEmptySlotActions(starterCatalog.buildingGrowth, game.getState(), "slot-r1-c1")[0]!;
    expect(short.affordable).toBe(false);
    expect(short.reason).toBe("还差 1 木材");
    expect(short.statusLabel).toBe("木材不足");
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
    const shortUpgrade = deriveBuildingDetail(starterCatalog.buildingGrowth, game.getState(), building)!.upgrade;
    expect(shortUpgrade.reason).toBe("还差 1 木材");
    expect(shortUpgrade.statusLabel).toBe("木材不足");
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
    expect(options.every((option) => option.statusLabel === "金币不足")).toBe(true);
    const detail = deriveBuildingDetail(starterCatalog.buildingGrowth, game.getState(), building)!;
    expect(detail.canTransform).toBe(true);
    expect(detail.transformAffordable).toBe(false);
    expect(detail.transformStatusLabel).toBe("金币不足");
    expect(detail.transformReason).toBe("还差 1 金币");
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

  it("derives content-owned max level and transformation cost", () => {
    const game = new GameSimulation();
    const buildingId = build(game, "slot-r1-c1", "arrow_tower");
    const building = game.getState().buildings.find((candidate) => candidate.id === buildingId)!;
    const content = {
      ...starterCatalog.buildingGrowth,
      buildings: starterCatalog.buildingGrowth.buildings.map((definition) => definition.id === "arrow_tower" ? { ...definition, maxLevel: 4 as const, role: "改造后的箭塔职责" } : definition),
      transformations: starterCatalog.buildingGrowth.transformations.map((route) => ({ ...route, goldCost: 13 as const })),
    };
    const detail = deriveBuildingDetail(content, game.getState(), building)!;
    expect(detail.maxLevel).toBe(4);
    expect(detail.transformCostLabel).toBe("13");
    expect(detail.role).toBe("改造后的箭塔职责");
    expect(deriveEmptySlotActions(content, game.getState(), "slot-r1-c2")[0]!.description).toBe("改造后的箭塔职责");
    const missingLumberyard = { ...starterCatalog.buildingGrowth, buildings: starterCatalog.buildingGrowth.buildings.filter((definition) => definition.id !== "lumberyard") };
    expect(deriveEmptySlotActions(missingLumberyard, game.getState(), "slot-r1-c2")[1]).toMatchObject({ affordable: false, statusLabel: "暂无合法目标", reason: "暂无合法目标", command: null });
    const missingArrowDefinition = { ...starterCatalog.buildingGrowth, towers: starterCatalog.buildingGrowth.towers.filter((tower) => tower.id !== "arrow_tower") };
    expect(deriveBuildingDetail(missingArrowDefinition, game.getState(), building)).toBeNull();
  });

  it("derives cumulative typed trait effects for repeated selections", () => {
    expect(formatGrowthTraitEffect(starterCatalog.buildingGrowth, "tower_damage", 3)).toContain("累计 +36%");
    expect(formatGrowthTraitEffect(starterCatalog.buildingGrowth, "lumber_flat", 3)).toContain("累计 +1.2/秒");
    expect(formatGrowthTraitEffect(starterCatalog.buildingGrowth, "lumber_upgrade_discount", 3)).toContain("累计 -35%");
    expect(formatGrowthTraitEffect(starterCatalog.buildingGrowth, "lumber_wave_stockpile", 3)).toContain("提供木材 15");
    expect(formatGrowthTraitEffect(starterCatalog.buildingGrowth, "machine_penetration", 3)).toContain("穿透目标 +3");
    expect(formatGrowthTraitEffect(starterCatalog.buildingGrowth, "cannon_burn", 3)).toContain("基础攻击的 45%/秒");
    expect(formatGrowthTraitEffect(starterCatalog.buildingGrowth, "cannon_burn", 3)).toContain("20% × 2.25");
  });

  it("enforces priority and blocks lower hot zones while allowing modal actions", () => {
    expect(getGrowthInputPriority("VICTORY", false)).toBe("result");
    expect(getGrowthInputPriority("SYSTEM_PAUSE", true)).toBe("system_pause");
    expect(getGrowthInputPriority("TRAIT_DRAFT", true)).toBe("trait_draft");
    expect(getGrowthInputPriority("RUNNING", true)).toBe("transform");
    expect(getGrowthInputPriority("TACTICAL_PAUSE", false)).toBe("building");
    expect(getGrowthInputPriority("OPENING_COUNTDOWN", false)).toBe("building");
    const slot = { kind: "slot" as const, slotId: "slot-r1-c1" };
    const action = { kind: "action" as const, index: 0 };
    const trait = { kind: "trait_option" as const, index: 0 };
    const transform = { kind: "transform_option" as const, index: 0 };
    const close = hitGrowthPointer(GROWTH_TRANSFORM_CLOSE_BOUNDS.x + GROWTH_TRANSFORM_CLOSE_BOUNDS.width / 2, GROWTH_TRANSFORM_CLOSE_BOUNDS.y + GROWTH_TRANSFORM_CLOSE_BOUNDS.height / 2);
    expect(close).toEqual({ kind: "transform_close" });
    expect(hitGrowthPointer(GROWTH_TRANSFORM_OPTION_BOUNDS[0]!.x + 10, GROWTH_TRANSFORM_OPTION_BOUNDS[0]!.y + 10)).toEqual({ kind: "transform_option", index: 0 });
    expect(hitGrowthPointer(GROWTH_CONTEXT_ACTION_BOUNDS[0]!.x + 10, GROWTH_CONTEXT_ACTION_BOUNDS[0]!.y + 10)).toEqual({ kind: "action", index: 0 });
    for (const priority of ["result", "system_pause", "trait_draft", "transform"] as const) {
      expect(decideGrowthPointer(priority, slot).kind).toBe("blocked");
      expect(decideGrowthPointer(priority, action).kind).toBe("blocked");
    }
    expect(decideGrowthPointer("trait_draft", trait).kind).toBe("dispatch");
    expect(decideGrowthPointer("transform", transform).kind).toBe("dispatch");
    expect(decideGrowthPointer("transform", close!).kind).toBe("dispatch");
    expect(decideGrowthPointer("transform", slot).kind).toBe("blocked");
  });
});
