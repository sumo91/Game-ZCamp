import { writeFileSync } from "node:fs";
import { BattleSession } from "../../../../../.codex/worktrees/threejs-issue-12/ZCamp/src/core/battleSession";
import { Campaign } from "../../../../../.codex/worktrees/threejs-issue-12/ZCamp/src/ui/campaign";
import { ProgressionStore } from "../../../../../.codex/worktrees/threejs-issue-12/ZCamp/src/platform/progressionStore";
import { replayCampaignBattle } from "../../../../../.codex/worktrees/threejs-issue-12/ZCamp/src/three/campaignReplay";

const campaign = new Campaign(new ProgressionStore(null));
const reports = [];
for (const [levelId, heroId] of [["first_defense", "camp_warden"], ["broken_valley", "vanguard_gunner"], ["kings_march", "lumber_baron"]] as const) {
  if (campaign.choose({ kind: "level", id: levelId }) || campaign.choose({ kind: "hero", id: heroId })) throw new Error("Formal campaign selection failed");
  const battle = campaign.start()!;
  const replay = replayCampaignBattle(battle, "victory");
  const finalStep = battle.getStepIndex();
  const baseline = new BattleSession({ seed: 1337, config: { levelId, heroId } });
  let cursor = 0;
  for (let step = 0; step <= finalStep; step += 1) {
    while (replay.commands[cursor]?.step === step) {
      if (!baseline.dispatch(replay.commands[cursor]!.command).accepted) throw new Error(`Command replay rejected at ${step}`);
      cursor += 1;
    }
    if (step < finalStep) baseline.advance(1 / 30);
    baseline.drainEvents();
  }
  if (JSON.stringify(baseline.getState()) !== JSON.stringify(battle.getState())) throw new Error("Formal command replay is not identical");
  reports.push({ levelId, heroId, ...replay, finalStep, equalFinalStateFromLegalCommands: true, victory: campaign.result()?.victory, finalState: battle.getState() });
  console.log(JSON.stringify({ levelId, heroId, seed: replay.seed, peakLiveUnits: replay.peakLiveUnits, peakStep: replay.peakStep, peakEffectiveSeconds: replay.peakEffectiveSeconds, finalWave: replay.finalWave, finalStep, commands: replay.commands.length, exactReplay: true }));
  baseline.dispose(); campaign.returnToLobby();
}
campaign.dispose();
writeFileSync("C:/Users/Admin/AppData/Local/Temp/zcamp-threejs-implementation/issue-12-evidence/formal-campaign-peaks.json", JSON.stringify({ source: "7b3afd1e620279c5b1979b567a1bd97981ed0047", boundary: "Formal catalog, normal five-second opening and 10/12/15 waves; seed1337, actual earned resources, legal commands. Core peaks, not device rendering benchmark.", reports }, null, 2));
