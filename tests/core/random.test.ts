import { describe, expect, it } from "vitest";
import { SeededRandom } from "../../src/core/random";

describe("SeededRandom", () => {
  it("replays the same sequence for the same seed", () => {
    const first = new SeededRandom(1234);
    const second = new SeededRandom(1234);

    expect([first.nextUint(), first.nextUint(), first.nextUint()]).toEqual([
      second.nextUint(),
      second.nextUint(),
      second.nextUint(),
    ]);
  });

  it("generates integers within the requested range", () => {
    const random = new SeededRandom(5678);

    for (let index = 0; index < 50; index += 1) {
      const value = random.nextInt(3, 8);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThan(8);
    }
  });
});
