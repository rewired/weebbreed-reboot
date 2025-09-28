import { beforeEach, describe, expect, it } from 'vitest';
import { createEventCollector, type SimulationEvent } from '@/lib/eventBus.js';
import { DeviceRemovalService } from './deviceRemovalService.js';
import type { CommandExecutionContext } from '@/facade/index.js';
import type { DeviceInstanceState, GameState } from '@/state/models.js';
import { DEFAULT_MAINTENANCE_INTERVAL_TICKS } from '@/constants/world.js';

const STRUCTURE_ID = 'structure-test';
const ROOM_ID = 'room-test';
const ZONE_ID = 'zone-test';

const createDevice = (overrides: Partial<DeviceInstanceState>): DeviceInstanceState => ({
  id: overrides.id ?? 'device-test',
  blueprintId: overrides.blueprintId ?? 'blueprint-test',
  kind: overrides.kind ?? 'Lamp',
  name: overrides.name ?? 'Test Device',
  zoneId: overrides.zoneId ?? ZONE_ID,
  status: overrides.status ?? 'operational',
  efficiency: overrides.efficiency ?? 0.95,
  runtimeHours: overrides.runtimeHours ?? 0,
  maintenance: {
    lastServiceTick: overrides.maintenance?.lastServiceTick ?? 0,
    nextDueTick: overrides.maintenance?.nextDueTick ?? DEFAULT_MAINTENANCE_INTERVAL_TICKS,
    condition: overrides.maintenance?.condition ?? 1,
    runtimeHoursAtLastService: overrides.maintenance?.runtimeHoursAtLastService ?? 0,
    degradation: overrides.maintenance?.degradation ?? 0,
  },
  settings: { ...(overrides.settings ?? {}) },
});

const createGameState = (devices: DeviceInstanceState[]): GameState => {
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
            purposeId: 'room-purpose-test',
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
                devices: [...devices],
                metrics: {
                  averageTemperature: 22,
                  averageHumidity: 0.55,
                  averageCo2: 800,
                  averagePpfd: 0,
                  stressLevel: 0,
                  lastUpdatedTick: 0,
                },
                control: {
                  setpoints: {
                    temperature: 24,
                    humidity: 0.6,
                    co2: 900,
                    ppfd: 300,
                    vpd: 1.2,
                  },
                },
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

describe('DeviceRemovalService', () => {
  let state: GameState;
  let service: DeviceRemovalService;

  beforeEach(() => {
    state = createGameState([
      createDevice({ id: 'device-lamp', kind: 'Lamp' }),
      createDevice({ id: 'device-hvac', kind: 'ClimateUnit' }),
      createDevice({ id: 'device-humidity', kind: 'HumidityControlUnit' }),
      createDevice({ id: 'device-co2', kind: 'CO2Injector' }),
    ]);
    service = new DeviceRemovalService({ state });
  });

  it('removes a device, clears unsupported setpoints, and emits telemetry warnings', () => {
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    zone.control.setpoints = {
      temperature: 24,
      humidity: 0.6,
      co2: 900,
      ppfd: 300,
      vpd: 1.2,
    };

    const events: SimulationEvent[] = [];
    const collector = createEventCollector(events, state.clock.tick);
    const context: CommandExecutionContext = {
      command: 'devices.removeDevice',
      state,
      clock: state.clock,
      tick: state.clock.tick,
      events: collector,
    };

    const result = service.removeDevice('device-humidity', context);

    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([
      'Cleared humidity setpoint because the zone no longer has humidity control devices.',
      'Cleared VPD setpoint because the zone no longer has humidity control devices.',
    ]);
    expect(zone.devices.some((device) => device.id === 'device-humidity')).toBe(false);
    expect(zone.control.setpoints.humidity).toBeUndefined();
    expect(zone.control.setpoints.vpd).toBeUndefined();
    expect(zone.control.setpoints.temperature).toBe(24);
    expect(zone.control.setpoints.co2).toBe(900);
    expect(zone.control.setpoints.ppfd).toBe(300);

    const removalEvent = events.find((event) => event.type === 'device.removed');
    expect(removalEvent).toBeDefined();
    expect(removalEvent?.payload).toMatchObject({
      zoneId: ZONE_ID,
      deviceId: 'device-humidity',
      warnings: result.warnings,
    });
  });

  it('returns a failure when the device cannot be found', () => {
    const context = {
      command: 'devices.removeDevice',
      state,
      clock: state.clock,
      tick: state.clock.tick,
      events: createEventCollector([], state.clock.tick),
    } satisfies CommandExecutionContext;

    const result = service.removeDevice('missing-device', context);

    expect(result.ok).toBe(false);
    expect(result.errors?.[0]?.code).toBe('ERR_NOT_FOUND');
  });

  it('removes lighting without an event collector and leaves other setpoints intact', () => {
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    zone.control.setpoints = {
      temperature: 24,
      humidity: 0.6,
      co2: 900,
      ppfd: 320,
      vpd: 1.2,
    };

    const context = {
      command: 'devices.removeDevice',
      state,
      clock: state.clock,
      tick: state.clock.tick,
    } as unknown as CommandExecutionContext;

    const result = service.removeDevice('device-lamp', context);

    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([
      'Cleared PPFD setpoint because the zone no longer has lighting devices.',
    ]);
    expect(zone.control.setpoints.ppfd).toBeUndefined();
    expect(zone.control.setpoints.temperature).toBe(24);
    expect(zone.control.setpoints.humidity).toBe(0.6);
    expect(zone.control.setpoints.co2).toBe(900);
    expect(zone.control.setpoints.vpd).toBe(1.2);
  });
});
