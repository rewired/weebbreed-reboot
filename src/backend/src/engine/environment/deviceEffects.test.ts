import { describe, expect, it } from 'vitest';
import { SATURATION_VAPOR_DENSITY_KG_PER_M3 } from '@/constants/environment.js';
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
    control: { setpoints: {} },
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
    expect(deltas.ppfd).toBeCloseTo(72, 4);
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
    expect(deltas.ppfd).toBe(0);
  });

  it('exchanges air and trends toward ambient conditions for ventilation devices', () => {
    const zone = createZone(
      [
        createDevice(
          'Ventilation',
          {
            power: 0.05,
            airflow: 170,
          },
          0.75,
        ),
      ],
      createEnvironment({ temperature: 28, relativeHumidity: 0.7, co2: 900 }),
    );

    const deltas = computeZoneDeviceDeltas(
      zone,
      { area: 40, ceilingHeight: 3, volume: 120 },
      { tickHours: 0.25 },
    );

    expect(deltas.airflow).toBeCloseTo(127.5, 4);
    expect(deltas.temperatureDelta).toBeLessThan(0);
    expect(deltas.temperatureDelta).toBeCloseTo(-2.13, 2);
    expect(deltas.humidityDelta).toBeCloseTo(-0.053, 3);
    expect(deltas.co2Delta).toBeCloseTo(-133, 0);
    expect(deltas.energyKwh).toBeCloseTo(0.0125, 6);
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

  it('humidifies zone humidity according to controller output and device efficiency', () => {
    const tickHours = 0.25;
    const zone = createZone(
      [
        createDevice(
          'HumidityControlUnit',
          {
            power: 0.4,
            targetHumidity: 0.65,
            hysteresis: 0.04,
            humidifyRateKgPerTick: 0.1,
            dehumidifyRateKgPerTick: 0.06,
          },
          0.85,
        ),
      ],
      createEnvironment({ relativeHumidity: 0.45 }),
    );
    zone.control.setpoints.humidity = 0.65;

    const geometry = { area: 40, ceilingHeight: 3, volume: 120 } as const;

    const deltas = computeZoneDeviceDeltas(zone, geometry, {
      tickHours,
      powerLevels: {
        temperatureHeating: 0,
        temperatureCooling: 0,
        humidityHumidify: 60,
        humidityDehumidify: 0,
        co2Injection: 0,
      },
    });

    const fullPowerMass = 0.1 * tickHours * 0.85;
    const expectedFullPowerDelta =
      fullPowerMass / (geometry.volume * SATURATION_VAPOR_DENSITY_KG_PER_M3);
    const expectedDelta = expectedFullPowerDelta * 0.6;

    expect(deltas.humidityDelta).toBeCloseTo(expectedDelta, 6);
    expect(deltas.humidityDelta).toBeGreaterThan(0);
    expect(deltas.energyKwh).toBeCloseTo(0.4 * tickHours * 0.6, 6);
  });

  it('dehumidifies zone humidity down toward the setpoint while respecting bounds', () => {
    const tickHours = 0.5;
    const zone = createZone(
      [
        createDevice(
          'HumidityControlUnit',
          {
            power: 0.5,
            targetHumidity: 0.55,
            hysteresis: 0.06,
            humidifyRateKgPerTick: 0.08,
            dehumidifyRateKgPerTick: 0.12,
          },
          0.8,
        ),
      ],
      createEnvironment({ relativeHumidity: 0.9 }),
    );
    zone.control.setpoints.humidity = 0.55;

    const geometry = { area: 40, ceilingHeight: 3, volume: 120 } as const;

    const deltas = computeZoneDeviceDeltas(zone, geometry, {
      tickHours,
      powerLevels: {
        temperatureHeating: 0,
        temperatureCooling: 0,
        humidityHumidify: 0,
        humidityDehumidify: 80,
        co2Injection: 0,
      },
    });

    const fullPowerMass = 0.12 * tickHours * 0.8;
    const expectedFullPowerDelta =
      fullPowerMass / (geometry.volume * SATURATION_VAPOR_DENSITY_KG_PER_M3);
    const expectedDelta = -expectedFullPowerDelta * 0.8;

    expect(deltas.humidityDelta).toBeCloseTo(expectedDelta, 6);
    expect(deltas.humidityDelta).toBeLessThan(0);
    expect(deltas.humidityDelta).toBeGreaterThanOrEqual(-zone.environment.relativeHumidity);
    expect(deltas.energyKwh).toBeCloseTo(0.5 * tickHours * 0.8, 6);
  });
});
