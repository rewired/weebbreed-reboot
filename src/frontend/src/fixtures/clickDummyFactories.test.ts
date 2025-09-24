import { describe, expect, it } from 'vitest';
import {
  CLICKDUMMY_SEED,
  createClickDummyFixture,
  createFixtureFactoryContext,
  createPlant,
  generateCandidates,
  nextDeterministicId,
} from './clickDummyFactories';

describe('clickDummyFixtures', () => {
  it('produces deterministic fixture snapshots for the same seed', () => {
    const first = createClickDummyFixture();
    const second = createClickDummyFixture({ seed: CLICKDUMMY_SEED });

    expect(second.data).toEqual(first.data);
  });

  it('generates deterministic candidates when using the same seed', () => {
    const contextA = createFixtureFactoryContext('candidate-seed');
    const contextB = createFixtureFactoryContext('candidate-seed');

    const first = generateCandidates(contextA, 3);
    const second = generateCandidates(contextB, 3);

    expect(second).toEqual(first);
  });

  it('marks plants as harvestable when progress reaches the harvest threshold', () => {
    const context = createFixtureFactoryContext('plant-seed');

    const maturePlant = createPlant(context, { progress: 70 });
    const immaturePlant = createPlant(context, { progress: 40 });

    expect(maturePlant.harvestable).toBe(true);
    expect(immaturePlant.harvestable).toBe(false);
  });

  it('derives deterministic ids per context', () => {
    const context = createFixtureFactoryContext('id-seed');
    const otherContext = createFixtureFactoryContext('id-seed');

    const first = nextDeterministicId(context, 'device');
    const second = nextDeterministicId(context, 'device');
    const reset = nextDeterministicId(otherContext, 'device');

    expect(first).not.toEqual(second);
    expect(reset).toEqual(first);
  });
});
