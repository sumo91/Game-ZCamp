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
});
