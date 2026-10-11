import { starterHeroContent } from "../core/hero";
import type { HeroId, LevelId } from "../core/hero";

const STORAGE_KEY = "zcamp.progression.v1";

export interface ProgressionState {
  clearedLevelIds: LevelId[];
  lastHeroId: string | null;
  lastLevelId: string | null;
}

const EMPTY_STATE: ProgressionState = { clearedLevelIds: [], lastHeroId: null, lastLevelId: null };

type ProgressStorage = Pick<Storage, "getItem" | "setItem">;
function browserStorage(): ProgressStorage | null {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
}

/** A page keeps its unlocks even if storage becomes unavailable. */
export class ProgressionStore {
  private state: ProgressionState;
  public constructor(private readonly storage: ProgressStorage | null = browserStorage()) {
    this.state = read(storage);
  }
  public load(): ProgressionState { return { ...this.state, clearedLevelIds: [...this.state.clearedLevelIds] }; }
  public recordSelection(heroId: HeroId | undefined, levelId: LevelId | undefined): void {
    this.save({ ...this.state, lastHeroId: heroId ?? this.state.lastHeroId, lastLevelId: levelId ?? this.state.lastLevelId });
  }
  public recordLevelClear(levelId: LevelId): ProgressionState {
    if (isKnownLevel(levelId) && !this.state.clearedLevelIds.includes(levelId)) this.save({ ...this.state, clearedLevelIds: [...this.state.clearedLevelIds, levelId] });
    return this.load();
  }
  private save(state: ProgressionState): void {
    this.state = state;
    try { this.storage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Keep current-session unlocks. */ }
  }
}
let sharedStore: ProgressionStore | null = null;
const store = () => sharedStore ??= new ProgressionStore();

function isKnownLevel(id: string): id is LevelId {
  return starterHeroContent.levels.some((level) => level.id === id);
}

function isKnownHero(id: string): id is HeroId {
  return starterHeroContent.heroes.some((hero) => hero.id === id);
}

/** localStorage stays at this boundary module; the core only sees plain id sets. */
function read(storage: ProgressStorage | null): ProgressionState {
  if (!storage) return { ...EMPTY_STATE, clearedLevelIds: [] };
  try {
    const raw = storage.getItem(STORAGE_KEY);
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

export function loadProgression(): ProgressionState { return store().load(); }

/** Records one explicit card choice; pass undefined to leave the other slot untouched. */
export function recordSelection(heroId: HeroId | undefined, levelId: LevelId | undefined): void {
  store().recordSelection(heroId, levelId);
}

/** Returns the state after merging one cleared level; safe to call on repeat clears. */
export function recordLevelClear(levelId: LevelId): ProgressionState {
  return store().recordLevelClear(levelId);
}

export function clearedLevelIdSet(state: ProgressionState): Set<LevelId> {
  return new Set<LevelId>(state.clearedLevelIds);
}
