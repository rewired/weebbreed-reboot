export type UUID = string;

export type PlantStage = 'seedling' | 'vegetation' | 'flowering' | 'harvest-ready';

export interface GrowthModel {
  maxBiomassDry_g?: number;
  baseLUE_gPerMol?: number;
  maintenanceFracPerDay?: number;
  dryMatterFraction?: Partial<Record<'seedling' | 'vegetation' | 'flowering', number>>;
  harvestIndex?: Partial<Record<'vegetation' | 'flowering', number>>;
  phaseCapMultiplier?: Partial<Record<'seedling' | 'vegetation' | 'flowering', number>>;
  temperature?: {
    Q10?: number;
    T_ref_C?: number;
    optimum_C?: number;
    sigma_C?: number;
  };
}

export interface StrainEnvironmentalPreferences {
  lightIntensity?: Partial<Record<'seedling' | 'vegetation' | 'flowering', [number, number]>>;
  idealTemperature?: Partial<Record<'seedling' | 'vegetation' | 'flowering', [number, number]>>;
  idealHumidity?: Partial<Record<'seedling' | 'vegetation' | 'flowering', [number, number]>>;
  lightCycle?: Partial<Record<'seedling' | 'vegetation' | 'flowering', [number, number]>>;
}

export interface StrainNutrientDemandPhase {
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
}

export interface StrainNutrientDemand {
  dailyNutrientDemand?: Partial<Record<'seedling' | 'vegetation' | 'flowering', StrainNutrientDemandPhase>>;
  npkTolerance?: number;
  npkStressIncrement?: number;
}

export interface StrainWaterDemand {
  dailyWaterUsagePerSquareMeter?: Partial<Record<'seedling' | 'vegetation' | 'flowering', number>>;
  minimumFractionRequired?: number;
}

export interface StrainPhotoperiod {
  vegetationDays?: number;
  floweringDays?: number;
  transitionTriggerHours?: number;
}

export interface Strain {
  id: UUID;
  name: string;
  slug?: string;
  growthModel?: GrowthModel;
  morphology?: {
    growthRate?: number;
    yieldFactor?: number;
    leafAreaIndex?: number;
  };
  generalResilience?: number;
  environment?: {
    temperature?: { optMin_C: number; optMax_C: number };
    humidity?: { optMin: number; optMax: number };
    light?: { ppfdTarget?: number };
  };
  environmentalPreferences?: StrainEnvironmentalPreferences & Record<string, unknown>;
  nutrientDemand?: StrainNutrientDemand & Record<string, unknown>;
  waterDemand?: StrainWaterDemand & Record<string, unknown>;
  photoperiod?: StrainPhotoperiod & Record<string, unknown>;
  stageChangeThresholds?: Record<string, Record<string, number>>;
  [key: string]: unknown;
}

export interface DeviceSettings {
  power?: number;
  ppfd?: number;
  coverageArea?: number;
  heatFraction?: number;
  coolingCapacity?: number;
  airflow?: number;
  targetTemperature?: number;
  targetTemperatureRange?: [number, number];
  moistureRemoval_Lph?: number;
  injectionRate_ppmPerMin?: number;
  targetCO2_ppm?: number;
  maxSafeCO2_ppm?: number;
  [key: string]: unknown;
}

export interface DeviceBlueprint {
  id: UUID;
  name: string;
  kind: string;
  quality?: number;
  complexity?: number;
  lifespanInHours?: number;
  allowedRoomPurposes?: string[];
  settings: DeviceSettings;
  [key: string]: unknown;
}

export interface CultivationMethod {
  id: UUID;
  name: string;
  areaPerPlant_m2?: number;
  [key: string]: unknown;
}

export interface ZoneEnvironmentState {
  temperature: number;
  humidity: number;
  co2: number;
  ppfd: number;
  vpd: number;
}

export interface DeviceInstance {
  id: UUID;
  blueprint: DeviceBlueprint;
  isActive: boolean;
  coverageArea?: number;
}

export interface PlantState {
  id: UUID;
  strain: Strain;
  stage: PlantStage;
  ageHours: number;
  biomassDryGrams: number;
  health: number;
  stress: number;
  transpiredWater_L: number;
  lastTickPhotosynthesis_g: number;
}

export interface ZoneState {
  id: UUID;
  name: string;
  area: number;
  height: number;
  volume: number;
  ambient: {
    temperature: number;
    humidity: number;
    co2: number;
  };
  environment: ZoneEnvironmentState;
  devices: DeviceInstance[];
  plants: PlantState[];
  irrigationReservoir_L: number;
  lastIrrigationSatisfaction: number;
  nutrientSatisfaction: number;
  lastWaterSupplied_L?: number;
}

export interface SimulationState {
  tick: number;
  tickLengthMinutes: number;
  rngSeed: string;
  zones: ZoneState[];
  isPaused: boolean;
  accumulatedTimeMs: number;
}

export interface SimulationSnapshot {
  tick: number;
  ts: number;
  zones: ZoneState[];
}

export interface SimulationEvent<TPayload = unknown> {
  type: string;
  payload?: TPayload;
  tick: number;
  ts: number;
  level?: 'info' | 'warning' | 'error';
}
