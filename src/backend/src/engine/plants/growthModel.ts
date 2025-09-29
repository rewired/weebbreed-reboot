import type { SimulationEvent } from '@/lib/eventBus.js';
import type { PlantStage, PlantState, ZoneEnvironmentState } from '@/state/types.js';
import type { StrainBlueprint } from '@/data/schemas/strainsSchema.js';
import {
  PLANT_BASE_GROWTH_PER_TICK,
  PLANT_RECOVERY_FACTOR,
  PLANT_STRESS_IMPACT_FACTOR,
} from '@/constants/balance.js';
import {
  PLANT_CANOPY_AREA_MIN,
  PLANT_CANOPY_LIGHT_EXTINCTION_COEFFICIENT,
  PLANT_DEFAULT_CANOPY_COVER,
  PLANT_DEFAULT_CO2_HALF_SATURATION,
  PLANT_DEFAULT_GROWTH_RATE,
  PLANT_DEFAULT_HARVEST_INDEX,
  PLANT_DEFAULT_LEAF_AREA_INDEX,
  PLANT_DEFAULT_LIGHT_HALF_SATURATION,
  PLANT_DEFAULT_RESILIENCE,
  PLANT_DEFAULT_TEMPERATURE_GAUSSIAN_MEAN_C,
  PLANT_DEFAULT_TEMPERATURE_GAUSSIAN_SIGMA_C,
  PLANT_DEFAULT_VPD_GAUSSIAN_MEAN_KPA,
  PLANT_DEFAULT_VPD_GAUSSIAN_SIGMA_KPA,
  PLANT_HEALTH_ALERT_THRESHOLDS,
  PLANT_HEALTH_BASE_RECOVERY_RATE,
  PLANT_HEALTH_RESILIENCE_RECOVERY_BONUS,
  PLANT_HEIGHT_PER_GRAM_MULTIPLIER,
  PLANT_LEAF_AREA_INDEX_MAX,
  PLANT_LEAF_AREA_INDEX_MIN,
  PLANT_LIGHT_HALF_SATURATION_MAX,
  PLANT_LIGHT_HALF_SATURATION_MIN,
  PLANT_MAX_GROWTH_RATE,
  PLANT_MIN_GROWTH_RATE,
  PLANT_MIN_TEMPERATURE_GAUSSIAN_SIGMA_C,
  PLANT_QUALITY_BASE_ADJUSTMENT_RATE,
  PLANT_QUALITY_STRESS_FACTOR,
  PLANT_RESILIENCE_STRESS_RELIEF_FACTOR,
  PLANT_VPD_RELATIVE_HUMIDITY_LOW_MAX,
  PLANT_VPD_RELATIVE_HUMIDITY_MAX,
  PLANT_VPD_RELATIVE_HUMIDITY_MIN,
  PLANT_VPD_RELATIVE_HUMIDITY_MIN_SPAN,
  PLANT_VPD_TOLERANCE_FACTOR,
  PLANT_CO2_HALF_SATURATION_MAX,
  PLANT_CO2_HALF_SATURATION_MIN,
} from '@/constants/plants.js';
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
import { GAUSSIAN_MIN_SIGMA } from '@/constants/physiology.js';

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
};

const computeVpd = vaporPressureDeficit;

const resolveLightHalfSaturation = (strain: StrainBlueprint, stage: PlantStage): number => {
  const phase = mapStageToGrowthPhase(stage);
  const range = strain.environmentalPreferences?.lightIntensity?.[phase];
  if (!range) {
    return PLANT_DEFAULT_LIGHT_HALF_SATURATION;
  }
  const [low, high] = range;
  if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0 || high <= 0) {
    return PLANT_DEFAULT_LIGHT_HALF_SATURATION;
  }
  return clamp((low + high) / 2, PLANT_LIGHT_HALF_SATURATION_MIN, PLANT_LIGHT_HALF_SATURATION_MAX);
};

const resolveTemperatureResponse = (
  strain: StrainBlueprint,
  stage: PlantStage,
  temperature: number,
): number => {
  const phase = mapStageToGrowthPhase(stage);
  const range = strain.environmentalPreferences?.idealTemperature?.[phase];
  if (!range) {
    return gaussianResponse(
      temperature,
      PLANT_DEFAULT_TEMPERATURE_GAUSSIAN_MEAN_C,
      PLANT_DEFAULT_TEMPERATURE_GAUSSIAN_SIGMA_C,
    );
  }
  const [low, high] = range;
  const mean = (low + high) / 2;
  const sigma = Math.max((high - low) / 2, PLANT_MIN_TEMPERATURE_GAUSSIAN_SIGMA_C);
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
    return gaussianResponse(
      vpd,
      PLANT_DEFAULT_VPD_GAUSSIAN_MEAN_KPA,
      PLANT_DEFAULT_VPD_GAUSSIAN_SIGMA_KPA,
    );
  }
  const lowRh = clamp(
    humidityRange[0],
    PLANT_VPD_RELATIVE_HUMIDITY_MIN,
    PLANT_VPD_RELATIVE_HUMIDITY_LOW_MAX,
  );
  const highRh = clamp(
    humidityRange[1],
    lowRh + PLANT_VPD_RELATIVE_HUMIDITY_MIN_SPAN,
    PLANT_VPD_RELATIVE_HUMIDITY_MAX,
  );
  const midRh = (lowRh + highRh) / 2;
  const vpdOpt = computeVpd(temperature, midRh);
  const vpdLow = computeVpd(temperature, highRh);
  const vpdHigh = computeVpd(temperature, lowRh);
  const tolerance = Math.max(Math.abs(vpdHigh - vpdOpt), Math.abs(vpdOpt - vpdLow));
  return gaussianResponse(
    vpd,
    vpdOpt,
    Math.max(tolerance * PLANT_VPD_TOLERANCE_FACTOR, GAUSSIAN_MIN_SIGMA),
  );
};

const resolveCo2HalfSaturation = (strain: StrainBlueprint): number => {
  const growthRate = clamp(
    strain.morphology?.growthRate ?? PLANT_DEFAULT_GROWTH_RATE,
    PLANT_MIN_GROWTH_RATE,
    PLANT_MAX_GROWTH_RATE,
  );
  return clamp(
    PLANT_DEFAULT_CO2_HALF_SATURATION / growthRate,
    PLANT_CO2_HALF_SATURATION_MIN,
    PLANT_CO2_HALF_SATURATION_MAX,
  );
};

const computeCanopyInterception = (leafAreaIndex: number): number => {
  const lai = clamp(leafAreaIndex, PLANT_LEAF_AREA_INDEX_MIN, PLANT_LEAF_AREA_INDEX_MAX);
  const extinctionCoefficient = PLANT_CANOPY_LIGHT_EXTINCTION_COEFFICIENT;
  return clamp(1 - Math.exp(-extinctionCoefficient * lai), 0, 1);
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
  const qualityTarget = clamp(newHealth - stress * PLANT_QUALITY_STRESS_FACTOR, 0, 1);
  const adjustmentRate = clamp(tickHours / 24, 0, 1) * PLANT_QUALITY_BASE_ADJUSTMENT_RATE;
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
  const maxBiomassKg = Math.max(toFiniteNumber(strain.growthModel?.maxBiomassDry) ?? 0, 0);
  const maxBiomass = maxBiomassKg * 1_000;
  return Math.max(maxBiomass * capFraction, 0);
};

const resolveHarvestIndex = (strain: StrainBlueprint): number => {
  const harvestIndex = toFiniteNumber(strain.growthModel?.harvestIndex?.targetFlowering);
  if (typeof harvestIndex === 'number') {
    return clamp(harvestIndex, 0, 1);
  }
  return PLANT_DEFAULT_HARVEST_INDEX;
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
  for (const threshold of PLANT_HEALTH_ALERT_THRESHOLDS) {
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
  const canopyArea = Math.max(
    context.canopyAreaOverride ?? plant.canopyCover ?? PLANT_DEFAULT_CANOPY_COVER,
    PLANT_CANOPY_AREA_MIN,
  );
  const leafAreaIndex = clamp(
    strain.morphology?.leafAreaIndex ?? PLANT_DEFAULT_LEAF_AREA_INDEX,
    PLANT_LEAF_AREA_INDEX_MIN,
    PLANT_LEAF_AREA_INDEX_MAX,
  );

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

  const resilience = clamp(strain.generalResilience ?? PLANT_DEFAULT_RESILIENCE, 0, 1);
  const overallStress = clamp(1 - combinedResponse, 0, 1);
  const effectiveStress = clamp(
    overallStress - (resilience - PLANT_DEFAULT_RESILIENCE) * PLANT_RESILIENCE_STRESS_RELIEF_FACTOR,
    0,
    1,
  );

  const stressPenalty = effectiveStress * PLANT_STRESS_IMPACT_FACTOR * Math.max(tickHours, 0);
  const recoveryBonus = (1 - effectiveStress) * PLANT_RECOVERY_FACTOR * Math.max(tickHours, 0);

  const healthTarget = clamp(1 - effectiveStress, 0, 1);
  const adjustmentRate =
    clamp(tickHours / 24, 0, 1) *
    (PLANT_HEALTH_BASE_RECOVERY_RATE + resilience * PLANT_HEALTH_RESILIENCE_RECOVERY_BONUS);
  const baselineHealthDelta = (healthTarget - plant.health) * adjustmentRate;
  const healthDelta = baselineHealthDelta - stressPenalty + recoveryBonus;
  const newHealth = clamp(plant.health + healthDelta, 0, 1);

  const { value: newQuality, delta: qualityDelta } = updateQuality(
    plant.quality,
    newHealth,
    effectiveStress,
    tickHours,
  );

  const canopyInterception = computeCanopyInterception(leafAreaIndex);
  const incidentMolPerSquareMeter = ppfdToMoles(environment.ppfd, tickHours);
  const totalIncidentMol = incidentMolPerSquareMeter * canopyArea;
  const absorbedMol = Math.min(
    totalIncidentMol,
    totalIncidentMol * canopyInterception * lightResponse,
  );
  const q10Value = toFiniteNumber(strain.growthModel?.temperature?.Q10);
  const tref = toFiniteNumber(strain.growthModel?.temperature?.T_ref_C) ?? 25;
  const q10Factor =
    q10Value && q10Value > 0 ? Math.pow(q10Value, (environment.temperature - tref) / 10) : 1;
  const baseLueKgPerMol = toFiniteNumber(strain.growthModel?.baseLightUseEfficiency) ?? 0.0009;
  const lue = baseLueKgPerMol * 1_000 * q10Factor;
  const baseBiomass =
    Math.max(tickHours, 0) * PLANT_BASE_GROWTH_PER_TICK * clamp(combinedResponse, 0, 1);
  const grossBiomass = baseBiomass + absorbedMol * lue * combinedResponse;
  const maintenanceFrac = Math.max(
    toFiniteNumber(strain.growthModel?.maintenanceFracPerDay) ?? 0,
    0,
  );
  const maintenance = plant.biomassDryGrams * maintenanceFrac * (tickHours / 24);
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
      plant.heightMeters + Math.max(0, biomassDelta) * PLANT_HEIGHT_PER_GRAM_MULTIPLIER,
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
