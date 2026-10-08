import { CAMP_SLOT_IDS } from "../core/types";
import { Vector3 } from "three";

export const WALL_Z = 0;
export const CAMP_POSITIONS = new Map(CAMP_SLOT_IDS.map((id, index) => [id, new Vector3((index % 5 - 2) * 2, 0, 1.4 + Math.floor(index / 5) * 2.4)]));

/** Pure display distribution, independent of the simulation's random stream. */
export function enemyPosition(id: string, progress: number): Vector3 {
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return new Vector3(((hash % 1000) / 999 - 0.5) * 8.4, 0, -10.8 + Math.min(1, Math.max(0, progress)) * 10.15);
}
