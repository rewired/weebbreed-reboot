import seedStems from '../data/seed_stems.json';

// Simple seeded random number generator (Linear Congruential Generator)
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}

// Generate a deterministic 3-word seed from current time
export function generateSeed(timestamp?: number): string {
  const seed = timestamp || Date.now();
  const rng = new SeededRandom(seed);

  const words: string[] = [];
  const availableStems = [...seedStems];

  // Pick 3 unique words
  for (let i = 0; i < 3; i++) {
    const index = rng.nextInt(availableStems.length);
    const word = availableStems.splice(index, 1)[0];
    words.push(word);
  }

  return words.join('-');
}

// Generate a seed based on current microtime
export function generateTimestampSeed(): string {
  return generateSeed(Date.now());
}
