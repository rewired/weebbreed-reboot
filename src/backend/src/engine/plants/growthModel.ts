import type { SimulationEvent } from '@/lib/eventBus.js';
import type { PlantStage, PlantState, ZoneEnvironmentState } from '@/state/models.js';
import type { StrainBlueprint } from '@/data/schemas/strainsSchema.js';
import {
  PLANT_BASE_GROWTH_PER_TICK,
  PLANT_RECOVERY_FACTOR,
  PLANT_STRESS_IMPACT_FACTOR,
} from '@/constants/balance.js';
import {
  advancePhenology,
  createInitialPhenologyState,
  createPhenologyConfig,
  mapStageToGrowthPhase,
  type PhenologyConfig,
  type PhenologyState,
} from './phenology.js';
import {
  calculateResourceDemand,
  type ResourceDemandResult,
  type ResourceSupply,
} from './resourceDemand.js';
import { lightSaturationResponse, ppfdToMoles } from '@/engine/physio/ppfd.js';
import { gaussianResponse } from '@/engine/physio/temp.js';
import { co2HalfSaturationResponse } from '@/engine/physio/co2.js';
import { vaporPressureDeficit } from '@/engine/physio/vpd.js';
import { estimateTranspirationLiters } from '@/engine/physio/transpiration.js';

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const DEFAULT_LIGHT_HALF_SAT = 350;
const DEFAULT_CO2_HALF_SAT = 600;
const MIN_SIGMA = 0.05;

const HEALTH_ALERT_THRESHOLDS = [
  { threshold: 0.5, severity: 'warning' as const },
  { threshold: 0.3, severity: 'critical' as const },
];

const computeVpd = vaporPressureDeficit;

const resolveLightHalfSaturation = (strain: StrainBlueprint, stage: PlantStage): number => {
  const phase = mapStageToGrowthPhase(stage);
  const range = strain.environmentalPreferences?.lightIntensity?.[phase];
  if (!range) {
    return DEFAULT_LIGHT_HALF_SAT;
  }
  const [low, high] = range;
  if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0 || high <= 0) {
    return DEFAULT_LIGHT_HALF_SAT;
  }
  return clamp((low + high) / 2, 50, 1200);
};

const resolveTemperatureResponse = (
  strain: StrainBlueprint,
  stage: PlantStage,
  temperature: number,
): number => {
  const phase = mapStageToGrowthPhase(stage);
  const range = strain.environmentalPreferences?.idealTemperature?.[phase];
  if (!range) {
    return gaussianResponse(temperature, 25, 6);
  }
  const [low, high] = range;
  const mean = (low + high) / 2;
  const sigma = Math.max((high - low) / 2, 3);
  return gaussianResponse(temperature, mean, sigma);
};

const resolveVpdResponse = (
  strain: StrainBlueprint,
  stage: PlantStage,
  temperature: number,
  vpd: number,
): number => {
  const phase = mapStageToGrowthPhase(stage);
  const humidityRange = strain.environmentalPreferences?.idealHumidity?.[phase];
  if (!humidityRange) {
    return gaussianResponse(vpd, 1.1, 0.6);
  }
  const lowRh = clamp(humidityRange[0], 0.2, 0.95);
  const highRh = clamp(humidityRange[1], lowRh + 0.05, 0.98);
  const midRh = (lowRh + highRh) / 2;
  const vpdOpt = computeVpd(temperature, midRh);
  const vpdLow = computeVpd(temperature, highRh);
  const vpdHigh = computeVpd(temperature, lowRh);
  const tolerance = Math.max(Math.abs(vpdHigh - vpdOpt), Math.abs(vpdOpt - vpdLow));
  return gaussianResponse(vpd, vpdOpt, Math.max(tolerance / 2, MIN_SIGMA));
};

const resolveCo2HalfSaturation = (strain: StrainBlueprint): number => {
  const growthRate = clamp(strain.morphology?.growthRate ?? 1, 0.3, 2);
  return clamp(DEFAULT_CO2_HALF_SAT / growthRate, 350, 900);
};

const computeCanopyInterception = (leafAreaIndex: number, canopyArea: number): number => {
  const lai = clamp(leafAreaIndex, 0.2, 6);
  const referenceArea = Math.max(canopyArea, 0.05);
  const extinctionCoefficient = 0.7;
  return clamp(1 - Math.exp(-extinctionCoefficient * lai * referenceArea), 0, 1);
};

export interface DriverEvaluation {
  response: number;
  stress: number;
}

export interface VpdEvaluation extends DriverEvaluation {
  value: number;
}

export interface TranspirationMetrics {
  liters: number;
  litersPerHour: number;
}

export interface GrowthDriverMetrics {
  light: DriverEvaluation;
  temperature: DriverEvaluation;
  co2: DriverEvaluation;
  vpd: VpdEvaluation;
  water: DriverEvaluation;
  nutrients: DriverEvaluation;
  transpiration: TranspirationMetrics;
  overallStress: number;
  combinedResponse: number;
}

export interface PlantGrowthContext {
  plant: PlantState;
  strain: StrainBlueprint;
  environment: ZoneEnvironmentState;
  tickHours: number;
  tick?: number;
  phenology?: PhenologyState;
  phenologyConfig?: PhenologyConfig;
  resourceSupply?: ResourceSupply;
  canopyAreaOverride?: number;
}

export interface PlantGrowthResult {
  plant: PlantState;
  phenology: PhenologyState;
  biomassDelta: number;
  healthDelta: number;
  qualityDelta: number;
  transpirationLiters: number;
  metrics: GrowthDriverMetrics;
  resources: ResourceDemandResult;
  events: SimulationEvent[];
}

const ensurePhenologyState = (stage: PlantStage, state?: PhenologyState): PhenologyState => {
  if (state) {
    return state;
  }
  return createInitialPhenologyState(stage);
};

const computeCombinedResponse = (responses: number[]): number => {
  const bounded = responses.map((value) => clamp(value, 0, 1));
  const product = bounded.reduce((acc, value) => acc * value, 1);
  if (product <= 0) {
    return 0;
  }
  return Math.pow(product, 1 / bounded.length);
};

const updateQuality = (
  currentQuality: number,
  newHealth: number,
  stress: number,
  tickHours: number,
): { value: number; delta: number } => {
  const qualityTarget = clamp(newHealth - stress * 0.4, 0, 1);
  const adjustmentRate = clamp(tickHours / 24, 0, 1) * 0.5;
  const delta = (qualityTarget - currentQuality) * adjustmentRate;
  const value = clamp(currentQuality + delta, 0, 1);
  return { value, delta };
};

const resolveStageCap = (
  config: PhenologyConfig,
  strain: StrainBlueprint,
  stage: PlantStage,
): number => {
  const capFraction = config.stageCaps[stage] ?? 1;
  const maxBiomassKg = Math.max(strain.growthModel?.maxBiomassDry ?? 0, 0);
  const maxBiomass = maxBiomassKg * 1_000;
  return Math.max(maxBiomass * capFraction, 0);
};

const resolveHarvestIndex = (strain: StrainBlueprint): number => {
  const harvestIndex = strain.growthModel?.harvestIndex?.targetFlowering;
  if (typeof harvestIndex === 'number' && Number.isFinite(harvestIndex)) {
    return clamp(harvestIndex, 0, 1);
  }
  return 0.65;
};

const shouldAccumulateYield = (stage: PlantStage): boolean => {
  return stage === 'flowering' || stage === 'ripening' || stage === 'harvestReady';
};

const buildHealthEvents = (
  plant: PlantState,
  newHealth: number,
  stress: number,
  tick?: number,
): SimulationEvent[] => {
  const events: SimulationEvent[] = [];
  for (const threshold of HEALTH_ALERT_THRESHOLDS) {
    const previouslyHealthy = plant.health >= threshold.threshold;
    const nowBelow = newHealth < threshold.threshold;
    if (previouslyHealthy && nowBelow) {
      events.push({
        type: 'plant.healthAlert',
        level: threshold.severity === 'critical' ? 'error' : 'warning',
        tick,
        payload: {
          plantId: plant.id,
          previousHealth: plant.health,
          health: newHealth,
          stress,
          severity: threshold.severity,
        },
      });
    }
  }
  return events;
};

const buildStageEvent = (
  plant: PlantState,
  previousStage: PlantStage,
  nextStage: PlantStage,
  tick?: number,
): SimulationEvent => ({
  type: 'plant.stageChanged',
  level: 'info',
  tick,
  payload: {
    plantId: plant.id,
    from: previousStage,
    to: nextStage,
  },
});

export const updatePlantGrowth = (context: PlantGrowthContext): PlantGrowthResult => {
  const { plant, strain, environment, tickHours, tick } = context;
  const phenologyConfig = context.phenologyConfig ?? createPhenologyConfig(strain);
  const phenologyState = ensurePhenologyState(plant.stage, context.phenology);
  const canopyArea = Math.max(context.canopyAreaOverride ?? plant.canopyCover ?? 0.1, 0.05);
  const leafAreaIndex = clamp(strain.morphology?.leafAreaIndex ?? 2.5, 0.2, 6);

  const resources = calculateResourceDemand({
    strain,
    stage: phenologyState.stage,
    canopyArea,
    tickHours,
    supply: context.resourceSupply,
  });

  const lightResponse = lightSaturationResponse(
    environment.ppfd,
    resolveLightHalfSaturation(strain, phenologyState.stage),
  );
  const temperatureResponse = resolveTemperatureResponse(
    strain,
    phenologyState.stage,
    environment.temperature,
  );
  const co2Response = co2HalfSaturationResponse(environment.co2, resolveCo2HalfSaturation(strain));
  const vpd = computeVpd(environment.temperature, environment.relativeHumidity);
  const vpdResponse = resolveVpdResponse(
    strain,
    phenologyState.stage,
    environment.temperature,
    vpd,
  );
  const waterResponse = 1 - resources.waterStress;
  const nutrientResponse = 1 - resources.nutrientStress;
  const resourceResponse = Math.min(waterResponse, nutrientResponse, resources.resourceResponse);

  const combinedResponse = computeCombinedResponse([
    lightResponse,
    temperatureResponse,
    co2Response,
    vpdResponse,
    resourceResponse,
  ]);

  const transpirationLiters = estimateTranspirationLiters({
    vpdKPa: vpd,
    canopyAreaM2: canopyArea,
    leafAreaIndex,
    durationHours: tickHours,
    stomatalFactor: combinedResponse,
  });

  const resilience = clamp(strain.generalResilience ?? 0.5, 0, 1);
  const overallStress = clamp(1 - combinedResponse, 0, 1);
  const effectiveStress = clamp(overallStress - (resilience - 0.5) * 0.3, 0, 1);

  const stressPenalty = effectiveStress * PLANT_STRESS_IMPACT_FACTOR * Math.max(tickHours, 0);
  const recoveryBonus = (1 - effectiveStress) * PLANT_RECOVERY_FACTOR * Math.max(tickHours, 0);

  const healthTarget = clamp(1 - effectiveStress, 0, 1);
  const adjustmentRate = clamp(tickHours / 24, 0, 1) * (0.6 + resilience * 0.4);
  const baselineHealthDelta = (healthTarget - plant.health) * adjustmentRate;
  const healthDelta = baselineHealthDelta - stressPenalty + recoveryBonus;
  const newHealth = clamp(plant.health + healthDelta, 0, 1);

  const { value: newQuality, delta: qualityDelta } = updateQuality(
    plant.quality,
    newHealth,
    effectiveStress,
    tickHours,
  );

  const canopyInterception = computeCanopyInterception(leafAreaIndex, canopyArea);
  const incidentMol = ppfdToMoles(environment.ppfd, tickHours);
  const absorbedMol = incidentMol * canopyInterception * lightResponse;
  const q10 = strain.growthModel?.temperature?.Q10;
  const tref = strain.growthModel?.temperature?.T_ref_C ?? 25;
  const q10Factor = q10 ? Math.pow(q10, (environment.temperature - tref) / 10) : 1;
  const baseLueKgPerMol = strain.growthModel?.baseLightUseEfficiency ?? 0.0009;
  const lue = baseLueKgPerMol * 1_000 * q10Factor;
  const baseBiomass =
    Math.max(tickHours, 0) * PLANT_BASE_GROWTH_PER_TICK * clamp(combinedResponse, 0, 1);
  const grossBiomass = baseBiomass + absorbedMol * lue * combinedResponse;
  const maintenance =
    plant.biomassDryGrams * (strain.growthModel?.maintenanceFracPerDay ?? 0) * (tickHours / 24);
  const netBiomassDelta = grossBiomass - maintenance;

  const stageCap = resolveStageCap(phenologyConfig, strain, phenologyState.stage);
  const unclampedBiomass = plant.biomassDryGrams + netBiomassDelta;
  const newBiomass = clamp(unclampedBiomass, 0, stageCap);
  const biomassDelta = newBiomass - plant.biomassDryGrams;

  const harvestIndex = resolveHarvestIndex(strain);
  const yieldDelta =
    shouldAccumulateYield(phenologyState.stage) && biomassDelta > 0
      ? biomassDelta * harvestIndex
      : 0;
  const maxYield = resolveStageCap(phenologyConfig, strain, 'harvestReady') * harvestIndex;
  const newYield = clamp(plant.yieldDryGrams + yieldDelta, 0, maxYield || Number.POSITIVE_INFINITY);

  const phenologyUpdate = advancePhenology(
    phenologyState,
    {
      tickHours,
      lightHours: tickHours * clamp(lightResponse, 0, 1),
      stress: effectiveStress,
    },
    phenologyConfig,
  );

  const updatedStage = phenologyUpdate.state.stage;
  const events: SimulationEvent[] = [];

  if (phenologyUpdate.stageChanged) {
    events.push(buildStageEvent(plant, phenologyState.stage, updatedStage, tick));
  }

  events.push(...buildHealthEvents(plant, newHealth, effectiveStress, tick));

  const metrics: GrowthDriverMetrics = {
    light: { response: lightResponse, stress: 1 - lightResponse },
    temperature: { response: temperatureResponse, stress: 1 - temperatureResponse },
    co2: { response: co2Response, stress: 1 - co2Response },
    vpd: { value: vpd, response: vpdResponse, stress: 1 - vpdResponse },
    water: { response: clamp(waterResponse, 0, 1), stress: clamp(1 - waterResponse, 0, 1) },
    nutrients: {
      response: clamp(nutrientResponse, 0, 1),
      stress: clamp(1 - nutrientResponse, 0, 1),
    },
    transpiration: {
      liters: transpirationLiters,
      litersPerHour: tickHours > 0 ? transpirationLiters / tickHours : 0,
    },
    overallStress: effectiveStress,
    combinedResponse,
  };

  const updatedPlant: PlantState = {
    ...plant,
    stage: updatedStage,
    ageInHours: plant.ageInHours + tickHours,
    biomassDryGrams: newBiomass,
    yieldDryGrams: newYield,
    health: newHealth,
    stress: effectiveStress,
    quality: newQuality,
    heightMeters: Math.max(
      plant.heightMeters + Math.max(0, biomassDelta) * 0.002,
      plant.heightMeters,
    ),
    lastMeasurementTick: tick ?? plant.lastMeasurementTick,
  };

  return {
    plant: updatedPlant,
    phenology: phenologyUpdate.state,
    biomassDelta,
    healthDelta,
    qualityDelta,
    transpirationLiters,
    metrics,
    resources,
    events,
  };
};
