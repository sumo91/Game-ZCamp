import { describe, expect, it } from "vitest";
import { FixedStepClock } from "../../src/core/clock";

describe("FixedStepClock", () => {
  it("emits deterministic fixed-size steps", () => {
    const clock = new FixedStepClock(0.1, 10);
    const steps: number[] = [];

    const emitted = clock.advance(0.35, (step) => steps.push(step));

    expect(emitted).toBe(3);
    expect(steps).toEqual([0.1, 0.1, 0.1]);
  });

  it("caps catch-up work after a long frame", () => {
    const clock = new FixedStepClock(0.1, 2);
    let steps = 0;

    clock.advance(2, () => {
      steps += 1;
    });

    expect(steps).toBe(2);
  });
});
