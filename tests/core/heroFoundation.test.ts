import { describe, expect, it } from "vitest";
import { GameSimulation } from "../../src/core/game";
import { starterCatalog } from "../../src/core/content";
import { getWoodProductionPerSecond } from "../../src/core/resources";
import { starterHeroContent, validateHeroContent } from "../../src/core/hero";

describe("camp warden foundation", () => {
  it("validates one legal level and hero without inventing extra choices", () => {
    expect(() => validateHeroContent(starterHeroContent)).not.toThrow();
    expect(starterHeroContent.levels).toHaveLength(1);
    expect(starterHeroContent.heroes).toHaveLength(1);
    expect(starterHeroContent.heroes[0]?.detailLines).toEqual(["基础攻击 · 复用 Lv.1 箭塔档案", "木材总产量 +10%", "开局城墙护盾 +100"]);
    expect(() => validateHeroContent({ ...starterHeroContent, heroes: [{ ...starterHeroContent.heroes[0]!, woodProductionMultiplier: 1.2 }] })).toThrow();
  });

  it("starts every new battle with an independent hero and shield", () => {
    const game = new GameSimulation(starterCatalog, 1337, "camp_warden");
    expect(game.getState().hero?.definitionId).toBe("camp_warden");
    expect(game.getState().wallShield).toBe(100);
    expect(game.getState().wallHp).toBe(100);
    game.dispatch({ type: "restart" });
    expect(game.getState().wallShield).toBe(100);
    expect(game.getState().wallHp).toBe(100);
    expect(game.getState().buildings).toHaveLength(1);
    expect(game.getState().enemies).toHaveLength(0);
  });

  it("uses the hero multiplier for both displayed selector and settled wood", () => {
    const game = new GameSimulation(starterCatalog, 1337, "camp_warden");
    expect(getWoodProductionPerSecond(game.getState())).toBeCloseTo(0.55, 8);
    const before = game.getState().wood;
    game.tick(5);
    expect(game.getState().phase).toBe("RUNNING");
    game.tick(1);
    expect(game.getState().wood - before).toBeCloseTo(0.55, 8);
    game.dispatch({ type: "pause" });
    const pausedWood = game.getState().wood;
    game.tick(3);
    expect(game.getState().wood).toBe(pausedWood);
  });

  it("lets the hero attack with the shared Lv.1 arrow profile", () => {
    const game = new GameSimulation(starterCatalog, 1337, "camp_warden");
    game.tick(5);
    const before = game.getState().enemies[0]!.hp;
    game.tick(0.25);
    const events = game.drainEvents();
    expect(events.some((event) => event.type === "tower_attack" && event.buildingId === "hero-camp-warden" && event.towerDefinitionId === "arrow_tower")).toBe(true);
    expect(game.getState().enemies[0]!.hp).toBeLessThan(before);
  });

  it("consumes shield before wall hp and never repairs shield", () => {
    const game = new GameSimulation(starterCatalog, 1337, "camp_warden");
    game.tick(5);
    const enemy = game.getState().enemies[0]!;
    enemy.hp = enemy.maxHp = 1000;
    enemy.atWall = true;
    enemy.position = 1;
    enemy.attackCooldownSeconds = 0;
    game.getState().wallShield = 10;
    game.getState().wallHp = 100;
    game.tick(0.25);
    expect(game.getState().wallShield).toBeLessThan(10);
    expect(game.getState().wallHp).toBe(100);
    game.getState().wallShield = 0;
    game.getState().wallHp = 100;
    enemy.attackCooldownSeconds = 0;
    game.tick(0.25);
    expect(game.getState().wallHp).toBeLessThan(100);
    expect(game.getState().wallShield).toBe(0);
  });
});
