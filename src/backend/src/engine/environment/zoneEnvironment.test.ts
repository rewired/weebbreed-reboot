import { beforeAll, describe, expect, it } from 'vitest';
import { ZoneEnvironmentService } from './zoneEnvironment.js';
import { resolvePurposeIdByName } from '../roomPurposeRegistry.js';
import { loadTestRoomPurposes } from '../../testing/loadTestRoomPurposes.js';
import type {
  DeviceInstanceState,
  FootprintDimensions,
  GameState,
  RoomState,
  StructureState,
  ZoneEnvironmentState,
  ZoneHealthState,
  ZoneMetricState,
  ZoneResourceState,
  ZoneState,
} from '../../state/models.js';

const createEnvironment = (
  overrides: Partial<ZoneEnvironmentState> = {},
): ZoneEnvironmentState => ({
  temperature: 25,
  relativeHumidity: 0.65,
  co2: 800,
  ppfd: 0,
  vpd: 1,
  ...overrides,
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
  stressLevel: 0.2,
  lastUpdatedTick: 0,
});

const createHealth = (): ZoneHealthState => ({
  plantHealth: {},
  pendingTreatments: [],
  appliedTreatments: [],
});

let growRoomPurposeId: string;

beforeAll(async () => {
  await loadTestRoomPurposes();
  growRoomPurposeId = resolvePurposeIdByName('Grow Room');
});

const createDevice = (
  id: string,
  kind: string,
  settings: Record<string, unknown>,
  efficiency = 1,
): DeviceInstanceState => ({
  id,
  blueprintId: `${kind}-blueprint`,
  kind,
  name: `${kind} Device`,
  zoneId: 'zone-1',
  status: 'operational',
  efficiency,
  runtimeHours: 0,
  maintenance: {
    lastServiceTick: 0,
    nextDueTick: 2000,
    condition: 1,
    runtimeHoursAtLastService: 0,
    degradation: 0,
  },
  settings,
});

const createZone = (
  devices: DeviceInstanceState[],
  environment: ZoneEnvironmentState,
): ZoneState => ({
  id: 'zone-1',
  roomId: 'room-1',
  name: 'Zone 1',
  cultivationMethodId: 'method-1',
  strainId: 'strain-1',
  environment,
  resources: createResources(),
  plants: [],
  devices,
  metrics: createMetrics(environment),
  health: createHealth(),
  activeTaskIds: [],
});

const createRoom = (zone: ZoneState): RoomState => ({
  id: 'room-1',
  structureId: 'structure-1',
  name: 'Grow Room',
  purposeId: growRoomPurposeId,
  area: 40,
  height: 3,
  volume: 120,
  zones: [zone],
  cleanliness: 0.9,
  maintenanceLevel: 0.9,
});

const createFootprint = (): FootprintDimensions => ({
  length: 10,
  width: 4,
  height: 3,
  area: 40,
  volume: 120,
});

const createStructure = (room: RoomState): StructureState => ({
  id: 'structure-1',
  blueprintId: 'structure-blueprint',
  name: 'Structure One',
  status: 'active',
  footprint: createFootprint(),
  rooms: [room],
  rentPerTick: 0,
  upfrontCostPaid: 0,
});

const createGameState = (structure: StructureState): GameState => {
  const createdAt = '2024-01-01T00:00:00.000Z';
  return {
    metadata: {
      gameId: 'game-1',
      createdAt,
      seed: 'seed',
      difficulty: 'easy',
      simulationVersion: '0.0.0',
      tickLengthMinutes: 15,
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
      isPaused: true,
      startedAt: createdAt,
      lastUpdatedAt: createdAt,
      targetTickRate: 1,
    },
    structures: [structure],
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
  };
};

describe('ZoneEnvironmentService', () => {
  it('applies device deltas and normalization per tick', () => {
    const environment = createEnvironment();
    const devices: DeviceInstanceState[] = [
      createDevice(
        'lamp-1',
        'Lamp',
        {
          power: 0.6,
          heatFraction: 0.3,
          coverageArea: 1.2,
          ppfd: 800,
        },
        0.9,
      ),
      createDevice(
        'hvac-1',
        'ClimateUnit',
        {
          coolingCapacity: 1.6,
          airflow: 350,
          targetTemperature: 24,
          targetTemperatureRange: [23, 25],
          fullPowerAtDeltaK: 2,
        },
        0.9,
      ),
      createDevice('co2-1', 'CO2Injector', {
        targetCO2: 1100,
        targetCO2Range: [400, 1500],
        hysteresis: 50,
        pulsePpmPerTick: 150,
      }),
    ];

    const zone = createZone(devices, environment);
    const room = createRoom(zone);
    const structure = createStructure(room);
    const state = createGameState(structure);

    const service = new ZoneEnvironmentService();

    service.applyDeviceDeltas(state, 15);

    expect(zone.environment.temperature).toBeCloseTo(25.25, 2);
    expect(zone.environment.ppfd).toBeCloseTo(21.6, 4);
    expect(zone.environment.co2).toBeCloseTo(1100, 5);

    service.normalize(state, 15);

    expect(zone.environment.temperature).toBeCloseTo(24.28, 2);
    expect(zone.environment.relativeHumidity).toBeCloseTo(0.63, 2);
    expect(zone.environment.co2).toBeCloseTo(890, 0);
    expect(zone.environment.ppfd).toBeCloseTo(21.6, 4);
  });
});
