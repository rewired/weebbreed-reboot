import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ZoneEnvironmentService } from './zoneEnvironment.js';
import { resolveRoomPurposeId } from '../roomPurposes/index.js';
import { loadTestRoomPurposes } from '@/testing/loadTestRoomPurposes.js';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import { ClimateController } from './climateController.js';
import { AMBIENT_CO2_PPM, AMBIENT_HUMIDITY_RH, AMBIENT_TEMP_C } from '@/constants/environment.js';
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
} from '@/state/models.js';

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
let repository: BlueprintRepository;

beforeAll(async () => {
  repository = await loadTestRoomPurposes();
  growRoomPurposeId = resolveRoomPurposeId(repository, 'Grow Room');
});

afterEach(() => {
  vi.restoreAllMocks();
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
  area: 40,
  ceilingHeight: 3,
  volume: 120,
  environment,
  resources: createResources(),
  plants: [],
  devices,
  metrics: createMetrics(environment),
  control: { setpoints: {} },
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
  it('uses ventilation airflow to accelerate normalization', () => {
    const ventilationDevice = createDevice(
      'vent-1',
      'Ventilation',
      { power: 0.05, airflow: 170 },
      0.8,
    );
    const ventilatedEnvironment = createEnvironment({
      temperature: 30,
      relativeHumidity: 0.8,
      co2: 1100,
    });
    const ventilationZone = createZone([ventilationDevice], ventilatedEnvironment);
    ventilationZone.id = 'zone-vent';
    ventilationZone.roomId = 'room-vent';
    ventilationZone.name = 'Ventilated Zone';
    ventilationZone.devices.forEach((device) => {
      device.zoneId = ventilationZone.id;
    });
    const ventilationRoom = createRoom(ventilationZone);
    ventilationRoom.id = 'room-vent';
    ventilationRoom.zones = [ventilationZone];
    const ventilationStructure = createStructure(ventilationRoom);
    ventilationStructure.id = 'structure-vent';
    ventilationStructure.rooms = [ventilationRoom];
    const ventilationState = createGameState(ventilationStructure);

    const baselineEnvironment = createEnvironment({
      temperature: 30,
      relativeHumidity: 0.8,
      co2: 1100,
    });
    const baselineZone = createZone([], baselineEnvironment);
    baselineZone.id = 'zone-base';
    baselineZone.roomId = 'room-base';
    baselineZone.name = 'Baseline Zone';
    const baselineRoom = createRoom(baselineZone);
    baselineRoom.id = 'room-base';
    baselineRoom.zones = [baselineZone];
    const baselineStructure = createStructure(baselineRoom);
    baselineStructure.id = 'structure-base';
    baselineStructure.rooms = [baselineRoom];
    const baselineState = createGameState(baselineStructure);

    const ventilationService = new ZoneEnvironmentService();
    const baselineService = new ZoneEnvironmentService();

    ventilationService.applyDeviceDeltas(ventilationState, 15, undefined);
    baselineService.applyDeviceDeltas(baselineState, 15, undefined);

    const ventilationAirflow =
      (
        ventilationService as unknown as { deviceEffects: Map<string, { airflow: number }> }
      ).deviceEffects.get(ventilationZone.id)?.airflow ?? 0;
    const baselineAirflow =
      (
        baselineService as unknown as { deviceEffects: Map<string, { airflow: number }> }
      ).deviceEffects.get(baselineZone.id)?.airflow ?? 0;

    expect(ventilationAirflow).toBeGreaterThan(0);
    expect(baselineAirflow).toBe(0);

    ventilationService.normalize(ventilationState, 15);
    baselineService.normalize(baselineState, 15);

    const ventilationTempDiff = Math.abs(ventilationZone.environment.temperature - AMBIENT_TEMP_C);
    const baselineTempDiff = Math.abs(baselineZone.environment.temperature - AMBIENT_TEMP_C);
    expect(ventilationTempDiff).toBeLessThan(baselineTempDiff);

    const ventilationHumidityDiff = Math.abs(
      ventilationZone.environment.relativeHumidity - AMBIENT_HUMIDITY_RH,
    );
    const baselineHumidityDiff = Math.abs(
      baselineZone.environment.relativeHumidity - AMBIENT_HUMIDITY_RH,
    );
    expect(ventilationHumidityDiff).toBeLessThan(baselineHumidityDiff);

    const ventilationCo2Diff = Math.abs(ventilationZone.environment.co2 - AMBIENT_CO2_PPM);
    const baselineCo2Diff = Math.abs(baselineZone.environment.co2 - AMBIENT_CO2_PPM);
    expect(ventilationCo2Diff).toBeLessThan(baselineCo2Diff);
  });

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

    service.applyDeviceDeltas(state, 15, undefined);

    expect(zone.environment.temperature).toBeCloseTo(25.5, 2);
    expect(zone.environment.ppfd).toBeCloseTo(21.6, 4);
    expect(zone.environment.co2).toBeCloseTo(1100, 5);

    service.normalize(state, 15);

    expect(zone.environment.temperature).toBeCloseTo(24.51, 2);
    expect(zone.environment.relativeHumidity).toBeCloseTo(0.63, 2);
    expect(zone.environment.co2).toBeCloseTo(900, 0);
    expect(zone.environment.ppfd).toBeCloseTo(21.6, 4);
  });

  it('raises humidity toward the setpoint without exceeding the safety clamp', () => {
    const environment = createEnvironment({ relativeHumidity: 0.4 });
    const devices: DeviceInstanceState[] = [
      createDevice(
        'humidity-1',
        'HumidityControlUnit',
        {
          power: 0.4,
          targetHumidity: 0.65,
          hysteresis: 0.05,
          humidifyRateKgPerTick: 0.12,
          dehumidifyRateKgPerTick: 0.08,
        },
        0.85,
      ),
    ];

    const zone = createZone(devices, environment);
    zone.control.setpoints.humidity = 0.65;
    const room = createRoom(zone);
    const structure = createStructure(room);
    const state = createGameState(structure);
    const service = new ZoneEnvironmentService();

    service.applyDeviceDeltas(state, 15, undefined);

    expect(zone.environment.relativeHumidity).toBeGreaterThan(0.4);
    expect(zone.environment.relativeHumidity).toBeLessThanOrEqual(1);
  });

  it('reduces humidity toward the setpoint without dropping below zero', () => {
    const environment = createEnvironment({ relativeHumidity: 0.92 });
    const devices: DeviceInstanceState[] = [
      createDevice(
        'humidity-1',
        'HumidityControlUnit',
        {
          power: 0.45,
          targetHumidity: 0.55,
          hysteresis: 0.05,
          humidifyRateKgPerTick: 0.08,
          dehumidifyRateKgPerTick: 0.15,
        },
        0.8,
      ),
    ];

    const zone = createZone(devices, environment);
    zone.control.setpoints.humidity = 0.55;
    const room = createRoom(zone);
    const structure = createStructure(room);
    const state = createGameState(structure);
    const service = new ZoneEnvironmentService();

    service.applyDeviceDeltas(state, 15, undefined);

    expect(zone.environment.relativeHumidity).toBeLessThan(0.92);
    expect(zone.environment.relativeHumidity).toBeGreaterThanOrEqual(0);
  });

  it('resets PPFD based on device contributions each tick', () => {
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
    ];

    const zone = createZone(devices, environment);
    const room = createRoom(zone);
    const structure = createStructure(room);
    const state = createGameState(structure);
    const service = new ZoneEnvironmentService();

    service.applyDeviceDeltas(state, 15, undefined);
    const firstTickPpfd = zone.environment.ppfd;

    service.normalize(state, 15);
    service.applyDeviceDeltas(state, 15, undefined);
    const secondTickPpfd = zone.environment.ppfd;

    expect(firstTickPpfd).toBeCloseTo(21.6, 4);
    expect(secondTickPpfd).toBeCloseTo(firstTickPpfd, 6);
  });

  it('prefers zone control setpoints when resolving climate targets', () => {
    const environment = createEnvironment();
    const devices: DeviceInstanceState[] = [
      createDevice('lamp-1', 'Lamp', { power: 0.6, coverageArea: 1.2, ppfd: 800 }, 0.9),
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
      createDevice('humidity-1', 'HumidityControlUnit', { targetHumidity: 0.6 }),
      createDevice('co2-1', 'CO2Injector', {
        targetCO2: 1100,
        targetCO2Range: [400, 1500],
        hysteresis: 50,
      }),
    ];

    const zone = createZone(devices, environment);
    zone.control.setpoints.temperature = 20;
    zone.control.setpoints.humidity = 0.45;
    zone.control.setpoints.co2 = 950;
    const room = createRoom(zone);
    const structure = createStructure(room);
    const state = createGameState(structure);
    const service = new ZoneEnvironmentService();

    const updateSpy = vi.spyOn(ClimateController.prototype, 'update');

    service.applyDeviceDeltas(state, 15, undefined);

    expect(updateSpy).toHaveBeenCalled();
    const [setpoints] = updateSpy.mock.calls[0] ?? [];
    expect(setpoints).toEqual({ temperature: 20, humidity: 0.45, co2: 950 });
  });

  it('throws when zone area exceeds the enclosing room capacity', () => {
    const environment = createEnvironment();
    const devices: DeviceInstanceState[] = [];
    const zone = createZone(devices, environment);
    zone.area = 80;
    zone.volume = zone.area * zone.ceilingHeight;
    const room = createRoom(zone);
    const structure = createStructure(room);
    const state = createGameState(structure);
    const service = new ZoneEnvironmentService();

    expect(() => service.applyDeviceDeltas(state, 15, undefined)).toThrow(/zone areas/i);
  });

  it('throws when zone ceiling height exceeds the room height', () => {
    const environment = createEnvironment();
    const zone = createZone([], environment);
    zone.ceilingHeight = 5;
    zone.volume = zone.area * zone.ceilingHeight;
    const room = createRoom(zone);
    const structure = createStructure(room);
    const state = createGameState(structure);
    const service = new ZoneEnvironmentService();

    expect(() => service.applyDeviceDeltas(state, 15, undefined)).toThrow(/ceiling height/i);
  });
});
