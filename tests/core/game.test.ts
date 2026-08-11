import { describe, expect, it } from "vitest";
import { starterCatalog, type ContentCatalog } from "../../src/core/content";
import { CAMP_SLOT_IDS } from "../../src/core/types";
import { GameSimulation, INITIAL_WOOD, MAX_WAVE, WALL_MAX_HP } from "../../src/core/game";

function startCombat(game: GameSimulation): void {
  expect(game.dispatch({ type: "complete_prep" }).accepted).toBe(true);
  game.tick(3);
  expect(game.getState().phase).toBe("COMBAT");
}

describe("GameSimulation D3 flow", () => {
  it("starts in SHOP with a stable 5x3 camp", () => {
    const game = new GameSimulation();

    expect(game.getState()).toMatchObject({
      phase: "SHOP",
      wave: 0,
      wood: INITIAL_WOOD,
      wallHp: WALL_MAX_HP,
      countdownRemainingSeconds: 0,
    });
    expect(CAMP_SLOT_IDS).toEqual([
      "slot-r1-c1", "slot-r1-c2", "slot-r1-c3", "slot-r1-c4", "slot-r1-c5",
      "slot-r2-c1", "slot-r2-c2", "slot-r2-c3", "slot-r2-c4", "slot-r2-c5",
      "slot-r3-c1", "slot-r3-c2", "slot-r3-c3", "slot-r3-c4", "slot-r3-c5",
    ]);
  });

  it("builds once through a validated 15-slot command", () => {
    const game = new GameSimulation();
    const result = game.dispatch({ type: "build_tower", definitionId: "machine_gun", slotId: "slot-r1-c1" });

    expect(result.accepted).toBe(true);
    expect(game.getState().buildings).toHaveLength(1);
    expect(game.getState().wood).toBe(INITIAL_WOOD - 40);
    expect(game.dispatch({ type: "build_tower", definitionId: "cannon", slotId: "slot-r1-c1" }).accepted).toBe(false);
    expect(game.dispatch({ type: "build_tower", definitionId: "cannon", slotId: "slot-1" }).accepted).toBe(false);
  });

  it("uses a non-repeatable three-second countdown and blocks build input", () => {
    const game = new GameSimulation();
    game.dispatch({ type: "build_tower", definitionId: "machine_gun", slotId: "slot-r1-c1" });
    const woodBeforeCountdown = game.getState().wood;

    expect(game.dispatch({ type: "complete_prep" }).accepted).toBe(true);
    expect(game.dispatch({ type: "complete_prep" }).accepted).toBe(false);
    expect(game.getState().phase).toBe("COUNTDOWN");
    expect(game.getState().countdownRemainingSeconds).toBe(3);
    expect(game.dispatch({ type: "build_tower", definitionId: "cannon", slotId: "slot-r1-c2" })).toMatchObject({ accepted: false });
    expect(game.getState().wood).toBe(woodBeforeCountdown);

    game.tick(2.99);
    expect(game.getState().phase).toBe("COUNTDOWN");
    game.tick(1 / 30);
    expect(game.getState().phase).toBe("COMBAT");
    expect(game.getState().wave).toBe(1);
  });

  it("upgrades only after an explicit upgrade command", () => {
    const game = new GameSimulation();
    game.dispatch({ type: "build_tower", definitionId: "machine_gun", slotId: "slot-r1-c1" });
    const woodAfterBuild = game.getState().wood;

    expect(game.getState().buildings[0]?.level).toBe(1);
    expect(game.dispatch({ type: "upgrade_tower", slotId: "slot-r1-c1" }).accepted).toBe(true);
    expect(game.getState().buildings[0]?.level).toBe(2);
    expect(game.getState().wood).toBeLessThan(woodAfterBuild);
  });

  it("spawns an enemy, emits combat events, and pays the kill reward", () => {
    const singleEnemyCatalog = {
      ...starterCatalog,
      waves: [{ wave: 1, durationSeconds: 8, spawnEvents: [{ atSeconds: 0, enemyId: "walker" }] }],
    };
    const game = new GameSimulation(singleEnemyCatalog);
    game.dispatch({ type: "build_tower", definitionId: "machine_gun", slotId: "slot-r1-c1" });
    startCombat(game);

    game.tick(0.7);
    const events = game.drainEvents();
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "tower_attack", towerDefinitionId: "machine_gun" }),
      expect.objectContaining({ type: "enemy_hit", damage: 12 }),
    ]));

    for (let index = 0; index < 300 && game.getState().phase === "COMBAT"; index += 1) {
      game.tick(1 / 30);
    }

    expect(game.getState().defeatedEnemies).toBeGreaterThan(0);
    expect(game.getState().gold).toBeGreaterThan(0);
    expect(game.getState().phase).toBe("SHOP");
  });

  it("returns to SHOP after a cleared wave", () => {
    const safeCatalog = {
      ...starterCatalog,
      enemies: starterCatalog.enemies.map((enemy) => ({ ...enemy, maxHp: 1, moveSpeed: 0.1, wallDamage: 0 })),
      waves: [{ wave: 1, durationSeconds: 1, spawnEvents: [{ atSeconds: 0, enemyId: "walker" }] }],
    };
    const game = new GameSimulation(safeCatalog);
    game.dispatch({ type: "build_tower", definitionId: "machine_gun", slotId: "slot-r1-c1" });
    startCombat(game);
    game.tick(1);

    expect(game.getState().phase).toBe("SHOP");
    expect(game.getState().wave).toBe(1);
  });

  it("pauses and resumes SHOP, COUNTDOWN, and COMBAT without advancing time", () => {
    const game = new GameSimulation();
    game.dispatch({ type: "build_tower", definitionId: "machine_gun", slotId: "slot-r1-c1" });
    game.dispatch({ type: "complete_prep" });
    const countdownBeforePause = game.getState().countdownRemainingSeconds;
    game.dispatch({ type: "pause" });
    game.tick(10);
    expect(game.getState().phase).toBe("PAUSED");
    expect(game.getState().countdownRemainingSeconds).toBe(countdownBeforePause);
    game.dispatch({ type: "resume" });
    expect(game.getState().phase).toBe("COUNTDOWN");
    game.tick(3);
    const beforePause = game.getState().waveTimeRemainingSeconds;
    game.dispatch({ type: "pause" });
    game.tick(10);
    expect(game.getState().waveTimeRemainingSeconds).toBe(beforePause);
    expect(game.dispatch({ type: "resume" }).accepted).toBe(true);
  });

  it("enters defeat once when the wall reaches zero", () => {
    const game = new GameSimulation();
    game.dispatch({ type: "build_tower", definitionId: "machine_gun", slotId: "slot-r1-c1" });
    startCombat(game);
    game.damageWall(WALL_MAX_HP);
    game.damageWall(10);

    expect(game.getState().phase).toBe("DEFEAT");
    expect(game.getState().wallHp).toBe(0);
  });

  it("offers an upgrade in SHOP and applies the selected effect", () => {
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
    game.dispatch({ type: "build_tower", definitionId: "machine_gun", slotId: "slot-r1-c1" });
    startCombat(game);
    game.tick(1);

    expect(game.getState().phase).toBe("SHOP");
    expect(game.getState().pendingUpgradeChoices).toHaveLength(3);
    expect(game.dispatch({ type: "choose_upgrade", upgradeId: "test_damage" }).accepted).toBe(true);

    startCombat(game);
    game.tick(1);
    expect(game.getState().defeatedEnemies).toBe(2);
  });

  it("restarts deterministically into a fresh SHOP", () => {
    const game = new GameSimulation();
    game.dispatch({ type: "build_tower", definitionId: "machine_gun", slotId: "slot-r1-c1" });
    startCombat(game);
    game.dispatch({ type: "restart" });

    expect(game.getState()).toMatchObject({ phase: "SHOP", wave: 0, wood: INITIAL_WOOD, wallHp: WALL_MAX_HP });
    expect(game.getState().buildings).toHaveLength(0);
  });

  it("completes the fixed wave sequence with repeated shop transitions", () => {
    const safeCatalog = {
      ...starterCatalog,
      enemies: starterCatalog.enemies.map((enemy) => ({ ...enemy, maxHp: 1, moveSpeed: 0.1, wallDamage: 0 })),
      waves: Array.from({ length: MAX_WAVE }, (_, index) => ({
        wave: index + 1,
        durationSeconds: 1,
        spawnEvents: [{ atSeconds: 0, enemyId: "walker" }],
      })),
    };
    const game = new GameSimulation(safeCatalog);
    game.dispatch({ type: "build_tower", definitionId: "machine_gun", slotId: "slot-r1-c1" });

    for (let wave = 0; wave < MAX_WAVE; wave += 1) {
      expect(game.dispatch({ type: "complete_prep" }).accepted).toBe(true);
      game.tick(3);
      game.tick(1);
      if (game.getState().pendingUpgradeChoices.length > 0) {
        expect(game.dispatch({ type: "choose_upgrade", upgradeId: game.getState().pendingUpgradeChoices[0]! }).accepted).toBe(true);
      }
    }

    expect(game.getState().wave).toBe(MAX_WAVE);
    expect(game.getState().phase).toBe("VICTORY");
  });
});
