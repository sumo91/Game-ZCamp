import { getHeroDefinition, getLevelDefinition, starterHeroContent } from "./hero";
import type { HeroContentCatalog, HeroDefinition, HeroId, LevelDefinition, LevelId } from "./hero";
import { isBattleSelectionAllowed } from "./progression";
import type { ClearedLevelIds } from "./progression";

export interface BattleLaunchData {
  heroId?: string;
  levelId?: string;
  clearedLevelIds?: string[];
}

export interface BattleConfig {
  heroId: HeroId;
  levelId: LevelId;
}

export interface ResolvedBattleConfig extends BattleConfig {
  hero: HeroDefinition;
  level: LevelDefinition;
}

/** Resolve the boundary payload before a scene is allowed to construct a battle.
 * When clearedLevelIds is provided, locked heroes/levels are rejected. */
export function resolveBattleConfig(data: BattleLaunchData = {}, content: HeroContentCatalog = starterHeroContent, cleared?: ClearedLevelIds): ResolvedBattleConfig {
  const heroId = data.heroId ?? content.heroes[0]?.id;
  const levelId = data.levelId ?? content.levels[0]?.id;
  const hero = heroId ? getHeroDefinition(content, heroId as HeroId) : undefined;
  const level = levelId ? getLevelDefinition(content, levelId as LevelId) : undefined;
  if (!hero) throw new Error("Unknown hero: " + String(heroId));
  if (!level) throw new Error("Unknown level: " + String(levelId));
  if (cleared && !isBattleSelectionAllowed(content, hero.id, level.id, cleared)) throw new Error("Battle selection is locked: hero " + hero.id + " / level " + level.id);
  return { heroId: hero.id, levelId: level.id, hero, level };
}
