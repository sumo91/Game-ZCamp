import { describe, expect, it } from "vitest";
import { CAMP_SLOT_LAYOUTS, CONTEXT_PANEL, ENEMY_ZONE, GRID_ZONE, LOGICAL_HEIGHT, LOGICAL_WIDTH, RESOURCE_RAIL, WALL_ZONE, deriveSlotActionBarBounds, pointInLogicalBounds } from "../../src/phaser/layout";

describe("vertical zone contract", () => {
  it("stacks zones edge-to-edge from the battlefield to the info strip", () => {
    expect(WALL_ZONE.y).toBe(ENEMY_ZONE.height); // enemy zone starts at y=0
    expect(GRID_ZONE.y).toBe(WALL_ZONE.y + WALL_ZONE.height);
    expect(RESOURCE_RAIL.y).toBe(GRID_ZONE.y + GRID_ZONE.height);
    expect(CONTEXT_PANEL.y).toBe(RESOURCE_RAIL.y + RESOURCE_RAIL.height);
    expect(CONTEXT_PANEL.y + CONTEXT_PANEL.height).toBe(LOGICAL_HEIGHT);
  });

  it("keeps the enemy band inside the 58-63% product spec", () => {
    const share = ENEMY_ZONE.height / LOGICAL_HEIGHT;
    expect(share).toBeGreaterThanOrEqual(0.58);
    expect(share).toBeLessThanOrEqual(0.63);
  });
});

describe("deriveSlotActionBarBounds", () => {
  it("keeps the floating bar fully on-screen and below the wall top for every camp slot", () => {
    for (const slot of CAMP_SLOT_LAYOUTS) {
      const bounds = deriveSlotActionBarBounds(slot.id);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(LOGICAL_WIDTH);
      expect(bounds.y).toBeGreaterThanOrEqual(WALL_ZONE.y);
    }
  });

  it("never overlaps the selected slot itself", () => {
    for (const slot of CAMP_SLOT_LAYOUTS) {
      const bounds = deriveSlotActionBarBounds(slot.id);
      const overlaps = pointInLogicalBounds(slot.x + slot.width / 2, slot.y + slot.height / 2, bounds);
      expect(overlaps).toBe(false);
    }
  });
});

describe("pointInLogicalBounds", () => {
  const bounds = { x: 100, y: 200, width: 50, height: 60 };

  it("accepts inner points including edges", () => {
    expect(pointInLogicalBounds(100, 200, bounds)).toBe(true);
    expect(pointInLogicalBounds(150, 260, bounds)).toBe(true);
    expect(pointInLogicalBounds(125, 230, bounds)).toBe(true);
  });

  it("rejects outer points", () => {
    expect(pointInLogicalBounds(99, 230, bounds)).toBe(false);
    expect(pointInLogicalBounds(151, 230, bounds)).toBe(false);
    expect(pointInLogicalBounds(125, 199, bounds)).toBe(false);
    expect(pointInLogicalBounds(125, 261, bounds)).toBe(false);
  });
});
