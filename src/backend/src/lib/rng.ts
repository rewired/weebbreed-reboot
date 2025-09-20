const UINT32_MAX = 0xffffffff;
const DEFAULT_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

const mulberry32 = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), (state | 1) >>> 0);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / (UINT32_MAX + 1);
  };
};

const hashString = (input: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export interface SerializedRngState {
  seed: string;
  streams: Record<string, number>;
}

export class RngStream {
  private generator: () => number;
  private offset = 0;

  constructor(
    private readonly name: string,
    streamSeed: number,
    offset = 0,
  ) {
    this.generator = mulberry32(streamSeed);
    if (offset > 0) {
      this.advance(offset);
    }
  }

  private advance(steps: number) {
    for (let index = 0; index < steps; index += 1) {
      // discard value to fast-forward the stream
      this.generator();
    }
    this.offset += steps;
  }

  getName(): string {
    return this.name;
  }

  getOffset(): number {
    return this.offset;
  }

  next(): number {
    const value = this.generator();
    this.offset += 1;
    return value;
  }

  nextFloat(): number {
    return this.next();
  }

  nextRange(min: number, max: number): number {
    if (max <= min) {
      throw new Error(`Invalid range for RNG stream '${this.name}': [${min}, ${max}]`);
    }
    return min + (max - min) * this.next();
  }

  nextInt(maxExclusive: number): number {
    if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
      throw new Error(`Invalid integer bound for RNG stream '${this.name}': ${maxExclusive}`);
    }
    return Math.floor(this.next() * maxExclusive);
  }

  nextBoolean(trueWeight = 0.5): boolean {
    if (trueWeight <= 0) {
      return false;
    }
    if (trueWeight >= 1) {
      return true;
    }
    return this.next() < trueWeight;
  }

  nextString(length: number, alphabet = DEFAULT_ALPHABET): string {
    if (length <= 0) {
      return '';
    }
    if (alphabet.length === 0) {
      throw new Error('Alphabet for RNG string generation must not be empty.');
    }
    let result = '';
    for (let index = 0; index < length; index += 1) {
      const charIndex = this.nextInt(alphabet.length);
      result += alphabet.charAt(charIndex);
    }
    return result;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error(`Cannot pick from empty array using RNG stream '${this.name}'.`);
    }
    const index = this.nextInt(items.length);
    return items[index];
  }
}

export class RngService {
  private readonly streams = new Map<string, RngStream>();
  private readonly knownOffsets = new Map<string, number>();

  constructor(
    private readonly seed: string,
    snapshot?: SerializedRngState,
  ) {
    if (snapshot) {
      if (snapshot.seed !== seed) {
        throw new Error('Seed mismatch while restoring RNG state.');
      }
      Object.entries(snapshot.streams ?? {}).forEach(([name, offset]) => {
        this.knownOffsets.set(name, offset);
      });
    }
  }

  getSeed(): string {
    return this.seed;
  }

  getStream(name: string): RngStream {
    let stream = this.streams.get(name);
    if (!stream) {
      const streamSeed = hashString(`${this.seed}:${name}`);
      const offset = this.knownOffsets.get(name) ?? 0;
      stream = new RngStream(name, streamSeed, offset);
      this.streams.set(name, stream);
    }
    return stream;
  }

  serialize(): SerializedRngState {
    const mergedOffsets = new Map<string, number>(this.knownOffsets);
    for (const [name, stream] of this.streams.entries()) {
      mergedOffsets.set(name, stream.getOffset());
    }
    const streams: Record<string, number> = {};
    for (const [name, offset] of mergedOffsets.entries()) {
      streams[name] = offset;
    }
    return {
      seed: this.seed,
      streams,
    };
  }
}

export default RngService;
