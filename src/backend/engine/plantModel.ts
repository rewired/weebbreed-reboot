import { nanoid } from 'nanoid';
import type { PlantState, PlantStage, Strain, ZoneEnvironmentState } from '../../shared/domain.js';
import {
  gaussianTemperatureFactor,
  rectangularHyperbola,
  transpirationRate,
  calculateVpd
} from './envPhysics.js';

const DEFAULT_SEEDLING_DAYS = 7;
const DEFAULT_VEGETATION_DAYS = 28;
const DEFAULT_FLOWERING_DAYS = 56;
const DEFAULT_TEMP_SIGMA = 6;
const DEFAULT_OPTIMUM_TEMP = 25;
const DEFAULT_CO2_TARGET = 900;
const DEFAULT_STOMATAL_CONDUCTANCE = 0.1;
const DEFAULT_LIGHT_USE_EFFICIENCY = 0.85;
const DEFAULT_ASSIMILATION_MAX = 12;

export interface PlantUpdateInput {
  plant: PlantState;
  zoneArea: number;
  environment: ZoneEnvironmentState;
  tickHours: number;
}

export interface PlantUpdateResult {
  updatedPlant: PlantState;
  stageChanged?: { previous: PlantStage; current: PlantStage };
  waterDemand_L: number;
}

export function createPlantInstance(strain: Strain): PlantState {
  return {
    id: nanoid(),
    strain,
    stage: 'seedling',
    ageHours: 0,
    biomassDryGrams: 0.1,
    health: 1,
    stress: 0,
    transpiredWater_L: 0,
    lastTickPhotosynthesis_g: 0
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function computeStage(ageHours: number, strain: Strain): PlantStage {
  const vegetationDays = strain.photoperiod?.vegetationDays ?? DEFAULT_VEGETATION_DAYS;
  const floweringDays = strain.photoperiod?.floweringDays ?? DEFAULT_FLOWERING_DAYS;
  const seedlingHours = DEFAULT_SEEDLING_DAYS * 24;
  const vegetationHours = vegetationDays * 24;
  if (ageHours < seedlingHours) return 'seedling';
  if (ageHours < seedlingHours + vegetationHours) return 'vegetation';
  if (ageHours < seedlingHours + vegetationHours + floweringDays * 24) return 'flowering';
  return 'harvest-ready';
}

function rangePenalty(value: number, range?: [number, number]): number {
  if (!range) return 0;
  const [min, max] = range;
  if (value >= min && value <= max) return 0;
  const distance = value < min ? min - value : value - max;
  const span = max - min;
  return clamp01((distance / Math.max(span, 1)) ** 2);
}

function computeLightRange(strain: Strain, stage: PlantStage): [number, number] | undefined {
  const prefs = strain.environmentalPreferences;
  if (!prefs) return strain.environment?.light?.ppfdTarget
    ? [strain.environment.light.ppfdTarget * 0.8, strain.environment.light.ppfdTarget * 1.2]
    : undefined;
  const key = stage === 'seedling' ? 'seedling' : stage === 'harvest-ready' ? 'flowering' : stage;
  const range = prefs.lightIntensity?.[key];
  if (range) return range as [number, number];
  const target = strain.environment?.light?.ppfdTarget;
  return target ? [target * 0.8, target * 1.2] : undefined;
}

function computeTemperatureRange(strain: Strain, stage: PlantStage): [number, number] {
  const prefs = strain.environmentalPreferences;
  if (prefs?.idealTemperature) {
    const key = stage === 'seedling' ? 'seedling' : stage === 'harvest-ready' ? 'flowering' : stage;
    const range = prefs.idealTemperature[key];
    if (range) return range as [number, number];
  }
  const env = strain.environment?.temperature;
  if (env) return [env.optMin_C, env.optMax_C];
  return [DEFAULT_OPTIMUM_TEMP - 2, DEFAULT_OPTIMUM_TEMP + 2];
}

function computeHumidityRange(strain: Strain, stage: PlantStage): [number, number] {
  const prefs = strain.environmentalPreferences;
  if (prefs?.idealHumidity) {
    const key = stage === 'seedling' ? 'seedling' : stage === 'harvest-ready' ? 'flowering' : stage;
    const range = prefs.idealHumidity[key];
    if (range) return range as [number, number];
  }
  const env = strain.environment?.humidity;
  if (env) return [env.optMin, env.optMax];
  return [0.45, 0.75];
}

export function estimateWaterDemand(
  strain: Strain,
  stage: PlantStage,
  zoneArea: number,
  plantCount: number,
  tickHours: number
): number {
  const waterDemand = strain.waterDemand?.dailyWaterUsagePerSquareMeter?.[stage] ?? 0.3;
  const totalPerDay = waterDemand * zoneArea;
  const perPlantPerDay = totalPerDay / Math.max(plantCount, 1);
  return (perPlantPerDay * tickHours) / 24;
}

export function updatePlant(input: PlantUpdateInput, plantCountInZone: number): PlantUpdateResult {
  const { plant, zoneArea, environment, tickHours } = input;
  const newPlant: PlantState = { ...plant };
  newPlant.ageHours += tickHours;
  const previousStage = newPlant.stage;
  newPlant.stage = computeStage(newPlant.ageHours, newPlant.strain);

  const temperatureRange = computeTemperatureRange(newPlant.strain, newPlant.stage);
  const humidityRange = computeHumidityRange(newPlant.strain, newPlant.stage);
  const lightRange = computeLightRange(newPlant.strain, newPlant.stage);

  const tempOptimum = (temperatureRange[0] + temperatureRange[1]) / 2;
  const tempSigma = newPlant.strain.growthModel?.temperature?.sigma_C ?? DEFAULT_TEMP_SIGMA;
  const temperatureFactor = gaussianTemperatureFactor(environment.temperature, tempOptimum, tempSigma);

  const humidityPenalty = rangePenalty(environment.humidity, humidityRange);
  const lightPenalty = rangePenalty(environment.ppfd, lightRange);
  const vpd = calculateVpd(environment.temperature, environment.humidity);

  const resilience = 1 - (newPlant.strain.generalResilience ?? 0.5);
  const stress = clamp01((humidityPenalty + lightPenalty) * resilience);
  newPlant.stress = stress;

  const healthChange = stress > 0.3 ? -0.02 * stress : 0.01 * (1 - newPlant.health);
  newPlant.health = clamp01(newPlant.health + healthChange);

  const areaPerPlant = zoneArea / Math.max(plantCountInZone, 1);
  const tickSeconds = tickHours * 3600;
  const molPhotons = (environment.ppfd * tickSeconds) / 1_000_000;
  const lue = newPlant.strain.growthModel?.baseLUE_gPerMol ?? DEFAULT_LIGHT_USE_EFFICIENCY;
  const potentialGrowth = molPhotons * areaPerPlant * lue;

  const photosynthesisFactor = rectangularHyperbola(environment.ppfd, {
    lightUseEfficiency: 0.003,
    maxAssimilationRate: DEFAULT_ASSIMILATION_MAX,
    halfSaturationConstant: 300
  }) / DEFAULT_ASSIMILATION_MAX;

  const co2Factor = Math.min(environment.co2 / DEFAULT_CO2_TARGET, 1);
  const stressPenalty = 1 - stress * 0.6;
  const healthFactor = newPlant.health;

  const actualGrowth = clamp01(temperatureFactor * photosynthesisFactor * co2Factor) * potentialGrowth * stressPenalty * healthFactor;

  const phaseCapMultiplier = newPlant.strain.growthModel?.phaseCapMultiplier?.[newPlant.stage] ?? 1;
  const maxBiomass = (newPlant.strain.growthModel?.maxBiomassDry_g ?? 150) * phaseCapMultiplier;
  newPlant.lastTickPhotosynthesis_g = Math.max(0, actualGrowth);
  newPlant.biomassDryGrams = Math.min(maxBiomass, newPlant.biomassDryGrams + newPlant.lastTickPhotosynthesis_g);

  const transpiration = transpirationRate(vpd, {
    stomatalConductance: DEFAULT_STOMATAL_CONDUCTANCE,
    lai: newPlant.strain.morphology?.leafAreaIndex,
    vpdClamp: [0, 3]
  });
  newPlant.transpiredWater_L = transpiration * tickHours;

  const waterDemand = estimateWaterDemand(newPlant.strain, newPlant.stage, zoneArea, plantCountInZone, tickHours);

  return {
    updatedPlant: newPlant,
    stageChanged: newPlant.stage !== previousStage ? { previous: previousStage, current: newPlant.stage } : undefined,
    waterDemand_L: waterDemand
  };
}
