import { create, all } from 'mathjs';
import type { DeviceInstance, ZoneEnvironmentState } from '../../shared/domain.js';

const math = create(all, {});

const AIR_HEAT_CAPACITY_KJ_PER_M3_K = 1.2; // Approximate at 20-25 °C
const LATENT_HEAT_VAPORIZATION_KJ_PER_L = 2450;
const DEFAULT_LAI = 3;

export function saturationVaporPressure(temperatureC: number): number {
  const numerator = 17.27 * temperatureC;
  const denominator = temperatureC + 237.3;
  const exponent = numerator / denominator;
  const es = 0.6108 * math.exp(exponent);
  return Number(es);
}

export function calculateVpd(temperatureC: number, humidity: number): number {
  const es = saturationVaporPressure(temperatureC);
  const ea = es * math.max(0, math.min(1, humidity));
  const vpd = es - ea;
  return Number(math.max(0, vpd));
}

export function gaussianTemperatureFactor(temperatureC: number, optimum: number, sigma: number): number {
  const diff = temperatureC - optimum;
  const exponent = -((diff * diff) / (2 * sigma * sigma));
  return Number(math.exp(exponent));
}

export interface PhotosynthesisParams {
  lightUseEfficiency: number;
  maxAssimilationRate: number;
  halfSaturationConstant: number;
}

export function rectangularHyperbola(ppfd: number, params: PhotosynthesisParams): number {
  const numerator = params.lightUseEfficiency * ppfd;
  const denominator = 1 + numerator / params.maxAssimilationRate;
  const rate = numerator / denominator;
  return Number(math.max(0, rate));
}

export interface TranspirationParams {
  stomatalConductance: number;
  lai?: number;
  vpdClamp?: [number, number];
}

export function transpirationRate(vpd: number, params: TranspirationParams): number {
  const [minClamp, maxClamp] = params.vpdClamp ?? [0, 3];
  const effectiveVpd = math.min(math.max(vpd, minClamp), maxClamp);
  const lai = params.lai ?? DEFAULT_LAI;
  const transpiration = params.stomatalConductance * effectiveVpd * lai;
  return Number(math.max(0, transpiration));
}

export interface DeviceEffectContext {
  tickHours: number;
  zoneVolume: number;
  zoneArea: number;
}

export interface EnvironmentDelta {
  temperature: number;
  humidity: number;
  co2: number;
  ppfd: number;
}

const ZERO_DELTA: EnvironmentDelta = { temperature: 0, humidity: 0, co2: 0, ppfd: 0 };

export function accumulateDeviceEffects(
  devices: DeviceInstance[],
  environment: ZoneEnvironmentState,
  context: DeviceEffectContext
): EnvironmentDelta {
  return devices.reduce<EnvironmentDelta>((delta, device) => {
    const settings = device.blueprint.settings;
    switch (device.blueprint.kind) {
      case 'Lamp':
      case 'GrowLight': {
        const powerKw = settings.power ?? 0;
        const heatFraction = settings.heatFraction ?? 0.4;
        const addedEnergyKJ = powerKw * 1000 * context.tickHours * 3600 * heatFraction;
        const tempIncrease = addedEnergyKJ / (AIR_HEAT_CAPACITY_KJ_PER_M3_K * context.zoneVolume);
        const ppfd = settings.ppfd ?? 0;
        const coverage = settings.coverageArea ?? context.zoneArea;
        const ppfdContribution = coverage > 0 ? ppfd * math.min(1, coverage / context.zoneArea) : 0;
        return {
          temperature: delta.temperature + tempIncrease,
          humidity: delta.humidity,
          co2: delta.co2,
          ppfd: delta.ppfd + ppfdContribution
        };
      }
      case 'ClimateUnit': {
        const target = settings.targetTemperature ?? environment.temperature;
        const range = settings.targetTemperatureRange ?? [target - 1, target + 1];
        let temperatureDelta = 0;
        if (environment.temperature > range[1]) {
          const coolingCapacityKw = settings.coolingCapacity ?? settings.power ?? 0;
          const removedEnergyKJ = coolingCapacityKw * 1000 * context.tickHours * 3600;
          temperatureDelta -= removedEnergyKJ / (AIR_HEAT_CAPACITY_KJ_PER_M3_K * context.zoneVolume);
        } else if (environment.temperature < range[0]) {
          const heatingKw = settings.power ?? 0;
          const addedEnergyKJ = heatingKw * 1000 * context.tickHours * 3600;
          temperatureDelta += addedEnergyKJ / (AIR_HEAT_CAPACITY_KJ_PER_M3_K * context.zoneVolume);
        }
        const airflow = settings.airflow ?? 0;
        const humidityDelta = airflow > 0 ? -0.01 * context.tickHours * airflow / 1000 : 0;
        return {
          temperature: delta.temperature + temperatureDelta,
          humidity: delta.humidity + humidityDelta,
          co2: delta.co2,
          ppfd: delta.ppfd
        };
      }
      case 'Dehumidifier': {
        const removalRate = settings.moistureRemoval_Lph ?? 0;
        const humidityDrop =
          removalRate > 0
            ? -(removalRate * context.tickHours * LATENT_HEAT_VAPORIZATION_KJ_PER_L) /
              (LATENT_HEAT_VAPORIZATION_KJ_PER_L * context.zoneVolume)
            : 0;
        return {
          temperature: delta.temperature,
          humidity: delta.humidity + humidityDrop,
          co2: delta.co2,
          ppfd: delta.ppfd
        };
      }
      case 'CO2Injector': {
        const targetCO2 = settings.targetCO2_ppm ?? 0;
        const maxSafe = settings.maxSafeCO2_ppm ?? 1500;
        const injectionRate = settings.injectionRate_ppmPerMin ?? 0;
        const deltaCo2 = Math.min(targetCO2 - environment.co2, injectionRate * (context.tickHours * 60));
        const limited = environment.co2 + deltaCo2 > maxSafe ? maxSafe - environment.co2 : deltaCo2;
        return {
          temperature: delta.temperature,
          humidity: delta.humidity,
          co2: delta.co2 + limited,
          ppfd: delta.ppfd
        };
      }
      default:
        return delta;
    }
  }, { ...ZERO_DELTA });
}

export function mixTowardsAmbient(
  environment: ZoneEnvironmentState,
  ambient: { temperature: number; humidity: number; co2: number },
  airflow: number,
  tickHours: number
): ZoneEnvironmentState {
  const mixFactor = math.min(1, airflow * tickHours * 0.001);
  const newTemperature = environment.temperature + (ambient.temperature - environment.temperature) * mixFactor;
  const newHumidity = environment.humidity + (ambient.humidity - environment.humidity) * mixFactor;
  const newCo2 = environment.co2 + (ambient.co2 - environment.co2) * mixFactor;
  const vpd = calculateVpd(newTemperature, newHumidity);
  return {
    temperature: Number(newTemperature),
    humidity: Number(math.min(math.max(newHumidity, 0), 1)),
    co2: Number(math.max(newCo2, 0)),
    ppfd: environment.ppfd,
    vpd
  };
}

export function applyEnvironmentDelta(
  environment: ZoneEnvironmentState,
  delta: EnvironmentDelta
): ZoneEnvironmentState {
  const temperature = environment.temperature + delta.temperature;
  const humidity = math.min(math.max(environment.humidity + delta.humidity, 0), 1);
  const co2 = math.max(environment.co2 + delta.co2, 0);
  const ppfd = math.max(environment.ppfd + delta.ppfd, 0);
  const vpd = calculateVpd(temperature, humidity);
  return {
    temperature: Number(temperature),
    humidity: Number(humidity),
    co2: Number(co2),
    ppfd: Number(ppfd),
    vpd
  };
}
