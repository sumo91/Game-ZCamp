import type { GrowthBuildingId } from "./buildingGrowth";

export type HeroId = "camp_warden" | "vanguard_gunner" | "lumber_baron";
export type LevelId = "first_defense" | "broken_valley" | "kings_march";

export interface HeroDefinition {
  id: HeroId;
  displayName: string;
  role: string;
  attackBuildingId: GrowthBuildingId;
  woodProductionMultiplier: number;
  startingWallShield: number;
  detailLines: readonly [string, string, string];
  /** Level that must be cleared before this hero can be selected; null = available from the start. */
  unlockedByClearing: LevelId | null;
}

export interface LevelDefinition {
  id: LevelId;
  displayName: string;
  subtitle: string;
  difficultyStars: 1 | 2 | 3;
  difficultyLabel: string;
  enemyHint: string;
  waveCount: number;
  /** Level that must be cleared before this level can be selected; null = available from the start. */
  unlockedByClearing: LevelId | null;
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
      role: "均衡驻守英雄",
      attackBuildingId: "arrow_tower",
      woodProductionMultiplier: 1.1,
      startingWallShield: 100,
      detailLines: ["基础攻击 · 复用 Lv.1 箭塔档案", "木材总产量 +10%", "开局城墙护盾 +100"],
      unlockedByClearing: null,
    },
    {
      id: "vanguard_gunner",
      displayName: "机枪老兵",
      role: "战斗驻守英雄",
      attackBuildingId: "machine_gun",
      woodProductionMultiplier: 1.0,
      startingWallShield: 50,
      detailLines: ["速射攻击 · 复用 Lv.1 机枪塔档案", "木材总产量 +0%", "开局城墙护盾 +50"],
      unlockedByClearing: "first_defense",
    },
    {
      id: "lumber_baron",
      displayName: "伐木大亨",
      role: "经济驻守英雄",
      attackBuildingId: "arrow_tower",
      woodProductionMultiplier: 1.25,
      startingWallShield: 120,
      detailLines: ["基础攻击 · 复用 Lv.1 箭塔档案", "木材总产量 +25%", "开局城墙护盾 +120"],
      unlockedByClearing: "broken_valley",
    },
  ],
  levels: [
    {
      id: "first_defense",
      displayName: "第一防线",
      subtitle: "十波连续尸潮",
      difficultyStars: 1,
      difficultyLabel: "新手",
      enemyHint: "标准密度 · 第 5 波冲锋领主 · 终局尸潮君王",
      waveCount: 10,
      unlockedByClearing: null,
    },
    {
      id: "broken_valley",
      displayName: "裂谷尸潮",
      subtitle: "十二波连续尸潮",
      difficultyStars: 2,
      difficultyLabel: "进阶",
      enemyHint: "密度上调 · 精英提前 · 第 6 波冲锋领主",
      waveCount: 12,
      unlockedByClearing: "first_defense",
    },
    {
      id: "kings_march",
      displayName: "君王亲征",
      subtitle: "十五波连续尸潮 · 双 Boss 终局",
      difficultyStars: 3,
      difficultyLabel: "困难",
      enemyHint: "坦克海 · 双冲锋压阵 · 终局尸潮君王",
      waveCount: 15,
      unlockedByClearing: "broken_valley",
    },
  ],
};

export function getHeroDefinition(content: HeroContentCatalog, heroId: HeroId): HeroDefinition | undefined {
  return content.heroes.find((hero) => hero.id === heroId);
}

export function getLevelDefinition(content: HeroContentCatalog, levelId: LevelId): LevelDefinition | undefined {
  return content.levels.find((level) => level.id === levelId);
}

const FROZEN_HERO_STATS: Record<HeroId, { attackBuildingId: GrowthBuildingId; woodProductionMultiplier: number; startingWallShield: number }> = {
  camp_warden: { attackBuildingId: "arrow_tower", woodProductionMultiplier: 1.1, startingWallShield: 100 },
  vanguard_gunner: { attackBuildingId: "machine_gun", woodProductionMultiplier: 1.0, startingWallShield: 50 },
  lumber_baron: { attackBuildingId: "arrow_tower", woodProductionMultiplier: 1.25, startingWallShield: 120 },
};

const FROZEN_LEVEL_SHAPE: Record<LevelId, { difficultyStars: 1 | 2 | 3; waveCount: number; unlockedByClearing: LevelId | null }> = {
  first_defense: { difficultyStars: 1, waveCount: 10, unlockedByClearing: null },
  broken_valley: { difficultyStars: 2, waveCount: 12, unlockedByClearing: "first_defense" },
  kings_march: { difficultyStars: 3, waveCount: 15, unlockedByClearing: "broken_valley" },
};

export function validateHeroContent(content: HeroContentCatalog): void {
  if (content.heroes.length !== 3 || content.levels.length !== 3) throw new Error("This stage requires exactly three heroes and three levels.");
  if (new Set(content.heroes.map((hero) => hero.id)).size !== 3) throw new Error("Hero ids must be unique.");
  if (new Set(content.levels.map((level) => level.id)).size !== 3) throw new Error("Level ids must be unique.");
  const levelIds = new Set(content.levels.map((level) => level.id));
  for (const hero of content.heroes) {
    const frozen = FROZEN_HERO_STATS[hero.id];
    if (!frozen || hero.attackBuildingId !== frozen.attackBuildingId || hero.woodProductionMultiplier !== frozen.woodProductionMultiplier || hero.startingWallShield !== frozen.startingWallShield) {
      throw new Error("Hero " + hero.id + " deviates from the frozen stat baseline.");
    }
    if (hero.unlockedByClearing !== null && !levelIds.has(hero.unlockedByClearing)) throw new Error("Hero " + hero.id + " references an unknown unlock level.");
    if (hero.detailLines.length !== 3) throw new Error("Hero " + hero.id + " must provide exactly three detail lines.");
  }
  for (const level of content.levels) {
    const frozen = FROZEN_LEVEL_SHAPE[level.id];
    if (!frozen || level.difficultyStars !== frozen.difficultyStars || level.waveCount !== frozen.waveCount || level.unlockedByClearing !== frozen.unlockedByClearing) {
      throw new Error("Level " + level.id + " deviates from the frozen shape baseline.");
    }
    if (level.unlockedByClearing === level.id) throw new Error("Level " + level.id + " cannot unlock itself.");
  }
}

validateHeroContent(starterHeroContent);
