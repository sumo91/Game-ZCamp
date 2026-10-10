import { describe, expect, it } from "vitest";
import { Campaign } from "../../src/ui/campaign";
import { ProgressionStore } from "../../src/platform/progressionStore";
import { replayCampaignBattle } from "../../src/three/campaignReplay";

describe("explicit campaign demonstration through real battle commands", () => {
  it("wins the unchanged first campaign and unlocks the next hero and level", () => {
    const campaign = new Campaign(new ProgressionStore(null));
    const battle = campaign.start()!;
    replayCampaignBattle(battle, "victory");
    expect(campaign.result()).toEqual({ victory: true, rewards: { newlyUnlockedHeroes: ["vanguard_gunner"], newlyUnlockedLevels: ["broken_valley"] } });
    expect(battle.getState().wave).toBe(10);
    expect(battle.getState().defeatedEnemies).toBeGreaterThan(800);
    campaign.returnToLobby();
    expect(campaign.view().levelCards[1]!.locked).toBe(false);
    campaign.dispose();
  });
  it("preserves actual clears and selections across reload, including the final double-Boss campaign", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    let campaign = new Campaign(new ProgressionStore(storage));
    const defeat = campaign.start()!;
    replayCampaignBattle(defeat, "defeat");
    expect(campaign.result()?.victory).toBe(false);
    campaign.returnToLobby();
    expect(campaign.view().levelCards[1]!.locked).toBe(true);
    for (const [levelId, heroId] of [["first_defense", "camp_warden"], ["broken_valley", "vanguard_gunner"], ["kings_march", "lumber_baron"]] as const) {
      expect(campaign.choose({ kind: "level", id: levelId })).toBe("");
      expect(campaign.choose({ kind: "hero", id: heroId })).toBe("");
      const battle = campaign.start()!;
      replayCampaignBattle(battle, "victory");
      expect(campaign.result()?.victory).toBe(true);
      campaign.dispose();
      campaign = new Campaign(new ProgressionStore(storage));
      expect(campaign.view().selectedLevelId).toBe(levelId);
      expect(campaign.view().selectedHeroId).toBe(heroId);
      expect(campaign.view().selectedLevelCleared).toBe(true);
    }
    expect(new ProgressionStore(storage).load().clearedLevelIds).toEqual(["first_defense", "broken_valley", "kings_march"]);
    campaign.dispose();
  });
});
