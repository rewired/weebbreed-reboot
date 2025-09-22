import { beforeAll, describe, expect, it } from 'vitest';
import { DeviceDegradationService } from './deviceDegradation.js';
import type {
  DeviceInstanceState,
  GameState,
  ZoneEnvironmentState,
  ZoneMetricState,
  ZoneResourceState,
} from '@/state/models.js';
import { resolveRoomPurposeId } from '../roomPurposes/index.js';
import { loadTestRoomPurposes } from '../../testing/loadTestRoomPurposes.js';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';

const LAMBDA = 1e-5;
const EXPONENT = 0.9;
const MAINTENANCE_CAP = 0.98;
const MINUTES_PER_HOUR = 60;

interface DeviceOverrides extends Partial<Omit<DeviceInstanceState, 'maintenance' | 'settings'>> {
  maintenance?: Partial<DeviceInstanceState['maintenance']>;
  settings?: DeviceInstanceState['settings'];
}

const createDevice = (overrides: DeviceOverrides = {}): DeviceInstanceState => {
  const maintenanceOverrides = overrides.maintenance ?? {};
  return {
    id: overrides.id ?? 'device-1',
    blueprintId: overrides.blueprintId ?? 'device-blueprint',
    kind: overrides.kind ?? 'Lamp',
    name: overrides.name ?? 'Lamp 1',
    zoneId: overrides.zoneId ?? 'zone-1',
    status: overrides.status ?? 'operational',
    efficiency: overrides.efficiency ?? 0.95,
    runtimeHours: overrides.runtimeHours ?? 0,
    maintenance: {
      lastServiceTick: maintenanceOverrides.lastServiceTick ?? 0,
      nextDueTick: maintenanceOverrides.nextDueTick ?? 24,
      condition: maintenanceOverrides.condition ?? 0.95,
      runtimeHoursAtLastService: maintenanceOverrides.runtimeHoursAtLastService ?? 0,
      degradation: maintenanceOverrides.degradation ?? 0,
    },
    settings: overrides.settings ?? {},
  } satisfies DeviceInstanceState;
};

const createEnvironment = (): ZoneEnvironmentState => ({
  temperature: 24,
  relativeHumidity: 0.6,
  co2: 900,
  ppfd: 500,
  vpd: 1.2,
});

const createResources = (): ZoneResourceState => ({
  waterLiters: 500,
  nutrientSolutionLiters: 250,
  nutrientStrength: 1,
  substrateHealth: 1,
  reservoirLevel: 0.6,
});

const createMetrics = (environment: ZoneEnvironmentState): ZoneMetricState => ({
  averageTemperature: environment.temperature,
  averageHumidity: environment.relativeHumidity,
  averageCo2: environment.co2,
  averagePpfd: environment.ppfd,
  stressLevel: 0,
  lastUpdatedTick: 0,
});

const createBaseState = (): GameState => {
  const createdAt = '2025-01-01T00:00:00.000Z';
  return {
    metadata: {
      gameId: 'test-game',
      createdAt,
      seed: 'seed',
      difficulty: 'normal',
      simulationVersion: '0.1.0',
      tickLengthMinutes: MINUTES_PER_HOUR,
      economics: {
        initialCapital: 0,
        itemPriceMultiplier: 1,
        harvestPriceMultiplier: 1,
        rentPerSqmStructurePerTick: 0.2,
        rentPerSqmRoomPerTick: 0.3,
      },
    },
    clock: {
      tick: 0,
      isPaused: true,
      startedAt: createdAt,
      lastUpdatedAt: createdAt,
      targetTickRate: 1,
    },
    structures: [],
    inventory: {
      resources: {
        waterLiters: 500,
        nutrientsGrams: 250,
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
      cashOnHand: 1000,
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

const createStateWithDevice = (device: DeviceInstanceState): GameState => {
  const state = createBaseState();
  const environment = createEnvironment();
  state.structures = [
    {
      id: 'structure-1',
      blueprintId: 'structure-blueprint',
      name: 'Structure 1',
      status: 'active',
      footprint: { length: 10, width: 10, height: 4, area: 100, volume: 400 },
      rooms: [
        {
          id: 'room-1',
          structureId: 'structure-1',
          name: 'Room 1',
          purposeId: growRoomPurposeId,
          area: 100,
          height: 4,
          volume: 400,
          zones: [
            {
              id: 'zone-1',
              roomId: 'room-1',
              name: 'Zone 1',
              cultivationMethodId: 'method-1',
              strainId: undefined,
              area: 100,
              ceilingHeight: 4,
              volume: 400,
              environment,
              resources: createResources(),
              plants: [],
              devices: [device],
              metrics: createMetrics(environment),
              health: { plantHealth: {}, pendingTreatments: [], appliedTreatments: [] },
              activeTaskIds: [],
            },
          ],
          cleanliness: 1,
          maintenanceLevel: 1,
        },
      ],
      rentPerTick: 0,
      upfrontCostPaid: 0,
    },
  ];
  return state;
};

let growRoomPurposeId: string;
let repository: BlueprintRepository;

beforeAll(async () => {
  repository = await loadTestRoomPurposes();
  growRoomPurposeId = resolveRoomPurposeId(repository, 'Grow Room');
});

const computeWear = (runtimeHours: number): number => {
  if (runtimeHours <= 0) {
    return 0;
  }
  return LAMBDA * Math.pow(runtimeHours, EXPONENT);
};

describe('DeviceDegradationService', () => {
  it('increments runtime hours and applies the lambda curve to efficiency', () => {
    const device = createDevice();
    const state = createStateWithDevice(device);
    const service = new DeviceDegradationService();
    const baseEfficiency = Math.min(MAINTENANCE_CAP, device.maintenance.condition);

    service.process(state, 1, MINUTES_PER_HOUR);

    expect(device.runtimeHours).toBeCloseTo(1, 6);
    const wearAfterFirstTick = computeWear(1);
    expect(device.maintenance.degradation).toBeCloseTo(wearAfterFirstTick, 10);
    expect(device.efficiency).toBeCloseTo(baseEfficiency * (1 - wearAfterFirstTick), 10);

    service.process(state, 2, MINUTES_PER_HOUR);

    expect(device.runtimeHours).toBeCloseTo(2, 6);
    const wearAfterSecondTick = computeWear(2);
    expect(device.maintenance.degradation).toBeCloseTo(wearAfterSecondTick, 10);
    expect(device.efficiency).toBeCloseTo(baseEfficiency * (1 - wearAfterSecondTick), 10);
  });

  it('resets efficiency to the maintenance guardrail when serviced', () => {
    const device = createDevice({
      maintenance: { condition: 0.92 },
    });
    const state = createStateWithDevice(device);
    const service = new DeviceDegradationService();
    const baseEfficiency = Math.min(MAINTENANCE_CAP, device.maintenance.condition);

    service.process(state, 1, MINUTES_PER_HOUR);
    service.process(state, 2, MINUTES_PER_HOUR);

    device.status = 'maintenance';
    service.process(state, 3, MINUTES_PER_HOUR);

    expect(device.runtimeHours).toBeCloseTo(2, 6);
    expect(device.maintenance.runtimeHoursAtLastService).toBeCloseTo(2, 6);
    expect(device.maintenance.degradation).toBeCloseTo(0, 10);
    expect(device.efficiency).toBeCloseTo(baseEfficiency, 10);

    device.status = 'operational';
    service.process(state, 4, MINUTES_PER_HOUR);

    expect(device.runtimeHours).toBeCloseTo(3, 6);
    const runtimeSinceService = device.runtimeHours - device.maintenance.runtimeHoursAtLastService;
    const expectedWear = computeWear(runtimeSinceService);
    expect(runtimeSinceService).toBeCloseTo(1, 6);
    expect(device.maintenance.degradation).toBeCloseTo(expectedWear, 10);
    expect(device.efficiency).toBeCloseTo(baseEfficiency * (1 - expectedWear), 10);
  });

  it('persists degradation state for subsequent ticks', () => {
    const device = createDevice();
    const state = createStateWithDevice(device);
    const firstService = new DeviceDegradationService();

    firstService.process(state, 1, MINUTES_PER_HOUR);
    firstService.process(state, 2, MINUTES_PER_HOUR);

    const runtimeBefore = device.runtimeHours;
    expect(runtimeBefore).toBeCloseTo(2, 6);
    const wearBefore = computeWear(runtimeBefore);
    expect(device.maintenance.degradation).toBeCloseTo(wearBefore, 10);

    const secondService = new DeviceDegradationService();
    secondService.process(state, 3, MINUTES_PER_HOUR);

    expect(device.runtimeHours).toBeCloseTo(runtimeBefore + 1, 6);
    const runtimeSinceService = device.runtimeHours - device.maintenance.runtimeHoursAtLastService;
    const expectedWear = computeWear(runtimeSinceService);
    const baseEfficiency = Math.min(MAINTENANCE_CAP, device.maintenance.condition);
    expect(device.maintenance.degradation).toBeCloseTo(expectedWear, 10);
    expect(device.efficiency).toBeCloseTo(baseEfficiency * (1 - expectedWear), 10);
  });
});
