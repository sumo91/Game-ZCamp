import { describe, expect, it } from "vitest";
import { starterCatalog, type ContentCatalog } from "../../src/core/content";
import { GameSimulation } from "../../src/core/game";
import { getWoodProductionPerSecond } from "../../src/core/resources";
import type { BuildingState, EnemyRuntimeState } from "../../src/core/types";

function quietCatalog(): ContentCatalog {
  return {
    ...starterCatalog,
    enemies: starterCatalog.enemies.map((enemy) => ({ ...enemy, moveSpeed: 0, wallDamage: 0 })),
  };
}

function startRunning(game: GameSimulation): void {
  game.tick(5);
  expect(game.getState().phase).toBe("RUNNING");
}

function enemy(id: string, position = 1, hp = 100): EnemyRuntimeState {
  return {
    id,
    definitionId: "walker",
    wave: 1,
    position,
    hp,
    maxHp: hp,
    atWall: position >= 1,
    attackCooldownSeconds: 99,
    slowMultiplier: 1,
    slowRemainingSeconds: 0,
    abilityCooldownSeconds: 99,
    burnDamagePerSecond: 0,
    burnRemainingSeconds: 0,
    growthSlowStates: [],
    growthBurnStates: [],
    chargeWarningRemainingSeconds: 0,
    chargeRemainingSeconds: 0,
    chargeTargetPosition: 0,
  };
}

function makeGrowthTower(towerId: "arrow_tower" | "machine_gun" | "cannon" | "frost" | "electric", traits: NonNullable<BuildingState["traits"]> = []): { game: GameSimulation; building: BuildingState } {
  const game = new GameSimulation(quietCatalog());
  game.getState().wood = 1000;
  expect(game.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "arrow_tower" }).accepted).toBe(true);
  const building = game.getState().buildings.find((candidate) => candidate.model === "growth")!;
  if (towerId !== "arrow_tower") {
    game.getState().gold = 10;
    expect(game.dispatch({ type: "transform_tower", buildingId: building.id, targetTowerId: towerId }).accepted).toBe(true);
  }
  building.traits = traits;
  startRunning(game);
  game.getState().enemies = [enemy("target")];
  building.attackCooldownSeconds = 0;
  game.drainEvents();
  return { game, building };
}

function trait(definitionId: NonNullable<BuildingState["traits"]>[number]["definitionId"], stacks = 1): NonNullable<BuildingState["traits"]>[number] {
  return { definitionId, stacks, acquiredAtLevel: 2 };
}

describe("growth building combat and economy integration", () => {
  it("lets the arrow tower and every transformed tower attack a wall-contact enemy", () => {
    for (const towerId of ["arrow_tower", "machine_gun", "cannon", "frost", "electric"] as const) {
      const { game, building } = makeGrowthTower(towerId);
      const target = game.getState().enemies[0]!;
      const hpBefore = target.hp;
      game.tick(0.25);
      const events = game.drainEvents();
      expect(events.filter((event) => event.type === "tower_attack")).toEqual([
        expect.objectContaining({ buildingId: building.id, towerDefinitionId: towerId, targetId: target.id }),
      ]);
      expect(target.hp).toBeLessThan(hpBefore);
    }
  });

  it("keeps growth damage local and does not duplicate legacy settlement", () => {
    const game = new GameSimulation(quietCatalog());
    game.getState().wood = 1000;
    game.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "arrow_tower" });
    game.dispatch({ type: "build_building", slotId: "slot-r1-c2", definitionId: "arrow_tower" });
    const first = game.getState().buildings.find((building) => building.slotId === "slot-r1-c1")!;
    const second = game.getState().buildings.find((building) => building.slotId === "slot-r1-c2")!;
    first.traits = [trait("tower_damage", 2)];
    first.attackCooldownSeconds = 0;
    second.attackCooldownSeconds = 99;
    game.getState().permanentApplications.tower_boss_damage = 99;
    startRunning(game);
    game.getState().enemies = [enemy("target")];
    game.drainEvents();
    game.tick(0.25);
    const attacks = game.drainEvents().filter((event) => event.type === "tower_attack");
    expect(attacks).toEqual([expect.objectContaining({ buildingId: first.id })]);
    expect(game.getState().enemies[0]!.hp).toBeCloseTo(100 - 7 * 1.24, 8);
  });

  it("applies machine penetration, cannon burn, frost source marks, and electric chain deterministically", () => {
    const machine = makeGrowthTower("machine_gun", [trait("machine_penetration")]);
    machine.game.getState().enemies = [enemy("primary"), enemy("secondary", 0.7)];
    machine.game.tick(0.25);
    expect(machine.game.drainEvents().filter((event) => event.type === "tower_special")).toEqual([
      expect.objectContaining({ buildingId: machine.building.id, effect: "穿透", targetId: "secondary" }),
    ]);

    const cannon = makeGrowthTower("cannon", [trait("cannon_burn", 2)]);
    cannon.game.getState().enemies = [enemy("primary"), enemy("splash", 0.9)];
    cannon.game.tick(0.25);
    const cannonTarget = cannon.game.getState().enemies[0]!;
    expect(cannonTarget.growthBurnStates).toEqual([{ sourceBuildingId: cannon.building.id, damagePerSecond: 10.5, remainingSeconds: 2.75 }]);
    cannon.building.attackCooldownSeconds = 0;
    cannon.game.tick(0.25);
    expect(cannon.game.getState().enemies[0]!.growthBurnStates).toHaveLength(1);

    const electric = makeGrowthTower("electric", [trait("electric_chain")]);
    electric.game.getState().enemies = [enemy("primary"), enemy("chain-a", 0.9), enemy("chain-b", 0.8), enemy("chain-c", 0.7)];
    electric.game.tick(0.25);
    expect(electric.game.drainEvents().filter((event) => event.type === "tower_special")).toHaveLength(3);
  });

  it("recognizes only the frost tower that owns the active slow for vulnerability", () => {
    const game = new GameSimulation(quietCatalog());
    game.getState().wood = 1000;
    game.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "arrow_tower" });
    game.dispatch({ type: "build_building", slotId: "slot-r1-c2", definitionId: "arrow_tower" });
    const first = game.getState().buildings.find((building) => building.slotId === "slot-r1-c1")!;
    const second = game.getState().buildings.find((building) => building.slotId === "slot-r1-c2")!;
    game.getState().gold = 20;
    game.dispatch({ type: "transform_tower", buildingId: first.id, targetTowerId: "frost" });
    game.dispatch({ type: "transform_tower", buildingId: second.id, targetTowerId: "frost" });
    first.traits = [trait("frost_vulnerability")];
    first.attackCooldownSeconds = 99;
    second.attackCooldownSeconds = 0;
    startRunning(game);
    const target = enemy("target");
    target.growthSlowStates = [{ sourceBuildingId: first.id, multiplier: 0.52, remainingSeconds: 5 }];
    game.getState().enemies = [target];
    game.drainEvents();
    game.tick(0.25);
    const hit = game.drainEvents().find((event) => event.type === "enemy_hit");
    expect(hit).toMatchObject({ damage: 4 });
  });

  it("removes all source states and future effects when a growth tower is dismantled", () => {
    const { game, building } = makeGrowthTower("cannon", [trait("cannon_burn")]);
    game.tick(0.25);
    const target = game.getState().enemies[0]!;
    expect(target.growthBurnStates).toHaveLength(1);
    expect(game.dispatch({ type: "destroy_building", slotId: building.slotId })).toEqual({ accepted: true, buildingId: building.id });
    expect(target.growthBurnStates).toEqual([]);
    const hpAfterDestroy = target.hp;
    game.drainEvents();
    game.tick(0.25);
    expect(target.hp).toBe(hpAfterDestroy);
    expect(game.drainEvents().some((event) => event.type === "enemy_hit")).toBe(false);
  });

  it("settles two growth lumberyards independently, discounts only the owner, and stockpiles once per wave", () => {
    const game = new GameSimulation(quietCatalog());
    game.getState().wood = 1000;
    game.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "lumberyard" });
    game.dispatch({ type: "build_building", slotId: "slot-r1-c2", definitionId: "lumberyard" });
    const first = game.getState().buildings.find((building) => building.slotId === "slot-r1-c1")!;
    const second = game.getState().buildings.find((building) => building.slotId === "slot-r1-c2")!;
    first.level = 2;
    first.traits = [trait("lumber_flat", 2), trait("lumber_output", 2), trait("lumber_upgrade_discount", 3), trait("lumber_wave_stockpile", 2)];
    second.level = 2;
    second.traits = [];
    first.level = 3;
    expect(getWoodProductionPerSecond(game.getState())).toBeCloseTo(0.5 + (2.4 + 0.8) * 1.5 + 1.6, 8);
    game.getState().permanentApplications.wood_efficiency = 2;
    expect(getWoodProductionPerSecond(game.getState())).toBeCloseTo(0.5 + (2.4 + 0.8) * 1.5 + 1.6 + 1, 8);
    first.level = 2;

    game.getState().wood = 65;
    expect(game.dispatch({ type: "upgrade_building", buildingId: first.id }).accepted).toBe(true);
    expect(first.level).toBe(3);
    expect(game.getState().wood).toBe(0);
    expect(game.dispatch({ type: "choose_building_trait", buildingId: first.id, traitDefinitionId: game.getState().pendingTraitDraft!.options[0]! }).accepted).toBe(true);

    const stockpileGame = new GameSimulation(quietCatalog());
    stockpileGame.getState().wood = 1000;
    stockpileGame.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "lumberyard" });
    const stockpileYard = stockpileGame.getState().buildings.find((building) => building.model === "growth")!;
    stockpileYard.traits = [trait("lumber_wave_stockpile", 2)];
    stockpileGame.getState().wood = 0;
    startRunning(stockpileGame);
    expect(stockpileGame.getState().wood).toBe(10);
    expect(stockpileGame.dispatch({ type: "destroy_building", slotId: stockpileYard.slotId }).accepted).toBe(true);
    stockpileGame.getState().effectiveBattleTimeSeconds = 60;
    stockpileGame.getState().wave = 1;
    const beforeWaveTwo = stockpileGame.getState().wood;
    const production = getWoodProductionPerSecond(stockpileGame.getState());
    stockpileGame.tick(0.25);
    expect(stockpileGame.getState().wood - beforeWaveTwo).toBeCloseTo(production * 0.25, 8);
  });

  it("freezes growth wood and statuses in tactical pause and remains deterministic under tick splitting", () => {
    const first = makeGrowthTower("arrow_tower");
    first.game.getState().enemies = [enemy("target", 1, 1000)];
    first.game.getState().waveSpawnProgress = starterCatalog.waves.map((wave) => wave.spawnEvents.length);
    first.game.tick(0.25);
    const second = makeGrowthTower("arrow_tower");
    second.game.getState().enemies = [enemy("target", 1, 1000)];
    second.game.getState().waveSpawnProgress = starterCatalog.waves.map((wave) => wave.spawnEvents.length);
    second.game.tick(0.125);
    second.game.tick(0.125);
    expect(second.game.getState().enemies[0]!.hp).toBeCloseTo(first.game.getState().enemies[0]!.hp, 8);
    const paused = makeGrowthTower("arrow_tower");
    paused.game.getState().buildings.push({ id: "yard", slotId: "slot-r1-c2", kind: "lumberyard", definitionId: "lumberyard", growthDefinitionId: "lumberyard", model: "growth", level: 1, lanePosition: 0.2, attackCooldownSeconds: 0, traits: [] });
    const woodBefore = paused.game.getState().wood;
    startRunning(paused.game);
    paused.game.getState().wood = woodBefore;
    expect(paused.game.dispatch({ type: "pause" }).accepted).toBe(true);
    paused.game.tick(10);
    expect(paused.game.getState().wood).toBe(woodBefore);
  });

  it("freezes growth wood, enemies, and effective time during a forced trait draft", () => {
    const game = new GameSimulation(quietCatalog());
    game.getState().wood = 100;
    game.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "arrow_tower" });
    game.dispatch({ type: "build_building", slotId: "slot-r1-c2", definitionId: "lumberyard" });
    startRunning(game);
    const towerId = game.getState().buildings.find((building) => building.growthDefinitionId === "arrow_tower")!.id;
    game.getState().wood = 50;
    expect(game.dispatch({ type: "upgrade_building", buildingId: towerId }).accepted).toBe(true);
    const snapshot = structuredClone({ wood: game.getState().wood, enemies: game.getState().enemies, effectiveBattleTimeSeconds: game.getState().effectiveBattleTimeSeconds });
    game.tick(20);
    expect({ wood: game.getState().wood, enemies: game.getState().enemies, effectiveBattleTimeSeconds: game.getState().effectiveBattleTimeSeconds }).toEqual(snapshot);
  });
});
