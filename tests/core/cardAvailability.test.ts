import { describe, expect, it } from "vitest";
import { getBaseCardActions, getCardUseReadiness, getWoodProgress } from "../../src/core/cardAvailability";
import { starterCatalog } from "../../src/core/content";
import { getUpgradeCost } from "../../src/core/costs";
import { CAMP_SLOT_IDS } from "../../src/core/types";
import type { BuildingState } from "../../src/core/types";
import { GameSimulation } from "../../src/core/game";

function card(id: string) {
  return starterCatalog.cards.find((definition) => definition.id === id)!;
}

function fillAllSlotsExcept(game: GameSimulation, keepSlot: string | null, targetBuilding?: BuildingState): void {
  const state = game.getState();
  state.buildings = state.buildings.filter((building) => building.kind === "main_city");
  for (const slotId of CAMP_SLOT_IDS) {
    if (slotId === "slot-r3-c3") continue;
    if (slotId === keepSlot && targetBuilding) {
      state.buildings.push(targetBuilding);
      continue;
    }
    state.buildings.push({
      id: "lumberyard-" + slotId,
      slotId,
      kind: "lumberyard",
      definitionId: "lumberyard",
      level: 1,
      lanePosition: 0.5,
      attackCooldownSeconds: 0,
    });
  }
}

describe("card availability derivation", () => {
  it("shares the level-two and level-three upgrade fees with command execution", () => {
    expect(getUpgradeCost(40, 1)).toBe(60);
    expect(getUpgradeCost(40, 2)).toBe(90);
  });

  it("derives base fees, exact affordability, and a one-wood shortfall", () => {
    const game = new GameSimulation();
    const machineGun = card("machine_gun");
    game.getState().wood = 39;
    expect(getCardUseReadiness(machineGun, game.getState())).toMatchObject({
      usable: false,
      kind: "insufficient",
      minimumCost: 40,
      shortfall: 1,
      hint: "还差 1 木材",
    });

    game.getState().wood = 40;
    expect(getCardUseReadiness(machineGun, game.getState())).toMatchObject({ usable: true, kind: "usable", minimumCost: 40, shortfall: 0, hint: "可支付" });
  });

  it("uses the real minimum upgrade fee when every other slot is unavailable", () => {
    const game = new GameSimulation();
    fillAllSlotsExcept(game, "slot-r1-c1", {
      id: "machine-gun-slot-r1-c1",
      slotId: "slot-r1-c1",
      kind: "tower",
      definitionId: "machine_gun",
      level: 1,
      lanePosition: 0.1,
      attackCooldownSeconds: 0,
    });
    const readiness = getCardUseReadiness(card("machine_gun"), game.getState());
    expect(readiness.minimumCost).toBe(60);
    expect(readiness.actions).toEqual([{ target: { kind: "slot", slotId: "slot-r1-c1" }, cost: 60 }]);
    game.getState().wood = 59;
    expect(getCardUseReadiness(card("machine_gun"), game.getState()).hint).toBe("还差 1 木材");
    game.getState().wood = 60;
    expect(getCardUseReadiness(card("machine_gun"), game.getState()).usable).toBe(true);
  });

  it("keeps the full-wall repair action legal and reports no legal target separately", () => {
    const game = new GameSimulation();
    fillAllSlotsExcept(game, null);
    game.getState().wood = 59;
    expect(getCardUseReadiness(card("repair_shop"), game.getState())).toMatchObject({ kind: "insufficient", minimumCost: 60, shortfall: 1 });
    game.getState().wood = 60;
    expect(getCardUseReadiness(card("repair_shop"), game.getState())).toMatchObject({ usable: true, actions: [{ target: { kind: "wall" }, cost: 60 }] });

    expect(getCardUseReadiness(card("machine_gun"), game.getState())).toMatchObject({ usable: false, kind: "blocked", hint: "暂无合法目标", minimumCost: null, actions: [] });
    expect(getBaseCardActions(card("machine_gun"), game.getState())).toEqual([]);
  });

  it("derives permanent cost, exact gold, shortfall, and application limits", () => {
    const game = new GameSimulation();
    const permanent = card("wall_reinforcement");
    game.getState().gold = 23;
    expect(getCardUseReadiness(permanent, game.getState())).toMatchObject({ usable: false, kind: "insufficient", hint: "还差 1 金币", shortfall: 1 });
    game.getState().gold = 24;
    expect(getCardUseReadiness(permanent, game.getState())).toMatchObject({ usable: true, hint: "可支付" });
    game.getState().permanentApplications.wall_reinforcement = 2;
    expect(getCardUseReadiness(permanent, game.getState())).toMatchObject({ usable: false, kind: "blocked", hint: "已达上限" });
  });

  it("tracks the smallest unaffordable base-card target and falls back to neutral when none exist", () => {
    const game = new GameSimulation();
    game.getState().hand = [{ instanceId: "cannon", definitionId: "cannon", batchNumber: 1, batchIndex: 1 }, { instanceId: "electric", definitionId: "electric", batchNumber: 1, batchIndex: 2 }];
    game.getState().wood = 16;
    expect(getWoodProgress(game.getState().hand, game.getState())).toMatchObject({ kind: "target", targetCost: 65, shortfall: 49, ratio: 16 / 65, label: "距可建还差 49" });
    game.getState().wood = 85;
    expect(getWoodProgress(game.getState().hand, game.getState())).toEqual({ kind: "ready", ratio: 1, targetCost: null, shortfall: 0, label: "基地牌可支付" });
    fillAllSlotsExcept(game, null);
    expect(getWoodProgress(game.getState().hand, game.getState())).toEqual({ kind: "neutral", ratio: 0, targetCost: null, shortfall: 0, label: "暂无合法基地目标" });
  });
});
