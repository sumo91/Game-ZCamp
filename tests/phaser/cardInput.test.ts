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

    const readinessFor = (definition: Parameters<typeof getCardUseReadiness>[0]) => getCardUseReadiness(definition, game.getState());
    const first = decideCardClick(game.getState().hand, index, selectedCardInstanceId, definitionFor, readinessFor);
    expect(first).toEqual({ kind: "select", instanceId: card.instanceId });
    if (first.kind === "select") selectedCardInstanceId = first.instanceId;

    const second = decideCardClick(game.getState().hand, index, selectedCardInstanceId, definitionFor, readinessFor);
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
    const readinessFor = (definition: Parameters<typeof getCardUseReadiness>[0]) => getCardUseReadiness(definition, game.getState());
    const first = decideCardClick(game.getState().hand, 0, null, definitionFor, readinessFor);
    expect(first).toEqual({ kind: "select", instanceId: card.instanceId });
    const second = decideCardClick(game.getState().hand, 0, card.instanceId, definitionFor, readinessFor);
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
    const game = new GameSimulation();
    game.getState().gold = 0;
    expect(getCardUseReadiness(wall, game.getState())).toMatchObject({ usable: false, hint: "还差 24 金币" });
    game.getState().gold = 24;
    expect(getCardUseReadiness(wall, game.getState())).toMatchObject({ usable: true, hint: "可支付" });
    game.getState().gold = 99;
    game.getState().permanentApplications.wall_reinforcement = 2;
    expect(getCardUseReadiness(wall, game.getState())).toMatchObject({ usable: false, hint: "已达上限" });
    game.getState().permanentApplications.wall_reinforcement = 0;
    const shieldGame = new GameSimulation();
    shieldGame.getState().gold = 10;
    expect(getCardUseReadiness(shield, shieldGame.getState())).toMatchObject({ usable: true, hint: "可支付" });
  });

  it("cancels base selection, blocks unaffordable clicks, and clears an older selection", () => {
    const game = new GameSimulation();
    game.getState().wood = 40;
    const hand: CardInstance[] = [
      { instanceId: "machine", definitionId: "machine_gun", batchNumber: 1, batchIndex: 0 },
      { instanceId: "cannon", definitionId: "cannon", batchNumber: 1, batchIndex: 1 },
    ];
    const definitionFor = (definitionId: string) => starterCatalog.cards.find((definition) => definition.id === definitionId);
    const readinessFor = (definition: Parameters<typeof getCardUseReadiness>[0]) => getCardUseReadiness(definition, game.getState());

    expect(decideCardClick(hand, 0, null, definitionFor, readinessFor)).toEqual({ kind: "select", instanceId: "machine" });
    expect(decideCardClick(hand, 0, "machine", definitionFor, readinessFor)).toEqual({ kind: "cancel", instanceId: "machine" });
    expect(decideCardClick(hand, 1, "machine", definitionFor, readinessFor)).toEqual({ kind: "blocked", hint: "还差 25 木材" });
  });

  it("rechecks permanent and tactical affordability on the confirmation click", () => {
    const game = new GameSimulation();
    const hand: CardInstance[] = [{ instanceId: "shield", definitionId: "wall_shield", batchNumber: 1, batchIndex: 0 }];
    const definitionFor = (definitionId: string) => starterCatalog.cards.find((definition) => definition.id === definitionId);
    const readinessFor = (definition: Parameters<typeof getCardUseReadiness>[0]) => getCardUseReadiness(definition, game.getState());
    game.getState().gold = 10;
    expect(decideCardClick(hand, 0, null, definitionFor, readinessFor)).toEqual({ kind: "select", instanceId: "shield" });
    game.getState().gold = 0;
    expect(decideCardClick(hand, 0, "shield", definitionFor, readinessFor)).toEqual({ kind: "blocked", hint: "还差 10 金币" });
  });
});
