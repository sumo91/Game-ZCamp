import { describe, expect, it } from "vitest";
import { Campaign } from "../../src/ui/campaign";
import { ProgressionStore } from "../../src/platform/progressionStore";
import { starterCatalog } from "../../src/core/content";

describe("campaign session ownership", () => {
  it("launches the remembered unlocked selection once and disposes it on returning", () => {
    const progress = new ProgressionStore(null);
    progress.recordLevelClear('first_defense');
    progress.recordSelection('vanguard_gunner', 'broken_valley');
    const campaign = new Campaign(progress);
    const first = campaign.start();
    expect(first?.getState().hero?.definitionId).toBe('vanguard_gunner');
    expect(first?.getState().maxWave).toBe(12);
    expect(first?.getState().wallShield).toBe(50);
    expect(campaign.start()).toBeNull();
    campaign.returnToLobby();
    expect(first?.advance(1)).toBe(0);
    expect(first?.dispatch({type:'restart'}).accepted).toBe(false);
    expect(campaign.view().selectedHeroId).toBe('vanguard_gunner');
    expect(campaign.start()).not.toBe(first);
    campaign.dispose();
  });
  it("keeps a real defeat unrewarded and launches each selected level with its formal wave count", () => {
    const progress = new ProgressionStore(null);
    const campaign = new Campaign(progress);
    const battle = campaign.start()!;
    expect(campaign.retry()).toBe(false);
    for (let step=0; step<30*180 && !campaign.result(); step+=1) { battle.advance(1/30); battle.drainEvents(); }
    expect(campaign.result()).toEqual({ victory: false, rewards: { newlyUnlockedHeroes: [], newlyUnlockedLevels: [] } });
    expect(progress.load().clearedLevelIds).toEqual([]);
    campaign.returnToLobby();
    progress.recordLevelClear('first_defense'); progress.recordLevelClear('broken_valley');
    for (const [levelId, waves] of [['first_defense',10],['broken_valley',12],['kings_march',15]] as const) {
      expect(campaign.choose({ kind:'level', id:levelId })).toBe('');
      const session = campaign.start()!;
      expect(session.getState().maxWave).toBe(waves);
      campaign.returnToLobby();
      expect(session.dispatch({type:'restart'}).accepted).toBe(false);
    }
    campaign.dispose();
  });
  it("records a real final-boss victory once, freezes the result and restarts the same selected battle", () => {
    const progress = new ProgressionStore(null);
    const catalog = { ...starterCatalog, enemies: starterCatalog.enemies.map((enemy) => ({ ...enemy, maxHp: 1, wallDamage: 0 })) };
    const campaign = new Campaign(progress, { catalog });
    const battle = campaign.start()!;
    const tower = battle.dispatch({ type: 'build_building', slotId: 'slot-r1-c1', definitionId: 'arrow_tower' });
    expect(tower.accepted).toBe(true);
    for (let step=0; step<30*650 && !campaign.result(); step+=1) { battle.advance(1/30); battle.drainEvents(); }
    const result = campaign.result();
    expect(result).toEqual({ victory: true, rewards: { newlyUnlockedHeroes: ['vanguard_gunner'], newlyUnlockedLevels: ['broken_valley'] } });
    expect(campaign.result()).toBe(result);
    const frozen = structuredClone(battle.getState());
    expect(battle.advance(5)).toBe(0);
    expect(battle.getState()).toEqual(frozen);
    expect(progress.load().clearedLevelIds).toEqual(['first_defense']);
    expect(campaign.retry()).toBe(true);
    expect(campaign.result()).toBeNull();
    expect(battle.getState().phase).toBe('OPENING_COUNTDOWN');
    expect(battle.getState().wallShield).toBe(100);
    expect(battle.getState().buildings).toHaveLength(1);
    expect(battle.getState().maxWave).toBe(10);
    for (let step=0; step<30*650 && !campaign.result(); step+=1) { battle.advance(1/30); battle.drainEvents(); }
    expect(campaign.result()).toEqual({ victory: true, rewards: { newlyUnlockedHeroes: [], newlyUnlockedLevels: [] } });
    expect(progress.load().clearedLevelIds).toEqual(['first_defense']);
    campaign.returnToLobby();
    expect(campaign.view().heroCards[1]!.locked).toBe(false);
    campaign.dispose();
  });
});
