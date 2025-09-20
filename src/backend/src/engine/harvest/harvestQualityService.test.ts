import { describe, expect, it } from 'vitest';
import type { GameState, HarvestBatch } from '../../state/models.js';
import { HarvestQualityService } from './harvestQualityService.js';

const createBaseState = (harvest: HarvestBatch[], tickLengthMinutes = 60): GameState => {
  const createdAt = '2024-01-01T00:00:00.000Z';
  return {
    metadata: {
      gameId: 'game-1',
      createdAt,
      seed: 'seed',
      difficulty: 'easy',
      simulationVersion: '0.0.0',
      tickLengthMinutes,
      economics: {
        initialCapital: 0,
        itemPriceMultiplier: 1,
        harvestPriceMultiplier: 1,
        rentPerSqmStructurePerTick: 0,
        rentPerSqmRoomPerTick: 0,
      },
    },
    clock: {
      tick: 0,
      isPaused: false,
      startedAt: createdAt,
      lastUpdatedAt: createdAt,
      targetTickRate: 1,
    },
    structures: [],
    inventory: {
      resources: {
        waterLiters: 0,
        nutrientsGrams: 0,
        co2Kg: 0,
        substrateKg: 0,
        packagingUnits: 0,
        sparePartsValue: 0,
      },
      seeds: [],
      devices: [],
      harvest: [...harvest],
      consumables: {},
    },
    finances: {
      cashOnHand: 0,
      reservedCash: 0,
      outstandingLoans: [],
      ledger: [],
      summary: {
        totalRevenue: 0,
        totalExpenses: 0,
        totalPayroll: 0,
        totalMaintenance: 0,
        netIncome: 0,
        lastTickRevenue: 0,
        lastTickExpenses: 0,
      },
    },
    personnel: {
      employees: [],
      applicants: [],
      trainingPrograms: [],
      overallMorale: 0,
    },
    tasks: {
      backlog: [],
      active: [],
      completed: [],
      cancelled: [],
    },
    notes: [],
  } satisfies GameState;
};

describe('HarvestQualityService', () => {
  it('applies exponential decay after more than seven days without cooling', () => {
    const decayRate = 0.02;
    const initialQuality = 80;
    const batch: HarvestBatch = {
      id: 'batch-1',
      strainId: 'strain-1',
      weightGrams: 1200,
      quality: initialQuality,
      stage: 'fresh',
      harvestedAtTick: 0,
      decayRatePerHour: decayRate,
      cooling: { enabled: false },
    };
    const state = createBaseState([batch]);
    const service = new HarvestQualityService();

    const targetTick = 24 * 7 + 1; // Just over seven days of storage at one hour per tick.
    service.process(state, targetTick, state.metadata.tickLengthMinutes);

    const expectedQuality = initialQuality * Math.exp(-decayRate * targetTick);
    expect(state.inventory.harvest[0].quality).toBeCloseTo(expectedQuality, 6);
    expect(state.inventory.harvest[0].qualityUpdatedAtTick).toBe(targetTick);
  });

  it('halves the decay rate when cooling is enabled', () => {
    const decayRate = 0.02;
    const initialQuality = 80;
    const batch: HarvestBatch = {
      id: 'batch-2',
      strainId: 'strain-1',
      weightGrams: 900,
      quality: initialQuality,
      stage: 'fresh',
      harvestedAtTick: 0,
      decayRatePerHour: decayRate,
      cooling: { enabled: true, enabledAtTick: 0, temperatureC: 4 },
    };
    const state = createBaseState([batch]);
    const service = new HarvestQualityService();

    const targetTick = 24 * 7 + 1;
    service.process(state, targetTick, state.metadata.tickLengthMinutes);

    const expectedQuality = initialQuality * Math.exp(-(decayRate / 2) * targetTick);
    expect(state.inventory.harvest[0].quality).toBeCloseTo(expectedQuality, 6);
    expect(state.inventory.harvest[0].qualityUpdatedAtTick).toBe(targetTick);
  });
});
