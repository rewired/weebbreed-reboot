import { afterEach, describe, expect, it, vi } from 'vitest';
import { SimulationFacade } from './index.js';
import { DEFAULT_MAINTENANCE_INTERVAL_TICKS } from '@/constants/world.js';
import {
  MIN_ZONE_TEMPERATURE_SETPOINT_C,
  MAX_ZONE_TEMPERATURE_SETPOINT_C,
  MIN_ZONE_HUMIDITY_SETPOINT,
  MAX_ZONE_HUMIDITY_SETPOINT,
  MIN_ZONE_CO2_SETPOINT_PPM,
  MAX_ZONE_CO2_SETPOINT_PPM,
  MIN_ZONE_PPFD_SETPOINT,
  MAX_ZONE_PPFD_SETPOINT,
  MIN_ZONE_VPD_SETPOINT_KPA,
  MAX_ZONE_VPD_SETPOINT_KPA,
} from '@/constants/environment.js';
import type { GameState } from '@/state/types.js';
import type { SimulationEvent } from '@/lib/eventBus.js';
import { EventBus } from '@/lib/eventBus.js';
import type { SimulationLoop } from '@/sim/loop.js';
import { saturationVaporPressure } from '@/engine/physio/vpd.js';

const createTestState = (): GameState => ({
  metadata: {
    gameId: 'game-1',
    createdAt: new Date(0).toISOString(),
    seed: 'seed-1',
    difficulty: 'normal',
    simulationVersion: '1.0.0',
    tickLengthMinutes: 60,
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
    startedAt: new Date(0).toISOString(),
    lastUpdatedAt: new Date(0).toISOString(),
    targetTickRate: 1,
  },
  structures: [
    {
      id: 'structure-1',
      blueprintId: 'structure-blueprint',
      name: 'Alpha',
      status: 'active',
      footprint: { length: 10, width: 10, height: 4, area: 100, volume: 400 },
      rooms: [
        {
          id: 'room-1',
          structureId: 'structure-1',
          name: 'Grow Room',
          purposeId: 'grow-room',
          area: 100,
          height: 4,
          volume: 400,
          cleanliness: 0.9,
          maintenanceLevel: 0.9,
          zones: [
            {
              id: 'zone-1',
              roomId: 'room-1',
              name: 'Zone 1',
              cultivationMethodId: 'method-1',
              strainId: 'strain-1',
              area: 80,
              ceilingHeight: 4,
              volume: 320,
              environment: {
                temperature: 24,
                relativeHumidity: 0.6,
                co2: 900,
                ppfd: 500,
                vpd: 1.2,
              },
              resources: {
                waterLiters: 500,
                nutrientSolutionLiters: 250,
                nutrientStrength: 1,
                substrateHealth: 1,
                reservoirLevel: 0.75,
                lastTranspirationLiters: 0,
              },
              plants: [],
              devices: [
                {
                  id: 'lamp-1',
                  blueprintId: 'lamp-blueprint',
                  kind: 'Lamp',
                  name: 'Primary Lamp',
                  zoneId: 'zone-1',
                  status: 'operational',
                  efficiency: 0.95,
                  runtimeHours: 0,
                  maintenance: {
                    lastServiceTick: 0,
                    nextDueTick: DEFAULT_MAINTENANCE_INTERVAL_TICKS,
                    condition: 1,
                    runtimeHoursAtLastService: 0,
                    degradation: 0,
                  },
                  settings: { power: 0.8, ppfd: 600, coverageArea: 12 },
                },
                {
                  id: 'climate-1',
                  blueprintId: 'climate-blueprint',
                  kind: 'ClimateUnit',
                  name: 'Climate Control',
                  zoneId: 'zone-1',
                  status: 'operational',
                  efficiency: 0.9,
                  runtimeHours: 0,
                  maintenance: {
                    lastServiceTick: 0,
                    nextDueTick: DEFAULT_MAINTENANCE_INTERVAL_TICKS,
                    condition: 1,
                    runtimeHoursAtLastService: 0,
                    degradation: 0,
                  },
                  settings: {
                    airflow: 320,
                    coolingCapacity: 1.2,
                    targetTemperature: 24,
                    targetTemperatureRange: [22, 26],
                    fullPowerAtDeltaK: 2,
                  },
                },
                {
                  id: 'humidity-1',
                  blueprintId: 'humidity-blueprint',
                  kind: 'HumidityControlUnit',
                  name: 'Humidity Control',
                  zoneId: 'zone-1',
                  status: 'operational',
                  efficiency: 0.9,
                  runtimeHours: 0,
                  maintenance: {
                    lastServiceTick: 0,
                    nextDueTick: DEFAULT_MAINTENANCE_INTERVAL_TICKS,
                    condition: 1,
                    runtimeHoursAtLastService: 0,
                    degradation: 0,
                  },
                  settings: {
                    targetHumidity: 0.6,
                    humidifyRateKgPerTick: 0.1,
                    dehumidifyRateKgPerTick: 0.1,
                  },
                },
                {
                  id: 'co2-1',
                  blueprintId: 'co2-blueprint',
                  kind: 'CO2Injector',
                  name: 'CO2 Injector',
                  zoneId: 'zone-1',
                  status: 'operational',
                  efficiency: 0.9,
                  runtimeHours: 0,
                  maintenance: {
                    lastServiceTick: 0,
                    nextDueTick: DEFAULT_MAINTENANCE_INTERVAL_TICKS,
                    condition: 1,
                    runtimeHoursAtLastService: 0,
                    degradation: 0,
                  },
                  settings: {
                    targetCO2: 900,
                    targetCO2Range: [400, 1500],
                    hysteresis: 50,
                  },
                },
              ],
              metrics: {
                averageTemperature: 24,
                averageHumidity: 0.6,
                averageCo2: 900,
                averagePpfd: 500,
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
});

const createFacade = (state?: GameState) => {
  const gameState = state ?? createTestState();
  const eventBus = new EventBus();
  const loopStub = { processTick: vi.fn() } as unknown as SimulationLoop;
  const facade = new SimulationFacade({ state: gameState, eventBus, loop: loopStub });
  return { facade, state: gameState, eventBus };
};

afterEach(() => {
  vi.restoreAllMocks();
});

const subscribeToSetpoints = (facade: SimulationFacade) => {
  const events: SimulationEvent[] = [];
  const unsubscribe = facade.subscribe('env.setpointUpdated', (event) => events.push(event));
  return { events, unsubscribe };
};

describe('SimulationFacade.setZoneSetpoint', () => {
  it('updates climate device settings and emits events for temperature setpoints', () => {
    const { facade, state } = createFacade();
    const { events, unsubscribe } = subscribeToSetpoints(facade);

    const result = facade.setZoneSetpoint('zone-1', 'temperature', 26);

    expect(result.ok).toBe(true);
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.control.setpoints.temperature).toBe(26);
    const climateUnit = zone.devices.find((device) => device.kind === 'ClimateUnit');
    expect(climateUnit?.settings.targetTemperature).toBe(26);
    expect(events).toHaveLength(1);
    expect(events[0]?.payload).toMatchObject({
      zoneId: 'zone-1',
      metric: 'temperature',
      value: 26,
    });

    unsubscribe();
  });

  it('clamps temperature setpoints below the minimum', () => {
    const { facade, state } = createFacade();

    const result = facade.setZoneSetpoint(
      'zone-1',
      'temperature',
      MIN_ZONE_TEMPERATURE_SETPOINT_C - 5,
    );

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain(
      `Temperature setpoint was clamped to the [${MIN_ZONE_TEMPERATURE_SETPOINT_C}, ${MAX_ZONE_TEMPERATURE_SETPOINT_C}] °C range.`,
    );
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.control.setpoints.temperature).toBe(MIN_ZONE_TEMPERATURE_SETPOINT_C);
    const climateUnit = zone.devices.find((device) => device.kind === 'ClimateUnit');
    expect(climateUnit?.settings.targetTemperature).toBe(MIN_ZONE_TEMPERATURE_SETPOINT_C);
  });

  it('clamps temperature setpoints above the maximum', () => {
    const { facade, state } = createFacade();

    const result = facade.setZoneSetpoint(
      'zone-1',
      'temperature',
      MAX_ZONE_TEMPERATURE_SETPOINT_C + 5,
    );

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain(
      `Temperature setpoint was clamped to the [${MIN_ZONE_TEMPERATURE_SETPOINT_C}, ${MAX_ZONE_TEMPERATURE_SETPOINT_C}] °C range.`,
    );
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.control.setpoints.temperature).toBe(MAX_ZONE_TEMPERATURE_SETPOINT_C);
    const climateUnit = zone.devices.find((device) => device.kind === 'ClimateUnit');
    expect(climateUnit?.settings.targetTemperature).toBe(MAX_ZONE_TEMPERATURE_SETPOINT_C);
  });

  it('clamps relative humidity setpoints to the [0, 1] range', () => {
    const { facade, state } = createFacade();

    const result = facade.setZoneSetpoint('zone-1', 'relativeHumidity', 1.2);

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain(
      'Relative humidity setpoint was clamped to the [0, 1] range.',
    );
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.control.setpoints.humidity).toBe(1);
    expect(zone.control.setpoints.vpd).toBeUndefined();
    const humidityUnit = zone.devices.find((device) => device.kind === 'HumidityControlUnit');
    expect(humidityUnit?.settings.targetHumidity).toBe(1);
  });

  it('clamps relative humidity setpoints below zero', () => {
    const { facade, state } = createFacade();

    const result = facade.setZoneSetpoint('zone-1', 'relativeHumidity', -0.3);

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain(
      'Relative humidity setpoint was clamped to the [0, 1] range.',
    );
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.control.setpoints.humidity).toBe(MIN_ZONE_HUMIDITY_SETPOINT);
    const humidityUnit = zone.devices.find((device) => device.kind === 'HumidityControlUnit');
    expect(humidityUnit?.settings.targetHumidity).toBe(MIN_ZONE_HUMIDITY_SETPOINT);
  });

  it('clamps CO₂ setpoints below the minimum', () => {
    const { facade, state } = createFacade();

    const result = facade.setZoneSetpoint('zone-1', 'co2', -100);

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain(
      `CO₂ setpoint was clamped to the [${MIN_ZONE_CO2_SETPOINT_PPM}, ${MAX_ZONE_CO2_SETPOINT_PPM}] ppm range.`,
    );
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.control.setpoints.co2).toBe(0);
    const injector = zone.devices.find((device) => device.kind === 'CO2Injector');
    expect(injector?.settings.targetCO2).toBe(0);
  });

  it('clamps CO₂ setpoints above the maximum', () => {
    const { facade, state } = createFacade();

    const result = facade.setZoneSetpoint('zone-1', 'co2', MAX_ZONE_CO2_SETPOINT_PPM + 500);

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain(
      `CO₂ setpoint was clamped to the [${MIN_ZONE_CO2_SETPOINT_PPM}, ${MAX_ZONE_CO2_SETPOINT_PPM}] ppm range.`,
    );
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.control.setpoints.co2).toBe(MAX_ZONE_CO2_SETPOINT_PPM);
    const injector = zone.devices.find((device) => device.kind === 'CO2Injector');
    expect(injector?.settings.targetCO2).toBe(MAX_ZONE_CO2_SETPOINT_PPM);
  });

  it('scales lamp power proportionally when adjusting PPFD', () => {
    const { facade, state } = createFacade();

    const result = facade.setZoneSetpoint('zone-1', 'ppfd', 300);

    expect(result.ok).toBe(true);
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.control.setpoints.ppfd).toBe(300);
    const lamp = zone.devices.find((device) => device.kind === 'Lamp');
    expect(lamp?.settings.ppfd).toBe(300);
    expect(lamp?.settings.power).toBeCloseTo(0.4, 6);
  });

  it('clamps PPFD setpoints below zero', () => {
    const { facade, state } = createFacade();

    const result = facade.setZoneSetpoint('zone-1', 'ppfd', -50);

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain(
      `PPFD setpoint was clamped to the [${MIN_ZONE_PPFD_SETPOINT}, ${MAX_ZONE_PPFD_SETPOINT}] µmol·m⁻²·s⁻¹ range.`,
    );
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.control.setpoints.ppfd).toBe(MIN_ZONE_PPFD_SETPOINT);
    const lamp = zone.devices.find((device) => device.kind === 'Lamp');
    expect(lamp?.settings.ppfd).toBe(MIN_ZONE_PPFD_SETPOINT);
    expect(lamp?.settings.power).toBe(0);
  });

  it('clamps PPFD setpoints above the maximum', () => {
    const { facade, state } = createFacade();

    const result = facade.setZoneSetpoint('zone-1', 'ppfd', MAX_ZONE_PPFD_SETPOINT + 200);

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain(
      `PPFD setpoint was clamped to the [${MIN_ZONE_PPFD_SETPOINT}, ${MAX_ZONE_PPFD_SETPOINT}] µmol·m⁻²·s⁻¹ range.`,
    );
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.control.setpoints.ppfd).toBe(MAX_ZONE_PPFD_SETPOINT);
    const lamp = zone.devices.find((device) => device.kind === 'Lamp');
    expect(lamp?.settings.ppfd).toBe(MAX_ZONE_PPFD_SETPOINT);
    expect(lamp?.settings.power).toBeCloseTo(2, 6);
  });

  it('derives humidity targets from VPD inputs', () => {
    const { facade, state } = createFacade();
    const { events, unsubscribe } = subscribeToSetpoints(facade);

    const result = facade.setZoneSetpoint('zone-1', 'vpd', 1);

    expect(result.ok).toBe(true);
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    const saturation = saturationVaporPressure(zone.environment.temperature);
    const expectedHumidity = Math.min(Math.max(1 - 1 / saturation, 0), 1);
    expect(zone.control.setpoints.vpd).toBe(1);
    expect(zone.control.setpoints.humidity).toBeCloseTo(expectedHumidity, 6);
    const humidityUnit = zone.devices.find((device) => device.kind === 'HumidityControlUnit');
    expect(humidityUnit?.settings.targetHumidity).toBeCloseTo(expectedHumidity, 6);
    expect(events[0]?.payload).toMatchObject({ metric: 'vpd', value: 1 });
    const eventPayload = events[0]?.payload as { effectiveHumidity?: number } | undefined;
    expect(eventPayload?.effectiveHumidity).toBeCloseTo(expectedHumidity, 6);

    unsubscribe();
  });

  it('clamps VPD setpoints below the minimum', () => {
    const { facade, state } = createFacade();

    const result = facade.setZoneSetpoint('zone-1', 'vpd', -0.2);

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain(
      `VPD setpoint was clamped to the [${MIN_ZONE_VPD_SETPOINT_KPA}, ${MAX_ZONE_VPD_SETPOINT_KPA}] kPa range.`,
    );
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.control.setpoints.vpd).toBe(MIN_ZONE_VPD_SETPOINT_KPA);
    expect(zone.control.setpoints.humidity).toBeCloseTo(MAX_ZONE_HUMIDITY_SETPOINT, 6);
    const humidityUnit = zone.devices.find((device) => device.kind === 'HumidityControlUnit');
    expect(humidityUnit?.settings.targetHumidity).toBeCloseTo(MAX_ZONE_HUMIDITY_SETPOINT, 6);
  });

  it('clamps VPD setpoints above the maximum', () => {
    const { facade, state } = createFacade();

    const result = facade.setZoneSetpoint('zone-1', 'vpd', MAX_ZONE_VPD_SETPOINT_KPA + 0.5);

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain(
      `VPD setpoint was clamped to the [${MIN_ZONE_VPD_SETPOINT_KPA}, ${MAX_ZONE_VPD_SETPOINT_KPA}] kPa range.`,
    );
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.control.setpoints.vpd).toBe(MAX_ZONE_VPD_SETPOINT_KPA);
    const referenceTemperature = zone.environment.temperature;
    const saturation = saturationVaporPressure(referenceTemperature);
    const expectedHumidity = Math.min(
      Math.max(1 - MAX_ZONE_VPD_SETPOINT_KPA / Math.max(saturation, Number.EPSILON), 0),
      1,
    );
    expect(zone.control.setpoints.humidity).toBeCloseTo(expectedHumidity, 6);
    const humidityUnit = zone.devices.find((device) => device.kind === 'HumidityControlUnit');
    expect(humidityUnit?.settings.targetHumidity).toBeCloseTo(expectedHumidity, 6);
  });

  it('rejects updates for zones without compatible devices', () => {
    const { facade, state } = createFacade();
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    zone.devices = zone.devices.filter((device) => device.kind !== 'ClimateUnit');
    const snapshot = JSON.stringify(zone);

    const result = facade.setZoneSetpoint('zone-1', 'temperature', 20);

    expect(result.ok).toBe(false);
    expect(result.errors?.[0]?.code).toBe('ERR_INVALID_STATE');
    expect(JSON.stringify(zone)).toBe(snapshot);
  });

  it('rejects unknown metrics with ERR_INVALID_STATE', () => {
    const { facade } = createFacade();

    const result = facade.setZoneSetpoint('zone-1', 'ph' as never, 6.5);

    expect(result.ok).toBe(false);
    expect(result.errors?.[0]?.code).toBe('ERR_INVALID_STATE');
  });

  it('rejects requests for missing zones', () => {
    const { facade } = createFacade();

    const result = facade.setZoneSetpoint('zone-unknown', 'temperature', 24);

    expect(result.ok).toBe(false);
    expect(result.errors?.[0]?.code).toBe('ERR_INVALID_STATE');
  });

  it('exposes difficulty configuration via the config domain', async () => {
    const { facade } = createFacade();
    const config = {
      easy: {
        name: 'Easy',
        description: 'Relaxed mode',
        modifiers: {
          plantStress: { optimalRangeMultiplier: 1.2, stressAccumulationMultiplier: 0.8 },
          deviceFailure: { mtbfMultiplier: 1.5 },
          economics: {
            initialCapital: 1_000_000,
            itemPriceMultiplier: 0.9,
            harvestPriceMultiplier: 1.1,
            rentPerSqmStructurePerTick: 0.1,
            rentPerSqmRoomPerTick: 0.2,
          },
        },
      },
      normal: {
        name: 'Normal',
        description: 'Baseline',
        modifiers: {
          plantStress: { optimalRangeMultiplier: 1, stressAccumulationMultiplier: 1 },
          deviceFailure: { mtbfMultiplier: 1 },
          economics: {
            initialCapital: 500_000,
            itemPriceMultiplier: 1,
            harvestPriceMultiplier: 1,
            rentPerSqmStructurePerTick: 0.15,
            rentPerSqmRoomPerTick: 0.3,
          },
        },
      },
      hard: {
        name: 'Hard',
        description: 'Challenge',
        modifiers: {
          plantStress: { optimalRangeMultiplier: 0.9, stressAccumulationMultiplier: 1.2 },
          deviceFailure: { mtbfMultiplier: 0.85 },
          economics: {
            initialCapital: 250_000,
            itemPriceMultiplier: 1.1,
            harvestPriceMultiplier: 0.9,
            rentPerSqmStructurePerTick: 0.25,
            rentPerSqmRoomPerTick: 0.35,
          },
        },
      },
    } as const;

    facade.updateServices({
      config: {
        getDifficultyConfig: () => ({ ok: true, data: config }),
      },
    });

    const response = await facade.config.getDifficultyConfig();

    expect(response.ok).toBe(true);
    expect(response.data).toEqual(config);
  });
});
