import { describe, expect, it } from "vitest";
import { starterHeroContent } from "../../src/core/hero";
import type { LevelId } from "../../src/core/hero";
import { decideLobbyAction, deriveLobbyView, deriveResultActions } from "../../src/phaser/lobbyUi";

describe("camp lobby view", () => {
  it("shows three level cards and three hero cards with lock states from progression", () => {
    const view = deriveLobbyView(starterHeroContent, new Set<LevelId>());
    expect(view.levelCards.map((card) => card.id)).toEqual(["first_defense", "broken_valley", "kings_march"]);
    expect(view.heroCards.map((card) => card.id)).toEqual(["camp_warden", "vanguard_gunner", "lumber_baron"]);
    expect(view.levelCards.map((card) => card.locked)).toEqual([false, true, true]);
    expect(view.heroCards.map((card) => card.locked)).toEqual([false, true, true]);
    expect(view.levelCards[1]!.lockHint).toContain("通关《第一防线》");
    expect(view.levelCards[0]!.stars).toBe(1);
    expect(view.levelCards[2]!.starLabel).toBe("困难");
    expect(view.selectedLevelDetail).toContain("共 10 波");
    expect(view.selectedLevelCleared).toBe(false);
  });

  it("unlocks the second tier and preselects the next uncleared level after a clear", () => {
    const view = deriveLobbyView(starterHeroContent, new Set<LevelId>(["first_defense"]));
    expect(view.levelCards.map((card) => card.locked)).toEqual([false, false, true]);
    expect(view.heroCards.map((card) => card.locked)).toEqual([false, false, true]);
    expect(view.selectedLevelId).toBe("broken_valley");
    expect(view.selectedLevelCleared).toBe(false);
    const replay = deriveLobbyView(starterHeroContent, new Set<LevelId>(["first_defense"]), { levelId: "first_defense" });
    expect(replay.selectedLevelId).toBe("first_defense");
    expect(replay.selectedLevelCleared).toBe(true);
    const allDone = deriveLobbyView(starterHeroContent, new Set<LevelId>(["first_defense", "broken_valley", "kings_march"]));
    expect(allDone.selectedLevelId).toBe("first_defense");
    expect(allDone.selectedLevelCleared).toBe(true);
  });

  it("falls back to unlocked options when the remembered selection is locked", () => {
    const view = deriveLobbyView(starterHeroContent, new Set<LevelId>(), { heroId: "lumber_baron", levelId: "kings_march" });
    expect(view.selectedHeroId).toBe("camp_warden");
    expect(view.selectedLevelId).toBe("first_defense");
    const unlocked = deriveLobbyView(starterHeroContent, new Set<LevelId>(["first_defense", "broken_valley"]), { heroId: "lumber_baron", levelId: "kings_march" });
    expect(unlocked.selectedHeroId).toBe("lumber_baron");
    expect(unlocked.selectedLevelId).toBe("kings_march");
    expect(unlocked.startSublabel).toBe("《君王亲征》 · 伐木大亨");
  });

  it("keeps the lobby input hierarchy explicit", () => {
    const cleared = new Set<LevelId>();
    const selection = { heroId: "camp_warden", levelId: "first_defense" };
    expect(decideLobbyAction(starterHeroContent, cleared, { kind: "level", id: "broken_valley" }, selection)).toEqual({ kind: "blocked", reason: expect.stringContaining("才能解锁该关卡") });
    expect(decideLobbyAction(starterHeroContent, cleared, { kind: "hero", id: "vanguard_gunner" }, selection)).toEqual({ kind: "blocked", reason: expect.stringContaining("才能解锁该英雄") });
    expect(decideLobbyAction(starterHeroContent, cleared, { kind: "level", id: "first_defense" }, selection)).toEqual({ kind: "select_level", levelId: "first_defense" });
    expect(decideLobbyAction(starterHeroContent, new Set<LevelId>(["first_defense"]), { kind: "hero", id: "vanguard_gunner" }, selection)).toEqual({ kind: "select_hero", heroId: "vanguard_gunner" });
    expect(decideLobbyAction(starterHeroContent, cleared, { kind: "start" }, selection)).toEqual({ kind: "start_battle", heroId: "camp_warden", levelId: "first_defense" });
    expect(decideLobbyAction(starterHeroContent, cleared, { kind: "level", id: "missing" }, selection).kind).toBe("blocked");
  });

  it("exposes both terminal actions without making them a normal battle control", () => {
    expect(deriveResultActions()).toEqual({ rematchLabel: "再战", lobbyLabel: "返回营地", terminalOnly: true });
  });
});
