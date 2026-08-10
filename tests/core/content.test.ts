import { describe, expect, it } from "vitest";
import { starterCatalog, validateCatalog } from "../../src/core/content";

describe("content catalog", () => {
  it("accepts the starter catalog", () => {
    expect(() => validateCatalog(starterCatalog)).not.toThrow();
  });

  it("rejects waves that reference unknown enemies", () => {
    expect(() => validateCatalog({
      ...starterCatalog,
      waves: [{ wave: 1, durationSeconds: 5, enemyIds: ["missing"] }],
    })).toThrow("unknown enemy");
  });
});
