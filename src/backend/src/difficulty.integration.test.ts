import { describe, it, expect } from 'vitest';
import type { DifficultyConfig } from '@/data/configs/difficulty.js';
import { createStateFactoryContext } from '@/testing/fixtures.js';
import { createInitialState } from '@/stateFactory.js';
import { WorldService } from '@/engine/world/worldService.js';
import { RngService } from '@/lib/rng.js';
import { CostAccountingService } from '@/engine/economy/costAccounting.js';
import { createPriceCatalogFromRepository } from '@/engine/economy/catalog.js';
import { createEventCollector, type SimulationEvent } from '@/lib/eventBus.js';

const TEST_CONFIG: DifficultyConfig = {
  easy: {
    name: 'Easy',
    description: 'Test easy',
    modifiers: {
      plantStress: { optimalRangeMultiplier: 1.25, stressAccumulationMultiplier: 0.8 },
      deviceFailure: { mtbfMultiplier: 1.4 },
      economics: {
        initialCapital: 42_000_000,
        itemPriceMultiplier: 0.9,
        harvestPriceMultiplier: 1.11,
        rentPerSqmStructurePerTick: 0.12,
        rentPerSqmRoomPerTick: 0.22,
      },
    },
  },
  normal: {
    name: 'Normal',
    description: 'Test normal',
    modifiers: {
      plantStress: { optimalRangeMultiplier: 1, stressAccumulationMultiplier: 1 },
      deviceFailure: { mtbfMultiplier: 1 },
      economics: {
        initialCapital: 1_500_000,
        itemPriceMultiplier: 1,
        harvestPriceMultiplier: 1,
        rentPerSqmStructurePerTick: 0.15,
        rentPerSqmRoomPerTick: 0.3,
      },
    },
  },
  hard: {
    name: 'Hard',
    description: 'Test hard',
    modifiers: {
      plantStress: { optimalRangeMultiplier: 0.8, stressAccumulationMultiplier: 1.2 },
      deviceFailure: { mtbfMultiplier: 0.85 },
      economics: {
        initialCapital: 555_000,
        itemPriceMultiplier: 1.1,
        harvestPriceMultiplier: 0.9,
        rentPerSqmStructurePerTick: 0.21,
        rentPerSqmRoomPerTick: 0.41,
      },
    },
  },
};

describe('Difficulty presets sync with JSON config', () => {
  it('createInitialState uses injected difficultyConfig for economics', async () => {
    const context = createStateFactoryContext('diff-factory', {
      difficultyConfig: TEST_CONFIG,
    });

    const state = await createInitialState(context, { difficulty: 'easy' });

    expect(state.metadata.difficulty).toBe('easy');
    expect(state.metadata.economics).toEqual(TEST_CONFIG.easy.modifiers.economics);
    expect(state.metadata.plantStress).toEqual(TEST_CONFIG.easy.modifiers.plantStress);
    expect(state.metadata.deviceFailure).toEqual(TEST_CONFIG.easy.modifiers.deviceFailure);
    // Finance ledger starts with initial capital income matching economics
    expect(state.finances.summary.totalRevenue).toBe(
      TEST_CONFIG.easy.modifiers.economics.initialCapital,
    );
  });

  it('WorldService.newGame derives economics from injected difficultyConfig (when no custom modifiers provided)', async () => {
    const context = createStateFactoryContext('diff-world', {
      difficultyConfig: TEST_CONFIG,
    });
    const initialState = await createInitialState(context, { difficulty: 'normal' });

    const repository = context.repository;
    const rng = new RngService('world-service');
    const priceCatalog = createPriceCatalogFromRepository(repository);
    const costAccounting = new CostAccountingService(priceCatalog);

    const world = new WorldService({
      state: initialState,
      rng,
      costAccounting,
      structureBlueprints: context.structureBlueprints ?? [],
      roomPurposeSource: repository,
      difficultyConfig: TEST_CONFIG,
      repository,
    });

    const buffer: SimulationEvent[] = [];
    const eventsCollector = createEventCollector(buffer, 0);
    const result = world.newGame('hard', undefined, undefined, {
      command: 'world.newGame',
      state: initialState,
      clock: initialState.clock,
      tick: 0,
      events: eventsCollector,
    });

    expect(result.ok).toBe(true);
    expect(initialState.metadata.difficulty).toBe('hard');
    expect(initialState.metadata.economics).toEqual(TEST_CONFIG.hard.modifiers.economics);
    expect(initialState.metadata.plantStress).toEqual(TEST_CONFIG.hard.modifiers.plantStress);
    expect(initialState.metadata.deviceFailure).toEqual(TEST_CONFIG.hard.modifiers.deviceFailure);
    expect(initialState.finances.cashOnHand).toBe(
      TEST_CONFIG.hard.modifiers.economics.initialCapital,
    );
  });

  it('WorldService.newGame respects custom economics overrides when provided', async () => {
    const context = createStateFactoryContext('diff-world-override', {
      difficultyConfig: TEST_CONFIG,
    });
    const initialState = await createInitialState(context, { difficulty: 'normal' });

    const repository = context.repository;
    const rng = new RngService('world-service');
    const priceCatalog = createPriceCatalogFromRepository(repository);
    const costAccounting = new CostAccountingService(priceCatalog);

    const world = new WorldService({
      state: initialState,
      rng,
      costAccounting,
      structureBlueprints: context.structureBlueprints ?? [],
      roomPurposeSource: repository,
      difficultyConfig: TEST_CONFIG,
      repository,
    });

    const custom = {
      plantStress: { optimalRangeMultiplier: 1, stressAccumulationMultiplier: 1 },
      deviceFailure: { mtbfMultiplier: 1 },
      economics: {
        initialCapital: 7_777_777,
        itemPriceMultiplier: 1.23,
        harvestPriceMultiplier: 0.87,
        rentPerSqmStructurePerTick: 0.5,
        rentPerSqmRoomPerTick: 0.6,
      },
    } as const;

    const buffer: SimulationEvent[] = [];
    const eventsCollector = createEventCollector(buffer, 0);
    const result = world.newGame(
      'hard',
      custom as unknown as Parameters<typeof world.newGame>[1],
      undefined,
      {
        command: 'world.newGame',
        state: initialState,
        clock: initialState.clock,
        tick: 0,
        events: eventsCollector,
      },
    );

    expect(result.ok).toBe(true);
    expect(initialState.metadata.difficulty).toBe('hard');
    expect(initialState.metadata.economics).toEqual(custom.economics);
    expect(initialState.metadata.plantStress).toEqual(custom.plantStress);
    expect(initialState.metadata.deviceFailure).toEqual(custom.deviceFailure);
    expect(initialState.finances.cashOnHand).toBe(custom.economics.initialCapital);
  });
});
