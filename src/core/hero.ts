import type { GrowthBuildingId } from "./buildingGrowth";

export type HeroId = "camp_warden";
export type LevelId = "first_defense";

export interface HeroDefinition {
  id: HeroId;
  displayName: string;
  role: string;
  attackBuildingId: Extract<GrowthBuildingId, "arrow_tower">;
  woodProductionMultiplier: number;
  startingWallShield: number;
  detailLines: readonly [string, string, string];
}

export interface LevelDefinition {
  id: LevelId;
  displayName: string;
  subtitle: string;
  waveCount: 10;
}

export interface HeroContentCatalog {
  heroes: readonly HeroDefinition[];
  levels: readonly LevelDefinition[];
}

export const starterHeroContent: HeroContentCatalog = {
  heroes: [
    {
      id: "camp_warden",
      displayName: "营地守望者",
      role: "基础驻守英雄",
      attackBuildingId: "arrow_tower",
      woodProductionMultiplier: 1.1,
      startingWallShield: 100,
      detailLines: ["基础攻击 · 复用 Lv.1 箭塔档案", "木材总产量 +10%", "开局城墙护盾 +100"],
    },
  ],
  levels: [
    { id: "first_defense", displayName: "第一防线", subtitle: "十波连续尸潮 · 当前可用", waveCount: 10 },
  ],
};

export function getHeroDefinition(content: HeroContentCatalog, heroId: HeroId): HeroDefinition | undefined {
  return content.heroes.find((hero) => hero.id === heroId);
}

export function getLevelDefinition(content: HeroContentCatalog, levelId: LevelId): LevelDefinition | undefined {
  return content.levels.find((level) => level.id === levelId);
}

export function validateHeroContent(content: HeroContentCatalog): void {
  if (content.heroes.length !== 1 || content.levels.length !== 1) throw new Error("This candidate requires exactly one hero and one level.");
  const hero = content.heroes[0];
  const level = content.levels[0];
  if (!hero || hero.id !== "camp_warden" || hero.attackBuildingId !== "arrow_tower" || hero.woodProductionMultiplier !== 1.1 || hero.startingWallShield !== 100) {
    throw new Error("The camp warden definition is invalid.");
  }
  if (hero.detailLines.length !== 3 || level?.id !== "first_defense" || level.waveCount !== 10) throw new Error("The starter hero or level details are invalid.");
}

validateHeroContent(starterHeroContent);
