import type { HeroContentCatalog, HeroId, LevelId } from "../core/hero";
import { deriveUnlockedHeroes, deriveUnlockedLevels } from "../core/progression";
import type { ClearedLevelIds } from "../core/progression";

export interface LobbyCardView {
  id: string;
  title: string;
  subtitle: string;
  locked: boolean;
  lockHint: string;
  selected: boolean;
  stars: number;
  starLabel: string;
}

export interface LobbyViewModel {
  levelCards: LobbyCardView[];
  heroCards: LobbyCardView[];
  selectedLevelId: LevelId;
  selectedHeroId: HeroId;
  selectedLevelName: string;
  selectedHeroName: string;
  selectedLevelCleared: boolean;
  selectedLevelDetail: string;
  selectedHeroDetailLines: readonly string[];
  startLabel: string;
  startSublabel: string;
}

export interface LobbySelection {
  heroId?: string;
  levelId?: string;
}

function levelLockHint(content: HeroContentCatalog, unlockedBy: LevelId | null): string {
  if (unlockedBy === null) return "";
  const level = content.levels.find((candidate) => candidate.id === unlockedBy);
  return level ? "通关《" + level.displayName + "》解锁" : "";
}

/** Builds the full lobby view model; locked selections fall back to the first unlocked option. */
export function deriveLobbyView(content: HeroContentCatalog, cleared: ClearedLevelIds, selection: LobbySelection = {}): LobbyViewModel {
  const unlockedLevels = new Set(deriveUnlockedLevels(content, cleared));
  const unlockedHeroes = new Set(deriveUnlockedHeroes(content, cleared));
  // Default to the next uncleared level so returning to the lobby after a win points at the new challenge.
  const fallbackLevel = content.levels.find((level) => unlockedLevels.has(level.id) && !cleared.has(level.id))?.id
    ?? content.levels.find((level) => unlockedLevels.has(level.id))?.id
    ?? content.levels[0]!.id;
  const fallbackHero = content.heroes.find((hero) => unlockedHeroes.has(hero.id))?.id ?? content.heroes[0]!.id;
  const requestedLevel = selection.levelId && unlockedLevels.has(selection.levelId as LevelId) ? (selection.levelId as LevelId) : null;
  const requestedHero = selection.heroId && unlockedHeroes.has(selection.heroId as HeroId) ? (selection.heroId as HeroId) : null;
  const selectedLevelId = requestedLevel ?? fallbackLevel;
  const selectedHeroId = requestedHero ?? fallbackHero;
  const selectedLevel = content.levels.find((level) => level.id === selectedLevelId)!;
  const selectedHero = content.heroes.find((hero) => hero.id === selectedHeroId)!;
  return {
    levelCards: content.levels.map((level) => ({
      id: level.id,
      title: level.displayName,
      subtitle: level.subtitle,
      locked: !unlockedLevels.has(level.id),
      lockHint: levelLockHint(content, level.unlockedByClearing),
      selected: level.id === selectedLevelId,
      stars: level.difficultyStars,
      starLabel: level.difficultyLabel,
    })),
    heroCards: content.heroes.map((hero) => ({
      id: hero.id,
      title: hero.displayName,
      subtitle: hero.role,
      locked: !unlockedHeroes.has(hero.id),
      lockHint: levelLockHint(content, hero.unlockedByClearing),
      selected: hero.id === selectedHeroId,
      stars: 0,
      starLabel: "",
    })),
    selectedLevelId,
    selectedHeroId,
    selectedLevelName: selectedLevel.displayName,
    selectedHeroName: selectedHero.displayName,
    selectedLevelCleared: cleared.has(selectedLevelId),
    selectedLevelDetail: "敌情 · " + selectedLevel.enemyHint + " · 共 " + selectedLevel.waveCount + " 波",
    selectedHeroDetailLines: selectedHero.detailLines,
    startLabel: "开始战斗",
    startSublabel: "《" + selectedLevel.displayName + "》 · " + selectedHero.displayName,
  };
}

export type LobbyIntent = { kind: "level" | "hero"; id: string } | { kind: "start" };

export type LobbyDecision =
  | { kind: "select_level"; levelId: LevelId }
  | { kind: "select_hero"; heroId: HeroId }
  | { kind: "start_battle"; heroId: HeroId; levelId: LevelId }
  | { kind: "blocked"; reason: string };

/** Pure pointer legality: locked cards block selection, start always carries the current selection. */
export function decideLobbyAction(content: HeroContentCatalog, cleared: ClearedLevelIds, intent: LobbyIntent, selection: LobbySelection): LobbyDecision {
  if (intent.kind === "start") {
    const view = deriveLobbyView(content, cleared, selection);
    return { kind: "start_battle", heroId: view.selectedHeroId, levelId: view.selectedLevelId };
  }
  if (intent.kind === "level") {
    const level = content.levels.find((candidate) => candidate.id === intent.id);
    if (!level) return { kind: "blocked", reason: "未知关卡" };
    if (level.unlockedByClearing !== null && !cleared.has(level.unlockedByClearing)) {
      return { kind: "blocked", reason: "先通关《" + content.levels.find((candidate) => candidate.id === level.unlockedByClearing)?.displayName + "》才能解锁该关卡" };
    }
    return { kind: "select_level", levelId: level.id };
  }
  const hero = content.heroes.find((candidate) => candidate.id === intent.id);
  if (!hero) return { kind: "blocked", reason: "未知英雄" };
  if (hero.unlockedByClearing !== null && !cleared.has(hero.unlockedByClearing)) {
    return { kind: "blocked", reason: "先通关《" + content.levels.find((candidate) => candidate.id === hero.unlockedByClearing)?.displayName + "》才能解锁该英雄" };
  }
  return { kind: "select_hero", heroId: hero.id };
}

export interface ResultActionView {
  rematchLabel: string;
  lobbyLabel: string;
  terminalOnly: true;
}

export function deriveResultActions(): ResultActionView {
  return { rematchLabel: "再战", lobbyLabel: "返回营地", terminalOnly: true };
}
