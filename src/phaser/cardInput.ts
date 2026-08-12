import type { CardDefinition } from "../core/content";
import type { CardInstance, GameCommand } from "../core/types";

export type CardUseReadiness = { usable: boolean; hint: string };

export type CardClickDecision =
  | { kind: "select"; instanceId: string }
  | { kind: "play"; command: Extract<GameCommand, { type: "play_card" }> }
  | { kind: "noop"; reason: "missing-card" | "missing-definition" };

export function decideCardClick(
  hand: readonly CardInstance[],
  index: number,
  selectedCardInstanceId: string | null,
  definitionFor: (definitionId: string) => CardDefinition | undefined,
): CardClickDecision {
  const card = hand[index];
  if (!card) return { kind: "noop", reason: "missing-card" };
  const definition = definitionFor(card.definitionId);
  if (!definition) return { kind: "noop", reason: "missing-definition" };
  if (selectedCardInstanceId === card.instanceId && definition.category !== "base") {
    return { kind: "play", command: { type: "play_card", cardInstanceId: card.instanceId } };
  }
  return { kind: "select", instanceId: card.instanceId };
}

export function getCardUseReadiness(
  definition: CardDefinition,
  gold: number,
  permanentApplications: Readonly<Record<string, number>>,
): CardUseReadiness {
  if (definition.category === "base") return { usable: false, hint: "请选择目标" };
  const applications = permanentApplications[definition.id] ?? 0;
  if (definition.category === "permanent" && definition.maxApplications !== undefined && applications >= definition.maxApplications) {
    return { usable: false, hint: "已达上限 · 请弃牌" };
  }
  if (gold < definition.cost) return { usable: false, hint: "金币不足 · 还差 " + Math.ceil(definition.cost - gold) };
  return { usable: true, hint: "可使用 · 再点确认" };
}
