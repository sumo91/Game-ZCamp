import { describe, expect, it } from "vitest";
import { BattleSession } from "../../src/core/battleSession";
import { starterCatalog } from "../../src/core/content";
import { deriveBuildingDetail, deriveEmptySlotActions, deriveGrowthWaveTime } from "../../src/ui/growthUi";
import { decideGrowthControl, initialGrowthUiState } from "../../src/ui/growthControls";

const content = starterCatalog.buildingGrowth;

describe("shared growth controls through the battle session", () => {
  it("shows the frozen first-wave countdown inside an opening trait draft and its system pause", () => {
    const session = new BattleSession();
    const built = session.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "arrow_tower" });
    session.dispatch({ type: "upgrade_building", buildingId: built.buildingId! });
    expect(deriveGrowthWaveTime(session.getState())).toBe("首波 5 秒");
    session.dispatch({ type: "system_pause" });
    expect(deriveGrowthWaveTime(session.getState())).toBe("首波 5 秒");
    session.dispatch({ type: "system_resume" });
    const draft = session.getState().pendingTraitDraft!;
    session.dispatch({ type: "choose_building_trait", buildingId: draft.buildingId, traitDefinitionId: draft.options[0] });
    expect(session.getState().phase).toBe("OPENING_COUNTDOWN");
    expect(deriveGrowthWaveTime(session.getState())).toBe("首波 5 秒");
  });

  it("offers both real build choices and builds the selected lumberyard once", () => {
    const session = new BattleSession();
    const ui = decideGrowthControl(content, session.getState(), initialGrowthUiState(), { type: "select_slot", slotId: "slot-r1-c1" }).ui;
    expect(deriveEmptySlotActions(content, session.getState(), ui.selectedSlot!)).toMatchObject([
      { cost: 40, description: "基础单体防御" },
      { cost: 60, description: "持续生产木材" },
    ]);
    const build = decideGrowthControl(content, session.getState(), ui, { type: "build", definitionId: "lumberyard" });
    expect(build.command).toEqual({ type: "build_building", slotId: "slot-r1-c1", definitionId: "lumberyard" });
    expect(session.dispatch(build.command!).accepted).toBe(true);
    expect(session.getState().wood).toBe(60);
    const building = session.getState().buildings.find((entry) => entry.slotId === "slot-r1-c1")!;
    expect(deriveBuildingDetail(content, session.getState(), building)?.current).toEqual({ kind: "lumberyard", woodPerSecond: 1 });
    expect(decideGrowthControl(content, session.getState(), ui, { type: "build", definitionId: "lumberyard" })).toMatchObject({ command: null, reason: "格位已占用" });
    expect(session.getState().wood).toBe(60);
  });

  it("upgrades once, requires a local trait, and returns to the original tactical pause", () => {
    const session = new BattleSession();
    session.dispatch({ type: "pause" });
    session.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "arrow_tower" });
    session.dispatch({ type: "build_building", slotId: "slot-r1-c2", definitionId: "arrow_tower" });
    // Earn enough wood through the real opening/resource simulation, then pause again.
    session.dispatch({ type: "resume" });
    for (let index = 0; index < 900; index += 1) session.advance(1 / 30);
    session.dispatch({ type: "pause" });
    const selected = decideGrowthControl(content, session.getState(), initialGrowthUiState(), { type: "select_slot", slotId: "slot-r1-c1" }).ui;
    const wood = session.getState().wood;
    const upgrade = decideGrowthControl(content, session.getState(), selected, { type: "upgrade" });
    expect(upgrade.command?.type).toBe("upgrade_building");
    expect(session.dispatch(upgrade.command!).accepted).toBe(true);
    expect(session.getState().wood).toBeCloseTo(wood - 50);
    expect(session.getState().phase).toBe("TRAIT_DRAFT");
    expect(decideGrowthControl(content, session.getState(), selected, { type: "upgrade" }).command).toBeNull();
    const frozen = structuredClone(session.getState());
    session.advance(100);
    expect(session.getState()).toEqual(frozen);
    const choose = decideGrowthControl(content, session.getState(), selected, { type: "choose_trait", index: 0 });
    expect(choose.ui.traitLocked).toBe(true);
    expect(session.dispatch(choose.command!).accepted).toBe(true);
    expect(session.getState().phase).toBe("TACTICAL_PAUSE");
    expect(session.getState().buildings.find((entry) => entry.slotId === "slot-r1-c1")?.traits).toHaveLength(1);
    expect(session.getState().buildings.find((entry) => entry.slotId === "slot-r1-c2")?.traits).toEqual([]);
    expect(decideGrowthControl(content, session.getState(), choose.ui, { type: "choose_trait", index: 0 }).command).toBeNull();
    expect(session.getState().wood).toBeCloseTo(wood - 50);
  });

  it.each(["machine_gun", "cannon", "frost", "electric"] as const)("opens %s even without gold, then preserves the upgraded building on payment", (targetTowerId) => {
    const session = new BattleSession({ config: { heroId: "camp_warden", levelId: "first_defense" } });
    const built = session.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "arrow_tower" });
    session.dispatch({ type: "upgrade_building", buildingId: built.buildingId! });
    const draft = session.getState().pendingTraitDraft!;
    session.dispatch({ type: "choose_building_trait", buildingId: draft.buildingId, traitDefinitionId: draft.options[0] });
    const selected = decideGrowthControl(content, session.getState(), initialGrowthUiState(), { type: "select_slot", slotId: "slot-r1-c1" }).ui;
    const open = decideGrowthControl(content, session.getState(), selected, { type: "open_transform" });
    expect(open).toMatchObject({ command: null, reason: "", ui: { transformOpen: true } });
    expect(decideGrowthControl(content, session.getState(), open.ui, { type: "transform", targetTowerId })).toMatchObject({ command: null, reason: "还差 10 金币" });
    expect(session.getState().phase).toBe("OPENING_COUNTDOWN");
    for (let index = 0; index < 3600 && session.getState().gold < 10; index += 1) session.advance(1 / 30);
    expect(session.getState().gold).toBeGreaterThanOrEqual(10);
    const before = structuredClone(session.getState().buildings.find((entry) => entry.id === built.buildingId)!);
    const gold = session.getState().gold;
    const transform = decideGrowthControl(content, session.getState(), open.ui, { type: "transform", targetTowerId });
    expect(transform.ui.transformOpen).toBe(false);
    expect(session.dispatch(transform.command!).accepted).toBe(true);
    expect(session.getState().gold).toBeCloseTo(gold - 10);
    expect(session.getState().buildings.find((entry) => entry.id === built.buildingId)).toMatchObject({ id: before.id, slotId: before.slotId, level: 2, traits: before.traits, growthDefinitionId: targetTowerId });
    expect(decideGrowthControl(content, session.getState(), transform.ui, { type: "open_transform" })).toMatchObject({ command: null, reason: "当前建筑不可改造" });
  });

  it("requires a fresh demolition confirmation, cancels it, and refunds nothing", () => {
    const session = new BattleSession();
    session.dispatch({ type: "pause" });
    session.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "lumberyard" });
    const selected = decideGrowthControl(content, session.getState(), initialGrowthUiState(), { type: "select_slot", slotId: "slot-r1-c1" }).ui;
    expect(decideGrowthControl(content, session.getState(), selected, { type: "confirm_destroy" })).toMatchObject({ command: null, reason: "请先确认拆除当前建筑" });
    const confirm = decideGrowthControl(content, session.getState(), selected, { type: "request_destroy" });
    expect(confirm).toMatchObject({ command: null, ui: { destroyConfirm: true } });
    expect(session.getState().buildings).toHaveLength(2);
    const cancel = decideGrowthControl(content, session.getState(), confirm.ui, { type: "cancel_destroy" });
    expect(cancel).toMatchObject({ command: null, ui: { selectedSlot: "slot-r1-c1", destroyConfirm: false } });
    const switchSlot = decideGrowthControl(content, session.getState(), confirm.ui, { type: "select_slot", slotId: "slot-r1-c2" });
    expect(switchSlot.ui.destroyConfirm).toBe(false);
    expect(decideGrowthControl(content, session.getState(), switchSlot.ui, { type: "confirm_destroy" }).command).toBeNull();
    const resources = { wood: session.getState().wood, gold: session.getState().gold };
    const destroy = decideGrowthControl(content, session.getState(), confirm.ui, { type: "confirm_destroy" });
    expect(session.dispatch(destroy.command!).accepted).toBe(true);
    expect(destroy.ui).toMatchObject({ selectedSlot: null, destroyConfirm: false });
    expect(session.getState()).toMatchObject(resources);
    expect(session.getState().buildings.map((entry) => entry.slotId)).toEqual(["slot-r3-c3"]);
    const city = decideGrowthControl(content, session.getState(), initialGrowthUiState(), { type: "select_slot", slotId: "slot-r3-c3" }).ui;
    expect(decideGrowthControl(content, session.getState(), city, { type: "request_destroy" })).toMatchObject({ command: null, reason: "主城不可拆除" });
  });

  it("guards pause and restart behind modal/system/result priority and restores the open transform", () => {
    const session = new BattleSession();
    session.dispatch({ type: "build_building", slotId: "slot-r1-c1", definitionId: "arrow_tower" });
    const selected = decideGrowthControl(content, session.getState(), initialGrowthUiState(), { type: "select_slot", slotId: "slot-r1-c1" }).ui;
    const pause = decideGrowthControl(content, session.getState(), selected, { type: "toggle_pause" });
    expect(pause.command).toEqual({ type: "pause" });
    session.dispatch(pause.command!);
    const open = decideGrowthControl(content, session.getState(), selected, { type: "open_transform" }).ui;
    for (const input of [{ type: "toggle_pause" }, { type: "request_destroy" }, { type: "select_slot", slotId: "slot-r1-c2" }] as const) {
      expect(decideGrowthControl(content, session.getState(), open, input)).toMatchObject({ ui: open, command: null, reason: "改造面板打开时只能操作改造面板" });
    }
    session.dispatch({ type: "system_pause" });
    expect(decideGrowthControl(content, session.getState(), open, { type: "close_transform" })).toMatchObject({ ui: open, command: null, reason: "系统暂停中，输入已锁定" });
    session.dispatch({ type: "system_resume" });
    const closed = decideGrowthControl(content, session.getState(), open, { type: "close_transform" }).ui;
    expect(closed.transformOpen).toBe(false);
    expect(decideGrowthControl(content, session.getState(), closed, { type: "restart" }).command).toBeNull();
    const resume = decideGrowthControl(content, session.getState(), closed, { type: "toggle_pause" });
    expect(resume.command).toEqual({ type: "resume" });
    session.dispatch(resume.command!);
    for (let index = 0; index < 18000 && session.getState().phase !== "DEFEAT"; index += 1) session.advance(1 / 30);
    expect(session.getState().phase).toBe("DEFEAT");
    expect(decideGrowthControl(content, session.getState(), open, { type: "close_transform" }).reason).toBe("结算中，其他操作已锁定");
    const restart = decideGrowthControl(content, session.getState(), open, { type: "restart" });
    expect(restart.command).toEqual({ type: "restart" });
    expect(restart.ui).toEqual(initialGrowthUiState());
  });
});
