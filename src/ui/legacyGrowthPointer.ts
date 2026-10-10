import { CAMP_SLOT_LAYOUTS, GROWTH_CONTEXT_ACTION_BOUNDS, GROWTH_TRANSFORM_CLOSE_BOUNDS, GROWTH_TRANSFORM_OPTION_BOUNDS, type LogicalBounds } from "./legacyLayout";
import type { GrowthPointerHit } from "./growthUi";
export * from "./growthUi";
function pointInBounds(x: number, y: number, bounds: LogicalBounds): boolean {
  return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
}

/** Modal-space hit zones only apply while the transform modal is open; otherwise they would shadow camp slots. */
export function hitGrowthPointer(x: number, y: number, transformOpen = true): GrowthPointerHit {
  if (transformOpen) {
    if (pointInBounds(x, y, GROWTH_TRANSFORM_CLOSE_BOUNDS)) return { kind: "transform_close" };
    const transformIndex = GROWTH_TRANSFORM_OPTION_BOUNDS.findIndex((bounds) => pointInBounds(x, y, bounds));
    if (transformIndex >= 0) return { kind: "transform_option", index: transformIndex };
  }
  const actionIndex = GROWTH_CONTEXT_ACTION_BOUNDS.findIndex((bounds) => pointInBounds(x, y, bounds));
  if (actionIndex >= 0) return { kind: "action", index: actionIndex };
  const slot = CAMP_SLOT_LAYOUTS.find((candidate) => pointInBounds(x, y, candidate));
  if (slot) return { kind: "slot", slotId: slot.id };
  return { kind: "none" };
}

