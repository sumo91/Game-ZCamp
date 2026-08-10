import { describe, expect, it } from "vitest";
import { starterCatalog, type ContentCatalog } from "../../src/core/content";
import { GameSimulation, INITIAL_WOOD, MAX_WAVE, WALL_MAX_HP } from "../../src/core/game";

describe("GameSimulation", () => {
  it("starts in preparation with initial resources", () => {
    const game = new GameSimulation();

    expect(game.getState()).toMatchObject({
      phase: "PREPARE",
      wave: 0,
      wood: INITIAL_WOOD,
      wallHp: WALL_MAX_HP,
    });
  });

  it("builds a tower through a validated command", () => {
    const game = new GameSimulation();
    const result = game.dispatch({
      type: "build_tower",
      definitionId: "machine_gun",
      slotId: "slot-1",
    });

    expect(result.accepted).toBe(true);
    expect(game.getState().buildings).toHaveLength(1);
    expect(game.getState().wood).toBe(INITIAL_WOOD - 40);
  });

  it("upgrades an occupied tower slot and consumes the upgrade cost", () => {
    const game = new GameSimulation();
    game.dispatch({ type: "build_tower", definitionId: "machine_gun", slotId: "slot-1" });
    const woodAfterBuild = game.getState().wood;

    const result = game.dispatch({ type: "upgrade_tower", slotId: "slot-1" });

    expect(result.accepted).toBe(true);
    expect(game.getState().buildings[0]?.level).toBe(2);
    expect(game.getState().wood).toBeLessThan(woodAfterBuild);
  });

  it("spawns an enemy, lets a tower attack it, and pays the kill reward", () => {
    const singleEnemyCatalog = {
      ...starterCatalog,
      waves: [{ wave: 1, durationSeconds: 8, spawnEvents: [{ atSeconds: 0, enemyId: "walker" }] }],
    };
    const game = new GameSimulation(singleEnemyCatalog);
    game.dispatch({
      type: "build_tower",
      definitionId: "machine_gun",
      slotId: "slot-1",
    });
    game.dispatch({ type: "start_wave" });

    for (let index = 0; index < 300 && game.getState().phase === "COMBAT"; index += 1) {
      game.tick(1 / 30);
    }

    expect(game.getState().defeatedEnemies).toBeGreaterThan(0);
    expect(game.getState().gold).toBeGreaterThan(0);
    expect(game.getState().enemies).toHaveLength(0);
  });

  it("emits deterministic attack and hit events for the presentation layer", () => {
    const singleEnemyCatalog = {
      ...starterCatalog,
      waves: [{ wave: 1, durationSeconds: 8, spawnEvents: [{ atSeconds: 0, enemyId: "walker" }] }],
    };
    const game = new GameSimulation(singleEnemyCatalog);
    game.dispatch({ type: "build_tower", definitionId: "machine_gun", slotId: "slot-1" });
    game.dispatch({ type: "start_wave" });

    game.tick(0.7);
    const events = game.drainEvents();

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "tower_attack", towerDefinitionId: "machine_gun" }),
      expect.objectContaining({ type: "enemy_hit", damage: 12 }),
    ]));
  });

  it("damages the wall when an enemy reaches it", () => {
    const game = new GameSimulation();
    game.dispatch({ type: "start_wave" });

    game.tick(8);

    expect(game.getState().wallHp).toBeLessThan(WALL_MAX_HP);
    expect(game.getState().enemies.length).toBeGreaterThan(0);
  });

  it("pauses simulation time and resumes the previous phase", () => {
    const game = new GameSimulation();
    game.dispatch({ type: "start_wave" });
    const beforePause = game.getState().waveTimeRemainingSeconds;

    game.dispatch({ type: "pause" });
    game.tick(10);
    expect(game.getState().phase).toBe("PAUSED");
    expect(game.getState().waveTimeRemainingSeconds).toBe(beforePause);

    game.dispatch({ type: "resume" });
    expect(game.getState().phase).toBe("COMBAT");
  });

  it("enters defeat once when the wall reaches zero", () => {
    const game = new GameSimulation();
    game.dispatch({ type: "start_wave" });
    game.damageWall(WALL_MAX_HP);
    game.damageWall(10);

    expect(game.getState().phase).toBe("DEFEAT");
    expect(game.getState().wallHp).toBe(0);
  });

  it("offers three upgrades and applies the selected effect to the next wave", () => {
    const upgradeCatalog: ContentCatalog = {
      ...starterCatalog,
      enemies: [
        { ...starterCatalog.enemies[0]!, id: "rewarder", maxHp: 1, moveSpeed: 0.1, wallDamage: 0, xpReward: 3 },
        { ...starterCatalog.enemies[0]!, id: "target", maxHp: 17, moveSpeed: 0.1, wallDamage: 0, xpReward: 1 },
      ],
      waves: [
        { wave: 1, durationSeconds: 2, spawnEvents: [{ atSeconds: 0, enemyId: "rewarder" }] },
        { wave: 2, durationSeconds: 2, spawnEvents: [{ atSeconds: 0, enemyId: "target" }] },
      ],
      upgrades: [
        { id: "test_damage", title: "测试伤害", description: "机枪塔伤害 +5。", effect: { kind: "tower_damage", towerId: "machine_gun", amount: 5 } },
        { id: "test_range", title: "测试射程", description: "机枪塔射程 +0.1。", effect: { kind: "tower_range", towerId: "machine_gun", amount: 0.1 } },
        { id: "test_wood", title: "测试木材", description: "木材产出 +1。", effect: { kind: "wood_income", amount: 1 } },
      ],
    };
    const game = new GameSimulation(upgradeCatalog);
    game.dispatch({ type: "build_tower", definitionId: "machine_gun", slotId: "slot-1" });
    game.dispatch({ type: "start_wave" });
    game.tick(1);

    expect(game.getState().phase).toBe("UPGRADE");
    expect(game.getState().pendingUpgradeChoices).toHaveLength(3);
    expect(game.dispatch({ type: "choose_upgrade", upgradeId: "test_damage" }).accepted).toBe(true);
    expect(game.getState().upgradeIds).toContain("test_damage");

    game.dispatch({ type: "start_wave" });
    game.tick(1);
    expect(game.getState().defeatedEnemies).toBe(2);
  });

  it("completes the fixed wave sequence", () => {
    const safeCatalog = {
      ...starterCatalog,
      enemies: starterCatalog.enemies.map((enemy) => ({
        ...enemy,
        maxHp: 1,
        moveSpeed: 0.1,
        wallDamage: 0,
      })),
      waves: Array.from({ length: MAX_WAVE }, (_, index) => ({
        wave: index + 1,
        durationSeconds: 1,
        spawnEvents: [{ atSeconds: 0, enemyId: "walker" }],
      })),
    };
    const game = new GameSimulation(safeCatalog);
    game.dispatch({
      type: "build_tower",
      definitionId: "machine_gun",
      slotId: "slot-1",
    });

    for (let wave = 0; wave < MAX_WAVE; wave += 1) {
      expect(game.dispatch({ type: "start_wave" }).accepted).toBe(true);
      game.tick(1);
      if (game.getState().phase === "UPGRADE") {
        expect(game.dispatch({ type: "choose_upgrade", upgradeId: game.getState().pendingUpgradeChoices[0]! }).accepted).toBe(true);
      }
    }

    expect(game.getState().wave).toBe(MAX_WAVE);
    expect(game.getState().phase).toBe("VICTORY");
  });
});
