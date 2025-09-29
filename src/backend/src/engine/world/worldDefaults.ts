import {
  DEFAULT_MAINTENANCE_INTERVAL_TICKS,
  DEFAULT_ZONE_NUTRIENT_LITERS,
  DEFAULT_ZONE_RESERVOIR_LEVEL,
  DEFAULT_ZONE_WATER_LITERS,
} from '@/constants/world.js';
import type {
  DeviceFailureModifiers,
  PlantStressModifiers,
  ZoneHealthState,
  ZoneMetricState,
  ZoneResourceState,
  ZoneState,
} from '@/state/models.js';

export const deriveDuplicateName = (original: string, fallbackSuffix: string): string => {
  const trimmed = original.trim();
  if (trimmed.length === 0) {
    return fallbackSuffix;
  }
  if (trimmed.toLowerCase().includes('copy')) {
    return trimmed;
  }
  return `${trimmed} Copy`;
};

export const cloneMetrics = (source: ZoneMetricState, tick: number): ZoneMetricState => ({
  averageTemperature: source.averageTemperature,
  averageHumidity: source.averageHumidity,
  averageCo2: source.averageCo2,
  averagePpfd: source.averagePpfd,
  stressLevel: source.stressLevel,
  lastUpdatedTick: tick,
});

export const cloneCultivation = (
  cultivation: ZoneState['cultivation'] | undefined,
): ZoneState['cultivation'] | undefined => {
  if (!cultivation) {
    return undefined;
  }

  const cloned: ZoneState['cultivation'] = {};
  if (cultivation.container) {
    cloned.container = { ...cultivation.container };
  }
  if (cultivation.substrate) {
    cloned.substrate = { ...cultivation.substrate };
  }
  return cloned;
};

export const createDefaultResources = (): ZoneResourceState => ({
  waterLiters: DEFAULT_ZONE_WATER_LITERS,
  nutrientSolutionLiters: DEFAULT_ZONE_NUTRIENT_LITERS,
  nutrientStrength: 1,
  substrateHealth: 1,
  reservoirLevel: DEFAULT_ZONE_RESERVOIR_LEVEL,
  lastTranspirationLiters: 0,
});

export const createEmptyHealth = (): ZoneHealthState => ({
  plantHealth: {},
  pendingTreatments: [],
  appliedTreatments: [],
});

export const cloneEnvironment = (
  environment: ZoneState['environment'],
): ZoneState['environment'] => ({
  temperature: environment.temperature,
  relativeHumidity: environment.relativeHumidity,
  co2: environment.co2,
  ppfd: environment.ppfd,
  vpd: environment.vpd,
});

export const cloneControl = (control: ZoneState['control'] | undefined): ZoneState['control'] => {
  if (!control) {
    return { setpoints: {} } satisfies ZoneState['control'];
  }
  const setpoints = control.setpoints ?? {};
  return {
    setpoints: {
      temperature: setpoints.temperature,
      humidity: setpoints.humidity,
      co2: setpoints.co2,
      ppfd: setpoints.ppfd,
      vpd: setpoints.vpd,
    },
  } satisfies ZoneState['control'];
};

export const clonePlantStressModifiers = (source: PlantStressModifiers): PlantStressModifiers => ({
  optimalRangeMultiplier: source.optimalRangeMultiplier,
  stressAccumulationMultiplier: source.stressAccumulationMultiplier,
});

export const cloneDeviceFailureModifiers = (
  source: DeviceFailureModifiers,
): DeviceFailureModifiers => ({
  mtbfMultiplier: source.mtbfMultiplier,
});

export const deepCloneSettings = (settings: Record<string, unknown>): Record<string, unknown> => {
  return JSON.parse(JSON.stringify(settings));
};

export const defaultMaintenanceIntervalTicks = DEFAULT_MAINTENANCE_INTERVAL_TICKS;
