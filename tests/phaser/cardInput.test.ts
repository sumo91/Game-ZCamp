import { describe, expect, it } from "vitest";
import { starterCatalog } from "../../src/core/content";
import { GameSimulation } from "../../src/core/game";
import type { CardInstance } from "../../src/core/types";
import { decideCardClick, getCardUseReadiness } from "../../src/phaser/cardInput";

describe("card input adaptation", () => {
  it("selects first and plays a permanent card on the second click at exact cost", () => {
    const game = new GameSimulation();
    const card: CardInstance = { instanceId: "wall-reinforcement-input", definitionId: "wall_reinforcement", batchNumber: 99, batchIndex: 4 };
    game.getState().hand.push(card);
    game.getState().gold = 24;
    const index = game.getState().hand.length - 1;
    const definitionFor = (definitionId: string) => starterCatalog.cards.find((definition) => definition.id === definitionId);
    let selectedCardInstanceId: string | null = null;

    const first = decideCardClick(game.getState().hand, index, selectedCardInstanceId, definitionFor);
    expect(first).toEqual({ kind: "select", instanceId: card.instanceId });
    if (first.kind === "select") selectedCardInstanceId = first.instanceId;

    const second = decideCardClick(game.getState().hand, index, selectedCardInstanceId, definitionFor);
    expect(second).toEqual({ kind: "play", command: { type: "play_card", cardInstanceId: card.instanceId } });
    if (second.kind === "play") {
      const result = game.dispatch(second.command);
      expect(result.accepted).toBe(true);
      if (result.accepted) selectedCardInstanceId = null;
    }

    expect(game.getState().hand.some((entry) => entry.instanceId === card.instanceId)).toBe(false);
    expect(game.getState().gold).toBe(0);
    expect(game.getState().wallMaxHp).toBe(120);
    expect(selectedCardInstanceId).toBeNull();
  });

  it("selects first and plays a tactical card on the second click at exact cost", () => {
    const game = new GameSimulation();
    const card: CardInstance = { instanceId: "wall-shield-input", definitionId: "wall_shield", batchNumber: 99, batchIndex: 5 };
    game.getState().hand = [card];
    game.getState().gold = 10;
    const definitionFor = (definitionId: string) => starterCatalog.cards.find((definition) => definition.id === definitionId);
    const first = decideCardClick(game.getState().hand, 0, null, definitionFor);
    expect(first).toEqual({ kind: "select", instanceId: card.instanceId });
    const second = decideCardClick(game.getState().hand, 0, card.instanceId, definitionFor);
    expect(second.kind).toBe("play");
    if (second.kind !== "play") return;
    expect(game.dispatch(second.command).accepted).toBe(true);
    expect(game.getState().hand).toHaveLength(0);
    expect(game.getState().gold).toBe(0);
    expect(game.getState().wallShieldHp).toBe(30);
  });

  it("describes affordability and permanent limits without promising a failed use", () => {
    const wall = starterCatalog.cards.find((definition) => definition.id === "wall_reinforcement")!;
    const shield = starterCatalog.cards.find((definition) => definition.id === "wall_shield")!;
    expect(getCardUseReadiness(wall, 0, {})).toEqual({ usable: false, hint: "金币不足 · 还差 24" });
    expect(getCardUseReadiness(wall, 24, {})).toEqual({ usable: true, hint: "可使用 · 再点确认" });
    expect(getCardUseReadiness(wall, 99, { wall_reinforcement: 2 })).toEqual({ usable: false, hint: "已达上限 · 请弃牌" });
    expect(getCardUseReadiness(shield, 10, {})).toEqual({ usable: true, hint: "可使用 · 再点确认" });
  });
});
