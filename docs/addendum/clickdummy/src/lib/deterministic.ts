/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A simple linear congruential generator (LCG) for deterministic random numbers.
export class SeededRandom {
  private seed: number;
  private readonly a = 1664525;
  private readonly c = 1013904223;
  private readonly m = 2 ** 32;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Returns a random float between 0 (inclusive) and 1 (exclusive)
  next(): number {
    this.seed = (this.a * this.seed + this.c) % this.m;
    return this.seed / this.m;
  }

  // Returns a random integer between min (inclusive) and max (exclusive)
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  // Pick a random element from an array
  choice<T>(arr: readonly T[]): T {
    return arr[this.nextInt(0, arr.length)];
  }
}

// Global deterministic utilities
let idCounter = 0;
export const deterministicUuid = () => `id-${idCounter++}`;
