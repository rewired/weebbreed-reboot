import type {
  DeviceGroupSnapshot,
  DeviceSnapshot,
  FinanceSummarySnapshot,
  PlantSnapshot,
  PlantingGroupSnapshot,
  RoomSnapshot,
  SimulationSnapshot,
  StructureSnapshot,
  ZoneLightingSnapshot,
  ZonePlantingPlanSnapshot,
  ZoneResourceSnapshot,
  ZoneSnapshot,
  ZoneSupplyStatusSnapshot,
  ZoneHealthSnapshot,
} from '@/types/simulation';
import type {
  ClickDummyCandidate,
  ClickDummyGameData,
  ClickDummyKpi,
  ClickDummyRoom,
  ClickDummyStructure,
  ClickDummyZone,
} from './types';

export interface RoomPurposeDescriptor {
  id: string;
  kind: string;
  name: string;
  flags?: Record<string, boolean>;
}

export interface FixtureTranslationOptions {
  tickLengthMinutes?: number;
  startDate?: string;
  isPaused?: boolean;
  targetTickRate?: number;
  roomPurposes?: Record<string, RoomPurposeDescriptor>;
}

interface TickInfo {
  tick: number;
  day?: number;
  minutesIntoDay?: number;
}

interface NormalizedZoneKpis {
  temperature?: number;
  relativeHumidity?: number;
  co2?: number;
  ppfd?: number;
  vpd?: number;
  dli?: number;
  stressLevel?: number;
  reservoirLevel?: number;
  substrateHealth?: number;
  nutrientStrength?: number;
  waterLiters?: number;
  nutrientSolutionLiters?: number;
  transpirationLiters?: number;
  dailyWaterLiters?: number;
  dailyNutrientLiters?: number;
  reentryHours?: number;
  preHarvestHours?: number;
  diseaseCount?: number;
  pestCount?: number;
  pendingTreatmentCount?: number;
  appliedTreatmentCount?: number;
}

const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const DAYS_PER_WEEK = 7;
const WORKING_HOURS_PER_YEAR = 2080; // 52 weeks × 40 hours
const DEFAULT_START_DATE = '2025-01-01T00:00:00.000Z';
const DEFAULT_TICK_LENGTH_MINUTES = 60;
const DEFAULT_DEVICE_MAINTENANCE_DAYS = 7;
const DEFAULT_RESOURCE_WATER_LITERS = 800;
const DEFAULT_RESOURCE_NUTRIENT_LITERS = 400;
const HUMIDITY_PERCENT_SCALE = 100;
const HEALTH_PERCENT_SCALE = 100;
const STRESS_PERCENT_SCALE = 100;

const sanitizeNonNegative = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
};

const normalizeUnitInterval = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value > 1) {
    return clamp(value / HUMIDITY_PERCENT_SCALE, 0, 1);
  }
  return clamp(value, 0, 1);
};

const normalizeDurationToHours = (value: number, unit: string, titleSlug: string): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const normalizedUnit = unit.replace(/\s+/g, '').toLowerCase();
  if (normalizedUnit.includes('week') || titleSlug.includes('week')) {
    return value * HOURS_PER_DAY * DAYS_PER_WEEK;
  }
  if (normalizedUnit.includes('day') || titleSlug.includes('day')) {
    return value * HOURS_PER_DAY;
  }
  if (
    normalizedUnit.includes('hour') ||
    normalizedUnit.includes('hr') ||
    normalizedUnit === 'h' ||
    titleSlug.includes('hour')
  ) {
    return value;
  }
  if (normalizedUnit.includes('min')) {
    return value / MINUTES_PER_HOUR;
  }
  return value;
};

const sanitizeCount = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value));
};

const DEFAULT_ROOM_PURPOSES: Record<string, RoomPurposeDescriptor> = {
  growroom: { id: 'purpose:growroom', kind: 'growroom', name: 'Grow Room' },
  breakroom: { id: 'purpose:breakroom', kind: 'breakroom', name: 'Break Room' },
  processing: { id: 'purpose:processing', kind: 'processing', name: 'Processing Room' },
  drying: { id: 'purpose:drying', kind: 'drying', name: 'Drying Room' },
  curing: { id: 'purpose:curing', kind: 'curing', name: 'Curing Room' },
};

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

const parseNumber = (value: string | number | undefined): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value !== 'string') {
    return 0;
  }
  const sanitized = value
    .replace(/[^0-9.,-]+/g, '')
    .replace(/,(?=\d{3}(\D|$))/g, '')
    .replace(/,/g, '.');
  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const SUBSCRIPT_DIGIT_MAP: Record<string, string> = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
};

const slugify = (value: string): string => {
  const withNormalizedDigits = value.replace(
    /[₀₁₂₃₄₅₆₇₈₉]/g,
    (char) => SUBSCRIPT_DIGIT_MAP[char] ?? '',
  );
  return withNormalizedDigits
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
};

const normalizePurposeKey = (purpose: string | undefined): string => {
  if (!purpose) {
    return '';
  }
  return slugify(purpose);
};

const pickPurposeDescriptor = (
  purpose: string,
  overrides?: Record<string, RoomPurposeDescriptor>,
): RoomPurposeDescriptor => {
  const key = normalizePurposeKey(purpose);
  if (overrides && overrides[key]) {
    return overrides[key];
  }
  return (
    DEFAULT_ROOM_PURPOSES[key] ?? {
      id: `purpose:${key || 'general'}`,
      kind: key || 'general',
      name: purpose.trim().length > 0 ? purpose : 'General Room',
    }
  );
};

const parsePhotoperiod = (cycle: string | undefined): { on: number; off: number } | undefined => {
  if (!cycle) {
    return undefined;
  }
  const match = cycle.match(/(\d+(?:\.\d+)?)h\/(\d+(?:\.\d+)?)h/i);
  if (!match) {
    return undefined;
  }
  const on = Number.parseFloat(match[1]);
  const off = Number.parseFloat(match[2]);
  if (!Number.isFinite(on) || !Number.isFinite(off)) {
    return undefined;
  }
  return { on, off };
};

const mapKpiToNormalizedEntry = (
  kpi: ClickDummyKpi,
): [keyof NormalizedZoneKpis, number] | undefined => {
  const rawValue = parseNumber(kpi.value);
  if (!Number.isFinite(rawValue)) {
    return undefined;
  }

  const slug = slugify(kpi.title);
  const normalizedUnit = (kpi.unit ?? '').toLowerCase().replace(/\s+/g, '');
  const titleCompact = slug.replace(/-/g, '');

  if (slug.includes('pending-treatment')) {
    return ['pendingTreatmentCount', sanitizeCount(rawValue)];
  }
  if (slug.includes('applied-treatment')) {
    return ['appliedTreatmentCount', sanitizeCount(rawValue)];
  }
  if (slug.includes('disease')) {
    return ['diseaseCount', sanitizeCount(rawValue)];
  }
  if (slug.includes('pest')) {
    return ['pestCount', sanitizeCount(rawValue)];
  }
  if (slug.includes('stress')) {
    return ['stressLevel', normalizeUnitInterval(rawValue)];
  }
  if (slug.includes('humidity') || slug === 'rh' || slug.includes('relative-humidity')) {
    return ['relativeHumidity', normalizeUnitInterval(rawValue)];
  }
  if (slug.includes('temperature')) {
    return ['temperature', rawValue];
  }
  if (slug.includes('co2') || titleCompact.includes('co2')) {
    return ['co2', sanitizeNonNegative(rawValue)];
  }
  if (slug.includes('ppfd')) {
    return ['ppfd', sanitizeNonNegative(rawValue)];
  }
  if (slug.includes('vpd')) {
    return ['vpd', sanitizeNonNegative(rawValue)];
  }
  if (slug === 'dli') {
    return ['dli', sanitizeNonNegative(rawValue)];
  }

  if (normalizedUnit.includes('/day') && (slug.includes('water') || slug.includes('irrigation'))) {
    return ['dailyWaterLiters', sanitizeNonNegative(rawValue)];
  }
  if (
    normalizedUnit.includes('/day') &&
    (slug.includes('nutrient') || slug.includes('fertigation'))
  ) {
    return ['dailyNutrientLiters', sanitizeNonNegative(rawValue)];
  }

  if (
    slug.includes('water-consumption') ||
    slug.includes('daily-water') ||
    slug.includes('water-use')
  ) {
    return ['dailyWaterLiters', sanitizeNonNegative(rawValue)];
  }
  if (slug.includes('nutrient-consumption') || slug.includes('daily-nutrient')) {
    return ['dailyNutrientLiters', sanitizeNonNegative(rawValue)];
  }

  if (slug.includes('water-reserve') || slug.includes('water-available') || slug === 'water') {
    return ['waterLiters', sanitizeNonNegative(rawValue)];
  }
  if (
    slug.includes('nutrient-solution') ||
    slug.includes('nutrient-level') ||
    slug.includes('fertigation-reserve')
  ) {
    return ['nutrientSolutionLiters', sanitizeNonNegative(rawValue)];
  }
  if (slug.includes('transpiration')) {
    return ['transpirationLiters', sanitizeNonNegative(rawValue)];
  }

  if (slug.includes('reservoir')) {
    return ['reservoirLevel', normalizeUnitInterval(rawValue)];
  }
  if (slug.includes('substrate')) {
    return ['substrateHealth', normalizeUnitInterval(rawValue)];
  }
  if (slug.includes('nutrient-strength') || slug.includes('ec')) {
    return ['nutrientStrength', normalizeUnitInterval(rawValue)];
  }

  if (slug.includes('reentry') || slug.includes('re-entry')) {
    return [
      'reentryHours',
      sanitizeNonNegative(normalizeDurationToHours(rawValue, normalizedUnit, slug)),
    ];
  }
  if (slug.includes('preharvest') || slug.includes('pre-harvest')) {
    return [
      'preHarvestHours',
      sanitizeNonNegative(normalizeDurationToHours(rawValue, normalizedUnit, slug)),
    ];
  }

  return undefined;
};

const extractNormalizedKpis = (zone: ClickDummyZone): NormalizedZoneKpis => {
  const normalized: NormalizedZoneKpis = {};
  for (const kpi of zone.kpis ?? []) {
    const entry = mapKpiToNormalizedEntry(kpi);
    if (!entry) {
      continue;
    }
    const [key, value] = entry;
    if (Number.isFinite(value)) {
      normalized[key] = value;
    }
  }
  return normalized;
};

const computeDli = (ppfd: number, photoperiodOnHours: number | undefined): number | undefined => {
  if (!Number.isFinite(ppfd) || !Number.isFinite(photoperiodOnHours)) {
    return undefined;
  }
  const secondsPerHour = MINUTES_PER_HOUR * 60;
  const micromolesPerDay = ppfd * photoperiodOnHours * secondsPerHour;
  return micromolesPerDay / 1_000_000;
};

const parseTickInfo = (timeString: string | undefined, tickLengthMinutes: number): TickInfo => {
  if (!timeString || timeString.trim().length === 0) {
    return { tick: 0 };
  }
  const tickMatch = timeString.match(/tick\s*(\d+)/i);
  const dayMatch = timeString.match(/day\s*(\d+)/i);
  const timeMatch = timeString.match(/(\d{1,2}):(\d{2})/);

  const day = dayMatch ? Number.parseInt(dayMatch[1], 10) : undefined;
  const hours = timeMatch ? Number.parseInt(timeMatch[1], 10) : 0;
  const minutes = timeMatch ? Number.parseInt(timeMatch[2], 10) : 0;
  const minutesIntoDay = hours * MINUTES_PER_HOUR + minutes;

  if (tickMatch) {
    const tick = Number.parseInt(tickMatch[1], 10);
    return { tick, day, minutesIntoDay };
  }

  if (Number.isFinite(day) && Number.isFinite(minutesIntoDay)) {
    const ticksPerDay = (HOURS_PER_DAY * MINUTES_PER_HOUR) / Math.max(tickLengthMinutes, 1);
    const ticksFromDays = ((day ?? 1) - 1) * ticksPerDay;
    const ticksFromMinutes = minutesIntoDay / Math.max(tickLengthMinutes, 1);
    return { tick: Math.round(ticksFromDays + ticksFromMinutes), day, minutesIntoDay };
  }

  return { tick: 0 };
};

const toStrainId = (name: string): string => {
  const slug = slugify(name || 'unknown-strain');
  return slug.length > 0 ? `strain:${slug}` : 'strain:unknown';
};

const toStage = (phase: string | undefined): string => {
  if (!phase) {
    return 'unknown';
  }
  const base = phase.split('(')[0]?.trim();
  return base?.length ? base : 'unknown';
};

const toZoneLighting = (
  zone: ClickDummyZone,
  environmentPpfd: number,
  normalizedKpis: NormalizedZoneKpis,
): ZoneLightingSnapshot | undefined => {
  const photoperiod = parsePhotoperiod(zone.controls?.light?.cycle);
  const ppfd = normalizedKpis.ppfd ?? environmentPpfd;
  const hasDli = normalizedKpis.dli !== undefined;
  if (!photoperiod && ppfd <= 0 && !hasDli) {
    return undefined;
  }
  const lighting: ZoneLightingSnapshot = {};
  if (photoperiod) {
    lighting.photoperiodHours = photoperiod;
  }
  if (normalizedKpis.dli !== undefined) {
    lighting.dli = normalizedKpis.dli;
  } else if (photoperiod?.on !== undefined) {
    const dli = computeDli(ppfd, photoperiod.on);
    if (Number.isFinite(dli)) {
      lighting.dli = dli;
    }
  }
  if (ppfd > 0) {
    lighting.averagePpfd = ppfd;
  }
  const power = zone.controls?.light?.power;
  if (Number.isFinite(power)) {
    lighting.coverageRatio = clamp(power / 100, 0, 1);
  }
  return lighting;
};

const deriveZoneResources = (
  zone: ClickDummyZone,
  facilityWaterLiters: number | undefined,
  normalizedKpis: NormalizedZoneKpis,
  relativeHumidity: number,
): ZoneResourceSnapshot => {
  const areaFactor = zone.area > 0 ? zone.area / 50 : 1;

  const waterFromKpi = normalizedKpis.waterLiters;
  let waterLiters: number;
  if (waterFromKpi !== undefined) {
    const sanitized = sanitizeNonNegative(waterFromKpi);
    const facilityCap = Number.isFinite(facilityWaterLiters) ? facilityWaterLiters : undefined;
    waterLiters = facilityCap !== undefined ? clamp(sanitized, 0, facilityCap) : sanitized;
  } else if (Number.isFinite(facilityWaterLiters)) {
    waterLiters = clamp(
      (facilityWaterLiters ?? 0) / Math.max(areaFactor, 1),
      50,
      facilityWaterLiters ?? DEFAULT_RESOURCE_WATER_LITERS,
    );
  } else {
    waterLiters = DEFAULT_RESOURCE_WATER_LITERS * areaFactor;
  }

  const nutrientSolutionLiters =
    normalizedKpis.nutrientSolutionLiters !== undefined
      ? sanitizeNonNegative(normalizedKpis.nutrientSolutionLiters)
      : DEFAULT_RESOURCE_NUTRIENT_LITERS * areaFactor;

  const nutrientStrength =
    normalizedKpis.nutrientStrength !== undefined
      ? clamp(normalizedKpis.nutrientStrength, 0, 1)
      : 1;

  const reservoirLevel =
    normalizedKpis.reservoirLevel !== undefined
      ? clamp(normalizedKpis.reservoirLevel, 0, 1)
      : clamp(0.5 + relativeHumidity / 2, 0.25, 1);

  const stressReference = normalizedKpis.stressLevel ?? zone.stress;
  const substrateHealth =
    normalizedKpis.substrateHealth !== undefined
      ? clamp(normalizedKpis.substrateHealth, 0, 1)
      : clamp(1 - stressReference * 0.4, 0.2, 1);

  const transpiration =
    normalizedKpis.transpirationLiters !== undefined
      ? sanitizeNonNegative(normalizedKpis.transpirationLiters)
      : Math.max(0, (zone.estYield ?? zone.plants.length) * 0.1);

  return {
    waterLiters,
    nutrientSolutionLiters,
    nutrientStrength,
    substrateHealth,
    reservoirLevel,
    lastTranspirationLiters: transpiration,
  } satisfies ZoneResourceSnapshot;
};

const pickKpiValue = (zone: ClickDummyZone, title: string): number | undefined => {
  const lower = title.toLowerCase();
  const expectedSlug = slugify(title);
  const kpi = zone.kpis?.find((entry) => {
    if (entry.title.toLowerCase() === lower) {
      return true;
    }
    return slugify(entry.title) === expectedSlug;
  });
  if (!kpi) {
    return undefined;
  }
  return parseNumber(kpi.value);
};

const toEnvironment = (
  zone: ClickDummyZone,
  normalizedKpis: NormalizedZoneKpis,
): {
  temperature: number;
  relativeHumidity: number;
  co2: number;
  ppfd: number;
  vpd: number;
} => {
  const controlTemperature = zone.controls?.temperature?.value ?? 24;
  const temperature = normalizedKpis.temperature ?? controlTemperature;

  const humidityControl = zone.controls?.humidity?.value ?? 55;
  const humidityFromControl = normalizeUnitInterval(humidityControl);
  const relativeHumidity = normalizedKpis.relativeHumidity ?? humidityFromControl;

  const co2Control = zone.controls?.co2?.value ?? 800;
  const co2Kpi = normalizedKpis.co2 ?? pickKpiValue(zone, 'CO2');
  const co2 = Number.isFinite(co2Kpi) ? (co2Kpi ?? co2Control) : co2Control;

  const kpiPpfd = normalizedKpis.ppfd ?? pickKpiValue(zone, 'PPFD');
  const ppfd = Number.isFinite(kpiPpfd) ? (kpiPpfd as number) : zone.controls?.light?.on ? 800 : 0;

  const kpiVpd = normalizedKpis.vpd ?? pickKpiValue(zone, 'VPD');
  const fallbackVpd = clamp((1 - relativeHumidity) * Math.max(temperature - 10, 0) * 0.1, 0, 3);
  const vpd = Number.isFinite(kpiVpd) ? (kpiVpd as number) : fallbackVpd;

  return {
    temperature,
    relativeHumidity: clamp(relativeHumidity, 0, 1),
    co2,
    ppfd,
    vpd,
  };
};

const toZoneMetrics = (
  environment: ReturnType<typeof toEnvironment>,
  zone: ClickDummyZone,
  currentTick: number,
  normalizedKpis: NormalizedZoneKpis,
) => {
  return {
    averageTemperature: normalizedKpis.temperature ?? environment.temperature,
    averageHumidity: normalizedKpis.relativeHumidity ?? environment.relativeHumidity,
    averageCo2: normalizedKpis.co2 ?? environment.co2,
    averagePpfd: normalizedKpis.ppfd ?? environment.ppfd,
    stressLevel: clamp(normalizedKpis.stressLevel ?? zone.stress, 0, 1),
    lastUpdatedTick: currentTick,
  };
};

const toZoneSupplyStatus = (
  zone: ClickDummyZone,
  normalizedKpis: NormalizedZoneKpis,
): ZoneSupplyStatusSnapshot | undefined => {
  const estimatedYield = zone.estYield ?? 0;
  const areaFactor = Math.max(zone.area / 50, 1);

  const fallbackWater =
    Number.isFinite(estimatedYield) && estimatedYield > 0
      ? estimatedYield * 0.4 * areaFactor
      : undefined;
  const fallbackNutrient =
    Number.isFinite(estimatedYield) && estimatedYield > 0
      ? estimatedYield * 0.2 * areaFactor
      : undefined;

  const water = normalizedKpis.dailyWaterLiters ?? fallbackWater;
  const nutrient = normalizedKpis.dailyNutrientLiters ?? fallbackNutrient;

  if (water === undefined && nutrient === undefined) {
    return undefined;
  }

  const snapshot: ZoneSupplyStatusSnapshot = {};
  if (water !== undefined) {
    snapshot.dailyWaterConsumptionLiters = sanitizeNonNegative(water);
  }
  if (nutrient !== undefined) {
    snapshot.dailyNutrientConsumptionLiters = sanitizeNonNegative(nutrient);
  }
  return snapshot;
};

const toDeviceSettings = (
  zone: ClickDummyZone,
  device: DeviceSnapshot['kind'],
): Record<string, unknown> => {
  const controls = zone.controls;
  switch (device) {
    case 'hvac':
      return {
        targetTemperature: controls?.temperature?.target ?? controls?.temperature?.value,
        minTemperature: controls?.temperature?.min,
        maxTemperature: controls?.temperature?.max,
        targetHumidity: controls?.humidity?.target ?? controls?.humidity?.value,
      };
    case 'lighting':
      return {
        power: controls?.light?.power,
        isOn: controls?.light?.on,
        photoperiod: controls?.light?.cycle,
      };
    case 'climate':
    case 'co2':
      return {
        targetCo2: controls?.co2?.target ?? controls?.co2?.value,
        minCo2: controls?.co2?.min,
        maxCo2: controls?.co2?.max,
      };
    default:
      return {};
  }
};

const toDeviceKind = (deviceType: string): string => {
  const normalized = slugify(deviceType);
  if (normalized.includes('hvac')) {
    return 'hvac';
  }
  if (normalized.includes('light')) {
    return 'lighting';
  }
  if (normalized.includes('climate') || normalized.includes('co2')) {
    return 'climate';
  }
  return normalized || 'device';
};

const translateDevices = (
  zone: ClickDummyZone,
  structureId: string,
  roomId: string,
  currentTick: number,
  tickLengthMinutes: number,
): DeviceSnapshot[] => {
  if (!Array.isArray(zone.devices) || zone.devices.length === 0) {
    return [];
  }
  const baseRuntimeHours = (currentTick * tickLengthMinutes) / MINUTES_PER_HOUR;
  const maintenanceWindowTicks = Math.max(
    HOURS_PER_DAY,
    Math.round(
      (DEFAULT_DEVICE_MAINTENANCE_DAYS * HOURS_PER_DAY * MINUTES_PER_HOUR) /
        Math.max(tickLengthMinutes, 1),
    ),
  );
  return zone.devices.map((device) => {
    const kind = toDeviceKind(device.type);
    const lastServiceTick = Math.max(0, currentTick - maintenanceWindowTicks);
    const nextDueTick = currentTick + maintenanceWindowTicks;
    const efficiency = clamp(1 - zone.stress * 0.2, 0.5, 1);
    const degradation = clamp(zone.stress * 0.3, 0, 1);
    const runtimeMultiplier = kind === 'lighting' && zone.controls?.light?.on === false ? 0.25 : 1;
    const runtimeHours = baseRuntimeHours * runtimeMultiplier;
    return {
      id: device.id,
      blueprintId: `fixture:${kind}`,
      kind,
      name: device.name,
      zoneId: zone.id,
      status: degradation > 0.6 ? 'maintenance' : 'operational',
      efficiency,
      runtimeHours,
      maintenance: {
        lastServiceTick,
        nextDueTick,
        condition: clamp(1 - degradation, 0.2, 1),
        degradation,
      },
      settings: toDeviceSettings(zone, kind),
    } satisfies DeviceSnapshot;
  });
};

const translatePlants = (
  zone: ClickDummyZone,
  structureId: string,
  roomId: string,
): PlantSnapshot[] => {
  if (!Array.isArray(zone.plants) || zone.plants.length === 0) {
    return [];
  }
  const strainId = toStrainId(zone.strain || zone.plants[0]?.name || 'Unknown');
  const perPlantYield = (zone.estYield ?? 0) / Math.max(zone.plants.length, 1);
  return zone.plants.map((plant) => {
    const progressRatio = clamp(plant.progress / HEALTH_PERCENT_SCALE, 0, 1);
    const health = clamp(plant.health / HEALTH_PERCENT_SCALE, 0, 1);
    const stress = clamp((plant.stress ?? 0) / STRESS_PERCENT_SCALE, 0, 1);
    const biomassDryGrams = Math.max(
      perPlantYield * progressRatio * 4,
      perPlantYield * 0.25 * progressRatio,
    );
    const yieldDryGrams = perPlantYield * progressRatio;
    return {
      id: plant.id,
      strainId,
      stage: toStage(zone.phase),
      health,
      stress,
      biomassDryGrams,
      yieldDryGrams,
      zoneId: zone.id,
      structureId,
      roomId,
    } satisfies PlantSnapshot;
  });
};

const summarizeZoneHealth = (
  zone: ClickDummyZone,
  currentTick: number,
  tickLengthMinutes: number,
  normalizedKpis: NormalizedZoneKpis,
): ZoneHealthSnapshot => {
  const statuses = zone.plants?.map((plant) => plant.status.toLowerCase()) ?? [];
  const pestsFromPlants = statuses.filter((status) => status.includes('pest')).length;
  const diseasesFromPlants = statuses.filter((status) => status.includes('disease')).length;
  const treatmentsFromPlants = statuses.filter((status) => status.includes('treatment')).length;

  const diseases = sanitizeCount(normalizedKpis.diseaseCount ?? diseasesFromPlants);
  const pests = sanitizeCount(normalizedKpis.pestCount ?? pestsFromPlants);
  const pendingTreatments = sanitizeCount(
    normalizedKpis.pendingTreatmentCount ?? treatmentsFromPlants,
  );
  const appliedTreatments = sanitizeCount(normalizedKpis.appliedTreatmentCount ?? 0);

  const computeRestrictionTick = (hours: number | undefined): number | undefined => {
    if (!Number.isFinite(hours) || hours === undefined || hours <= 0) {
      return undefined;
    }
    const ticksOffset = Math.round((hours * MINUTES_PER_HOUR) / Math.max(tickLengthMinutes, 1));
    if (ticksOffset <= 0) {
      return currentTick;
    }
    return currentTick + ticksOffset;
  };

  const fallbackReentryHours =
    normalizedKpis.reentryHours !== undefined
      ? undefined
      : pendingTreatments > 0
        ? 12
        : pests > 0 || diseases > 0
          ? 6
          : undefined;

  const fallbackPreHarvestHours =
    normalizedKpis.preHarvestHours !== undefined
      ? undefined
      : diseases > 0
        ? HOURS_PER_DAY * 2
        : pendingTreatments > 0
          ? HOURS_PER_DAY
          : undefined;

  const reentryRestrictedUntilTick = computeRestrictionTick(
    normalizedKpis.reentryHours ?? fallbackReentryHours,
  );
  const preHarvestRestrictedUntilTick = computeRestrictionTick(
    normalizedKpis.preHarvestHours ?? fallbackPreHarvestHours,
  );

  return {
    diseases,
    pests,
    pendingTreatments,
    appliedTreatments,
    reentryRestrictedUntilTick,
    preHarvestRestrictedUntilTick,
  } satisfies ZoneHealthSnapshot;
};

const toPlantingGroups = (zone: ClickDummyZone): PlantingGroupSnapshot[] | undefined => {
  if (!Array.isArray(zone.plants) || zone.plants.length === 0) {
    return undefined;
  }
  const strainId = toStrainId(zone.strain || zone.plants[0]?.name || 'Unknown');
  const harvestReadyCount = zone.plants.filter((plant) => plant.harvestable).length;
  return [
    {
      id: `${zone.id}:group:${strainId}`,
      name: `${zone.strain || 'Unknown Strain'} Batch`,
      strainId,
      stage: toStage(zone.phase),
      harvestReadyCount,
      plantIds: zone.plants.map((plant) => plant.id),
    },
  ];
};

const toPlantingPlan = (zone: ClickDummyZone): ZonePlantingPlanSnapshot | null => {
  if (!zone.maxPlants || zone.maxPlants <= 0) {
    return null;
  }
  return {
    id: `${zone.id}:plan`,
    name: zone.method,
    strainId: toStrainId(zone.strain || zone.method || 'Unknown'),
    count: zone.maxPlants,
    autoReplant: zone.method.toLowerCase().includes('auto'),
    enabled: zone.plants.length > 0,
  } satisfies ZonePlantingPlanSnapshot;
};

const toDeviceGroups = (devices: DeviceSnapshot[]): DeviceGroupSnapshot[] | undefined => {
  if (!devices.length) {
    return undefined;
  }
  const groups = new Map<string, DeviceGroupSnapshot>();
  for (const device of devices) {
    const existing = groups.get(device.kind);
    if (existing) {
      existing.deviceIds.push(device.id);
      continue;
    }
    groups.set(device.kind, {
      id: `group:${device.kind}`,
      kind: device.kind,
      label: device.kind.charAt(0).toUpperCase() + device.kind.slice(1),
      deviceIds: [device.id],
      status: device.status === 'operational' ? 'on' : 'mixed',
      supportsScheduling: device.kind === 'lighting' || device.kind === 'hvac',
      supportsTuning: true,
    });
  }
  return Array.from(groups.values());
};

const translateZone = (
  zone: ClickDummyZone,
  structure: ClickDummyStructure,
  room: ClickDummyRoom,
  currentTick: number,
  tickLengthMinutes: number,
  facilityWaterLiters: number | undefined,
): ZoneSnapshot => {
  const normalizedKpis = extractNormalizedKpis(zone);
  const environment = toEnvironment(zone, normalizedKpis);
  const resources = deriveZoneResources(
    zone,
    facilityWaterLiters,
    normalizedKpis,
    environment.relativeHumidity,
  );
  const lighting = toZoneLighting(zone, environment.ppfd, normalizedKpis);
  const supplyStatus = toZoneSupplyStatus(zone, normalizedKpis);
  const devices = translateDevices(zone, structure.id, room.id, currentTick, tickLengthMinutes);
  const plants = translatePlants(zone, structure.id, room.id);
  const health = summarizeZoneHealth(zone, currentTick, tickLengthMinutes, normalizedKpis);
  const plantingGroups = toPlantingGroups(zone);
  const plantingPlan = toPlantingPlan(zone);
  const deviceGroups = toDeviceGroups(devices);
  const ceilingHeight = structure.footprint?.height ?? 4;
  const volume = zone.area * ceilingHeight;
  return {
    id: zone.id,
    name: zone.name,
    structureId: structure.id,
    structureName: structure.name,
    roomId: room.id,
    roomName: room.name,
    area: zone.area,
    ceilingHeight,
    volume,
    cultivationMethodId: slugify(zone.method) ? `method:${slugify(zone.method)}` : undefined,
    environment,
    resources,
    metrics: toZoneMetrics(environment, zone, currentTick, normalizedKpis),
    devices,
    plants,
    health,
    lighting,
    supplyStatus,
    plantingGroups,
    plantingPlan,
    deviceGroups,
  } satisfies ZoneSnapshot;
};

const translateRoom = (
  structure: ClickDummyStructure,
  room: ClickDummyRoom,
  currentTick: number,
  tickLengthMinutes: number,
  purposes?: Record<string, RoomPurposeDescriptor>,
  facilityWaterLiters?: number,
) => {
  const purposeDescriptor = pickPurposeDescriptor(room.purpose, purposes);
  const zoneSnapshots: ZoneSnapshot[] = [];
  for (const zone of room.zones ?? []) {
    zoneSnapshots.push(
      translateZone(zone, structure, room, currentTick, tickLengthMinutes, facilityWaterLiters),
    );
  }
  const zoneIds = zoneSnapshots.map((zone) => zone.id);
  const roomHeight = structure.footprint?.height ?? 4;
  const roomVolume = room.area * roomHeight;
  const cleanliness = clamp(
    1 - (room.zones?.reduce((sum, z) => sum + z.stress, 0) ?? 0) * 0.1,
    0.4,
    1,
  );
  const maintenanceLevel = clamp(0.8 + (room.occupancy?.current ?? 0) * 0.01, 0.8, 1);
  const roomSnapshot: RoomSnapshot = {
    id: room.id,
    name: room.name,
    structureId: structure.id,
    structureName: structure.name,
    purposeId: purposeDescriptor.id,
    purposeKind: purposeDescriptor.kind,
    purposeName: purposeDescriptor.name,
    purposeFlags: purposeDescriptor.flags,
    area: room.area,
    height: roomHeight,
    volume: roomVolume,
    cleanliness,
    maintenanceLevel,
    zoneIds,
  };
  return { roomSnapshot, zoneSnapshots };
};

const translateStructure = (
  structure: ClickDummyStructure,
  currentTick: number,
  tickLengthMinutes: number,
  purposes?: Record<string, RoomPurposeDescriptor>,
  facilityWaterLiters?: number,
) => {
  const roomSnapshots: RoomSnapshot[] = [];
  const zoneSnapshots: ZoneSnapshot[] = [];
  for (const room of structure.rooms ?? []) {
    const { roomSnapshot, zoneSnapshots: zones } = translateRoom(
      structure,
      room,
      currentTick,
      tickLengthMinutes,
      purposes,
      facilityWaterLiters,
    );
    roomSnapshots.push(roomSnapshot);
    zoneSnapshots.push(...zones);
  }
  const roomIds = roomSnapshots.map((room) => room.id);
  const area = structure.footprint.length * structure.footprint.width;
  const volume = area * structure.footprint.height;
  const structureSnapshot: StructureSnapshot = {
    id: structure.id,
    name: structure.name,
    status: 'active',
    footprint: {
      length: structure.footprint.length,
      width: structure.footprint.width,
      height: structure.footprint.height,
      area,
      volume,
    },
    rentPerTick: structure.dailyCost / HOURS_PER_DAY,
    roomIds,
  };
  return { structureSnapshot, roomSnapshots, zoneSnapshots };
};

const convertAnnualSalaryToPerTick = (annualSalary: number, tickLengthMinutes: number): number => {
  if (!Number.isFinite(annualSalary) || annualSalary <= 0) {
    return 0;
  }
  const hourlyRate = annualSalary / WORKING_HOURS_PER_YEAR;
  return hourlyRate * (tickLengthMinutes / MINUTES_PER_HOUR);
};

const translatePersonnel = (data: ClickDummyGameData, tickLengthMinutes: number) => {
  const employees =
    data.employees?.map((employee) => {
      const salaryPerTick = convertAnnualSalaryToPerTick(
        employee.expectedSalary,
        tickLengthMinutes,
      );
      const morale = clamp(0.75 + employee.traits.length * 0.03, 0.6, 0.95);
      return {
        id: employee.id,
        name: employee.name,
        role: employee.desiredRole,
        salaryPerTick,
        morale,
        energy: 0.85,
        maxMinutesPerTick: tickLengthMinutes,
        status: 'idle',
        assignedStructureId: employee.assignment,
      };
    }) ?? [];

  const applicants =
    data.candidates?.map((candidate) => translateCandidate(candidate, tickLengthMinutes)) ?? [];
  const overallMorale = employees.length
    ? employees.reduce((sum, employee) => sum + employee.morale, 0) / employees.length
    : 0.85;

  return {
    employees,
    applicants,
    overallMorale,
  } satisfies SimulationSnapshot['personnel'];
};

const translateCandidate = (candidate: ClickDummyCandidate, tickLengthMinutes: number) => {
  const expectedSalary = convertAnnualSalaryToPerTick(candidate.expectedSalary, tickLengthMinutes);
  return {
    id: candidate.id,
    name: candidate.name,
    desiredRole: candidate.desiredRole,
    expectedSalary,
    traits: candidate.traits ?? [],
    skills: candidate.skills ?? {},
  };
};

const translateFinance = (
  data: ClickDummyGameData,
  tickLengthMinutes: number,
): FinanceSummarySnapshot => {
  const ticksPerDay = (HOURS_PER_DAY * MINUTES_PER_HOUR) / Math.max(tickLengthMinutes, 1);
  const ticksPerWeek = ticksPerDay * DAYS_PER_WEEK;
  const totalRevenue = data.finance?.revenue?.total ?? 0;
  const totalOpex = data.finance?.opex?.total ?? 0;
  const totalCapex = data.finance?.capex?.total ?? 0;
  const totalExpenses = totalOpex + totalCapex;
  const lastTickRevenue = totalRevenue / Math.max(ticksPerWeek, 1);
  const lastTickExpenses = totalExpenses / Math.max(ticksPerWeek, 1);
  return {
    cashOnHand: data.globalStats?.balance ?? 0,
    reservedCash: totalCapex * 0.1,
    totalRevenue,
    totalExpenses,
    netIncome: data.finance?.netIncome7d ?? totalRevenue - totalExpenses,
    lastTickRevenue,
    lastTickExpenses,
  } satisfies FinanceSummarySnapshot;
};

export const translateClickDummyGameData = (
  data: ClickDummyGameData,
  options: FixtureTranslationOptions = {},
): SimulationSnapshot => {
  const tickLengthMinutes = options.tickLengthMinutes ?? DEFAULT_TICK_LENGTH_MINUTES;
  const startDate = new Date(options.startDate ?? DEFAULT_START_DATE);
  const tickInfo = parseTickInfo(data.globalStats?.time, tickLengthMinutes);
  const currentTick = tickInfo.tick;
  const millisecondsPerTick = tickLengthMinutes * MINUTES_PER_HOUR * 1000;
  const lastUpdatedAt = new Date(
    startDate.getTime() + currentTick * millisecondsPerTick,
  ).toISOString();
  const purposes = options.roomPurposes;
  const waterLiters = parseNumber(data.globalStats?.water);

  const structureSnapshots: StructureSnapshot[] = [];
  const roomSnapshots: RoomSnapshot[] = [];
  const zoneSnapshots: ZoneSnapshot[] = [];

  for (const structure of data.structures ?? []) {
    const {
      structureSnapshot,
      roomSnapshots: rooms,
      zoneSnapshots: zones,
    } = translateStructure(structure, currentTick, tickLengthMinutes, purposes, waterLiters);
    structureSnapshots.push(structureSnapshot);
    roomSnapshots.push(...rooms);
    zoneSnapshots.push(...zones);
  }

  const personnel = translatePersonnel(data, tickLengthMinutes);
  const finance = translateFinance(data, tickLengthMinutes);

  const snapshot: SimulationSnapshot = {
    tick: currentTick,
    clock: {
      tick: currentTick,
      isPaused: options.isPaused ?? false,
      targetTickRate: options.targetTickRate ?? 1,
      startedAt: startDate.toISOString(),
      lastUpdatedAt,
    },
    structures: structureSnapshots,
    rooms: roomSnapshots,
    zones: zoneSnapshots,
    personnel,
    finance,
  };

  return snapshot;
};
