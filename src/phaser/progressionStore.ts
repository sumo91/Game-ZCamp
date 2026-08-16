import { starterHeroContent } from "../core/hero";
import type { HeroId, LevelId } from "../core/hero";

const STORAGE_KEY = "zcamp.progression.v1";

export interface ProgressionState {
  clearedLevelIds: LevelId[];
  lastHeroId: string | null;
  lastLevelId: string | null;
}

const EMPTY_STATE: ProgressionState = { clearedLevelIds: [], lastHeroId: null, lastLevelId: null };

function isKnownLevel(id: string): id is LevelId {
  return starterHeroContent.levels.some((level) => level.id === id);
}

function isKnownHero(id: string): id is HeroId {
  return starterHeroContent.heroes.some((hero) => hero.id === id);
}

/** localStorage stays at this boundary module; the core only sees plain id sets. */
export function loadProgression(): ProgressionState {
  if (typeof localStorage === "undefined") return { ...EMPTY_STATE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_STATE };
    const parsed = JSON.parse(raw) as Partial<ProgressionState>;
    const cleared = Array.isArray(parsed.clearedLevelIds) ? parsed.clearedLevelIds.filter(isKnownLevel) : [];
    return {
      clearedLevelIds: [...new Set(cleared)],
      lastHeroId: typeof parsed.lastHeroId === "string" && isKnownHero(parsed.lastHeroId) ? parsed.lastHeroId : null,
      lastLevelId: typeof parsed.lastLevelId === "string" && isKnownLevel(parsed.lastLevelId) ? parsed.lastLevelId : null,
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

function save(state: ProgressionState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable (private mode); progression simply won't persist.
  }
}

/** Records one explicit card choice; pass undefined to leave the other slot untouched. */
export function recordSelection(heroId: HeroId | undefined, levelId: LevelId | undefined): void {
  const state = loadProgression();
  save({ ...state, lastHeroId: heroId ?? state.lastHeroId, lastLevelId: levelId ?? state.lastLevelId });
}

/** Returns the state after merging one cleared level; safe to call on repeat clears. */
export function recordLevelClear(levelId: LevelId): ProgressionState {
  const state = loadProgression();
  if (!isKnownLevel(levelId) || state.clearedLevelIds.includes(levelId)) return state;
  const next = { ...state, clearedLevelIds: [...state.clearedLevelIds, levelId] };
  save(next);
  return next;
}

export function clearedLevelIdSet(state: ProgressionState): Set<LevelId> {
  return new Set<LevelId>(state.clearedLevelIds);
}
