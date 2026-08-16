import { describe, expect, it } from "vitest";
import { starterHeroContent } from "../../src/core/hero";
import type { LevelId } from "../../src/core/hero";
import { deriveUnlockedHeroes, deriveUnlockedLevels, deriveVictoryRewards, isBattleSelectionAllowed } from "../../src/core/progression";

describe("progression unlock graph", () => {
  it("starts with only the starter hero and level", () => {
    const cleared = new Set<LevelId>();
    expect(deriveUnlockedLevels(starterHeroContent, cleared)).toEqual(["first_defense"]);
    expect(deriveUnlockedHeroes(starterHeroContent, cleared)).toEqual(["camp_warden"]);
  });

  it("unlocks the second tier after clearing the first defense", () => {
    const cleared = new Set<LevelId>(["first_defense"]);
    expect(deriveUnlockedLevels(starterHeroContent, cleared)).toEqual(["first_defense", "broken_valley"]);
    expect(deriveUnlockedHeroes(starterHeroContent, cleared)).toEqual(["camp_warden", "vanguard_gunner"]);
  });

  it("unlocks the final tier after clearing the broken valley", () => {
    const cleared = new Set<LevelId>(["first_defense", "broken_valley"]);
    expect(deriveUnlockedLevels(starterHeroContent, cleared)).toEqual(["first_defense", "broken_valley", "kings_march"]);
    expect(deriveUnlockedHeroes(starterHeroContent, cleared)).toEqual(["camp_warden", "vanguard_gunner", "lumber_baron"]);
  });

  it("gates battle selections by the unlock graph", () => {
    expect(isBattleSelectionAllowed(starterHeroContent, "camp_warden", "first_defense", new Set())).toBe(true);
    expect(isBattleSelectionAllowed(starterHeroContent, "vanguard_gunner", "first_defense", new Set())).toBe(false);
    expect(isBattleSelectionAllowed(starterHeroContent, "camp_warden", "kings_march", new Set(["first_defense"]))).toBe(false);
    expect(isBattleSelectionAllowed(starterHeroContent, "lumber_baron", "kings_march", new Set(["first_defense", "broken_valley"]))).toBe(true);
    expect(isBattleSelectionAllowed(starterHeroContent, "missing" as never, "first_defense", new Set())).toBe(false);
  });

  it("reports victory rewards only for newly unlocked content", () => {
    const first = deriveVictoryRewards(starterHeroContent, "first_defense", new Set());
    expect(first.newlyUnlockedLevels).toEqual(["broken_valley"]);
    expect(first.newlyUnlockedHeroes).toEqual(["vanguard_gunner"]);
    const repeat = deriveVictoryRewards(starterHeroContent, "first_defense", new Set(["first_defense"]));
    expect(repeat.newlyUnlockedLevels).toEqual([]);
    expect(repeat.newlyUnlockedHeroes).toEqual([]);
    const valley = deriveVictoryRewards(starterHeroContent, "broken_valley", new Set(["first_defense"]));
    expect(valley.newlyUnlockedLevels).toEqual(["kings_march"]);
    expect(valley.newlyUnlockedHeroes).toEqual(["lumber_baron"]);
    const finale = deriveVictoryRewards(starterHeroContent, "kings_march", new Set(["first_defense", "broken_valley"]));
    expect(finale.newlyUnlockedLevels).toEqual([]);
    expect(finale.newlyUnlockedHeroes).toEqual([]);
  });
});
