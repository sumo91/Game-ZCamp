import { CAMP_COLUMNS, CAMP_ROWS, CAMP_SLOT_IDS } from "../core/types";

export const LOGICAL_WIDTH = 720;
export const LOGICAL_HEIGHT = 1280;
export const ENEMY_ZONE = { x: 24, y: 0, width: 672, height: 724 };
export const WALL_ZONE = { x: 24, y: 708, width: 672, height: 64 };
export const GRID_ZONE = { x: 24, y: 772, width: 672, height: 318 };
export const RESOURCE_RAIL = { x: 24, y: 1090, width: 672, height: 48 };
export const CONTEXT_PANEL = { x: 24, y: 1138, width: 672, height: 142 };
export const LOBBY_ARTIFACT_BOUNDS = { x: 40, y: 790, width: 640, height: 120 };

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

/** Floating action bar bounds above a selected slot; pinned to the grid so it never covers the slot itself. */
export function deriveSlotActionBarBounds(slotId: string): LogicalBounds {
  const slot = CAMP_SLOT_LAYOUTS.find((layout) => layout.id === slotId);
  const column = slot?.column ?? 2;
  const row = slot?.row ?? 0;
  const width = 316;
  // Three staggered column positions keep the bar fully on-screen for all five camp columns.
  const columnAnchors = [GRID_ZONE.x + 6, GRID_ZONE.x + 178, GRID_ZONE.x + 350];
  const x = columnAnchors[Math.min(2, Math.max(0, column - 1))]!;
  const y = row === 0 ? GRID_ZONE.y + 8 : GRID_ZONE.y + row * 103 - 66;
  return { x, y, width, height: 58 };
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
