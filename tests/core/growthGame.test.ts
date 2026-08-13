import { describe, expect, it } from "vitest";
import { starterCatalog, type ContentCatalog } from "../../src/core/content";
import { GameSimulation } from "../../src/core/game";
import { getGrowthTowerAttackProfile } from "../../src/core/growthCombat";
import { getWoodProductionPerSecond } from "../../src/core/resources";
import type { BuildingState, EnemyRuntimeState } from "../../src/core/types";

function quietCatalog(): ContentCatalog {
  return {
    ...starterCatalog,
    enemies: starterCatalog.enemies.map((enemy) => ({ ...enemy, moveSpeed: 0, wallDamage: 0 })),
  };
}

function movingCatalog(): ContentCatalog {
  return {
    ...starterCatalog,
    enemies: starterCatalog.enemies.map((enemy) => ({ ...enemy, moveSpeed: 1, wallDamage: 0 })),
  };
}

function silenceFutureSpawns(game: GameSimulation): void {
  game.getState().waveSpawnProgress = starterCatalog.waves.map((wave) => wave.spawnEvents.length);
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
    abilityCooldownSeconds: 99,
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
  const building = game.getState().buildings.find((candidate) => candidate.growthDefinitionId === "arrow_tower")!;
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

  it("keeps growth damage local and does not duplicate settlement", () => {
    const game = new GameSimulation(quietCatalog());
    game.getState().wood = 1000;
    game.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "arrow_tower" });
    game.dispatch({ type: "build_building", slotId: "slot-r1-c2", definitionId: "arrow_tower" });
    const first = game.getState().buildings.find((building) => building.slotId === "slot-r1-c1")!;
    const second = game.getState().buildings.find((building) => building.slotId === "slot-r1-c2")!;
    first.traits = [trait("tower_damage", 2)];
    first.attackCooldownSeconds = 0;
    second.attackCooldownSeconds = 99;
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
    expect(cannon.game.getState().enemies[0]!.growthBurnStates).toEqual([{ sourceBuildingId: cannon.building.id, damagePerSecond: 10.5, remainingSeconds: 2.75 }]);

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

  it("refreshes an active cannon burn without double-settling the covered step", () => {
    const run = (deltaSeconds: number, steps: number, initialRemainingSeconds: number): { burnDamage: number; remaining: number } => {
      const { game, building } = makeGrowthTower("cannon", [trait("cannon_burn", 2)]);
      building.attackCooldownSeconds = 0.1;
      silenceFutureSpawns(game);
      const target = enemy("refresh-target", 1, 100000);
      target.growthBurnStates = [{ sourceBuildingId: building.id, damagePerSecond: 10.5, remainingSeconds: initialRemainingSeconds }];
      game.getState().enemies = [target];
      game.drainEvents();
      for (let index = 0; index < steps; index += 1) game.tick(deltaSeconds);
      const directDamage = 35;
      return { burnDamage: 100000 - target.hp - directDamage, remaining: target.growthBurnStates?.[0]?.remainingSeconds ?? 0 };
    };
    const quarter = run(0.25, 4, 0.15);
    const eighth = run(0.125, 8, 0.15);
    const thirtyHz = run(1 / 30, 30, 0.15);
    expect(quarter.burnDamage).toBeCloseTo(10.5, 6);
    expect(eighth.burnDamage).toBeCloseTo(quarter.burnDamage, 6);
    expect(thirtyHz.burnDamage).toBeCloseTo(quarter.burnDamage, 6);
    expect(quarter.remaining).toBeCloseTo(2.1, 6);
    expect(eighth.remaining).toBeCloseTo(quarter.remaining, 6);
    expect(thirtyHz.remaining).toBeCloseTo(quarter.remaining, 6);

    const expiredBeforeAttack = run(0.25, 4, 0.05);
    expect(expiredBeforeAttack.burnDamage).toBeCloseTo((0.05 + 0.9) * 10.5, 6);
    expect(expiredBeforeAttack.remaining).toBeCloseTo(2.1, 6);
  });

  it("keeps two cannon burn sources independent when one tower is dismantled", () => {
    const game = new GameSimulation(quietCatalog());
    game.getState().wood = 1000;
    game.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "arrow_tower" });
    game.dispatch({ type: "build_building", slotId: "slot-r1-c2", definitionId: "arrow_tower" });
    const first = game.getState().buildings.find((building) => building.slotId === "slot-r1-c1")!;
    const second = game.getState().buildings.find((building) => building.slotId === "slot-r1-c2")!;
    game.getState().gold = 20;
    expect(game.dispatch({ type: "transform_tower", buildingId: first.id, targetTowerId: "cannon" }).accepted).toBe(true);
    expect(game.dispatch({ type: "transform_tower", buildingId: second.id, targetTowerId: "cannon" }).accepted).toBe(true);
    first.attackCooldownSeconds = 99;
    second.attackCooldownSeconds = 99;
    startRunning(game);
    silenceFutureSpawns(game);
    const target = enemy("two-source-target", 1, 100000);
    target.growthBurnStates = [
      { sourceBuildingId: first.id, damagePerSecond: 7, remainingSeconds: 3 },
      { sourceBuildingId: second.id, damagePerSecond: 7, remainingSeconds: 3 },
    ];
    game.getState().enemies = [target];
    game.drainEvents();
    game.tick(0.25);
    expect(100000 - target.hp).toBeCloseTo(3.5, 6);
    expect(target.growthBurnStates?.map((state) => state.sourceBuildingId)).toEqual([first.id, second.id]);
    expect(game.dispatch({ type: "destroy_building", slotId: first.slotId }).accepted).toBe(true);
    expect(target.growthBurnStates).toEqual([{ sourceBuildingId: second.id, damagePerSecond: 7, remainingSeconds: 2.75 }]);
    const hpAfterDestroy = target.hp;
    game.tick(0.25);
    expect(hpAfterDestroy - target.hp).toBeCloseTo(1.75, 6);
    expect(target.growthBurnStates).toEqual([{ sourceBuildingId: second.id, damagePerSecond: 7, remainingSeconds: 2.5 }]);
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
    expect(getWoodProductionPerSecond(game.getState())).toBeCloseTo(0.5 + (2.4 + 0.8) * 1.5 + 1.6, 8);
    first.level = 2;

    game.getState().wood = 65;
    expect(game.dispatch({ type: "upgrade_building", buildingId: first.id }).accepted).toBe(true);
    expect(first.level).toBe(3);
    expect(game.getState().wood).toBe(0);
    expect(game.dispatch({ type: "choose_building_trait", buildingId: first.id, traitDefinitionId: game.getState().pendingTraitDraft!.options[0]! }).accepted).toBe(true);

    const stockpileGame = new GameSimulation(quietCatalog());
    stockpileGame.getState().wood = 1000;
    stockpileGame.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "lumberyard" });
    const stockpileYard = stockpileGame.getState().buildings.find((building) => building.growthDefinitionId === "lumberyard")!;
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
    paused.game.getState().buildings.push({ id: "yard", slotId: "slot-r1-c2", kind: "lumberyard", definitionId: "lumberyard", growthDefinitionId: "lumberyard", level: 1, lanePosition: 0.2, attackCooldownSeconds: 0, traits: [] });
    const woodBefore = paused.game.getState().wood;
    startRunning(paused.game);
    paused.game.getState().wood = woodBefore;
    expect(paused.game.dispatch({ type: "pause" }).accepted).toBe(true);
    paused.game.tick(10);
    expect(paused.game.getState().wood).toBe(woodBefore);
  });

  it("pays each surviving growth lumberyard's stockpile once in wave 1 and once in wave 2", () => {
    const game = new GameSimulation(quietCatalog());
    game.getState().wood = 1000;
    game.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "lumberyard" });
    game.dispatch({ type: "build_building", slotId: "slot-r1-c2", definitionId: "lumberyard" });
    const first = game.getState().buildings.find((building) => building.slotId === "slot-r1-c1")!;
    const second = game.getState().buildings.find((building) => building.slotId === "slot-r1-c2")!;
    first.traits = [trait("lumber_wave_stockpile", 1)];
    second.traits = [trait("lumber_wave_stockpile", 2)];
    game.getState().wood = 0;
    startRunning(game);
    const production = getWoodProductionPerSecond(game.getState());
    expect(game.getState().wave).toBe(1);
    expect(game.getState().wood).toBe(15);
    game.tick(0.25);
    const afterFirstQuarter = game.getState().wood;
    expect(afterFirstQuarter).toBeCloseTo(15 + production * 0.25, 8);
    game.tick(59.75);
    const afterWaveTwo = game.getState().wood;
    expect(game.getState().wave).toBe(2);
    expect(afterWaveTwo).toBeCloseTo(afterFirstQuarter + production * 59.75 + 15, 8);
    game.tick(0.25);
    expect(game.getState().wood).toBeCloseTo(afterWaveTwo + production * 0.25, 8);
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

  it("settles a source burn at its real DPS regardless of 0.25, 0.125, or 30Hz ticks", () => {
    const run = (deltaSeconds: number, steps: number): number => {
      const { game, building } = makeGrowthTower("cannon");
      building.attackCooldownSeconds = 99;
      silenceFutureSpawns(game);
      const target = enemy("burn-target", 1, 1000);
      target.growthBurnStates = [{ sourceBuildingId: building.id, damagePerSecond: 0.2, remainingSeconds: 3 }];
      game.getState().enemies = [target];
      for (let index = 0; index < steps; index += 1) game.tick(deltaSeconds);
      return 1000 - target.hp;
    };
    const quarter = run(0.25, 12);
    const eighth = run(0.125, 24);
    const thirtyHz = run(1 / 30, 90);
    expect(quarter).toBeCloseTo(0.6, 6);
    expect(eighth).toBeCloseTo(quarter, 6);
    expect(thirtyHz).toBeCloseTo(quarter, 6);
  });

  it("integrates a growth slow across its expiry point independent of tick splitting", () => {
    const run = (deltaSeconds: number, steps: number): number => {
      const game = new GameSimulation(movingCatalog());
      game.getState().wood = 1000;
      game.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "arrow_tower" });
      const building = game.getState().buildings.find((candidate) => candidate.growthDefinitionId === "arrow_tower")!;
      game.getState().gold = 10;
      game.dispatch({ type: "transform_tower", buildingId: building.id, targetTowerId: "frost" });
      building.attackCooldownSeconds = 99;
      startRunning(game);
      silenceFutureSpawns(game);
      const target = enemy("slow-target", 0, 1000);
      target.atWall = false;
      target.growthSlowStates = [{ sourceBuildingId: building.id, multiplier: 0.5, remainingSeconds: 0.2 }];
      game.getState().enemies = [target];
      for (let index = 0; index < steps; index += 1) game.tick(deltaSeconds);
      return target.position;
    };
    const quarter = run(0.25, 1);
    const split = run(0.125, 2);
    expect(quarter).toBeCloseTo(0.15, 6);
    expect(split).toBeCloseTo(quarter, 6);
  });

  it("uses the strongest active source and preserves expiry boundaries under split ticks", () => {
    const run = (deltaSeconds: number, steps: number): number => {
      const game = new GameSimulation(movingCatalog());
      game.getState().wood = 1000;
      game.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "arrow_tower" });
      game.dispatch({ type: "build_building", slotId: "slot-r1-c2", definitionId: "arrow_tower" });
      const first = game.getState().buildings.find((building) => building.slotId === "slot-r1-c1")!;
      const second = game.getState().buildings.find((building) => building.slotId === "slot-r1-c2")!;
      first.attackCooldownSeconds = 99;
      second.attackCooldownSeconds = 99;
      startRunning(game);
      silenceFutureSpawns(game);
      const target = enemy("multi-slow-target", 0, 1000);
      target.atWall = false;
      target.growthSlowStates = [
        { sourceBuildingId: first.id, multiplier: 0.5, remainingSeconds: 0.2 },
        { sourceBuildingId: second.id, multiplier: 0.8, remainingSeconds: 0.25 },
      ];
      game.getState().enemies = [target];
      for (let index = 0; index < steps; index += 1) game.tick(deltaSeconds);
      return target.position;
    };
    const quarter = run(0.25, 1);
    const split = run(0.125, 2);
    expect(quarter).toBeCloseTo(0.14, 6);
    expect(split).toBeCloseTo(quarter, 6);
  });

  it("preserves overshoot for multiple growth attacks at maximum attack-speed layers", () => {
    const run = (deltaSeconds: number, steps: number): { attacks: number; cooldown: number; attackTimes: number[]; damage: number } => {
      const { game, building } = makeGrowthTower("arrow_tower", [trait("tower_attack_speed", 4)]);
      building.level = 5;
      building.attackCooldownSeconds = 0;
      silenceFutureSpawns(game);
      const target = enemy("attack-target", 1, 100000);
      game.getState().enemies = [target];
      const interval = getGrowthTowerAttackProfile(starterCatalog.buildingGrowth, building)!.attackIntervalSeconds;
      let attacks = 0;
      const attackTimes: number[] = [];
      let damage = 0;
      for (let index = 0; index < steps; index += 1) {
        game.tick(deltaSeconds);
        const events = game.drainEvents();
        const stepAttacks = events.filter((event) => event.type === "tower_attack").length;
        attacks += stepAttacks;
        damage += events.filter((event) => event.type === "enemy_hit").reduce((total, event) => total + event.damage, 0);
        if (stepAttacks > 0) attackTimes.push((index + 1) * deltaSeconds - deltaSeconds + deltaSeconds + building.attackCooldownSeconds - interval);
      }
      return { attacks, cooldown: building.attackCooldownSeconds, attackTimes, damage };
    };
    const quarter = run(0.25, 12);
    const split = run(0.125, 24);
    expect(split.attacks).toBe(quarter.attacks);
    expect(split.cooldown).toBeCloseTo(quarter.cooldown, 6);
    expect(split.damage).toBeCloseTo(quarter.damage, 6);
    expect(split.attackTimes).toHaveLength(quarter.attackTimes.length);
    split.attackTimes.forEach((time, index) => expect(time).toBeCloseTo(quarter.attackTimes[index]!, 6));
  });
});
