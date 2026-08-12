import type { CardDefinition } from "../core/content";
import type { CardInstance, GameCommand } from "../core/types";
import type { CardUseReadiness } from "../core/cardAvailability";

export { getCardUseReadiness } from "../core/cardAvailability";
export type { CardUseReadiness } from "../core/cardAvailability";

export type CardClickDecision =
  | { kind: "select"; instanceId: string }
  | { kind: "cancel"; instanceId: string }
  | { kind: "play"; command: Extract<GameCommand, { type: "play_card" }> }
  | { kind: "blocked"; hint: string }
  | { kind: "noop"; reason: "missing-card" | "missing-definition" };

export function decideCardClick(
  hand: readonly CardInstance[],
  index: number,
  selectedCardInstanceId: string | null,
  definitionFor: (definitionId: string) => CardDefinition | undefined,
  readinessFor: (definition: CardDefinition) => CardUseReadiness,
): CardClickDecision {
  const card = hand[index];
  if (!card) return { kind: "noop", reason: "missing-card" };
  const definition = definitionFor(card.definitionId);
  if (!definition) return { kind: "noop", reason: "missing-definition" };
  const readiness = readinessFor(definition);
  if (!readiness.usable) return { kind: "blocked", hint: readiness.hint };
  if (selectedCardInstanceId === card.instanceId) {
    if (definition.category === "base") return { kind: "cancel", instanceId: card.instanceId };
    return { kind: "play", command: { type: "play_card", cardInstanceId: card.instanceId } };
  }
  return { kind: "select", instanceId: card.instanceId };
}
