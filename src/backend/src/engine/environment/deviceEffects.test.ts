import { describe, expect, it } from 'vitest';
import { computeZoneDeviceDeltas } from './deviceEffects.js';
import type {
  DeviceInstanceState,
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
  relativeHumidity: 0.6,
  co2: 800,
  ppfd: 0,
  vpd: 1,
  ...overrides,
});

const createResources = (): ZoneResourceState => ({
  waterLiters: 0,
  nutrientSolutionLiters: 0,
  nutrientStrength: 1,
  substrateHealth: 1,
  reservoirLevel: 0.5,
});

const createMetrics = (environment: ZoneEnvironmentState): ZoneMetricState => ({
  averageTemperature: environment.temperature,
  averageHumidity: environment.relativeHumidity,
  averageCo2: environment.co2,
  averagePpfd: environment.ppfd,
  stressLevel: 0,
  lastUpdatedTick: 0,
});

const createHealth = (): ZoneHealthState => ({
  plantHealth: {},
  pendingTreatments: [],
  appliedTreatments: [],
});

const createDevice = (
  kind: string,
  settings: Record<string, unknown>,
  efficiency = 1,
): DeviceInstanceState => ({
  id: `${kind}-device`,
  blueprintId: `${kind}-blueprint`,
  kind,
  name: `${kind} Unit`,
  zoneId: 'zone-1',
  status: 'operational',
  efficiency,
  runtimeHours: 0,
  maintenance: {
    lastServiceTick: 0,
    nextDueTick: 1000,
    condition: 1,
    runtimeHoursAtLastService: 0,
    degradation: 0,
  },
  settings,
});

const createZone = (
  devices: DeviceInstanceState[],
  environment?: ZoneEnvironmentState,
): ZoneState => {
  const env = environment ?? createEnvironment();
  return {
    id: 'zone-1',
    roomId: 'room-1',
    name: 'Zone 1',
    cultivationMethodId: 'method-1',
    strainId: 'strain-1',
    area: 40,
    ceilingHeight: 3,
    volume: 120,
    environment: env,
    resources: createResources(),
    plants: [],
    devices,
    metrics: createMetrics(env),
    health: createHealth(),
    activeTaskIds: [],
  };
};

describe('deviceEffects', () => {
  it('computes temperature and light contribution for grow lights', () => {
    const zone = createZone([
      createDevice(
        'Lamp',
        {
          power: 0.6,
          heatFraction: 0.3,
          coverageArea: 1.2,
          ppfd: 800,
        },
        0.9,
      ),
    ]);

    const deltas = computeZoneDeviceDeltas(
      zone,
      { area: 12, ceilingHeight: 3, volume: 36 },
      { tickHours: 0.25 },
    );

    expect(deltas.temperatureDelta).toBeCloseTo(1.67, 2);
    expect(deltas.ppfdDelta).toBeCloseTo(72, 4);
    expect(deltas.airflow).toBe(0);
  });

  it('cools zone temperature and contributes airflow for HVAC units', () => {
    const zone = createZone(
      [
        createDevice(
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
      ],
      createEnvironment({ temperature: 28 }),
    );

    const deltas = computeZoneDeviceDeltas(
      zone,
      { area: 40, ceilingHeight: 3, volume: 120 },
      { tickHours: 0.25 },
    );

    expect(deltas.temperatureDelta).toBeCloseTo(-4, 3);
    expect(deltas.airflow).toBeCloseTo(315, 6);
    expect(deltas.ppfdDelta).toBe(0);
  });

  it('injects CO2 when below target within safety bounds', () => {
    const zone = createZone(
      [
        createDevice('CO2Injector', {
          targetCO2: 1100,
          targetCO2Range: [400, 1500],
          hysteresis: 50,
          pulsePpmPerTick: 150,
        }),
      ],
      createEnvironment({ co2: 800 }),
    );

    const deltas = computeZoneDeviceDeltas(
      zone,
      { area: 30, ceilingHeight: 3, volume: 90 },
      { tickHours: 5 / 60 },
    );

    expect(deltas.co2Delta).toBeCloseTo(300, 5);
    expect(deltas.temperatureDelta).toBe(0);
    expect(deltas.airflow).toBe(0);
  });
});
