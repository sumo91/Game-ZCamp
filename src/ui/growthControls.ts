import type { BuildingGrowthContent, GrowthSpecialTowerId } from "../core/buildingGrowth";
import { CAMP_SLOT_IDS, type GameCommand, type GameState } from "../core/types";
import { decideGrowthAction, decideGrowthPointer, decideGrowthTrait, decideGrowthTransform, deriveBuildingDetail, deriveEmptySlotActions, deriveGrowthPauseControl, deriveTraitOptions, deriveTransformOptions, getGrowthInputPriority } from "./growthUi";

export interface GrowthUiState {
  selectedSlot: string | null;
  transformOpen: boolean;
  destroyConfirm: boolean;
  traitLocked: boolean;
}

export type GrowthControlInput =
  | { type: "select_slot"; slotId: string }
  | { type: "build"; definitionId: "arrow_tower" | "lumberyard" }
  | { type: "upgrade" }
  | { type: "choose_trait"; index: number }
  | { type: "open_transform" }
  | { type: "close_transform" }
  | { type: "transform"; targetTowerId: GrowthSpecialTowerId }
  | { type: "request_destroy" }
  | { type: "cancel_destroy" }
  | { type: "confirm_destroy" }
  | { type: "toggle_pause" }
  | { type: "restart" }
  | { type: "clear_selection" };

export interface GrowthControlDecision {
  ui: GrowthUiState;
  command: GameCommand | null;
  reason: string;
}

export function initialGrowthUiState(): GrowthUiState {
  return { selectedSlot: null, transformOpen: false, destroyConfirm: false, traitLocked: false };
}

/** Latest state and semantic controls are shared; screen coordinates stay in adapters. */
export function decideGrowthControl(content: BuildingGrowthContent, state: GameState, ui: GrowthUiState, input: GrowthControlInput): GrowthControlDecision {
  const blocked = (reason: string): GrowthControlDecision => ({ ui, command: null, reason });
  const hit = input.type === "choose_trait" ? { kind: "trait_option" as const, index: input.index }
    : input.type === "transform" ? { kind: "transform_option" as const, index: 0 }
    : input.type === "close_transform" ? { kind: "transform_close" as const }
    : input.type === "restart" ? { kind: "result_restart" as const }
    : { kind: "action" as const, index: 0 };
  const gate = decideGrowthPointer(getGrowthInputPriority(state.phase, ui.transformOpen), hit);
  if (gate.kind === "blocked") return blocked(gate.reason);
  if (input.type === "restart") return { ui: initialGrowthUiState(), command: { type: "restart" }, reason: "" };
  if (input.type === "clear_selection") return { ui: { ...ui, selectedSlot: null, destroyConfirm: false }, command: null, reason: "" };
  if (input.type === "toggle_pause") {
    const pause = deriveGrowthPauseControl(state.phase);
    if (!pause.enabled) return blocked("当前状态不可暂停或继续");
    return { ui, command: { type: pause.label === "暂停" ? "pause" : "resume" }, reason: "" };
  }
  if (input.type === "close_transform") return { ui: { ...ui, transformOpen: false }, command: null, reason: "" };
  if (input.type === "choose_trait") {
    const draft = state.pendingTraitDraft;
    const option = deriveTraitOptions(content, state, draft)[input.index];
    if (!draft || !option) return blocked("当前词条选项不可用");
    const decision = decideGrowthTrait(option, draft.buildingId, ui.traitLocked);
    if (decision.kind === "blocked") return blocked(decision.reason);
    const building = state.buildings.find((candidate) => candidate.id === draft.buildingId)!;
    return { ui: { ...ui, selectedSlot: building.slotId, traitLocked: true }, command: decision.command, reason: "" };
  }
  if (input.type === "select_slot") {
    if (!CAMP_SLOT_IDS.includes(input.slotId)) return blocked("格位不存在");
    return { ui: { ...ui, selectedSlot: input.slotId === ui.selectedSlot ? null : input.slotId, destroyConfirm: false }, command: null, reason: "" };
  }
  if (!ui.selectedSlot) return blocked("请先选择营地格位");
  const building = state.buildings.find((candidate) => candidate.slotId === ui.selectedSlot);
  if (input.type === "cancel_destroy") return { ui: { ...ui, destroyConfirm: false }, command: null, reason: "" };
  if (input.type === "request_destroy" || input.type === "confirm_destroy") {
    if (!building) return blocked("格位为空");
    if (building.kind === "main_city") return blocked("主城不可拆除");
    if (input.type === "request_destroy") return { ui: { ...ui, destroyConfirm: true }, command: null, reason: "" };
    if (!ui.destroyConfirm) return blocked("请先确认拆除当前建筑");
    return { ui: { ...ui, selectedSlot: null, destroyConfirm: false }, command: { type: "destroy_building", slotId: ui.selectedSlot }, reason: "" };
  }
  if (input.type === "open_transform") {
    if (!building || !deriveBuildingDetail(content, state, building)?.canTransform) return blocked("当前建筑不可改造");
    return { ui: { ...ui, transformOpen: true, destroyConfirm: false }, command: null, reason: "" };
  }
  if (input.type === "transform") {
    const option = building ? deriveTransformOptions(content, state, building).find((candidate) => candidate.targetTowerId === input.targetTowerId) : null;
    if (!option) return blocked("当前改造选项不可用");
    const decision = decideGrowthTransform(option);
    return decision.kind === "blocked" ? blocked(decision.reason) : { ui: { ...ui, transformOpen: false }, command: decision.command, reason: "" };
  }
  if (input.type === "upgrade") {
    const detail = building ? deriveBuildingDetail(content, state, building) : null;
    if (!detail) return blocked(building?.kind === "main_city" ? "主城不可升级" : "当前建筑不可升级");
    const decision = decideGrowthAction(detail.upgrade);
    return decision.kind === "blocked" ? blocked(decision.reason) : { ui: { ...ui, destroyConfirm: false }, command: decision.command, reason: "" };
  }
  if (state.buildings.some((building) => building.slotId === ui.selectedSlot)) return blocked("格位已占用");
  const action = deriveEmptySlotActions(content, state, ui.selectedSlot).find((candidate) => candidate.definitionId === input.definitionId)!;
  const decision = decideGrowthAction(action);
  return decision.kind === "blocked" ? blocked(decision.reason) : { ui, command: decision.command, reason: "" };
}
