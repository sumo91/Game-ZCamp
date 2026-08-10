export class SeededRandom {
  private state: number;

  public constructor(seed: number) {
    this.state = (seed >>> 0) || 0x9e3779b9;
  }

  public nextUint(): number {
    let value = (this.state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return (value ^ (value >>> 14)) >>> 0;
  }

  public nextFloat(): number {
    return this.nextUint() / 0x100000000;
  }

  public nextInt(minInclusive: number, maxExclusive: number): number {
    if (!Number.isInteger(minInclusive) || !Number.isInteger(maxExclusive)) {
      throw new Error("SeededRandom bounds must be integers.");
    }

    if (maxExclusive <= minInclusive) {
      throw new Error("SeededRandom maxExclusive must be greater than minInclusive.");
    }

    return minInclusive + Math.floor(this.nextFloat() * (maxExclusive - minInclusive));
  }

  public pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error("SeededRandom cannot pick from an empty collection.");
    }

    return items[this.nextInt(0, items.length)] as T;
  }
}
