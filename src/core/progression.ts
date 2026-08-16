import { getHeroDefinition, getLevelDefinition } from "./hero";
import type { HeroContentCatalog, HeroId, LevelId } from "./hero";

/** Levels the player has already cleared; the presentation layer owns persistence. */
export type ClearedLevelIds = ReadonlySet<LevelId>;

export interface VictoryRewards {
  newlyUnlockedHeroes: HeroId[];
  newlyUnlockedLevels: LevelId[];
}

function requirementMet(required: LevelId | null, cleared: ClearedLevelIds): boolean {
  return required === null || cleared.has(required);
}

export function deriveUnlockedLevels(content: HeroContentCatalog, cleared: ClearedLevelIds): LevelId[] {
  return content.levels.filter((level) => requirementMet(level.unlockedByClearing, cleared)).map((level) => level.id);
}

export function deriveUnlockedHeroes(content: HeroContentCatalog, cleared: ClearedLevelIds): HeroId[] {
  return content.heroes.filter((hero) => requirementMet(hero.unlockedByClearing, cleared)).map((hero) => hero.id);
}

export function isBattleSelectionAllowed(content: HeroContentCatalog, heroId: HeroId, levelId: LevelId, cleared: ClearedLevelIds): boolean {
  const hero = getHeroDefinition(content, heroId);
  const level = getLevelDefinition(content, levelId);
  if (!hero || !level) return false;
  return requirementMet(hero.unlockedByClearing, cleared) && requirementMet(level.unlockedByClearing, cleared);
}

/** Rewards earned by clearing one level, comparing the unlock sets before and after the clear. */
export function deriveVictoryRewards(content: HeroContentCatalog, clearedLevelId: LevelId, cleared: ClearedLevelIds): VictoryRewards {
  const before = new Set(cleared);
  const after = new Set(cleared);
  after.add(clearedLevelId);
  const heroesBefore = new Set(deriveUnlockedHeroes(content, before));
  const levelsBefore = new Set(deriveUnlockedLevels(content, before));
  return {
    newlyUnlockedHeroes: deriveUnlockedHeroes(content, after).filter((heroId) => !heroesBefore.has(heroId)),
    newlyUnlockedLevels: deriveUnlockedLevels(content, after).filter((levelId) => !levelsBefore.has(levelId)),
  };
}
