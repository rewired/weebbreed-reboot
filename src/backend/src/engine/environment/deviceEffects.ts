import type { DeviceInstanceState, ZoneEnvironmentState, ZoneState } from '@/state/models.js';
import type { ZoneGeometry } from '@/state/geometry.js';
import { COOLING_CAPACITY_FACTOR, LAMP_HEAT_FACTOR } from '@/constants/environment.js';
import type { ClimateControlOutput } from './climateController.js';

export interface DeviceEffect {
  temperatureDelta: number;
  humidityDelta: number;
  co2Delta: number;
  ppfdDelta: number;
  airflow: number;
  energyKwh: number;
}

export interface DeviceEffectContext {
  tickHours: number;
  powerLevels?: ClimateControlOutput;
}

const DEFAULT_DEVICE_EFFECT: DeviceEffect = {
  temperatureDelta: 0,
  humidityDelta: 0,
  co2Delta: 0,
  ppfdDelta: 0,
  airflow: 0,
  energyKwh: 0,
};

const SPECIFIC_HEAT_AIR_KWH_PER_M3K = 0.000336;
const MIN_HEAT_CAPACITY_KWH_PER_K = 0.0001;
const LAMP_HEAT_TRANSFER_COEFFICIENT = LAMP_HEAT_FACTOR;
const HVAC_HEAT_TRANSFER_COEFFICIENT = COOLING_CAPACITY_FACTOR;
const DEFAULT_LIGHT_HEAT_FRACTION = 0.4;
const DEFAULT_LIGHT_COVERAGE_M2 = 1;
const DEFAULT_FULL_POWER_DELTA_K = 1;
const DEFAULT_HYSTERESIS_K = 0.5;
const DEFAULT_CO2_PULSE_MINUTES = 1;
const DEFAULT_MAX_CO2_PPM = 1800;

const LIGHT_KINDS = new Set(['GrowLight', 'Lamp', 'Light']);
const HVAC_KINDS = new Set([
  'ClimateUnit',
  'HVAC',
  'HumidityControlUnit',
  'Dehumidifier',
  'ExhaustFan',
]);
const CO2_KINDS = new Set(['CO2Injector']);

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return fallback;
};

const toNumberTuple = (value: unknown): [number, number] | undefined => {
  if (!Array.isArray(value) || value.length !== 2) {
    return undefined;
  }
  const [first, second] = value;
  if (typeof first !== 'number' || typeof second !== 'number') {
    return undefined;
  }
  return [first, second];
};

const energyToTemperatureDelta = (energyKwh: number, volume: number): number => {
  if (energyKwh === 0) {
    return 0;
  }
  const capacity = Math.max(volume * SPECIFIC_HEAT_AIR_KWH_PER_M3K, MIN_HEAT_CAPACITY_KWH_PER_K);
  return energyKwh / capacity;
};

const computeGrowLightEffect = (
  device: DeviceInstanceState,
  geometry: ZoneGeometry,
  context: DeviceEffectContext,
): DeviceEffect => {
  const settings = device.settings;
  const powerKw = toNumber(settings.power, 0);
  const heatFraction = clamp(toNumber(settings.heatFraction, DEFAULT_LIGHT_HEAT_FRACTION), 0, 1);
  const coverage = Math.max(toNumber(settings.coverageArea, DEFAULT_LIGHT_COVERAGE_M2), 0.0001);
  const ppfd = Math.max(toNumber(settings.ppfd, 0), 0);

  if (powerKw <= 0 && ppfd === 0) {
    return { ...DEFAULT_DEVICE_EFFECT };
  }

  const totalEnergy = Math.max(powerKw, 0) * Math.max(context.tickHours, 0);
  const energy = powerKw * heatFraction * context.tickHours;
  const baseDelta = energyToTemperatureDelta(energy, geometry.volume);
  const temperatureDelta =
    baseDelta * LAMP_HEAT_TRANSFER_COEFFICIENT * clamp(device.efficiency, 0, 1);

  const coverageRatio = clamp(coverage / Math.max(geometry.area, 0.0001), 0, 1);
  const ppfdDelta = ppfd * coverageRatio * clamp(device.efficiency, 0, 1);

  return {
    temperatureDelta,
    humidityDelta: 0,
    co2Delta: 0,
    ppfdDelta,
    airflow: 0,
    energyKwh: totalEnergy,
  };
};

const computeTargetBand = (
  target: number,
  range: [number, number] | undefined,
  hysteresis: number,
): [number, number] => {
  if (range) {
    const [low, high] = range;
    if (Number.isFinite(low) && Number.isFinite(high) && low <= high) {
      return [low, high];
    }
  }
  const half = hysteresis / 2;
  return [target - half, target + half];
};

const computeHvacTemperatureEffect = (
  device: DeviceInstanceState,
  environment: ZoneEnvironmentState,
  geometry: ZoneGeometry,
  context: DeviceEffectContext,
): DeviceEffect => {
  const settings = device.settings;
  const efficiency = clamp(device.efficiency, 0, 1);
  const targetTemperature = toNumber(settings.targetTemperature, environment.temperature);
  const range = toNumberTuple(settings.targetTemperatureRange);
  const hysteresis = Math.max(toNumber(settings.hysteresisK, DEFAULT_HYSTERESIS_K), 0);
  const [lowerBound, upperBound] = computeTargetBand(
    targetTemperature,
    range,
    hysteresis || DEFAULT_HYSTERESIS_K,
  );

  const needsCooling = environment.temperature > upperBound;
  const needsHeating = environment.temperature < lowerBound;

  if (!needsCooling && !needsHeating) {
    return {
      ...DEFAULT_DEVICE_EFFECT,
      airflow: Math.max(toNumber(settings.airflow, 0), 0) * efficiency,
    };
  }

  const capacityKey = needsCooling ? 'coolingCapacity' : 'heatingCapacity';
  const capacityKw = Math.max(toNumber(settings[capacityKey], toNumber(settings.power, 0)), 0);
  if (capacityKw <= 0 || context.tickHours <= 0) {
    return {
      ...DEFAULT_DEVICE_EFFECT,
      airflow: Math.max(toNumber(settings.airflow, 0), 0) * efficiency,
    };
  }

  const temperatureDifference = targetTemperature - environment.temperature;
  const desiredDelta = needsCooling
    ? Math.max(targetTemperature - environment.temperature, lowerBound - environment.temperature)
    : Math.min(targetTemperature - environment.temperature, upperBound - environment.temperature);

  const controlLevel = context.powerLevels
    ? needsCooling
      ? context.powerLevels.temperatureCooling
      : context.powerLevels.temperatureHeating
    : undefined;

  const energy = capacityKw * context.tickHours;
  const baseDelta = energyToTemperatureDelta(energy, geometry.volume);
  const fullPowerDelta = Math.max(
    toNumber(settings.fullPowerAtDeltaK, DEFAULT_FULL_POWER_DELTA_K),
    0.0001,
  );
  const modulation =
    controlLevel !== undefined
      ? clamp(controlLevel / 100, 0, 1)
      : clamp(Math.abs(temperatureDifference) / fullPowerDelta, 0, 1);
  const potentialDelta = baseDelta * HVAC_HEAT_TRANSFER_COEFFICIENT * efficiency * modulation;

  const appliedDelta = Math.sign(desiredDelta) * Math.min(Math.abs(desiredDelta), potentialDelta);
  const airflowModulation = controlLevel !== undefined ? clamp(controlLevel / 100, 0, 1) : 1;
  const airflow = Math.max(toNumber(settings.airflow, 0), 0) * efficiency * airflowModulation;
  const totalEnergy = Math.max(capacityKw, 0) * Math.max(context.tickHours, 0) * modulation;

  return {
    temperatureDelta: appliedDelta,
    humidityDelta: 0,
    co2Delta: 0,
    ppfdDelta: 0,
    airflow,
    energyKwh: totalEnergy,
  };
};

const computeCo2Effect = (
  device: DeviceInstanceState,
  environment: ZoneEnvironmentState,
  context: DeviceEffectContext,
): DeviceEffect => {
  const settings = device.settings;
  const efficiency = clamp(device.efficiency, 0, 1);
  const target = toNumber(settings.targetCO2, environment.co2);
  const hysteresis = Math.max(toNumber(settings.hysteresis, 0), 0);
  const range = toNumberTuple(settings.targetCO2Range);
  const maxCo2 = range?.[1] ?? toNumber(settings.maxSafeCo2, DEFAULT_MAX_CO2_PPM);
  const pulse = Math.max(toNumber(settings.pulsePpmPerTick, 0), 0);
  if (pulse === 0 || context.tickHours <= 0) {
    return { ...DEFAULT_DEVICE_EFFECT };
  }

  const tickMinutes = context.tickHours * 60;
  const scaledPulse = pulse * (tickMinutes / DEFAULT_CO2_PULSE_MINUTES);

  const lowerThreshold = target - hysteresis;
  if (environment.co2 >= lowerThreshold) {
    return { ...DEFAULT_DEVICE_EFFECT };
  }

  const desiredIncrease = target - environment.co2;
  if (desiredIncrease <= 0) {
    return { ...DEFAULT_DEVICE_EFFECT };
  }

  const modulation =
    context.powerLevels !== undefined ? clamp(context.powerLevels.co2Injection / 100, 0, 1) : 1;
  const appliedIncrease = Math.min(desiredIncrease, scaledPulse) * efficiency * modulation;
  const safetyLimited = Math.min(appliedIncrease, Math.max(0, maxCo2 - environment.co2));

  return {
    temperatureDelta: 0,
    humidityDelta: 0,
    co2Delta: Math.max(0, safetyLimited),
    ppfdDelta: 0,
    airflow: 0,
    energyKwh: 0,
  };
};

const computeSingleDeviceEffect = (
  device: DeviceInstanceState,
  zone: ZoneEnvironmentState,
  geometry: ZoneGeometry,
  context: DeviceEffectContext,
): DeviceEffect => {
  if (device.status !== 'operational') {
    return { ...DEFAULT_DEVICE_EFFECT };
  }

  if (LIGHT_KINDS.has(device.kind)) {
    return computeGrowLightEffect(device, geometry, context);
  }

  if (HVAC_KINDS.has(device.kind)) {
    return computeHvacTemperatureEffect(device, zone, geometry, context);
  }

  if (CO2_KINDS.has(device.kind)) {
    return computeCo2Effect(device, zone, context);
  }

  return { ...DEFAULT_DEVICE_EFFECT };
};

export const computeZoneDeviceDeltas = (
  zone: ZoneState,
  geometry: ZoneGeometry,
  context: DeviceEffectContext,
): DeviceEffect => {
  return zone.devices.reduce<DeviceEffect>(
    (accumulator, device) => {
      const effect = computeSingleDeviceEffect(device, zone.environment, geometry, context);
      return {
        temperatureDelta: accumulator.temperatureDelta + effect.temperatureDelta,
        humidityDelta: accumulator.humidityDelta + effect.humidityDelta,
        co2Delta: accumulator.co2Delta + effect.co2Delta,
        ppfdDelta: accumulator.ppfdDelta + effect.ppfdDelta,
        airflow: accumulator.airflow + effect.airflow,
        energyKwh: accumulator.energyKwh + effect.energyKwh,
      };
    },
    { ...DEFAULT_DEVICE_EFFECT },
  );
};

export const hasActiveDevices = (zone: ZoneState): boolean => {
  return zone.devices.some((device) => device.status === 'operational');
};
