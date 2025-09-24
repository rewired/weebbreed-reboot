import { afterEach, describe, expect, it } from 'vitest';

import {
  CLICKDUMMY_SEED,
  createDeterministicManager,
  createDeterministicSequence,
  getSharedSequence,
  nextSharedId,
  sharedDeterministic,
} from './deterministic';

describe('createDeterministicSequence', () => {
  it('produces stable pseudo random values for identical seeds', () => {
    const sequenceA = createDeterministicSequence('seed:alpha', { idPrefix: 'a' });
    const sequenceB = createDeterministicSequence('seed:alpha', { idPrefix: 'a' });

    expect(sequenceA.nextFloat()).toBeCloseTo(sequenceB.nextFloat(), 10);
    expect(sequenceA.nextInt(0, 100)).toBe(sequenceB.nextInt(0, 100));
    expect(sequenceA.nextId()).toBe(sequenceB.nextId());
  });

  it('supports cloning sequences to reproduce subsequent values', () => {
    const sequence = createDeterministicSequence(1234, { startIndex: 5, idPrefix: 'clone' });
    sequence.nextInt(0, 10);
    const clone = sequence.clone();

    expect(sequence.nextFloat()).toBeCloseTo(clone.nextFloat(), 10);
    expect(sequence.nextId()).toBe(clone.nextId());
  });

  it('throws when requesting invalid ranges or empty picks', () => {
    const sequence = createDeterministicSequence(42);

    expect(() => sequence.nextInt(5, 5)).toThrowError();
    expect(() => sequence.nextInt(10, 0)).toThrowError();
    expect(() => sequence.pick([])).toThrowError();
  });
});

describe('createDeterministicManager', () => {
  it('creates isolated scoped sequences with derived seeds', () => {
    const manager = createDeterministicManager('manager-seed');
    const scopeA = manager.sequence('scope-a', { idPrefix: 'base', startIndex: 10 });
    const scopeASecondCall = manager.sequence('scope-a');
    const scopeB = manager.sequence('scope-b');

    expect(scopeA.nextId()).toBe('base-10');
    expect(scopeASecondCall.nextId()).toBe('base-11');
    expect(scopeB.nextId()).toBe('id-0');

    const scopeAFloat = scopeA.nextFloat();
    const scopeBFloat = scopeB.nextFloat();
    expect(scopeAFloat).not.toBe(scopeBFloat);
  });

  it('derives child managers with independent state', () => {
    const parent = createDeterministicManager('root-seed');
    const child = parent.derive('child');

    const parentSequence = parent.sequence('shared', { idPrefix: 'parent', startIndex: 1 });
    const childSequence = child.sequence('shared', { idPrefix: 'child', startIndex: 5 });

    expect(parentSequence.nextId()).toBe('parent-1');
    expect(childSequence.nextId()).toBe('child-5');
    expect(parentSequence.nextFloat()).not.toBe(childSequence.nextFloat());

    const snapshot = parent.snapshot();
    expect(Object.keys(snapshot)).toContain('shared');
  });

  it('can reset individual scopes without affecting others', () => {
    const manager = createDeterministicManager('reset-seed');
    const initial = manager.sequence('alpha').nextId('alpha');
    manager.sequence('beta').nextId('beta');

    manager.reset('alpha');
    const resetValue = manager.sequence('alpha').nextId('alpha');

    expect(resetValue).toBe(initial);
  });
});

describe('shared deterministic utilities', () => {
  afterEach(() => {
    sharedDeterministic.reset();
  });

  it('exposes a shared manager seeded with the clickdummy constant', () => {
    const sequence = sharedDeterministic.sequence('default');
    const clone = sequence.clone();

    expect(sharedDeterministic.seed).toBeDefined();
    expect(sequence.nextFloat()).toBeCloseTo(clone.nextFloat(), 10);
  });

  it('provides helper accessors for scoped sequences and ids', () => {
    const sequence = getSharedSequence('ui-tests', { idPrefix: 'ui', startIndex: 2 });

    expect(sequence.nextId()).toBe('ui-2');
    expect(sequence.nextId()).toBe('ui-3');

    expect(nextSharedId('device')).toBe('device-0');
    expect(nextSharedId('device')).toBe('device-1');
  });

  it('remains deterministic when recreating fixtures with the canonical seed', () => {
    const managerA = createDeterministicManager(CLICKDUMMY_SEED);
    const managerB = createDeterministicManager(CLICKDUMMY_SEED);

    expect(managerA.sequence('fixtures').nextId('fixture')).toBe('fixture-0');
    expect(managerB.sequence('fixtures').nextId('fixture')).toBe('fixture-0');
  });
});
