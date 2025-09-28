import type { DeviceInstanceState, ZoneEnvironmentState, ZoneState } from '@/state/models.js';
import type { ZoneGeometry } from '@/state/geometry.js';
import {
  AMBIENT_CO2_PPM,
  AMBIENT_HUMIDITY_RH,
  AMBIENT_TEMP_C,
  COOLING_CAPACITY_FACTOR,
  DEFAULT_CO2_PULSE_MINUTES,
  DEFAULT_FULL_POWER_DELTA_K,
  DEFAULT_FULL_POWER_DELTA_RH,
  DEFAULT_HUMIDITY_HYSTERESIS,
  DEFAULT_HYSTERESIS_K,
  DEFAULT_LIGHT_COVERAGE_M2,
  DEFAULT_LIGHT_HEAT_FRACTION,
  DEFAULT_MAX_CO2_PPM,
  LAMP_HEAT_FACTOR,
  MIN_HEAT_CAPACITY_KWH_PER_K,
  SATURATION_VAPOR_DENSITY_KG_PER_M3,
  SPECIFIC_HEAT_AIR_KWH_PER_M3K,
} from '@/constants/environment.js';
import type { ClimateControlOutput } from './climateController.js';

export interface DeviceEffect {
  temperatureDelta: number;
  humidityDelta: number;
  co2Delta: number;
  ppfd: number;
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
  ppfd: 0,
  airflow: 0,
  energyKwh: 0,
};

const LAMP_HEAT_TRANSFER_COEFFICIENT = LAMP_HEAT_FACTOR;
const HVAC_HEAT_TRANSFER_COEFFICIENT = COOLING_CAPACITY_FACTOR;

const LIGHT_KINDS = new Set(['GrowLight', 'Lamp', 'Light']);
const HVAC_KINDS = new Set([
  'ClimateUnit',
  'HVAC',
  'HumidityControlUnit',
  'Dehumidifier',
  'ExhaustFan',
  'Ventilation',
]);
const CO2_KINDS = new Set(['CO2Injector']);
const HUMIDITY_KINDS = new Set(['HumidityControlUnit', 'Dehumidifier']);
const VENTILATION_KINDS = new Set(['Ventilation', 'ExhaustFan']);

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

const addDeviceEffects = (left: DeviceEffect, right: DeviceEffect): DeviceEffect => ({
  temperatureDelta: left.temperatureDelta + right.temperatureDelta,
  humidityDelta: left.humidityDelta + right.humidityDelta,
  co2Delta: left.co2Delta + right.co2Delta,
  ppfd: left.ppfd + right.ppfd,
  airflow: left.airflow + right.airflow,
  energyKwh: left.energyKwh + right.energyKwh,
});

const waterMassToHumidityDelta = (massKg: number, volume: number): number => {
  if (massKg === 0 || volume <= 0 || SATURATION_VAPOR_DENSITY_KG_PER_M3 <= 0) {
    return 0;
  }
  const saturationMass = volume * SATURATION_VAPOR_DENSITY_KG_PER_M3;
  if (saturationMass <= 0) {
    return 0;
  }
  return massKg / saturationMass;
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
  const ppfdContribution = ppfd * coverageRatio * clamp(device.efficiency, 0, 1);

  return {
    temperatureDelta,
    humidityDelta: 0,
    co2Delta: 0,
    ppfd: ppfdContribution,
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
    ppfd: 0,
    airflow,
    energyKwh: totalEnergy,
  };
};

const computeVentilationEffect = (
  device: DeviceInstanceState,
  environment: ZoneEnvironmentState,
  geometry: ZoneGeometry,
  context: DeviceEffectContext,
): DeviceEffect => {
  const efficiency = clamp(device.efficiency, 0, 1);
  const airflowSetting = Math.max(toNumber(device.settings.airflow, 0), 0);
  const airflow = airflowSetting * efficiency;
  const tickHours = Math.max(context.tickHours, 0);
  const powerKw = Math.max(toNumber(device.settings.power, 0), 0);
  const energyKwh = powerKw * tickHours;

  if (airflow <= 0 || tickHours <= 0) {
    return {
      ...DEFAULT_DEVICE_EFFECT,
      airflow,
      energyKwh,
    };
  }

  const airChangesPerHour = airflow / Math.max(geometry.volume, 0.0001);
  const exchangeFraction = Math.min(Math.max(airChangesPerHour * tickHours, 0), 1);

  const temperatureDelta = (AMBIENT_TEMP_C - environment.temperature) * exchangeFraction;
  const humidityDeltaRaw = (AMBIENT_HUMIDITY_RH - environment.relativeHumidity) * exchangeFraction;
  const humidityDelta = clamp(
    humidityDeltaRaw,
    -environment.relativeHumidity,
    1 - environment.relativeHumidity,
  );
  const co2Delta = (AMBIENT_CO2_PPM - environment.co2) * exchangeFraction;

  return {
    temperatureDelta,
    humidityDelta,
    co2Delta,
    ppfd: 0,
    airflow,
    energyKwh,
  };
};

const computeHumidityEffect = (
  device: DeviceInstanceState,
  zone: ZoneState,
  geometry: ZoneGeometry,
  context: DeviceEffectContext,
): DeviceEffect => {
  const settings = device.settings;
  const efficiency = clamp(device.efficiency, 0, 1);
  const tickHours = Math.max(context.tickHours, 0);
  if (tickHours <= 0) {
    return { ...DEFAULT_DEVICE_EFFECT };
  }

  const humidifyRate = Math.max(toNumber(settings.humidifyRateKgPerTick, 0), 0);
  const dehumidifyRateSetting = Math.max(toNumber(settings.dehumidifyRateKgPerTick, 0), 0);
  const latentRemovalRate = Math.max(toNumber(settings.latentRemovalKgPerTick, 0), 0);
  const dehumidifyRate = dehumidifyRateSetting > 0 ? dehumidifyRateSetting : latentRemovalRate;

  const setpoint = zone.control?.setpoints?.humidity;
  const targetHumidity = clamp(
    toNumber(setpoint, toNumber(settings.targetHumidity, AMBIENT_HUMIDITY_RH)),
    0,
    1,
  );
  const range = toNumberTuple(settings.targetHumidityRange);
  const hysteresis = Math.max(toNumber(settings.hysteresis, DEFAULT_HUMIDITY_HYSTERESIS), 0);
  const [rawLowerBound, rawUpperBound] = computeTargetBand(
    targetHumidity,
    range,
    hysteresis || DEFAULT_HUMIDITY_HYSTERESIS,
  );
  const lowerBound = clamp(rawLowerBound, 0, 1);
  const upperBound = clamp(rawUpperBound, 0, 1);

  const humidityHumidifyPower = context.powerLevels?.humidityHumidify ?? 0;
  const humidityDehumidifyPower = context.powerLevels?.humidityDehumidify ?? 0;

  const belowLowerBand = zone.environment.relativeHumidity < lowerBound;
  const aboveUpperBand = zone.environment.relativeHumidity > upperBound;

  const canHumidify = humidifyRate > 0 && (belowLowerBand || humidityHumidifyPower > 0);
  const canDehumidify = dehumidifyRate > 0 && (aboveUpperBand || humidityDehumidifyPower > 0);

  let mode: 'humidify' | 'dehumidify' | null = null;
  if (canHumidify && canDehumidify) {
    const humidityError = targetHumidity - zone.environment.relativeHumidity;
    if (humidityError > 0) {
      mode = 'humidify';
    } else if (humidityError < 0) {
      mode = 'dehumidify';
    } else {
      mode = humidityHumidifyPower >= humidityDehumidifyPower ? 'humidify' : 'dehumidify';
    }
  } else if (canHumidify) {
    mode = 'humidify';
  } else if (canDehumidify) {
    mode = 'dehumidify';
  }

  if (!mode) {
    return { ...DEFAULT_DEVICE_EFFECT };
  }

  const controlLevel = mode === 'humidify' ? humidityHumidifyPower : humidityDehumidifyPower;
  const baseRate = mode === 'humidify' ? humidifyRate : dehumidifyRate;
  if (baseRate <= 0) {
    return { ...DEFAULT_DEVICE_EFFECT };
  }

  const fullPowerDelta = Math.max(
    toNumber(settings.fullPowerAtDeltaHumidity, DEFAULT_FULL_POWER_DELTA_RH),
    0.0001,
  );

  const automaticModulation = clamp(
    Math.abs(targetHumidity - zone.environment.relativeHumidity) / fullPowerDelta,
    0,
    1,
  );
  const modulation = controlLevel > 0 ? clamp(controlLevel / 100, 0, 1) : automaticModulation;

  if (modulation === 0) {
    return { ...DEFAULT_DEVICE_EFFECT };
  }

  const massAtFullPower = baseRate * efficiency;
  if (massAtFullPower <= 0) {
    return { ...DEFAULT_DEVICE_EFFECT };
  }

  const maxDeltaAtFullPower = waterMassToHumidityDelta(massAtFullPower, geometry.volume);
  if (maxDeltaAtFullPower <= 0) {
    return { ...DEFAULT_DEVICE_EFFECT };
  }

  const potentialDelta = maxDeltaAtFullPower * modulation;
  if (potentialDelta <= 0) {
    return { ...DEFAULT_DEVICE_EFFECT };
  }

  const currentHumidity = zone.environment.relativeHumidity;
  const rawDesiredDelta =
    mode === 'humidify'
      ? Math.min(targetHumidity - currentHumidity, upperBound - currentHumidity)
      : Math.max(targetHumidity - currentHumidity, lowerBound - currentHumidity);
  const desiredDelta = clamp(rawDesiredDelta, -1, 1);
  if (desiredDelta === 0) {
    return { ...DEFAULT_DEVICE_EFFECT };
  }

  const appliedDelta = Math.sign(desiredDelta) * Math.min(Math.abs(desiredDelta), potentialDelta);
  const clampedDelta = clamp(appliedDelta, -currentHumidity, 1 - currentHumidity);

  const powerKw = Math.max(toNumber(settings.power, 0), 0);
  const energyKwh = powerKw * tickHours * modulation;

  return {
    temperatureDelta: 0,
    humidityDelta: clampedDelta,
    co2Delta: 0,
    ppfd: 0,
    airflow: 0,
    energyKwh,
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
    ppfd: 0,
    airflow: 0,
    energyKwh: 0,
  };
};

const computeSingleDeviceEffect = (
  device: DeviceInstanceState,
  zone: ZoneState,
  geometry: ZoneGeometry,
  context: DeviceEffectContext,
): DeviceEffect => {
  if (device.status !== 'operational') {
    return { ...DEFAULT_DEVICE_EFFECT };
  }

  let effect = { ...DEFAULT_DEVICE_EFFECT };

  if (LIGHT_KINDS.has(device.kind)) {
    effect = addDeviceEffects(effect, computeGrowLightEffect(device, geometry, context));
  }

  if (VENTILATION_KINDS.has(device.kind)) {
    effect = addDeviceEffects(
      effect,
      computeVentilationEffect(device, zone.environment, geometry, context),
    );
  } else if (HVAC_KINDS.has(device.kind)) {
    effect = addDeviceEffects(
      effect,
      computeHvacTemperatureEffect(device, zone.environment, geometry, context),
    );
  }

  if (HUMIDITY_KINDS.has(device.kind)) {
    effect = addDeviceEffects(effect, computeHumidityEffect(device, zone, geometry, context));
  }

  if (CO2_KINDS.has(device.kind)) {
    effect = addDeviceEffects(effect, computeCo2Effect(device, zone.environment, context));
  }

  return effect;
};

export const computeZoneDeviceDeltas = (
  zone: ZoneState,
  geometry: ZoneGeometry,
  context: DeviceEffectContext,
): DeviceEffect => {
  const aggregate: DeviceEffect = { ...DEFAULT_DEVICE_EFFECT };
  let lightingPpfd = 0;

  for (const device of zone.devices) {
    const effect = computeSingleDeviceEffect(device, zone, geometry, context);

    aggregate.temperatureDelta += effect.temperatureDelta;
    aggregate.humidityDelta += effect.humidityDelta;
    aggregate.co2Delta += effect.co2Delta;
    aggregate.airflow += effect.airflow;
    aggregate.energyKwh += effect.energyKwh;
    lightingPpfd += effect.ppfd;
  }

  aggregate.ppfd = lightingPpfd;

  return aggregate;
};

export const hasActiveDevices = (zone: ZoneState): boolean => {
  return zone.devices.some((device) => device.status === 'operational');
};
