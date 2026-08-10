import { describe, expect, it } from "vitest";
import { starterCatalog, validateCatalog } from "../../src/core/content";

describe("content catalog", () => {
  it("accepts the starter catalog", () => {
    expect(() => validateCatalog(starterCatalog)).not.toThrow();
  });

  it("contains the MVP content counts", () => {
    expect(starterCatalog.towers).toHaveLength(4);
    expect(starterCatalog.enemies.filter((enemy) => enemy.tier === "normal")).toHaveLength(6);
    expect(starterCatalog.enemies.filter((enemy) => enemy.tier === "elite")).toHaveLength(4);
    expect(starterCatalog.enemies.filter((enemy) => enemy.tier === "boss")).toHaveLength(4);
    expect(starterCatalog.waves).toHaveLength(20);
    expect(starterCatalog.upgrades).toHaveLength(36);
  });

  it("rejects waves that reference unknown enemies", () => {
    expect(() => validateCatalog({
      ...starterCatalog,
      waves: [{ wave: 1, durationSeconds: 5, spawnEvents: [{ atSeconds: 0, enemyId: "missing" }] }],
    })).toThrow("unknown enemy");
  });
});
