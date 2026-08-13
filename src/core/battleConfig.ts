import { getHeroDefinition, getLevelDefinition, starterHeroContent } from "./hero";
import type { HeroContentCatalog, HeroDefinition, HeroId, LevelDefinition, LevelId } from "./hero";

export interface BattleLaunchData {
  heroId?: string;
  levelId?: string;
}

export interface BattleConfig {
  heroId: HeroId;
  levelId: LevelId;
}

export interface ResolvedBattleConfig extends BattleConfig {
  hero: HeroDefinition;
  level: LevelDefinition;
}

/** Resolve the boundary payload before a scene is allowed to construct a battle. */
export function resolveBattleConfig(data: BattleLaunchData = {}, content: HeroContentCatalog = starterHeroContent): ResolvedBattleConfig {
  const heroId = data.heroId ?? content.heroes[0]?.id;
  const levelId = data.levelId ?? content.levels[0]?.id;
  const hero = heroId ? getHeroDefinition(content, heroId as HeroId) : undefined;
  const level = levelId ? getLevelDefinition(content, levelId as LevelId) : undefined;
  if (!hero) throw new Error("Unknown hero: " + String(heroId));
  if (!level) throw new Error("Unknown level: " + String(levelId));
  return { heroId: hero.id, levelId: level.id, hero, level };
}
