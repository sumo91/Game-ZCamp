import { describe, expect, it } from "vitest";
import { enemyDisplayPosition } from "../../src/three/coordinates";

describe("living crowd display projection", () => {
  it("keeps all same-type wall attackers grounded in several visible depth ranks", () => {
    const positions = Array.from({ length: 100 }, (_, index) => enemyDisplayPosition(`walker-${index}`, 1, "walker"));
    expect(new Set(positions.map(position => position.z)).size).toBeGreaterThanOrEqual(5);
    for (const position of positions) {
      expect(position.y).toBe(0);
      expect(position.z).toBeLessThanOrEqual(-1.1);
      expect(position.z).toBeGreaterThanOrEqual(-3.6);
      expect(Math.abs(position.x)).toBeLessThanOrEqual(4.2);
    }
    expect(enemyDisplayPosition("walker-9", 1, "walker")).toEqual(positions[9]);
  });

  it("approaches each display rank continuously without changing Boss ability lanes", () => {
    const before = enemyDisplayPosition("walker-9", .65, "walker");
    const after = enemyDisplayPosition("walker-9", .65001, "walker");
    expect(before.distanceTo(after)).toBeLessThan(.001);
    expect(enemyDisplayPosition("charger_boss-98", 1, "charger_boss").z).toBeCloseTo(-.89);
    expect(enemyDisplayPosition("overlord_boss-99", 1, "overlord_boss").z).toBeCloseTo(-.89);
  });
});
