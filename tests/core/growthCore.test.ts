import { describe, expect, it } from "vitest";
import { starterCatalog, type ContentCatalog } from "../../src/core/content";
import { GameSimulation, INITIAL_GOLD, INITIAL_WOOD, OPENING_COUNTDOWN_SECONDS, WALL_MAX_HP } from "../../src/core/game";
import { getWoodProductionPerSecond } from "../../src/core/resources";
import { CAMP_SLOT_IDS, type BuildingState, type EnemyRuntimeState } from "../../src/core/types";

function quietCatalog(): ContentCatalog {
  return {
    ...starterCatalog,
    enemies: starterCatalog.enemies.map((enemy) => ({ ...enemy, moveSpeed: 0, wallDamage: 0 })),
  };
}

function stationaryEnemiesCatalog(): ContentCatalog {
  return { ...starterCatalog, enemies: starterCatalog.enemies.map((enemy) => ({ ...enemy, moveSpeed: 0 })) };
}

function buildAt(game: GameSimulation, slotId: string, definitionId: "arrow_tower" | "lumberyard"): BuildingState {
  const result = game.dispatch({ type: "build_building", slotId, definitionId });
  expect(result.accepted).toBe(true);
  return game.getState().buildings.find((building) => building.id === result.buildingId)!;
}

function chooseFirstTrait(game: GameSimulation, buildingId: string): void {
  const option = game.getState().pendingTraitDraft?.options[0];
  expect(option).toBeDefined();
  expect(game.dispatch({ type: "choose_building_trait", buildingId, traitDefinitionId: option! }).accepted).toBe(true);
}

function startRunning(game: GameSimulation): void {
  game.tick(OPENING_COUNTDOWN_SECONDS);
  expect(game.getState().phase).toBe("RUNNING");
}

function silenceFutureSpawns(game: GameSimulation): void {
  game.getState().waveSpawnProgress = starterCatalog.levelWaves.first_defense!.map((wave) => wave.spawnEvents.length);
}

function runtimeEnemy(definitionId: string, hp: number, atWall = true): EnemyRuntimeState {
  return {
    id: "test-" + definitionId,
    definitionId,
    wave: 1,
    position: atWall ? 1 : 0,
    hp,
    maxHp: hp,
    atWall,
    attackCooldownSeconds: 99,
    abilityCooldownSeconds: 99,
    growthSlowStates: [],
    growthBurnStates: [],
    chargeWarningRemainingSeconds: 0,
    chargeRemainingSeconds: 0,
    chargeTargetPosition: 0,
  };
}

describe("v0.2 growth candidate core regression matrix", () => {
  it("starts with only the fixed city, fourteen empty slots, and the v0.2 resources", () => {
    const game = new GameSimulation();
    const state = game.getState();
    expect(state.wood).toBe(INITIAL_WOOD);
    expect(state.gold).toBe(INITIAL_GOLD);
    expect(state.wallHp).toBe(WALL_MAX_HP);
    expect(state.buildings).toEqual([expect.objectContaining({ id: "main-city", slotId: "slot-r3-c3", kind: "main_city" })]);
    expect(CAMP_SLOT_IDS).toHaveLength(15);
    expect(state.buildings.filter((building) => building.kind !== "main_city")).toHaveLength(0);
    expect("hand" in state).toBe(false);
    const removedRuntimeFields = ["hand", "next" + "SupplyCard", "supply" + "WaitingCard", "permanent" + "Applications"];
    expect(removedRuntimeFields.every((field) => !(field in state))).toBe(true);
  });

  it("pauses and resumes the opening countdown without advancing time, resources, or the first wave", () => {
    const game = new GameSimulation(quietCatalog());
    const lumberyard = buildAt(game, "slot-r1-c1", "lumberyard");
    expect(lumberyard.kind).toBe("lumberyard");

    game.tick(1.5);
    const beforePause = structuredClone(game.getState());
    expect(beforePause.phase).toBe("OPENING_COUNTDOWN");
    expect(beforePause.openingCountdownRemainingSeconds).toBeCloseTo(3.5, 8);

    expect(game.dispatch({ type: "pause" })).toEqual({ accepted: true });
    expect(game.getState().phase).toBe("TACTICAL_PAUSE");
    const pausedCountdown = game.getState().openingCountdownRemainingSeconds;
    const pausedWood = game.getState().wood;
    const pausedBattleTime = game.getState().effectiveBattleTimeSeconds;
    game.tick(10);
    expect(game.getState().openingCountdownRemainingSeconds).toBe(pausedCountdown);
    expect(game.getState().wood).toBe(pausedWood);
    expect(game.getState().effectiveBattleTimeSeconds).toBe(pausedBattleTime);
    expect(game.getState().wave).toBe(beforePause.wave);
    expect(game.getState().spawnedEnemies).toBe(beforePause.spawnedEnemies);
    expect(game.getState().enemies).toEqual(beforePause.enemies);

    expect(game.dispatch({ type: "build_building", slotId: "slot-r1-c2", definitionId: "arrow_tower" }).accepted).toBe(true);
    expect(game.dispatch({ type: "resume" })).toEqual({ accepted: true });
    expect(game.getState().phase).toBe("OPENING_COUNTDOWN");
    expect(game.getState().openingCountdownRemainingSeconds).toBe(pausedCountdown);

    game.tick(pausedCountdown);
    expect(game.getState().phase).toBe("RUNNING");
    expect(game.getState().wave).toBe(1);
  });

  it("charges exact build costs and leaves invalid, occupied, and city targets atomic", () => {
    const game = new GameSimulation();
    expect(buildAt(game, "slot-r1-c1", "arrow_tower").growthDefinitionId).toBe("arrow_tower");
    expect(game.getState().wood).toBe(80);
    expect(buildAt(game, "slot-r1-c2", "lumberyard").growthDefinitionId).toBe("lumberyard");
    expect(game.getState().wood).toBe(20);

    const before = structuredClone(game.getState());
    expect(game.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "lumberyard" })).toEqual({ accepted: false, reason: "该格已有建筑" });
    expect(game.dispatch({ type: "build_building", slotId: "slot-r3-c3", definitionId: "arrow_tower" })).toEqual({ accepted: false, reason: "该格已有建筑" });
    expect(game.dispatch({ type: "build_building", slotId: "not-a-slot", definitionId: "arrow_tower" })).toEqual({ accepted: false, reason: "请选择合法营地格" });
    expect(game.getState()).toEqual(before);

    const oneShort = new GameSimulation();
    oneShort.getState().wood = 39;
    const oneShortBefore = structuredClone(oneShort.getState());
    expect(oneShort.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "arrow_tower" })).toEqual({ accepted: false, reason: "木材不足" });
    expect(oneShort.getState()).toEqual(oneShortBefore);
  });

  it("keeps a failed build from advancing the deterministic random stream", () => {
    const failed = new GameSimulation(undefined, 2026);
    const control = new GameSimulation(undefined, 2026);
    failed.getState().wood = 39;
    control.getState().wood = 39;
    failed.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "arrow_tower" });
    expect(failed.nextRandomInt(1000)).toBe(control.nextRandomInt(1000));
  });

  it("uses every arrow and lumberyard upgrade cost through Lv.5 and offers three distinct options", () => {
    for (const definitionId of ["arrow_tower", "lumberyard"] as const) {
      const game = new GameSimulation();
      game.getState().wood = 1000;
      const building = buildAt(game, "slot-r1-c1", definitionId);
      const costs = definitionId === "lumberyard" ? [70, 100, 145, 205] : [50, 70, 100, 140];
      for (const [index, cost] of costs.entries()) {
        game.getState().wood = cost;
        expect(game.dispatch({ type: "upgrade_building", buildingId: building.id })).toEqual({ accepted: true, buildingId: building.id });
        expect(game.getState().buildings.find((candidate) => candidate.id === building.id)!.level).toBe(index + 2);
        expect(new Set(game.getState().pendingTraitDraft!.options).size).toBe(3);
        chooseFirstTrait(game, building.id);
      }
      const before = structuredClone(game.getState());
      expect(game.dispatch({ type: "upgrade_building", buildingId: building.id })).toEqual({ accepted: false, reason: "建筑已达到 Lv.5" });
      expect(game.getState()).toEqual(before);
    }
  });

  it("rejects upgrade at one wood short without changing level, resources, draft, or RNG", () => {
    const failed = new GameSimulation(undefined, 77);
    const control = new GameSimulation(undefined, 77);
    failed.getState().wood = 40;
    control.getState().wood = 40;
    const building = buildAt(failed, "slot-r1-c1", "arrow_tower");
    buildAt(control, "slot-r1-c1", "arrow_tower");
    failed.getState().wood = 49;
    control.getState().wood = 49;
    const before = structuredClone(failed.getState());
    expect(failed.dispatch({ type: "upgrade_building", buildingId: building.id })).toEqual({ accepted: false, reason: "木材不足" });
    expect(failed.getState()).toEqual(before);
    expect(failed.nextRandomInt(1000)).toBe(control.nextRandomInt(1000));
  });

  it("keeps same-seed drafts identical and freezes a draft through system pause", () => {
    const prepare = (seed: number): GameSimulation => {
      const game = new GameSimulation(undefined, seed);
      game.getState().wood = 90;
      const building = buildAt(game, "slot-r1-c1", "arrow_tower");
      game.getState().wood = 50;
      expect(game.dispatch({ type: "upgrade_building", buildingId: building.id }).accepted).toBe(true);
      return game;
    };
    const first = prepare(2026);
    const second = prepare(2026);
    expect(first.getState().pendingTraitDraft).toEqual(second.getState().pendingTraitDraft);
    const snapshot = structuredClone(first.getState());
    expect(first.dispatch({ type: "system_pause" }).accepted).toBe(true);
    first.tick(30);
    expect(first.getState().pendingTraitDraft).toEqual(snapshot.pendingTraitDraft);
    expect(first.getState().effectiveBattleTimeSeconds).toBe(snapshot.effectiveBattleTimeSeconds);
    expect(first.dispatch({ type: "system_resume" }).accepted).toBe(true);
    expect(first.getState().phase).toBe("TRAIT_DRAFT");
  });

  it("blocks every other base operation while TRAIT_DRAFT is unresolved", () => {
    const game = new GameSimulation();
    game.getState().wood = 90;
    const building = buildAt(game, "slot-r1-c1", "arrow_tower");
    game.getState().wood = 50;
    expect(game.dispatch({ type: "upgrade_building", buildingId: building.id }).accepted).toBe(true);
    const before = structuredClone(game.getState());
    expect(game.dispatch({ type: "build_building", slotId: "slot-r1-c2", definitionId: "lumberyard" })).toEqual({ accepted: false, reason: "当前状态不可建造" });
    expect(game.dispatch({ type: "upgrade_building", buildingId: building.id })).toEqual({ accepted: false, reason: "当前状态不可升级" });
    expect(game.dispatch({ type: "transform_tower", buildingId: building.id, targetTowerId: "cannon" })).toEqual({ accepted: false, reason: "当前状态不可改造" });
    expect(game.dispatch({ type: "destroy_building", slotId: building.slotId })).toEqual({ accepted: false, reason: "当前状态不可拆除" });
    expect(game.getState()).toEqual(before);
  });

  it("resumes the original phase after choosing a trait, preserving deliberate pauses", () => {
    const running = new GameSimulation(quietCatalog());
    running.getState().wood = 90;
    startRunning(running);
    const runningBuilding = buildAt(running, "slot-r1-c1", "arrow_tower");
    running.getState().wood = 50;
    expect(running.dispatch({ type: "upgrade_building", buildingId: runningBuilding.id }).accepted).toBe(true);
    expect(running.getState().pendingTraitDraft?.returnPhase).toBe("RUNNING");
    chooseFirstTrait(running, runningBuilding.id);
    expect(running.getState().phase).toBe("RUNNING");

    const paused = new GameSimulation(quietCatalog());
    paused.getState().wood = 90;
    startRunning(paused);
    paused.dispatch({ type: "pause" });
    const pausedBuilding = buildAt(paused, "slot-r1-c1", "arrow_tower");
    paused.getState().wood = 50;
    expect(paused.dispatch({ type: "upgrade_building", buildingId: pausedBuilding.id }).accepted).toBe(true);
    expect(paused.getState().pendingTraitDraft?.returnPhase).toBe("TACTICAL_PAUSE");
    chooseFirstTrait(paused, pausedBuilding.id);
    expect(paused.getState().phase).toBe("TACTICAL_PAUSE");

    const opening = new GameSimulation();
    opening.tick(1);
    const frozenCountdown = opening.getState().openingCountdownRemainingSeconds;
    opening.getState().wood = 90;
    const openingBuilding = buildAt(opening, "slot-r1-c1", "arrow_tower");
    opening.getState().wood = 50;
    expect(opening.dispatch({ type: "upgrade_building", buildingId: openingBuilding.id }).accepted).toBe(true);
    chooseFirstTrait(opening, openingBuilding.id);
    expect(opening.getState().phase).toBe("OPENING_COUNTDOWN");
    expect(opening.getState().openingCountdownRemainingSeconds).toBe(frozenCountdown);
  });

  it("supports all four ten-gold transform routes, preserves identity, and rejects a second transform", () => {
    for (const targetTowerId of ["machine_gun", "cannon", "frost", "electric"] as const) {
      const game = new GameSimulation();
      game.getState().wood = 40;
      const building = buildAt(game, "slot-r1-c1", "arrow_tower");
      building.level = 3;
      building.traits = [{ definitionId: "tower_damage", stacks: 2, acquiredAtLevel: 2 }];
      game.getState().gold = 10;
      expect(game.dispatch({ type: "transform_tower", buildingId: building.id, targetTowerId })).toEqual({ accepted: true, buildingId: building.id });
      expect(game.getState().gold).toBe(0);
      expect(game.getState().pendingTraitDraft).toBeNull();
      expect(game.getState().buildings.find((candidate) => candidate.id === building.id)).toMatchObject({ id: building.id, slotId: "slot-r1-c1", level: 3, growthDefinitionId: targetTowerId, traits: [{ definitionId: "tower_damage", stacks: 2 }] });
      expect(game.dispatch({ type: "transform_tower", buildingId: building.id, targetTowerId: "frost" })).toEqual({ accepted: false, reason: "只有箭塔可以改造成特殊塔" });
    }
  });

  it("rejects a transform one gold short atomically", () => {
    const game = new GameSimulation();
    game.getState().wood = 40;
    const building = buildAt(game, "slot-r1-c1", "arrow_tower");
    game.getState().gold = 9;
    const before = structuredClone(game.getState());
    expect(game.dispatch({ type: "transform_tower", buildingId: building.id, targetTowerId: "cannon" })).toEqual({ accepted: false, reason: "金币不足" });
    expect(game.getState()).toEqual(before);
  });

  it("does not advance RNG or state when a one-gold-short transform fails before a later upgrade draft", () => {
    const prepare = (includeFailedTransform: boolean): GameSimulation => {
      const game = new GameSimulation(undefined, 90210);
      game.getState().wood = 90;
      const building = buildAt(game, "slot-r1-c1", "arrow_tower");
      game.getState().gold = 9;
      const beforeFailure = structuredClone(game.getState());
      if (includeFailedTransform) {
        expect(game.dispatch({ type: "transform_tower", buildingId: building.id, targetTowerId: "cannon" })).toEqual({ accepted: false, reason: "金币不足" });
        expect(game.getState()).toEqual(beforeFailure);
      }
      game.getState().wood = 50;
      expect(game.dispatch({ type: "upgrade_building", buildingId: building.id })).toEqual({ accepted: true, buildingId: building.id });
      return game;
    };

    const withFailedTransform = prepare(true);
    const control = prepare(false);
    expect(withFailedTransform.getState()).toEqual(control.getState());
    expect(withFailedTransform.nextRandomInt(1000)).toBe(control.nextRandomInt(1000));
  });

  it("keeps special re-upgrades exclusive and isolates a common trait to one of two towers", () => {
    const game = new GameSimulation();
    game.getState().wood = 140;
    const first = buildAt(game, "slot-r1-c1", "arrow_tower");
    const second = buildAt(game, "slot-r1-c2", "arrow_tower");
    game.getState().wood = 50;
    expect(game.dispatch({ type: "upgrade_building", buildingId: first.id }).accepted).toBe(true);
    chooseFirstTrait(game, first.id);
    expect(first.traits).toHaveLength(1);
    expect(second.traits).toEqual([]);
    game.getState().gold = 10;
    expect(game.dispatch({ type: "transform_tower", buildingId: first.id, targetTowerId: "cannon" }).accepted).toBe(true);
    game.getState().wood = 70;
    expect(game.dispatch({ type: "upgrade_building", buildingId: first.id }).accepted).toBe(true);
    expect(game.getState().pendingTraitDraft?.options.some((id) => id === "cannon_blast" || id === "cannon_burn")).toBe(true);
  });

  it("settles lumberyard production from its own level and traits, then removes it on dismantle", () => {
    const game = new GameSimulation();
    game.getState().wood = 1000;
    const first = buildAt(game, "slot-r1-c1", "lumberyard");
    const second = buildAt(game, "slot-r1-c2", "lumberyard");
    first.level = 3;
    first.traits = [{ definitionId: "lumber_flat", stacks: 2, acquiredAtLevel: 2 }];
    second.level = 2;
    const totalBefore = getWoodProductionPerSecond(game.getState());
    expect(totalBefore).toBeCloseTo(0.5 + (2.4 + 0.8) + 1.6, 8);
    expect(game.dispatch({ type: "destroy_building", slotId: first.slotId }).accepted).toBe(true);
    expect(getWoodProductionPerSecond(game.getState())).toBeCloseTo(0.5 + 1.6, 8);
  });

  it("keeps opening countdown and the sixty-second wave clock deterministic", () => {
    const game = new GameSimulation(stationaryEnemiesCatalog());
    game.tick(4.99);
    expect(game.getState().phase).toBe("OPENING_COUNTDOWN");
    expect(game.getState().wave).toBe(0);
    game.tick(0.01);
    expect(game.getState().phase).toBe("RUNNING");
    expect(game.getState().wave).toBe(1);
    game.tick(59.99);
    expect(game.getState().wave).toBe(1);
    game.tick(0.02);
    expect(game.getState().wave).toBe(2);
    expect(game.getState().effectiveBattleTimeSeconds).toBeGreaterThan(60);
  });

  it("runs the charger warning and charge signature from typed enemy content", () => {
    const game = new GameSimulation(stationaryEnemiesCatalog());
    startRunning(game);
    silenceFutureSpawns(game);
    const charger = runtimeEnemy("charger_boss", 100, false);
    charger.abilityCooldownSeconds = 0;
    game.getState().enemies = [charger];
    game.drainEvents();
    game.tick(0.25);
    expect(game.drainEvents()).toEqual([expect.objectContaining({ type: "enemy_charge_warning", enemyId: charger.id, durationSeconds: 2 })]);
    game.tick(2);
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({ type: "enemy_charge_started", enemyId: charger.id }));
    expect(charger.chargeRemainingSeconds).toBeGreaterThan(0);
  });

  it("runs charger/overlord signatures to final victory and freezes terminal commands until restart", () => {
    const game = new GameSimulation(stationaryEnemiesCatalog());
    game.getState().wood = 40;
    const tower = buildAt(game, "slot-r1-c1", "arrow_tower");
    tower.attackCooldownSeconds = 0;
    startRunning(game);
    silenceFutureSpawns(game);
    game.getState().enemies = [runtimeEnemy("overlord_boss", 1)];
    game.tick(0.25);
    expect(game.getState().phase).toBe("VICTORY");
    const snapshot = structuredClone(game.getState());
    expect(game.dispatch({ type: "build_building", slotId: "slot-r1-c2", definitionId: "lumberyard" })).toEqual({ accepted: false, reason: "当前状态不可建造" });
    game.tick(10);
    expect(game.getState()).toEqual(snapshot);
    expect(game.dispatch({ type: "restart" })).toEqual({ accepted: true });
    expect(game.getState().phase).toBe("OPENING_COUNTDOWN");
  });

  it("actually triggers overlord inspire with typed duration and multiplier before final-boss victory remains available", () => {
    const game = new GameSimulation(quietCatalog());
    startRunning(game);
    silenceFutureSpawns(game);
    const overlord = runtimeEnemy("overlord_boss", 100, true);
    overlord.abilityCooldownSeconds = 0;
    const target = runtimeEnemy("walker", 100, false);
    game.getState().enemies = [overlord, target];
    game.drainEvents();

    game.tick(0.25);
    const inspire = game.drainEvents().find((event) => event.type === "overlord_inspire");
    expect(inspire).toMatchObject({ enemyId: overlord.id, targetIds: [target.id], durationSeconds: 4, multiplier: 1.25 });
    expect(game.getState().overlordInspireRemainingSeconds).toBeCloseTo(3.75, 8);
    expect(game.getState().overlordInspireMultiplier).toBe(1.25);

    game.tick(4);
    expect(game.getState().overlordInspireRemainingSeconds).toBe(0);
    expect(game.getState().overlordInspireMultiplier).toBe(1);
  });

  it("transitions to defeat on wall loss and freezes, resumes, and restores a running game", () => {
    const game = new GameSimulation(stationaryEnemiesCatalog());
    startRunning(game);
    silenceFutureSpawns(game);
    game.getState().wallHp = 1;
    game.getState().enemies = [runtimeEnemy("walker", 100)];
    game.getState().enemies[0]!.attackCooldownSeconds = 0;
    game.tick(0.25);
    expect(game.getState().phase).toBe("DEFEAT");
    const terminal = structuredClone(game.getState());
    game.tick(5);
    expect(game.getState()).toEqual(terminal);

    const resumed = new GameSimulation(quietCatalog());
    startRunning(resumed);
    const timeBefore = resumed.getState().effectiveBattleTimeSeconds;
    expect(resumed.dispatch({ type: "system_pause" }).accepted).toBe(true);
    resumed.tick(10);
    expect(resumed.getState().effectiveBattleTimeSeconds).toBe(timeBefore);
    expect(resumed.dispatch({ type: "system_resume" }).accepted).toBe(true);
    expect(resumed.getState().phase).toBe("RUNNING");
  });
});
