import { describe, expect, it } from 'vitest';
import { RngService, RNG_STREAM_IDS } from '@/lib/rng.js';
import type { GameState } from '@/state/types.js';
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
      utilityPrices: {
        pricePerKwh: 0.12,
        pricePerLiterWater: 0.015,
        pricePerGramNutrients: 0.045,
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
    const stream = rng.getStream(RNG_STREAM_IDS.simulationTest);
    stream.next();
    stream.nextBoolean();

    const serialized = serializeGameState(state, rng, {
      version: DEFAULT_SAVEGAME_VERSION,
      createdAt: '2024-01-01T00:00:00.000Z',
    });

    expect(serialized.header.kind).toBe(SAVEGAME_KIND);
    expect(serialized.rng.streams[RNG_STREAM_IDS.simulationTest]).toBe(2);

    const plain = JSON.parse(JSON.stringify(serialized));
    const result = deserializeGameState(plain);

    expect(result.state).toEqual(state);
    expect(result.rng.serialize()).toEqual(serialized.rng);
    expect(result.rng.getStream(RNG_STREAM_IDS.simulationTest).getOffset()).toBe(2);
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

  it('backfills missing zone control state when migrating legacy saves', () => {
    const baseState = createMinimalState();

    const zoneWithoutControl = {
      id: 'zone-1',
      roomId: 'room-1',
      name: 'Zone 1',
      cultivationMethodId: 'cult-1',
      area: 10,
      ceilingHeight: 3,
      volume: 30,
      environment: {
        temperature: 25,
        relativeHumidity: 0.6,
        co2: 800,
        ppfd: 500,
        vpd: 1.1,
      },
      resources: {
        waterLiters: 10,
        nutrientSolutionLiters: 5,
        nutrientStrength: 1,
        substrateHealth: 1,
        reservoirLevel: 5,
        lastTranspirationLiters: 0,
      },
      plants: [],
      devices: [],
      metrics: {
        averageTemperature: 25,
        averageHumidity: 0.6,
        averageCo2: 800,
        averagePpfd: 500,
        stressLevel: 0,
        lastUpdatedTick: 0,
      },
      health: {
        plantHealth: {},
        pendingTreatments: [],
        appliedTreatments: [],
      },
      activeTaskIds: [],
    };

    const legacyState = {
      ...baseState,
      structures: [
        {
          id: 'structure-1',
          blueprintId: 'blueprint-1',
          name: 'Structure 1',
          status: 'active',
          footprint: {
            length: 10,
            width: 10,
            height: 3,
            area: 100,
            volume: 300,
          },
          rooms: [
            {
              id: 'room-1',
              structureId: 'structure-1',
              name: 'Room 1',
              purposeId: '00000000-0000-0000-0000-000000000000',
              area: 100,
              height: 3,
              volume: 300,
              zones: [zoneWithoutControl],
              cleanliness: 1,
              maintenanceLevel: 1,
            },
          ],
          rentPerTick: 0,
          upfrontCostPaid: 0,
        },
      ],
    } as unknown as GameState;

    const rng = new RngService(legacyState.metadata.seed);
    const legacyEnvelope = {
      kind: SAVEGAME_KIND,
      version: '0.1.0',
      createdAt: '2023-12-31T00:00:00.000Z',
      tickLengthMinutes: legacyState.metadata.tickLengthMinutes,
      rngSeed: legacyState.metadata.seed,
      rng: rng.serialize(),
      state: legacyState,
    };

    const result = deserializeGameState(JSON.parse(JSON.stringify(legacyEnvelope)));
    const migratedZone = result.state.structures[0].rooms[0].zones[0];

    expect(migratedZone.control).toEqual({ setpoints: {} });
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

  it('persists difficulty modifier metadata alongside the envelope', () => {
    const state = createMinimalState();
    state.metadata.plantStress = {
      optimalRangeMultiplier: 1.15,
      stressAccumulationMultiplier: 0.85,
    };
    state.metadata.deviceFailure = { mtbfMultiplier: 1.25 };

    const rng = new RngService(state.metadata.seed);

    const serialized = serializeGameState(state, rng, {
      version: DEFAULT_SAVEGAME_VERSION,
      createdAt: '2024-01-02T00:00:00.000Z',
    });

    expect(serialized.metadata.plantStress).toEqual(state.metadata.plantStress);
    expect(serialized.metadata.deviceFailure).toEqual(state.metadata.deviceFailure);

    const roundTrip = deserializeGameState(JSON.parse(JSON.stringify(serialized)));
    expect(roundTrip.state.metadata.plantStress).toEqual(state.metadata.plantStress);
    expect(roundTrip.state.metadata.deviceFailure).toEqual(state.metadata.deviceFailure);
  });
});
