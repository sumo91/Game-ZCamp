export class FixedStepClock {
  private accumulatorSeconds = 0;

  public constructor(
    public readonly stepSeconds = 1 / 30,
    private readonly maxStepsPerAdvance = 5,
  ) {
    if (stepSeconds <= 0 || maxStepsPerAdvance <= 0) {
      throw new Error("FixedStepClock requires positive step and step limit.");
    }
  }

  public advance(deltaSeconds: number, tick: (stepSeconds: number) => void): number {
    if (deltaSeconds <= 0) {
      return 0;
    }

    const cappedDelta = Math.min(deltaSeconds, this.stepSeconds * this.maxStepsPerAdvance);
    this.accumulatorSeconds += cappedDelta;

    let steps = 0;
    while (this.accumulatorSeconds >= this.stepSeconds && steps < this.maxStepsPerAdvance) {
      tick(this.stepSeconds);
      this.accumulatorSeconds -= this.stepSeconds;
      steps += 1;
    }

    return steps;
  }

  public reset(): void {
    this.accumulatorSeconds = 0;
  }
}
