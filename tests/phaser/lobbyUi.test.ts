import { describe, expect, it } from "vitest";
import { starterHeroContent } from "../../src/core/hero";
import { decideLobbyPointer, deriveLobbyView, deriveResultActions } from "../../src/phaser/lobbyUi";

describe("camp lobby view", () => {
  it("shows only the current level, hero and a non-interactive artifact placeholder", () => {
    const view = deriveLobbyView(starterHeroContent);
    expect(view.levelName).toBe("第一防线");
    expect(view.heroName).toBe("营地守望者");
    expect(view.heroDetails).toContain("基础攻击 · 复用 Lv.1 箭塔档案");
    expect(view.artifactInteractive).toBe(false);
    expect(view.artifactLabel).toContain("尚未开放");
  });

  it("keeps the main lobby input hierarchy explicit", () => {
    expect(decideLobbyPointer("level")).toBe("show_level");
    expect(decideLobbyPointer("hero")).toBe("show_hero");
    expect(decideLobbyPointer("start")).toBe("start_battle");
    expect(decideLobbyPointer("artifact")).toBe("blocked");
  });

  it("exposes both terminal actions without making them a normal battle control", () => {
    expect(deriveResultActions()).toEqual({ rematchLabel: "再战", lobbyLabel: "返回营地", terminalOnly: true });
  });
});
