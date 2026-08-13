import type { HeroContentCatalog, HeroId, LevelId } from "../core/hero";

export interface LobbyViewModel {
  levelId: LevelId;
  levelName: string;
  levelSubtitle: string;
  heroName: string;
  heroId: HeroId;
  heroRole: string;
  heroDetails: readonly string[];
  artifactLabel: string;
  artifactInteractive: false;
  startLabel: string;
}

export type LobbyPointerHit = "level" | "hero" | "artifact" | "start" | "none";

export interface ResultActionView {
  rematchLabel: string;
  lobbyLabel: string;
  terminalOnly: true;
}

export function deriveResultActions(): ResultActionView {
  return { rematchLabel: "再战", lobbyLabel: "返回营地", terminalOnly: true };
}

export function deriveLobbyView(content: HeroContentCatalog): LobbyViewModel {
  const level = content.levels[0];
  const hero = content.heroes[0];
  if (!level || !hero) throw new Error("Lobby content is incomplete.");
  return {
    levelId: level.id,
    levelName: level.displayName,
    levelSubtitle: level.subtitle,
    heroName: hero.displayName,
    heroId: hero.id,
    heroRole: hero.role,
    heroDetails: hero.detailLines,
    artifactLabel: "神器 / 养成位 · 尚未开放",
    artifactInteractive: false,
    startLabel: "开始战斗",
  };
}

export function decideLobbyPointer(hit: LobbyPointerHit): "show_level" | "show_hero" | "start_battle" | "blocked" {
  if (hit === "level") return "show_level";
  if (hit === "hero") return "show_hero";
  if (hit === "start") return "start_battle";
  return "blocked";
}
