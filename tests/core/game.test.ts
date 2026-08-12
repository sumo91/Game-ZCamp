import { describe, expect, it } from "vitest";
import { starterCatalog, type CardEffect, type ContentCatalog, type EnemyDefinition } from "../../src/core/content";
import { CAMP_SLOT_IDS } from "../../src/core/types";
import type { CardInstance } from "../../src/core/types";
import { GameSimulation, INITIAL_WOOD, SUPPLY_CYCLE_SECONDS, WALL_MAX_HP } from "../../src/core/game";

function makeCatalog(patches: Record<string, Partial<EnemyDefinition>> = {}, cards = starterCatalog.cards): ContentCatalog {
  return { ...starterCatalog, enemies: starterCatalog.enemies.map((enemy) => ({ ...enemy, ...(patches[enemy.id] ?? {}) })), cards };
}

function quietCatalog(cards = starterCatalog.cards): ContentCatalog {
  const patches = Object.fromEntries(starterCatalog.enemies.map((enemy) => [enemy.id, { moveSpeed: 0, wallDamage: 0 }]));
  return makeCatalog(patches, cards);
}

function startRunning(game: GameSimulation): void {
  game.tick(5);
  expect(game.getState().phase).toBe("RUNNING");
}

function handCard(game: GameSimulation, definitionId: string): CardInstance | undefined {
  return game.getState().hand.find((card) => card.definitionId === definitionId);
}

function injectCard(game: GameSimulation, definitionId: string, instanceId = "test-" + definitionId): CardInstance {
  const card: CardInstance = { instanceId, definitionId, batchNumber: 99, batchIndex: game.getState().hand.length };
  game.getState().hand.push(card);
  return card;
}

function playBase(game: GameSimulation, definitionId: string, slotId: string): void {
  const card = handCard(game, definitionId) ?? injectCard(game, definitionId, "base-" + definitionId + "-" + slotId);
  expect(game.dispatch({ type: "play_card", cardInstanceId: card.instanceId, target: { kind: "slot", slotId } }).accepted).toBe(true);
}

function playPermanent(game: GameSimulation, definitionId: string): void {
  game.getState().gold = Math.max(game.getState().gold, 100);
  const card = injectCard(game, definitionId, "permanent-" + definitionId + "-" + game.getState().hand.length);
  expect(game.dispatch({ type: "play_card", cardInstanceId: card.instanceId }).accepted).toBe(true);
}

function discardAllExcept(game: GameSimulation, keep: Set<string> = new Set()): void {
  for (const card of [...game.getState().hand]) {
    if (!keep.has(card.definitionId)) expect(game.dispatch({ type: "discard_card", cardInstanceId: card.instanceId }).accepted).toBe(true);
  }
}

function replaceCardEffect(catalog: ContentCatalog, id: string, effect: CardEffect): ContentCatalog {
  return { ...catalog, cards: catalog.cards.map((card) => card.id === id ? { ...card, effect } : card) };
}

describe("GameSimulation third-stage combat and card content", () => {
  it("starts with the fixed main city, fourteen slots, and the fixed opening hand", () => {
    const game = new GameSimulation();
    expect(game.getState().phase).toBe("OPENING_COUNTDOWN");
    expect(game.getState().wood).toBe(INITIAL_WOOD);
    expect(game.getState().wallHp).toBe(WALL_MAX_HP);
    expect(game.getState().buildings).toEqual([expect.objectContaining({ id: "main-city", slotId: "slot-r3-c3", kind: "main_city" })]);
    expect(game.getState().hand.map((card) => card.definitionId)).toEqual(["machine_gun", "cannon", "lumberyard", "frost"]);
    expect(game.getState().nextSupplyCard?.definitionId).toBe("machine_gun");
  });

  it("attacks an enemy after it reaches the wall from every tower and legal row slot", () => {
    const legalTowerSlots = CAMP_SLOT_IDS.filter((slotId) => slotId !== "slot-r3-c3");
    for (const tower of starterCatalog.towers) {
      for (const slotId of legalTowerSlots) {
        const game = new GameSimulation();
        game.getState().wood = 1000;
        playBase(game, tower.id, slotId);
        startRunning(game);

        const enemy = game.getState().enemies.find((candidate) => candidate.definitionId === "walker");
        expect(enemy).toBeDefined();
        enemy!.position = 1;
        enemy!.atWall = true;
        enemy!.attackCooldownSeconds = 99;
        const hpBeforeAttack = enemy!.hp;
        game.drainEvents();

        game.tick(0.25);

        const events = game.drainEvents();
        const towerAttack = events.find((event) => event.type === "tower_attack");
        const enemyHit = events.find((event) => event.type === "enemy_hit" && event.enemyId === enemy!.id);
        expect(towerAttack, tower.id + " at " + slotId).toMatchObject({
          type: "tower_attack",
          towerDefinitionId: tower.id,
          targetId: enemy!.id,
        });
        expect(enemyHit, tower.id + " hit at " + slotId).toMatchObject({
          type: "enemy_hit",
          enemyId: enemy!.id,
        });
        expect(enemyHit?.type === "enemy_hit" ? enemyHit.remainingHp : hpBeforeAttack).toBeLessThan(hpBeforeAttack);
      }
    }
  });

  it("prioritizes wall contact while preserving legal focus-fire priority", () => {
    const prepare = (): GameSimulation => {
      const game = new GameSimulation();
      game.getState().wood = 1000;
      playBase(game, "machine_gun", "slot-r1-c1");
      startRunning(game);
      const wallEnemy = game.getState().enemies[0]!;
      wallEnemy.position = 1;
      wallEnemy.atWall = true;
      wallEnemy.attackCooldownSeconds = 99;
      wallEnemy.hp = 1000;
      wallEnemy.maxHp = 1000;
      game.getState().enemies.push({ ...wallEnemy, id: "near-enemy", position: 0.1, atWall: false });
      game.getState().enemies.push({ ...wallEnemy, id: "far-enemy", position: 0.9, atWall: false });
      game.drainEvents();
      return game;
    };

    const wallPriority = prepare();
    wallPriority.getState().enemies = wallPriority.getState().enemies.filter((enemy) => enemy.id !== "far-enemy");
    wallPriority.tick(0.25);
    expect(wallPriority.drainEvents().find((event) => event.type === "tower_attack")?.targetId).toBe("walker-0");

    const validFocus = prepare();
    validFocus.getState().focusFireTargetId = "near-enemy";
    validFocus.getState().focusFireRemainingSeconds = 1;
    validFocus.tick(0.25);
    expect(validFocus.drainEvents().find((event) => event.type === "tower_attack")?.targetId).toBe("near-enemy");

    const invalidFocus = prepare();
    invalidFocus.getState().focusFireTargetId = "far-enemy";
    invalidFocus.getState().focusFireRemainingSeconds = 1;
    invalidFocus.tick(0.25);
    expect(invalidFocus.drainEvents().find((event) => event.type === "tower_attack")?.targetId).toBe("walker-0");
  });

  it("keeps opening planning, supply, and combat frozen until five seconds", () => {
    const game = new GameSimulation(quietCatalog());
    playBase(game, "machine_gun", "slot-r1-c1");
    const woodAfterBuild = game.getState().wood;
    game.tick(4.99);
    expect(game.getState().effectiveBattleTimeSeconds).toBe(0);
    expect(game.getState().wood).toBe(woodAfterBuild);
    expect(game.getState().supplyProgressSeconds).toBe(0);
    expect(game.getState().enemies).toHaveLength(0);
    game.tick(0.01);
    expect(game.getState().phase).toBe("RUNNING");
  });

  it("uses the 18-second supply cycle and exposes a waiting card without a hidden queue", () => {
    const game = new GameSimulation(quietCatalog());
    startRunning(game);
    game.tick(SUPPLY_CYCLE_SECONDS);
    expect(game.getState().hand).toHaveLength(4);
    expect(game.getState().supplyWaitingCard).toMatchObject({ definitionId: "machine_gun" });
    expect(game.getState().nextSupplyCard).toBeNull();
    expect(game.dispatch({ type: "discard_card", cardInstanceId: game.getState().hand[0]!.instanceId }).accepted).toBe(true);
    expect(game.getState().hand).toHaveLength(4);
    expect(game.getState().supplyWaitingCard).toBeNull();
    expect(game.getState().nextSupplyCard?.definitionId).toBe("electric");
  });

  it("keeps retained high-cost cards inside the two-card batch cap", () => {
    const game = new GameSimulation(quietCatalog(), 2026);
    game.getState().hand[1]!.definitionId = "electric";
    game.getState().supplyBatchRemaining = [];
    game.getState().supplyBatchNumber = 1;
    game.getState().nextSupplyCard = null;
    game.getState().supplyWaitingCard = { instanceId: "waiting", definitionId: "machine_gun", batchNumber: 1, batchIndex: 0 };
    const discarded = game.getState().hand.find((card) => card.definitionId === "machine_gun")!;
    expect(game.dispatch({ type: "discard_card", cardInstanceId: discarded.instanceId }).accepted).toBe(true);
    const nextBatch = [game.getState().nextSupplyCard!, ...game.getState().supplyBatchRemaining];
    expect(nextBatch).toHaveLength(12);
    expect(nextBatch.filter((card) => card.definitionId === "cannon" || card.definitionId === "electric")).toHaveLength(0);
  });

  it("supports tactical pause planning and freezes temporary durations at the corrected boundary", () => {
    const patches = Object.fromEntries(starterCatalog.enemies.map((enemy) => [enemy.id, { moveSpeed: 0, wallDamage: enemy.id === "walker" ? 5 : 0 }]));
    const game = new GameSimulation(makeCatalog(patches));
    startRunning(game);
    const enemy = game.getState().enemies[0]!;
    enemy.atWall = true;
    enemy.attackCooldownSeconds = 0;
    game.getState().wallHp = 100;
    game.getState().globalFreezeRemainingSeconds = 1;
    const beforeEnemy = structuredClone(enemy);
    expect(game.dispatch({ type: "pause" }).accepted).toBe(true);
    game.tick(10);
    expect(game.getState().phase).toBe("TACTICAL_PAUSE");
    expect(game.getState().effectiveBattleTimeSeconds).toBe(0);
    expect(game.getState().globalFreezeRemainingSeconds).toBe(1);
    expect(game.dispatch({ type: "resume" }).accepted).toBe(true);
    game.tick(1);
    expect(game.getState().wallHp).toBe(100);
    expect(game.getState().globalFreezeRemainingSeconds).toBe(0);
    expect(game.getState().enemies[0]?.position).toBe(beforeEnemy.position);
    game.getState().enemies[0]!.atWall = true;
    game.getState().enemies[0]!.attackCooldownSeconds = 0;
    game.tick(0.25);
    expect(game.getState().wallHp).toBeLessThan(100);
  });

  it("implements enemy-stop tower-continue: wall attacks and Boss abilities do not progress during freeze", () => {
    const game = new GameSimulation(quietCatalog());
    startRunning(game);
    const enemy = game.getState().enemies[0]!;
    enemy.atWall = true;
    enemy.attackCooldownSeconds = 0;
    enemy.abilityCooldownSeconds = 0;
    game.getState().globalFreezeRemainingSeconds = 2;
    game.drainEvents();
    game.tick(1);
    expect(game.getState().wallHp).toBe(WALL_MAX_HP);
    expect(enemy.attackCooldownSeconds).toBe(0);
    expect(enemy.abilityCooldownSeconds).toBe(0);
    expect(game.drainEvents().some((event) => event.type === "overlord_inspire" || event.type === "enemy_charge_warning")).toBe(false);

    playBase(game, "machine_gun", "slot-r1-c1");
    game.getState().globalFreezeRemainingSeconds = 2;
    game.getState().enemies[0]!.atWall = false;
    game.getState().enemies[0]!.hp = 1000;
    game.tick(0.25);
    expect(game.drainEvents().some((event) => event.type === "enemy_hit")).toBe(true);
  });

  it("applies the 22-card permanent and tactical effects through content values", () => {
    const game = new GameSimulation(quietCatalog());
    playBase(game, "machine_gun", "slot-r1-c1");
    playPermanent(game, "machine_penetration");
    playPermanent(game, "machine_boss_damage");
    playPermanent(game, "cannon_blast");
    playPermanent(game, "cannon_burn");
    playPermanent(game, "frost_slow");
    playPermanent(game, "frost_vulnerability");
    playPermanent(game, "electric_chain");
    playPermanent(game, "electric_overload");
    playPermanent(game, "wood_efficiency");
    playPermanent(game, "wall_reinforcement");
    playPermanent(game, "repair_mastery");
    playPermanent(game, "tower_synergy");
    expect(Object.keys(game.getState().permanentApplications)).toHaveLength(12);
    const wallMax = game.getState().wallMaxHp;
    expect(wallMax).toBe(WALL_MAX_HP + 20);
    expect(Object.keys(game.getState().permanentApplications)).toHaveLength(12);
  });

  it("reads modified effect values into simulation results", () => {
    const boostedCards = starterCatalog.cards.map((card) => card.id === "wood_efficiency" ? { ...card, effect: { kind: "wood_income" as const, amountPerSecond: 2 } } : card);
    const game = new GameSimulation(quietCatalog(boostedCards));
    playPermanent(game, "wood_efficiency");
    const before = game.getState().wood;
    startRunning(game);
    game.tick(1);
    expect(game.getState().wood - before).toBeCloseTo(2.5, 5);
  });

  it("uses machine-gun Boss damage for both Boss definitions", () => {
    const damages: number[] = [];
    for (const definitionId of ["charger_boss", "overlord_boss"]) {
      const game = new GameSimulation(quietCatalog());
      playBase(game, "machine_gun", "slot-r1-c1");
      playPermanent(game, "machine_boss_damage");
      startRunning(game);
      const enemy = game.getState().enemies[0]!;
      enemy.definitionId = definitionId;
      enemy.hp = 1000;
      enemy.maxHp = 1000;
      enemy.abilityCooldownSeconds = 10;
      game.drainEvents();
      game.tick(0.25);
      const hit = game.drainEvents().find((event) => event.type === "enemy_hit");
      expect(hit?.type).toBe("enemy_hit");
      damages.push(hit!.damage);
    }
    expect(damages[0]).toBeCloseTo(16.2, 5);
    expect(damages[1]).toBeCloseTo(16.2, 5);
  });

  it("keeps electric overload active for both Boss definitions", () => {
    for (const definitionId of ["charger_boss", "overlord_boss"]) {
      const game = new GameSimulation(quietCatalog());
      playBase(game, "electric", "slot-r1-c1");
      playPermanent(game, "electric_overload");
      startRunning(game);
      const enemy = game.getState().enemies[0]!;
      enemy.definitionId = definitionId;
      enemy.hp = 1000;
      enemy.maxHp = 1000;
      enemy.abilityCooldownSeconds = 10;
      game.drainEvents();
      game.tick(0.25);
      const hit = game.drainEvents().find((event) => event.type === "enemy_hit");
      expect(hit?.type).toBe("enemy_hit");
      expect(hit!.damage).toBeCloseTo(15.6, 5);
      expect(game.drainEvents().some((event) => event.type === "tower_special")).toBe(false);
    }
  });

  it("emits cannon burn and applies frost data values", () => {
    const game = new GameSimulation(quietCatalog());
    playBase(game, "cannon", "slot-r1-c1");
    playBase(game, "frost", "slot-r1-c2");
    playPermanent(game, "cannon_burn");
    playPermanent(game, "frost_slow");
    startRunning(game);
    for (const enemy of game.getState().enemies) { enemy.hp = 1000; enemy.maxHp = 1000; }
    game.drainEvents();
    game.tick(0.25);
    const target = game.getState().enemies[0]!;
    expect(target.burnDamagePerSecond).toBe(6);
    expect(target.burnRemainingSeconds).toBeGreaterThan(0);
    expect(target.slowMultiplier).toBe(0.35);
    expect(target.slowRemainingSeconds).toBeGreaterThan(0);
    expect(game.drainEvents().some((event) => event.type === "enemy_burned")).toBe(true);
  });

  it("pre-arms global freeze in an empty field and starts the full duration on the next spawn", () => {
    const game = new GameSimulation(quietCatalog());
    startRunning(game);
    game.getState().enemies.length = 0;
    game.getState().gold = 100;
    const freeze = injectCard(game, "global_freeze", "empty-field-freeze");
    expect(game.dispatch({ type: "play_card", cardInstanceId: freeze.instanceId }).accepted).toBe(true);
    expect(game.getState().globalFreezeNextSpawn).toBe(true);
    expect(game.getState().globalFreezePendingDurationSeconds).toBe(5);
    expect(game.getState().globalFreezeRemainingSeconds).toBe(0);
    expect(game.drainEvents().some((event) => event.type === "global_freeze_armed")).toBe(true);
    game.tick(starterCatalog.waves[0]!.spawnEvents[1]!.atSeconds);
    expect(game.getState().globalFreezeNextSpawn).toBe(false);
    expect(game.getState().globalFreezePendingDurationSeconds).toBe(0);
    expect(game.getState().globalFreezeRemainingSeconds).toBeCloseTo(5, 5);
    expect(game.drainEvents().some((event) => event.type === "global_freeze_started")).toBe(true);
  });

  it("supports all four tactical cards and data-driven focus targeting", () => {
    const game = new GameSimulation(quietCatalog());
    startRunning(game);
    game.getState().gold = 100;
    const shield = injectCard(game, "wall_shield", "tactical-shield");
    expect(game.dispatch({ type: "play_card", cardInstanceId: shield.instanceId }).accepted).toBe(true);
    const drop = injectCard(game, "wood_drop", "tactical-drop");
    const woodBefore = game.getState().wood;
    expect(game.dispatch({ type: "play_card", cardInstanceId: drop.instanceId }).accepted).toBe(true);
    expect(game.getState().wood).toBe(woodBefore + 40);
    const freeze = injectCard(game, "global_freeze", "tactical-freeze");
    expect(game.dispatch({ type: "play_card", cardInstanceId: freeze.instanceId }).accepted).toBe(true);
    const focus = injectCard(game, "focus_fire", "tactical-focus");
    expect(game.dispatch({ type: "play_card", cardInstanceId: focus.instanceId }).accepted).toBe(true);
    expect(game.getState().focusFireTargetId).toBe(game.getState().enemies[0]?.id);
    expect(game.getState().globalFreezeRemainingSeconds).toBe(5);
    expect(game.getState().wallShieldHp).toBe(30);
  });

  it("supports exact level-three cost, wall repair, shield expiry, illegal targets, and zero-refund dismantle", () => {
    const game = new GameSimulation(quietCatalog());
    game.getState().wood = 500;
    playBase(game, "repair_shop", "slot-r1-c1");
    const upgrade = injectCard(game, "repair_shop", "repair-upgrade");
    expect(game.dispatch({ type: "play_card", cardInstanceId: upgrade.instanceId, target: { kind: "slot", slotId: "slot-r1-c1" } }).accepted).toBe(true);
    const levelThree = injectCard(game, "repair_shop", "repair-level-three");
    expect(game.dispatch({ type: "play_card", cardInstanceId: levelThree.instanceId, target: { kind: "slot", slotId: "slot-r1-c1" } }).accepted).toBe(true);
    expect(game.getState().wood).toBe(500 - 60 - 90 - 135);
    game.getState().wallHp = 40;
    const repair = injectCard(game, "repair_shop", "repair-wall");
    expect(game.dispatch({ type: "play_card", cardInstanceId: repair.instanceId, target: { kind: "wall" } }).accepted).toBe(true);
    expect(game.getState().wallHp).toBe(85);
    game.getState().wallHp = game.getState().wallMaxHp;
    const fullRepair = injectCard(game, "repair_shop", "repair-full-wall");
    expect(game.dispatch({ type: "play_card", cardInstanceId: fullRepair.instanceId, target: { kind: "wall" } }).accepted).toBe(true);
    expect(game.getState().wallShieldHp).toBe(30);
    startRunning(game);
    const shieldRemaining = game.getState().wallShieldRemainingSeconds;
    game.tick(shieldRemaining + 0.1);
    expect(game.getState().wallShieldHp).toBe(0);
    const cannon = injectCard(game, "cannon", "illegal-cannon");
    const wood = game.getState().wood;
    expect(game.dispatch({ type: "play_card", cardInstanceId: cannon.instanceId, target: { kind: "slot", slotId: "slot-r1-c1" } }).accepted).toBe(false);
    expect(game.getState().wood).toBe(wood);
    expect(game.getState().hand.some((card) => card.instanceId === cannon.instanceId)).toBe(true);
    const beforeDismantle = game.getState().wood;
    expect(game.dispatch({ type: "destroy_building", slotId: "slot-r1-c1" }).accepted).toBe(true);
    expect(game.getState().wood).toBe(beforeDismantle);
  });

  it("reads charger signature timing from enemy content", () => {
    const enemies = starterCatalog.enemies.map((enemy) => {
      if (enemy.id === "charger_boss" && enemy.signature?.kind === "charger") return { ...enemy, moveSpeed: 0, wallDamage: 0, signature: { ...enemy.signature, warningSeconds: 1, chargeDistance: 0.2, chargeDurationSeconds: 0.4, initialCooldownSeconds: 0, cooldownSeconds: 2 } };
      return { ...enemy, moveSpeed: 0, wallDamage: 0 };
    });
    const game = new GameSimulation({ ...starterCatalog, enemies });
    startRunning(game);
    game.tick(280);
    const warning = game.drainEvents().find((event) => event.type === "enemy_charge_warning");
    expect(warning?.type).toBe("enemy_charge_warning");
    expect(warning!.durationSeconds).toBe(1);
    const charger = game.getState().enemies.find((enemy) => enemy.definitionId === "charger_boss")!;
    expect(charger.chargeWarningRemainingSeconds).toBeGreaterThan(0);
  });

  it("burns every enemy inside the cannon blast area", () => {
    const game = new GameSimulation(quietCatalog());
    playBase(game, "cannon", "slot-r1-c1");
    playPermanent(game, "cannon_burn");
    startRunning(game);
    for (const enemy of game.getState().enemies) { enemy.hp = 1000; enemy.maxHp = 1000; }
    game.getState().enemies[0]!.position = 0.1;
    const second = { ...game.getState().enemies[0]!, id: "walker-area-target", position: 0.0, hp: 1000, maxHp: 1000 };
    game.getState().enemies.push(second);
    game.drainEvents();
    game.tick(0.25);
    const burns = game.drainEvents().filter((event) => event.type === "enemy_burned");
    expect(new Set(burns.map((event) => event.enemyId)).size).toBeGreaterThanOrEqual(2);
    expect(burns.every((event) => event.areaRadius > 0 && event.damagePerSecond === 6 && event.durationSeconds === 4)).toBe(true);
  });

  it("computes secondary penetration damage from its own enemy modifiers", () => {
    const game = new GameSimulation(quietCatalog());
    playBase(game, "machine_gun", "slot-r1-c1");
    playPermanent(game, "machine_penetration");
    playPermanent(game, "machine_boss_damage");
    startRunning(game);
    const primary = game.getState().enemies[0]!;
    const secondary = { ...primary, id: "penetration-secondary" };
    game.getState().enemies.push(secondary);
    primary.position = 0.1;
    primary.hp = 1000;
    primary.maxHp = 1000;
    secondary.definitionId = "armored";
    secondary.position = 0;
    secondary.hp = 1000;
    secondary.maxHp = 1000;
    game.getState().buildings.find((building) => building.definitionId === "machine_gun")!.attackCooldownSeconds = 0;
    game.drainEvents();
    game.tick(0.25);
    const hit = game.drainEvents().filter((event) => event.type === "enemy_hit").find((event) => event.enemyId === secondary.id);
    expect(hit?.type).toBe("enemy_hit");
    expect(hit!.damage).toBeCloseTo(12 * 1.35 * 0.55, 5);
  });

  it("proves blast radius, frost vulnerability, chain jump, and three-tower synergy from future cards", () => {
    const blastGame = new GameSimulation(quietCatalog());
    playPermanent(blastGame, "cannon_blast");
    blastGame.getState().wood = 500;
    playBase(blastGame, "cannon", "slot-r1-c1");
    startRunning(blastGame);
    for (const enemy of blastGame.getState().enemies) { enemy.hp = 1000; enemy.maxHp = 1000; }
    blastGame.getState().enemies[0]!.position = 0.1;
    blastGame.getState().enemies.push({ ...blastGame.getState().enemies[0]!, id: "blast-secondary", position: 0.3, hp: 1000, maxHp: 1000 });
    blastGame.drainEvents();
    blastGame.tick(0.25);
    expect(blastGame.drainEvents().filter((event) => event.type === "enemy_hit" && event.enemyId === "blast-secondary").length).toBeGreaterThan(0);

    const vulnerabilityGame = new GameSimulation(quietCatalog());
    playPermanent(vulnerabilityGame, "frost_vulnerability");
    vulnerabilityGame.getState().wood = 500;
    playBase(vulnerabilityGame, "frost", "slot-r1-c1");
    startRunning(vulnerabilityGame);
    const vulnerable = vulnerabilityGame.getState().enemies[0]!;
    vulnerable.hp = 1000;
    vulnerable.maxHp = 1000;
    vulnerable.slowRemainingSeconds = 1;
    vulnerabilityGame.drainEvents();
    vulnerabilityGame.tick(0.25);
    const vulnerableHit = vulnerabilityGame.drainEvents().filter((event) => event.type === "enemy_hit").find((event) => event.enemyId === vulnerable.id);
    expect(vulnerableHit?.damage).toBeCloseTo(4 * 1.25, 5);

    const chainGame = new GameSimulation(quietCatalog());
    playPermanent(chainGame, "electric_chain");
    chainGame.getState().wood = 500;
    playBase(chainGame, "electric", "slot-r1-c1");
    startRunning(chainGame);
    for (const enemy of chainGame.getState().enemies) { enemy.hp = 1000; enemy.maxHp = 1000; enemy.position = 0.1; }
    for (let index = 0; index < 3; index += 1) chainGame.getState().enemies.push({ ...chainGame.getState().enemies[0]!, id: "chain-" + index, hp: 1000, maxHp: 1000 });
    chainGame.drainEvents();
    chainGame.tick(0.25);
    expect(chainGame.drainEvents().filter((event) => event.type === "enemy_hit").length).toBeGreaterThanOrEqual(4);

    const synergyGame = new GameSimulation(quietCatalog());
    playPermanent(synergyGame, "tower_synergy");
    synergyGame.getState().wood = 500;
    playBase(synergyGame, "machine_gun", "slot-r1-c1");
    playBase(synergyGame, "cannon", "slot-r1-c2");
    playBase(synergyGame, "frost", "slot-r1-c3");
    startRunning(synergyGame);
    const synergyTarget = synergyGame.getState().enemies[0]!;
    synergyTarget.hp = 1000;
    synergyTarget.maxHp = 1000;
    for (const building of synergyGame.getState().buildings) if (building.definitionId !== "machine_gun") building.attackCooldownSeconds = 99;
    synergyGame.getState().buildings.find((building) => building.definitionId === "machine_gun")!.attackCooldownSeconds = 0;
    synergyGame.drainEvents();
    synergyGame.tick(0.25);
    const synergyHit = synergyGame.drainEvents().filter((event) => event.type === "enemy_hit").find((event) => event.enemyId === synergyTarget.id);
    expect(synergyHit?.damage).toBeCloseTo(12 * 1.1, 5);
  });

  it("removes capped permanent cards from later deterministic candidates", () => {
    const prepare = () => {
      const game = new GameSimulation(quietCatalog(), 77);
      game.getState().permanentApplications = { wood_efficiency: 3, wall_reinforcement: 2, repair_mastery: 3 };
      startRunning(game);
      while (game.getState().supplyBatchNumber === 1) {
        discardAllExcept(game);
        game.tick(SUPPLY_CYCLE_SECONDS);
      }
      return game;
    };
    const first = prepare();
    const second = prepare();
    const firstBatch = [first.getState().nextSupplyCard!, ...first.getState().supplyBatchRemaining];
    const secondBatch = [second.getState().nextSupplyCard!, ...second.getState().supplyBatchRemaining];
    expect(firstBatch).toEqual(secondBatch);
    expect(firstBatch).toHaveLength(12);
    expect(firstBatch.some((card) => ["wood_efficiency", "wall_reinforcement", "repair_mastery"].includes(card.definitionId))).toBe(false);
  });

  it("runs charger warning, overlord inspire, and deterministic final victory", () => {
    const game = new GameSimulation(quietCatalog());
    startRunning(game);
    game.tick(285);
    const chargerEvents = game.drainEvents();
    expect(chargerEvents.some((event) => event.type === "enemy_charge_warning")).toBe(true);
    game.tick(300);
    const inspireEvents = game.drainEvents();
    expect(inspireEvents.some((event) => event.type === "overlord_inspire")).toBe(true);
    for (const enemy of game.getState().enemies) enemy.hp = 0;
    game.tick(0.25);
    expect(game.getState().phase).toBe("VICTORY");
  });

  it("blocks gameplay input and time after victory or defeat until restart", () => {
    const victory = new GameSimulation(quietCatalog());
    startRunning(victory);
    victory.tick(285);
    victory.drainEvents();
    victory.tick(300);
    victory.drainEvents();
    for (const enemy of victory.getState().enemies) enemy.hp = 0;
    victory.tick(0.25);
    expect(victory.getState().phase).toBe("VICTORY");
    const victoryTime = victory.getState().effectiveBattleTimeSeconds;
    expect(victory.dispatch({ type: "pause" }).accepted).toBe(false);
    expect(victory.dispatch({ type: "discard_card", cardInstanceId: victory.getState().hand[0]!.instanceId }).accepted).toBe(false);
    victory.tick(60);
    expect(victory.getState().effectiveBattleTimeSeconds).toBe(victoryTime);
    expect(victory.dispatch({ type: "restart" }).accepted).toBe(true);
    expect(victory.getState().phase).toBe("OPENING_COUNTDOWN");

    const defeat = new GameSimulation(makeCatalog({ walker: { moveSpeed: 0, wallDamage: 100, wallAttackIntervalSeconds: 0 } }));
    startRunning(defeat);
    defeat.getState().wallHp = 1;
    defeat.getState().enemies.push({
      id: "wall-test",
      definitionId: "walker",
      wave: 1,
      position: 1,
      hp: 36,
      maxHp: 36,
      atWall: true,
      attackCooldownSeconds: 0,
      slowMultiplier: 1,
      slowRemainingSeconds: 0,
      abilityCooldownSeconds: 0,
      burnDamagePerSecond: 0,
      burnRemainingSeconds: 0,
      chargeWarningRemainingSeconds: 0,
      chargeRemainingSeconds: 0,
      chargeTargetPosition: 1,
    });
    defeat.tick(0.25);
    expect(defeat.getState().phase).toBe("DEFEAT");
    expect(defeat.dispatch({ type: "pause" }).accepted).toBe(false);
    expect(defeat.dispatch({ type: "play_card", cardInstanceId: defeat.getState().hand[0]!.instanceId, target: { kind: "slot", slotId: "slot-r1-c1" } }).accepted).toBe(false);
  });

  it("freezes and restores running or tactical state through system pause", () => {
    const game = new GameSimulation(quietCatalog());
    startRunning(game);
    const runningTime = game.getState().effectiveBattleTimeSeconds;
    expect(game.dispatch({ type: "system_pause" }).accepted).toBe(true);
    expect(game.getState().phase).toBe("SYSTEM_PAUSE");
    expect(game.dispatch({ type: "pause" }).accepted).toBe(false);
    game.tick(30);
    expect(game.getState().effectiveBattleTimeSeconds).toBe(runningTime);
    expect(game.dispatch({ type: "system_resume" }).accepted).toBe(true);
    expect(game.getState().phase).toBe("RUNNING");

    expect(game.dispatch({ type: "pause" }).accepted).toBe(true);
    expect(game.dispatch({ type: "system_pause" }).accepted).toBe(true);
    expect(game.getState().phase).toBe("SYSTEM_PAUSE");
    expect(game.dispatch({ type: "system_resume" }).accepted).toBe(true);
    expect(game.getState().phase).toBe("TACTICAL_PAUSE");
  });
});
