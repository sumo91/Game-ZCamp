import { describe, expect, it } from "vitest";
import { ProgressionStore } from "../../src/platform/progressionStore";

describe("saved campaign progression", () => {
  it("reads the existing key, deduplicates old clears and keeps valid remembered ids", () => {
    const values = new Map([['zcamp.progression.v1', JSON.stringify({ clearedLevelIds: ['first_defense', 'first_defense', 'removed'], lastHeroId: 'vanguard_gunner', lastLevelId: 'broken_valley' })]]);
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const progress = new ProgressionStore(storage);
    expect(progress.load()).toEqual({ clearedLevelIds: ['first_defense'], lastHeroId: 'vanguard_gunner', lastLevelId: 'broken_valley' });
    progress.recordLevelClear('broken_valley');
    progress.recordSelection('lumber_baron', 'kings_march');
    expect(new ProgressionStore(storage).load()).toEqual({ clearedLevelIds: ['first_defense', 'broken_valley'], lastHeroId: 'lumber_baron', lastLevelId: 'kings_march' });
  });
  it("retains current-session unlocks with blocked storage and awards a repeated clear only once", () => {
    let writes = 0;
    const storage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { writes += 1; throw new Error('blocked'); } };
    const progress = new ProgressionStore(storage);
    progress.recordLevelClear('first_defense');
    progress.recordLevelClear('first_defense');
    progress.recordSelection('vanguard_gunner', 'broken_valley');
    expect(progress.load()).toEqual({ clearedLevelIds: ['first_defense'], lastHeroId: 'vanguard_gunner', lastLevelId: 'broken_valley' });
    expect(writes).toBe(2);
  });
});
