import { starterCatalog, type ContentCatalog } from "./content";
import type { GamePhase, GameState } from "./types";

export type SupplyProgressPresentation = {
  state: "progress" | "waiting" | "stopped";
  ratio: number;
  cardName: string | null;
  secondsRemaining: number | null;
  label: string;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function formatSeconds(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  return String(Math.floor(safe / 60)).padStart(2, "0") + ":" + String(safe % 60).padStart(2, "0");
}

function isTerminalPhase(phase: GamePhase): boolean {
  return phase === "VICTORY" || phase === "DEFEAT";
}

export function getSupplyProgressPresentation(
  state: Pick<GameState, "phase" | "nextSupplyCard" | "supplyWaitingCard" | "supplyProgressSeconds" | "supplyCycleSeconds">,
  catalog: ContentCatalog = starterCatalog,
): SupplyProgressPresentation {
  if (isTerminalPhase(state.phase)) {
    return { state: "stopped", ratio: 0, cardName: null, secondsRemaining: null, label: "补给停止" };
  }

  if (state.supplyWaitingCard) {
    const cardName = catalog.cards.find((card) => card.id === state.supplyWaitingCard?.definitionId)?.displayName ?? "未知牌";
    return { state: "waiting", ratio: 1, cardName, secondsRemaining: 0, label: "待入手：" + cardName + " · 腾出手牌" };
  }

  if (!state.nextSupplyCard || state.supplyCycleSeconds <= 0) {
    return { state: "stopped", ratio: 0, cardName: null, secondsRemaining: null, label: "补给停止" };
  }

  const cardName = catalog.cards.find((card) => card.id === state.nextSupplyCard?.definitionId)?.displayName ?? "未知牌";
  const ratio = clamp01(state.supplyProgressSeconds / state.supplyCycleSeconds);
  const secondsRemaining = Math.max(0, state.supplyCycleSeconds - state.supplyProgressSeconds);
  return {
    state: "progress",
    ratio,
    cardName,
    secondsRemaining,
    label: "下一张：" + cardName + "  " + formatSeconds(secondsRemaining),
  };
}
