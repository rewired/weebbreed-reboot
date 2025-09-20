import type { PlantState, PlantStage } from '../../shared/types/simulation';
import type { StrainBlueprint } from '../../shared/types/blueprints';
import { clamp } from '../../shared/utils/math';
import { calculatePhotosynthesis, calculateTranspiration, calculateVpd, gaussianResponse } from './envPhysics';

export interface PlantModelInputs {
  plant: PlantState;
  strain: StrainBlueprint;
  environment: {
    temperature: number;
    humidity: number;
    co2: number;
    ppfd: number;
    zoneVolume: number;
  };
  tickHours: number;
}

export interface PlantModelResult {
  growthDryMatter: number;
  transpirationRate: number;
  vpd: number;
  stress: number;
  health: number;
}

const stageOrder: PlantStage[] = ['seedling', 'vegetation', 'flowering', 'harvested'];

const getStageKey = (stage: PlantStage): string => {
  if (stage === 'harvested') {
    return 'flowering';
  }
  return stage;
};

const evaluateStress = (
  stage: PlantStage,
  strain: StrainBlueprint,
  environment: PlantModelInputs['environment']
): number => {
  const stageKey = getStageKey(stage);
  const prefs = strain.environmentalPreferences;
  const [tMin, tMax] = prefs.idealTemperature[stageKey] ?? prefs.idealTemperature.vegetation;
  const [hMin, hMax] = prefs.idealHumidity[stageKey] ?? prefs.idealHumidity.vegetation;
  const [lightMin, lightMax] = prefs.lightIntensity[stageKey] ?? prefs.lightIntensity.vegetation;

  const tPenalty = Math.max(0, Math.abs(environment.temperature - (tMin + tMax) / 2) / (tMax - tMin));
  const hPenalty = Math.max(0, Math.abs(environment.humidity - (hMin + hMax) / 2) / (hMax - hMin));
  const lightPenalty = Math.max(0, Math.abs(environment.ppfd - (lightMin + lightMax) / 2) / (lightMax - lightMin));

  const combined = 0.4 * tPenalty + 0.3 * hPenalty + 0.3 * lightPenalty;
  return clamp(combined * (1 - strain.generalResilience * 0.5), 0, 1);
};

const computeHealth = (currentHealth: number, stress: number, tickHours: number): number => {
  const stressThreshold = 0.35;
  if (stress > stressThreshold) {
    const decayRate = 0.05 * stress * tickHours;
    return clamp(currentHealth - decayRate, 0, 1);
  }

  const recoveryRate = 0.02 * tickHours;
  return clamp(currentHealth + recoveryRate * (1 - stress), 0, 1);
};

export const advanceStageIfNeeded = (plant: PlantState, strain: StrainBlueprint, tickHours: number): PlantStage => {
  if (!strain.phenology?.stageLengthsDays) {
    return plant.stage;
  }

  const stageIndex = stageOrder.indexOf(plant.stage);
  if (stageIndex < 0 || stageIndex >= stageOrder.length - 1) {
    return plant.stage;
  }

  const nextStage = stageOrder[stageIndex + 1];
  const stageLengthDays = strain.phenology.stageLengthsDays[plant.stage];
  if (!stageLengthDays) {
    return plant.stage;
  }

  const newAge = plant.ageDays + tickHours / 24;
  if (newAge >= stageLengthDays) {
    return nextStage;
  }

  return plant.stage;
};

export const updatePlant = (inputs: PlantModelInputs): PlantModelResult => {
  const { plant, strain, environment, tickHours } = inputs;

  const stageKey = getStageKey(plant.stage);
  const vpd = calculateVpd({ temperature: environment.temperature, humidity: environment.humidity });
  const stress = evaluateStress(plant.stage, strain, environment);
  const health = computeHealth(plant.health, stress, tickHours);

  const lai = strain.morphology.leafAreaIndex;
  const maxTranspirationRate = 8; // mmol m^-2 s^-1
  const transpirationRate = calculateTranspiration({
    temperature: environment.temperature,
    humidity: environment.humidity,
    leafAreaIndex: lai,
    maxTranspirationRate
  });

  const idealTempRange = strain.environmentalPreferences.idealTemperature[stageKey];
  const tempOptimum = idealTempRange ? (idealTempRange[0] + idealTempRange[1]) / 2 : environment.temperature;
  const tempWidth = idealTempRange ? Math.max(1, (idealTempRange[1] - idealTempRange[0]) / 2) : 5;
  const temperatureFactor = gaussianResponse(environment.temperature, tempOptimum, tempWidth);

  const lightRange = strain.environmentalPreferences.lightIntensity[stageKey];
  const lightOptimum = lightRange ? (lightRange[0] + lightRange[1]) / 2 : environment.ppfd;
  const lightSaturation = lightRange ? lightRange[1] : environment.ppfd + 1;

  const co2Factor = clamp(environment.co2 / 1000, 0.5, 1.5);

  const photosynthesisRate = calculatePhotosynthesis({
    ppfd: environment.ppfd,
    maxPhotosynthesisRate: strain.growthModel.baseLUE_gPerMol * lightSaturation,
    lightResponseCurve: { alpha: 0.05, theta: 0.7 },
    temperatureFactor,
    co2Factor
  });

  const growthPotential = photosynthesisRate * tickHours * 3600 * 1e-6; // convert to mol per m2 -> g
  const stressPenalty = 1 - stress * 0.6;
  const actualGrowth = clamp(growthPotential * health * stressPenalty, 0, strain.growthModel.maxBiomassDry_g);

  return {
    growthDryMatter: actualGrowth,
    transpirationRate,
    vpd,
    stress,
    health
  };
};
