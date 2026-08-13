import { describe, expect, it } from "vitest";
import { starterBuildingGrowthContent } from "../../src/core/buildingGrowth";
import {
  GROWTH_FROST_MIN_SLOW_MULTIPLIER,
  getGrowthCannonBurn,
  getGrowthCannonSplashRadius,
  getGrowthElectricChainExtraTargets,
  getGrowthFrostSlow,
  getGrowthMachinePenetrationMultiplier,
  getGrowthMachinePenetrationTargets,
  getGrowthTowerAttackProfile,
  getGrowthTowerDamage,
} from "../../src/core/growthCombat";
import { getGrowthLumberyardProduction, getGrowthLumberyardUpgradeDiscount, getGrowthLumberyardWaveStockpile } from "../../src/core/growthEconomy";
import type { BuildingState } from "../../src/core/types";

function growthBuilding(growthDefinitionId: BuildingState["growthDefinitionId"], level = 1, traits: BuildingState["traits"] = []): BuildingState {
  return {
    id: "growth-test",
    slotId: "slot-r1-c1",
    kind: growthDefinitionId === "lumberyard" ? "lumberyard" : "tower",
    definitionId: growthDefinitionId ?? "arrow_tower",
    growthDefinitionId,
    level,
    lanePosition: 0.1,
    attackCooldownSeconds: 0,
    traits,
  };
}

function trait(definitionId: NonNullable<BuildingState["traits"]>[number]["definitionId"], stacks: number): NonNullable<BuildingState["traits"]>[number] {
  return { definitionId, stacks, acquiredAtLevel: 2 };
}

describe("growth combat and economy selectors", () => {
  it("derives every tower's Lv.1/Lv.3/Lv.5 profile from typed content", () => {
    const expected = {
      arrow_tower: { damage: 7, interval: 1, range: 0.6 },
      machine_gun: { damage: 12, interval: 0.75, range: 0.6 },
      cannon: { damage: 35, interval: 2.1, range: 0.65 },
      frost: { damage: 4, interval: 1, range: 0.65 },
      electric: { damage: 12, interval: 1.4, range: 0.62 },
    } as const;
    for (const [towerId, base] of Object.entries(expected)) {
      for (const level of [1, 3, 5]) {
        const profile = getGrowthTowerAttackProfile(starterBuildingGrowthContent, growthBuilding(towerId as keyof typeof expected, level))!;
        expect(profile.baseAttackDamage, towerId + " Lv." + level).toBeCloseTo(base.damage * (1 + 0.2 * (level - 1)), 8);
        expect(profile.attackIntervalSeconds, towerId + " Lv." + level).toBeCloseTo(base.interval / (1 + 0.1 * (level - 1)), 8);
        expect(profile.range, towerId + " Lv." + level).toBeCloseTo(base.range, 8);
      }
    }
    const transformed = growthBuilding("arrow_tower", 3);
    transformed.growthDefinitionId = "cannon";
    transformed.definitionId = "cannon";
    expect(getGrowthTowerAttackProfile(starterBuildingGrowthContent, transformed)!.baseAttackDamage).toBeCloseTo(35 * 1.4, 8);
  });

  it("derives level, own trait damage, attack speed, and range without shared mutation", () => {
    const building = growthBuilding("arrow_tower", 3, [trait("tower_damage", 2), trait("tower_attack_speed", 2), trait("tower_range", 1)]);
    const profile = getGrowthTowerAttackProfile(starterBuildingGrowthContent, building)!;
    expect(profile.baseAttackDamage).toBeCloseTo(7 * 1.4 * 1.24, 8);
    expect(profile.attackIntervalSeconds).toBeCloseTo(1 / (1.2 * 1.3), 8);
    expect(profile.range).toBeCloseTo(0.6 * 1.1, 8);
    const levelFiveCannon = getGrowthTowerAttackProfile(starterBuildingGrowthContent, growthBuilding("cannon", 5))!;
    expect(levelFiveCannon.baseAttackDamage).toBeCloseTo(35 * 1.8, 8);
    expect(levelFiveCannon.attackIntervalSeconds).toBeCloseTo(2.1 / 1.4, 8);
    expect(getGrowthTowerAttackProfile(starterBuildingGrowthContent, growthBuilding("arrow_tower"))!.baseAttackDamage).toBe(7);
  });

  it("applies every common conditional trait only to the current tower hit", () => {
    const building = growthBuilding("arrow_tower", 1, [trait("tower_elite_damage", 2), trait("tower_wall_guard", 1), trait("tower_finisher", 1)]);
    const damage = getGrowthTowerDamage(starterBuildingGrowthContent, building, { tier: "elite", hp: 20, maxHp: 100, atWall: true });
    expect(damage).toBeCloseTo(7 * (1 + 0.25 * 2 + 0.2 + 0.2), 8);
    expect(getGrowthTowerDamage(starterBuildingGrowthContent, building, { tier: "normal", hp: 80, maxHp: 100, atWall: false })).toBe(7);
  });

  it("keeps each special mechanism as a stackable source-local selector", () => {
    const machine = growthBuilding("machine_gun", 1, [trait("machine_penetration", 2), trait("machine_hunter", 2)]);
    expect(getGrowthMachinePenetrationTargets(starterBuildingGrowthContent, machine)).toBe(2);
    expect(getGrowthMachinePenetrationMultiplier(starterBuildingGrowthContent)).toBe(0.7);
    expect(getGrowthTowerDamage(starterBuildingGrowthContent, machine, { tier: "boss", hp: 100, maxHp: 100, atWall: false })).toBeCloseTo(12 * (1 + 0.3 * 2), 8);

    const cannon = growthBuilding("cannon", 2, [trait("cannon_blast", 2), trait("cannon_burn", 2)]);
    expect(getGrowthCannonSplashRadius(starterBuildingGrowthContent, cannon)).toBeCloseTo(0.18 * 1.4, 8);
    expect(getGrowthCannonBurn(starterBuildingGrowthContent, cannon)).toEqual({ damagePerSecond: 35 * 1.2 * 0.2 * 1.5, durationSeconds: 3 });

    const frost = growthBuilding("frost", 1, [trait("frost_deep", 1), trait("frost_vulnerability", 2)]);
    const frostSlow = getGrowthFrostSlow(starterBuildingGrowthContent, frost)!;
    expect(frostSlow.multiplier).toBeCloseTo(0.47, 8);
    expect(frostSlow.durationSeconds).toBe(1.9);
    expect(getGrowthTowerDamage(starterBuildingGrowthContent, frost, { tier: "normal", hp: 100, maxHp: 100, atWall: false }, true)).toBeCloseTo(4 * 1.5, 8);
    expect(getGrowthFrostSlow(starterBuildingGrowthContent, growthBuilding("frost", 1, [trait("frost_deep", 10)]))!.multiplier).toBe(GROWTH_FROST_MIN_SLOW_MULTIPLIER);

    const electric = growthBuilding("electric", 1, [trait("electric_chain", 3), trait("electric_overload", 1)]);
    expect(getGrowthElectricChainExtraTargets(starterBuildingGrowthContent, electric)).toBe(3);
    expect(getGrowthTowerDamage(starterBuildingGrowthContent, electric, { tier: "elite", hp: 100, maxHp: 100, atWall: false })).toBeCloseTo(12 * 1.3, 8);
  });

  it("derives each lumberyard's output, discount cap, and wave stockpile independently", () => {
    const yard = growthBuilding("lumberyard", 3, [trait("lumber_flat", 2), trait("lumber_output", 2), trait("lumber_upgrade_discount", 3), trait("lumber_wave_stockpile", 2)]);
    expect(getGrowthLumberyardProduction(starterBuildingGrowthContent, yard)).toBeCloseTo((2.4 + 0.4 * 2) * (1 + 0.25 * 2), 8);
    expect(getGrowthLumberyardUpgradeDiscount(starterBuildingGrowthContent, yard)).toBe(0.35);
    expect(getGrowthLumberyardWaveStockpile(starterBuildingGrowthContent, yard)).toBe(10);
    const other = growthBuilding("lumberyard", 1);
    expect(getGrowthLumberyardProduction(starterBuildingGrowthContent, other)).toBe(1);
  });
});
