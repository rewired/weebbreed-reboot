import { beforeEach, describe, expect, it } from 'vitest';
import { createEventCollector, type SimulationEvent } from '@/lib/eventBus.js';
import { RngService } from '@/lib/rng.js';
import { DeviceInstallationService } from './deviceInstallationService.js';
import {
  createBlueprintRepositoryStub,
  createDeviceBlueprint,
  createRoomPurpose,
} from '@/testing/fixtures.js';
import type { CommandExecutionContext } from '@/facade/index.js';
import type { GameState } from '@/state/types.js';

const ROOM_PURPOSE_ID = 'room-purpose-test';
const STRUCTURE_ID = 'structure-test';
const ROOM_ID = 'room-test';
const ZONE_ID = 'zone-test';
const DEVICE_BLUEPRINT_ID = 'device-blueprint-test';

const createGameState = (): GameState => {
  const createdAt = new Date(0).toISOString();
  return {
    metadata: {
      gameId: 'game-test',
      createdAt,
      seed: 'seed-test',
      difficulty: 'normal',
      simulationVersion: '1.0.0-test',
      tickLengthMinutes: 30,
      economics: {
        initialCapital: 1_000_000,
        itemPriceMultiplier: 1,
        harvestPriceMultiplier: 1,
        rentPerSqmStructurePerTick: 0.1,
        rentPerSqmRoomPerTick: 0.2,
      },
    },
    clock: {
      tick: 0,
      isPaused: true,
      startedAt: createdAt,
      lastUpdatedAt: createdAt,
      targetTickRate: 1,
    },
    structures: [
      {
        id: STRUCTURE_ID,
        blueprintId: 'structure-blueprint-test',
        name: 'Test Structure',
        status: 'active',
        footprint: { length: 10, width: 6, height: 3, area: 60, volume: 180 },
        rooms: [
          {
            id: ROOM_ID,
            structureId: STRUCTURE_ID,
            name: 'Test Room',
            purposeId: ROOM_PURPOSE_ID,
            area: 60,
            height: 3,
            volume: 180,
            cleanliness: 1,
            maintenanceLevel: 1,
            zones: [
              {
                id: ZONE_ID,
                roomId: ROOM_ID,
                name: 'Zone Test',
                cultivationMethodId: 'method-test',
                strainId: 'strain-test',
                area: 30,
                ceilingHeight: 3,
                volume: 90,
                environment: {
                  temperature: 22,
                  relativeHumidity: 0.55,
                  co2: 800,
                  ppfd: 0,
                  vpd: 1.1,
                },
                resources: {
                  waterLiters: 100,
                  nutrientSolutionLiters: 50,
                  nutrientStrength: 1,
                  substrateHealth: 1,
                  reservoirLevel: 0.5,
                  lastTranspirationLiters: 0,
                },
                plants: [],
                devices: [],
                metrics: {
                  averageTemperature: 22,
                  averageHumidity: 0.55,
                  averageCo2: 800,
                  averagePpfd: 0,
                  stressLevel: 0,
                  lastUpdatedTick: 0,
                },
                control: { setpoints: {} },
                health: { plantHealth: {}, pendingTreatments: [], appliedTreatments: [] },
                activeTaskIds: [],
              },
            ],
          },
        ],
        rentPerTick: 0,
        upfrontCostPaid: 0,
      },
    ],
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
        pricePerKwh: 0.1,
        pricePerLiterWater: 0.01,
        pricePerGramNutrients: 0.05,
      },
    },
    personnel: { employees: [], applicants: [], trainingPrograms: [], overallMorale: 1 },
    tasks: { backlog: [], active: [], completed: [], cancelled: [] },
    notes: [],
  } satisfies GameState;
};

describe('DeviceInstallationService', () => {
  let state: GameState;
  let service: DeviceInstallationService;

  beforeEach(() => {
    state = createGameState();
    const repository = createBlueprintRepositoryStub({
      devices: [
        createDeviceBlueprint({
          id: DEVICE_BLUEPRINT_ID,
          kind: 'Lamp',
          roomPurposes: ['growroom'],
          settings: { power: 0.6, ppfd: 600 },
        }),
      ],
      roomPurposes: [
        createRoomPurpose({ id: ROOM_PURPOSE_ID, kind: 'growroom', name: 'Grow Room' }),
      ],
    });
    const rng = new RngService('device-installation-tests');
    service = new DeviceInstallationService({ state, rng, repository });
  });

  it('returns success even when the command context lacks an event collector', () => {
    const context = {
      command: 'devices.installDevice',
      state,
      clock: state.clock,
      tick: state.clock.tick,
    } as unknown as CommandExecutionContext;

    const result = service.installDevice(ZONE_ID, DEVICE_BLUEPRINT_ID, undefined, context);

    expect(result.ok).toBe(true);
    const devices = state.structures[0]?.rooms[0]?.zones[0]?.devices ?? [];
    expect(devices.length).toBe(1);
  });

  it('queues a telemetry event when an event collector is provided', () => {
    const events: SimulationEvent[] = [];
    const collector = createEventCollector(events, state.clock.tick);

    const context: CommandExecutionContext = {
      command: 'devices.installDevice',
      state,
      clock: state.clock,
      tick: state.clock.tick,
      events: collector,
    };

    const result = service.installDevice(ZONE_ID, DEVICE_BLUEPRINT_ID, undefined, context);

    expect(result.ok).toBe(true);
    expect(events.length).toBe(1);
    expect(events[0]).toMatchObject({
      type: 'device.installed',
      payload: {
        zoneId: ZONE_ID,
        blueprintId: DEVICE_BLUEPRINT_ID,
      },
      level: 'info',
    });
  });
});
