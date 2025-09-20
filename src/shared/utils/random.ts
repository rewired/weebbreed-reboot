import seedrandom from 'seedrandom';

export type Rng = seedrandom.prng;

export const createRng = (seed: string): Rng => seedrandom(seed, { state: true });

export const randomBetween = (rng: Rng, min: number, max: number): number =>
  min + rng.quick() * (max - min);
