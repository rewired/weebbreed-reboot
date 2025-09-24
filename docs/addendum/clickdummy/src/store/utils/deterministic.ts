/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const LCG_A = 1664525;
const LCG_C = 1013904223;
const LCG_M = 0x100000000;
const DEFAULT_SCOPE = 'default';
const DEFAULT_ID_PREFIX = 'id';

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

const normalizeSeed = (seed: number | string): number => {
  if (typeof seed === 'number') {
    if (!Number.isFinite(seed)) {
      throw new Error('Seed must be a finite number.');
    }
    return (seed >>> 0) || 0;
  }
  let hash = FNV_OFFSET;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
};

const deriveSeed = (seed: number, scope: string): number => normalizeSeed(`${seed}:${scope}`);

const resolveStartIndex = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
};

const nextState = (state: SequenceState): number => {
  state.state = (Math.imul(state.state, LCG_A) + LCG_C) >>> 0;
  return state.state;
};

const nextFloatInternal = (state: SequenceState): number => nextState(state) / LCG_M;

const nextIntInternal = (state: SequenceState, min: number, max: number): number => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error('Range bounds must be finite numbers.');
  }
  const lower = Math.floor(min);
  const upper = Math.floor(max);
  if (upper <= lower) {
    throw new Error('`max` must be greater than `min` for nextInt.');
  }
  const span = upper - lower;
  return lower + Math.floor(nextFloatInternal(state) * span);
};

const pickInternal = <T>(state: SequenceState, values: readonly T[]): T => {
  if (values.length === 0) {
    throw new Error('Cannot pick from an empty array.');
  }
  const index = nextIntInternal(state, 0, values.length);
  return values[index];
};

const nextIdInternal = (state: SequenceState, prefix?: string): string => {
  const effectivePrefix = prefix ?? state.idPrefix;
  const suffix = state.idCounter++;
  if (!effectivePrefix) {
    return `${suffix}`;
  }
  return `${effectivePrefix}-${suffix}`;
};

const cloneState = (state: SequenceState): SequenceState => ({
  state: state.state,
  initialSeed: state.initialSeed,
  idPrefix: state.idPrefix,
  idCounter: state.idCounter,
});

const createSequenceFromState = (state: SequenceState): DeterministicSequence => ({
  seed: state.initialSeed,
  nextFloat: () => nextFloatInternal(state),
  nextInt: (min: number, max: number) => nextIntInternal(state, min, max),
  pick: <T>(values: readonly T[]) => pickInternal(state, values),
  nextId: (prefix?: string) => nextIdInternal(state, prefix),
  clone: () => createSequenceFromState(cloneState(state)),
  getState: () => ({
    seed: state.state,
    initialSeed: state.initialSeed,
    idCounter: state.idCounter,
    idPrefix: state.idPrefix,
  }),
});

interface SequenceState {
  state: number;
  initialSeed: number;
  idPrefix: string;
  idCounter: number;
}

export interface SequenceOptions {
  idPrefix?: string;
  startIndex?: number;
}

interface NormalizedSequenceOptions {
  idPrefix: string;
  startIndex: number;
}

export interface DeterministicSequenceSnapshot {
  seed: number;
  initialSeed: number;
  idCounter: number;
  idPrefix: string;
}

export interface DeterministicSequence {
  readonly seed: number;
  nextFloat(): number;
  nextInt(min: number, max: number): number;
  pick<T>(values: readonly T[]): T;
  nextId(prefix?: string): string;
  clone(): DeterministicSequence;
  getState(): DeterministicSequenceSnapshot;
}

export interface DeterministicManager {
  readonly seed: number;
  sequence(scope: string, overrides?: SequenceOptions): DeterministicSequence;
  derive(scope: string, overrides?: SequenceOptions): DeterministicManager;
  reset(scope?: string): void;
  snapshot(): Record<string, DeterministicSequenceSnapshot>;
}

const createSequenceState = (
  seed: number,
  options: NormalizedSequenceOptions,
): SequenceState => ({
  state: seed >>> 0,
  initialSeed: seed >>> 0,
  idPrefix: options.idPrefix,
  idCounter: options.startIndex,
});

const normalizeOptions = (options: SequenceOptions | undefined): NormalizedSequenceOptions => ({
  idPrefix: options?.idPrefix ?? DEFAULT_ID_PREFIX,
  startIndex: resolveStartIndex(options?.startIndex),
});

export const createDeterministicSequence = (
  seed: number | string,
  options?: SequenceOptions,
): DeterministicSequence => {
  const normalizedSeed = normalizeSeed(seed);
  const normalizedOptions = normalizeOptions(options);
  return createSequenceFromState(createSequenceState(normalizedSeed, normalizedOptions));
};

export const createDeterministicManager = (
  seed: number | string,
  defaults?: SequenceOptions,
): DeterministicManager => {
  const baseSeed = normalizeSeed(seed);
  const defaultOptions = normalizeOptions(defaults);
  const sequences = new Map<string, DeterministicSequence>();

  const ensureSequence = (scope: string, overrides?: SequenceOptions): DeterministicSequence => {
    const effectiveScope = scope || DEFAULT_SCOPE;
    const existing = sequences.get(effectiveScope);
    if (existing) {
      return existing;
    }
    const normalized = normalizeOptions(overrides);
    const derivedSeed = deriveSeed(baseSeed, effectiveScope);
    const sequence = createDeterministicSequence(derivedSeed, normalized);
    sequences.set(effectiveScope, sequence);
    return sequence;
  };

  const deriveManager = (scope: string, overrides?: SequenceOptions): DeterministicManager => {
    const derivedSeed = deriveSeed(baseSeed, scope);
    const mergedDefaults: SequenceOptions = {
      idPrefix: overrides?.idPrefix ?? defaultOptions.idPrefix,
      startIndex: overrides?.startIndex ?? defaultOptions.startIndex,
    };
    return createDeterministicManager(derivedSeed, mergedDefaults);
  };

  const reset = (scope?: string) => {
    if (scope) {
      sequences.delete(scope);
    } else {
      sequences.clear();
    }
  };

  const snapshot = () => {
    const result: Record<string, DeterministicSequenceSnapshot> = {};
    for (const [scopeKey, sequence] of sequences.entries()) {
      result[scopeKey] = sequence.getState();
    }
    return result;
  };

  return {
    seed: baseSeed,
    sequence: ensureSequence,
    derive: deriveManager,
    reset,
    snapshot,
  };
};

export const CLICKDUMMY_SEED = 'clickdummy-fixtures';

export const sharedDeterministic = createDeterministicManager(CLICKDUMMY_SEED);

export const getSharedSequence = (
  scope: string,
  overrides?: SequenceOptions,
): DeterministicSequence => sharedDeterministic.sequence(scope, overrides);

export const nextSharedId = (prefix?: string): string =>
  sharedDeterministic.sequence('ids', { idPrefix: DEFAULT_ID_PREFIX }).nextId(prefix);
