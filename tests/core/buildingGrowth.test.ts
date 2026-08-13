import { describe, expect, it } from "vitest";
import {
  getGrowthUpgradeCost,
  getTraitCandidates,
  selectTraitOptions,
  starterBuildingGrowthContent,
  validateBuildingGrowthContent,
} from "../../src/core/buildingGrowth";

describe("building growth domain content", () => {
  it("validates the frozen build, upgrade, transform, and production baselines", () => {
    expect(() => validateBuildingGrowthContent(starterBuildingGrowthContent)).not.toThrow();
    expect(starterBuildingGrowthContent.buildings.map((definition) => [definition.id, definition.buildCost, definition.upgradeCosts])).toEqual([
      ["arrow_tower", 40, [50, 70, 100, 140]],
      ["lumberyard", 60, [70, 100, 145, 205]],
    ]);
    expect(starterBuildingGrowthContent.transformations.map((route) => [route.to, route.goldCost])).toEqual([
      ["machine_gun", 10], ["cannon", 10], ["frost", 10], ["electric", 10],
    ]);
    expect(starterBuildingGrowthContent.buildings[1]!.baseProductionPerSecond).toEqual([1, 1.6, 2.4, 3.4, 4.6]);
  });

  it("shares exact upgrade costs and caps lumberyard discounts at 35 percent", () => {
    expect(getGrowthUpgradeCost(starterBuildingGrowthContent, "arrow_tower", 1)).toBe(50);
    expect(getGrowthUpgradeCost(starterBuildingGrowthContent, "machine_gun", 1)).toBe(50);
    expect(getGrowthUpgradeCost(starterBuildingGrowthContent, "arrow_tower", 4)).toBe(140);
    expect(getGrowthUpgradeCost(starterBuildingGrowthContent, "arrow_tower", 5)).toBeNull();
    expect(getGrowthUpgradeCost(starterBuildingGrowthContent, "lumberyard", 2, 0.15)).toBe(85);
    expect(getGrowthUpgradeCost(starterBuildingGrowthContent, "lumberyard", 2, 0.45)).toBe(65);
  });

  it("keeps trait pools scoped and returns three distinct deterministic options", () => {
    const arrowCandidates = getTraitCandidates(starterBuildingGrowthContent, "arrow_tower");
    expect(arrowCandidates.every((trait) => trait.pool === "common_tower")).toBe(true);
    const lumberCandidates = getTraitCandidates(starterBuildingGrowthContent, "lumberyard");
    expect(lumberCandidates.every((trait) => trait.pool === "lumberyard")).toBe(true);
    for (const towerId of ["machine_gun", "cannon", "frost", "electric"] as const) {
      const options = selectTraitOptions(starterBuildingGrowthContent, towerId, () => 0);
      expect(options).not.toBeNull();
      expect(new Set(options).size).toBe(3);
      expect(options!.some((id) => getTraitCandidates(starterBuildingGrowthContent, towerId).find((trait) => trait.id === id)?.source === towerId)).toBe(true);
      expect(options!.every((id) => {
        const trait = starterBuildingGrowthContent.traits.find((candidate) => candidate.id === id)!;
        return trait.pool === "common_tower" || trait.source === towerId;
      })).toBe(true);
    }
  });

  it("fails fast when a special tower loses its exclusive trait pool", () => {
    const invalid = {
      ...starterBuildingGrowthContent,
      traits: starterBuildingGrowthContent.traits.filter((trait) => trait.id !== "machine_penetration" && trait.id !== "machine_hunter"),
    };
    expect(() => validateBuildingGrowthContent(invalid)).toThrow("Growth trait content is incomplete");
  });

  it("fails fast when a common or lumberyard trait is assigned to the wrong pool", () => {
    const wrongCommonPool = {
      ...starterBuildingGrowthContent,
      traits: starterBuildingGrowthContent.traits.map((trait) => trait.id === "tower_damage" ? { ...trait, pool: "special_tower" as const, source: "machine_gun" as const } : trait),
    };
    const wrongLumberyardPool = {
      ...starterBuildingGrowthContent,
      traits: starterBuildingGrowthContent.traits.map((trait) => trait.id === "lumber_output" ? { ...trait, pool: "common_tower" as const, source: "common" as const } : trait),
    };
    expect(() => validateBuildingGrowthContent(wrongCommonPool)).toThrow("invalid pool");
    expect(() => validateBuildingGrowthContent(wrongLumberyardPool)).toThrow("invalid pool");
  });

  it("fails fast when a special trait is assigned to another tower", () => {
    const invalid = {
      ...starterBuildingGrowthContent,
      traits: starterBuildingGrowthContent.traits.map((trait) => trait.id === "machine_penetration" ? { ...trait, source: "cannon" as const } : trait),
    };
    expect(() => validateBuildingGrowthContent(invalid)).toThrow("invalid pool");
  });

  it("fails fast when a transformation points outside the typed tower catalog", () => {
    const invalid = {
      ...starterBuildingGrowthContent,
      transformations: [...starterBuildingGrowthContent.transformations.slice(0, 3), { from: "arrow_tower" as const, to: "missing" as "machine_gun", goldCost: 10 as const }],
    };
    expect(() => validateBuildingGrowthContent(invalid)).toThrow("Growth transformations");
  });

  it("rejects a third or substitute buildable definition", () => {
    const invalid = {
      ...starterBuildingGrowthContent,
      buildings: starterBuildingGrowthContent.buildings.map((definition) => definition.id === "lumberyard" ? { ...definition, id: "machine_gun" as "lumberyard" } : definition),
    };
    expect(() => validateBuildingGrowthContent(invalid)).toThrow("exactly the arrow_tower and lumberyard");
  });
});
