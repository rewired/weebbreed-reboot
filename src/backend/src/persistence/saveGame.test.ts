import { describe, expect, it } from 'vitest';
import { RngService } from '../lib/rng.js';
import type { GameState } from '../state/models.js';
import {
  DEFAULT_SAVEGAME_VERSION,
  SAVEGAME_KIND,
  deserializeGameState,
  serializeGameState,
} from './saveGame.js';

const createMinimalState = (): GameState => {
  const createdAt = new Date('2024-01-01T00:00:00.000Z').toISOString();
  return {
    metadata: {
      gameId: 'game-1',
      createdAt,
      seed: 'seed-123',
      difficulty: 'easy',
      simulationVersion: '0.0.1',
      tickLengthMinutes: 60,
      economics: {
        initialCapital: 1_000_000,
        itemPriceMultiplier: 1,
        harvestPriceMultiplier: 1,
        rentPerSqmStructurePerTick: 0.1,
        rentPerSqmRoomPerTick: 0.1,
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
      harvest: [],
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

describe('saveGame persistence', () => {
  it('round-trips a game state with rng offsets intact', () => {
    const state = createMinimalState();
    const rng = new RngService(state.metadata.seed);
    const stream = rng.getStream('sim.test');
    stream.next();
    stream.nextBoolean();

    const serialized = serializeGameState(state, rng, {
      version: DEFAULT_SAVEGAME_VERSION,
      createdAt: '2024-01-01T00:00:00.000Z',
    });

    expect(serialized.header.kind).toBe(SAVEGAME_KIND);
    expect(serialized.rng.streams['sim.test']).toBe(2);

    const plain = JSON.parse(JSON.stringify(serialized));
    const result = deserializeGameState(plain);

    expect(result.state).toEqual(state);
    expect(result.rng.serialize()).toEqual(serialized.rng);
    expect(result.rng.getStream('sim.test').getOffset()).toBe(2);
  });

  it('migrates legacy save envelopes without headers', () => {
    const state = createMinimalState();
    const rng = new RngService(state.metadata.seed);
    const legacyEnvelope = {
      kind: SAVEGAME_KIND,
      version: '0.1.0',
      createdAt: '2023-12-31T00:00:00.000Z',
      tickLengthMinutes: state.metadata.tickLengthMinutes,
      rngSeed: state.metadata.seed,
      rng: rng.serialize(),
      state,
    };

    const result = deserializeGameState(JSON.parse(JSON.stringify(legacyEnvelope)));
    expect(result.state).toEqual(state);
    expect(result.rng.serialize()).toEqual(legacyEnvelope.rng);
  });

  it('rejects savegames with mismatched kind', () => {
    const state = createMinimalState();
    const rng = new RngService(state.metadata.seed);
    const invalid = {
      kind: 'OtherKind',
      version: '0.1.0',
      createdAt: '2023-12-31T00:00:00.000Z',
      tickLengthMinutes: state.metadata.tickLengthMinutes,
      rngSeed: state.metadata.seed,
      rng: rng.serialize(),
      state,
    };

    expect(() => deserializeGameState(invalid)).toThrow();
  });
});
