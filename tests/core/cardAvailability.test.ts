import { describe, expect, it } from "vitest";
import { getBaseCardActions, getCardUseReadiness } from "../../src/core/cardAvailability";
import { starterCatalog } from "../../src/core/content";
import { getUpgradeCost } from "../../src/core/costs";
import { getSupplyProgressPresentation } from "../../src/core/presentation";
import { getWoodProductionPerSecond } from "../../src/core/resources";
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
      resource: "wood",
      displayCost: 40,
      progress: 39 / 40,
      hardBlocked: false,
    });

    game.getState().wood = 40;
    expect(getCardUseReadiness(machineGun, game.getState())).toMatchObject({ usable: true, kind: "usable", minimumCost: 40, shortfall: 0, hint: "可支付", progress: 1 });
    game.getState().wood = 80;
    expect(getCardUseReadiness(machineGun, game.getState()).progress).toBe(1);
    game.getState().wood = 0;
    expect(getCardUseReadiness(machineGun, game.getState()).progress).toBe(0);
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
    expect(getCardUseReadiness(card("machine_gun"), game.getState()).progress).toBeNull();
    expect(getBaseCardActions(card("machine_gun"), game.getState())).toEqual([]);
  });

  it("derives permanent cost, exact gold, shortfall, and application limits", () => {
    const game = new GameSimulation();
    const permanent = card("wall_reinforcement");
    game.getState().gold = 23;
    expect(getCardUseReadiness(permanent, game.getState())).toMatchObject({ usable: false, kind: "insufficient", hint: "还差 1 金币", shortfall: 1, resource: "gold", displayCost: 24, progress: 23 / 24, hardBlocked: false });
    game.getState().gold = 24;
    expect(getCardUseReadiness(permanent, game.getState())).toMatchObject({ usable: true, hint: "可支付", progress: 1 });
    game.getState().permanentApplications.wall_reinforcement = 2;
    expect(getCardUseReadiness(permanent, game.getState())).toMatchObject({ usable: false, kind: "blocked", hint: "已达上限", displayCost: 24, progress: null, hardBlocked: true });
  });

  it("derives the shared wood production selector from city, lumberyards, and permanent income", () => {
    const game = new GameSimulation();
    expect(getWoodProductionPerSecond(game.getState())).toBe(0.5);
    game.getState().buildings.push(
      { id: "yard-1", slotId: "slot-r1-c1", kind: "lumberyard", definitionId: "lumberyard", level: 1, lanePosition: 0.1, attackCooldownSeconds: 0 },
      { id: "yard-2", slotId: "slot-r1-c2", kind: "lumberyard", definitionId: "lumberyard", level: 2, lanePosition: 0.2, attackCooldownSeconds: 0 },
      { id: "yard-3", slotId: "slot-r1-c3", kind: "lumberyard", definitionId: "lumberyard", level: 3, lanePosition: 0.3, attackCooldownSeconds: 0 },
    );
    game.getState().permanentApplications.wood_efficiency = 2;
    expect(getWoodProductionPerSecond(game.getState())).toBe(0.5 + 1 + 1.8 + 3 + 1);
    game.tick(5);
    const before = game.getState().wood;
    game.tick(1);
    expect(game.getState().wood - before).toBeCloseTo(getWoodProductionPerSecond(game.getState()) * 1, 5);
  });

  it("derives the deterministic next-supply rail language for progress, waiting, and terminal state", () => {
    const game = new GameSimulation();
    const state = game.getState();
    expect(getSupplyProgressPresentation(state)).toMatchObject({ state: "progress", ratio: 0, cardName: "机枪塔", secondsRemaining: 18, label: "下一张：机枪塔  00:18" });
    state.supplyProgressSeconds = 9;
    expect(getSupplyProgressPresentation(state)).toMatchObject({ state: "progress", ratio: 0.5, secondsRemaining: 9, label: "下一张：机枪塔  00:09" });
    state.supplyWaitingCard = state.nextSupplyCard;
    state.nextSupplyCard = null;
    expect(getSupplyProgressPresentation(state)).toEqual({ state: "waiting", ratio: 1, cardName: "机枪塔", secondsRemaining: 0, label: "待入手：机枪塔 · 腾出手牌" });
    state.supplyWaitingCard = null;
    state.phase = "DEFEAT";
    expect(getSupplyProgressPresentation(state)).toEqual({ state: "stopped", ratio: 0, cardName: null, secondsRemaining: null, label: "补给停止" });
  });

  it("keeps the supply selector frozen with core tactical pause", () => {
    const game = new GameSimulation();
    game.tick(5);
    game.tick(3);
    const before = getSupplyProgressPresentation(game.getState());
    expect(before.ratio).toBeCloseTo(3 / 18, 5);
    expect(game.dispatch({ type: "pause" }).accepted).toBe(true);
    game.tick(12);
    expect(getSupplyProgressPresentation(game.getState())).toEqual(before);
  });

});
