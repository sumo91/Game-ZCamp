import { CAMP_COLUMNS, CAMP_ROWS, CAMP_SLOT_IDS } from "../core/types";

export const LOGICAL_WIDTH = 720;
export const LOGICAL_HEIGHT = 1280;
export const ENEMY_ZONE = { x: 24, y: 0, width: 672, height: 724 };
export const WALL_ZONE = { x: 24, y: 708, width: 672, height: 64 };
export const GRID_ZONE = { x: 24, y: 772, width: 672, height: 318 };
export const RESOURCE_RAIL = { x: 24, y: 1090, width: 672, height: 48 };
export const CONTEXT_PANEL = { x: 24, y: 1138, width: 672, height: 142 };
export const CARD_HAND = { x: 24, y: 1138, width: 672, height: 142 };

export interface CampSlotLayout {
  id: string;
  row: number;
  column: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const CAMP_SLOT_LAYOUTS: CampSlotLayout[] = CAMP_SLOT_IDS.map((id, index) => {
  const row = Math.floor(index / CAMP_COLUMNS);
  const column = index % CAMP_COLUMNS;
  return {
    id,
    row,
    column,
    x: GRID_ZONE.x + column * 136,
    y: GRID_ZONE.y + row * 103,
    width: 128,
    height: 94,
  };
});

export const CARD_WIDTH = 160;
export const CARD_GAP = 10;
export const CARD_LAYOUTS = [0, 1, 2, 3].map((index) => ({
  x: CARD_HAND.x + index * (CARD_WIDTH + CARD_GAP),
  y: CARD_HAND.y + 6,
  width: CARD_WIDTH,
  height: CARD_HAND.height - 12,
}));

if (CAMP_SLOT_LAYOUTS.length !== CAMP_ROWS * CAMP_COLUMNS) {
  throw new Error("D3 camp layout must contain exactly 15 slots.");
}
