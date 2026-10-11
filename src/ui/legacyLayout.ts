import { CAMP_COLUMNS, CAMP_ROWS, CAMP_SLOT_IDS } from "../core/types";

export const LOGICAL_WIDTH = 720;
export const LOGICAL_HEIGHT = 1280;
// Enemy band targets 58-63% of screen height per the product overview; wall+grid sit below it.
export const ENEMY_ZONE = { x: 24, y: 0, width: 672, height: 768 };
export const WALL_ZONE = { x: 24, y: 768, width: 672, height: 64 };
export const GRID_ZONE = { x: 24, y: 832, width: 672, height: 318 };
export const RESOURCE_RAIL = { x: 24, y: 1150, width: 672, height: 56 };
export const CONTEXT_PANEL = { x: 24, y: 1206, width: 672, height: 74 };

export interface LogicalBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const GROWTH_TRANSFORM_OPTION_BOUNDS: readonly LogicalBounds[] = [
  { x: 46, y: 455, width: 300, height: 150 },
  { x: 374, y: 455, width: 300, height: 150 },
  { x: 46, y: 635, width: 300, height: 150 },
  { x: 374, y: 635, width: 300, height: 150 },
];
export const GROWTH_TRANSFORM_CLOSE_BOUNDS: LogicalBounds = { x: 240, y: 850, width: 240, height: 56 };
export const GROWTH_CONTEXT_ACTION_BOUNDS: readonly LogicalBounds[] = [
  { x: 42, y: 1220, width: 204, height: 56 },
  { x: 258, y: 1220, width: 204, height: 56 },
  { x: 474, y: 1220, width: 204, height: 56 },
];

export const SLOT_BAR_BUTTON_PITCH = 106;

/** Center X of button `index` inside a slot bar; keep in sync with the bar layout constants. */
export function slotBarButtonCenterX(bounds: LogicalBounds, index: number): number {
  return bounds.x + 8 + 50 + index * SLOT_BAR_BUTTON_PITCH;
}

/** Floating action bar bounds above a selected slot; width adapts to the visible button count. */
export function deriveSlotActionBarBounds(slotId: string, buttonCount = 3): LogicalBounds {
  const slot = CAMP_SLOT_LAYOUTS.find((layout) => layout.id === slotId);
  const row = slot?.row ?? 0;
  const count = Math.max(1, Math.min(3, buttonCount));
  const width = count * SLOT_BAR_BUTTON_PITCH + 10;
  const height = 58;
  const desiredX = slot ? slot.x + slot.width / 2 - width / 2 : GRID_ZONE.x + (GRID_ZONE.width - width) / 2;
  const x = Math.max(GRID_ZONE.x + 4, Math.min(GRID_ZONE.x + GRID_ZONE.width - width - 4, desiredX));
  // Row 0 has no gap above (the wall strip); other rows float in the band between the previous row and their own.
  const rowTop = GRID_ZONE.y + row * 103;
  const y = row === 0 ? WALL_ZONE.y + 4 : rowTop - height - 5;
  return { x, y, width, height };
}

export function pointInLogicalBounds(x: number, y: number, bounds: LogicalBounds): boolean {
  return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
}

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

if (CAMP_SLOT_LAYOUTS.length !== CAMP_ROWS * CAMP_COLUMNS) {
  throw new Error("D3 camp layout must contain exactly 15 slots.");
}
