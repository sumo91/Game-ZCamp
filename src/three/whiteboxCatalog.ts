import type { GameState } from "../core/types";

/** Development geometry only. No rule values or gameplay randomness live here. */
export const WHITEBOX_ENEMIES = {
  walker: { color: 0xc1bccb, scale: 0.75 },
  runner: { color: 0xaac5b9, scale: 0.6 },
  tank: { color: 0x9695a9, scale: 1 },
  armored: { color: 0x9383ad, scale: 1.05 },
  brute: { color: 0x827997, scale: 1.25 },
  charger_boss: { color: 0x9a6f91, scale: 1.6 },
  overlord_boss: { color: 0x749488, scale: 1.9 },
} as const;

export function whiteboxEnemy(id: string): { color: number; scale: number } {
  const definition = WHITEBOX_ENEMIES[id as keyof typeof WHITEBOX_ENEMIES];
  if (!definition) throw new Error("Missing development enemy: " + id);
  return definition;
}

/** Shared presentation threshold from the UI Bible; never changes wall rules. */
export function isWallInDanger(state: Pick<GameState, "wallHp" | "wallMaxHp">): boolean {
  return state.wallHp < state.wallMaxHp * 0.35;
}
