import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import type {
  DeviceBlueprint,
  DevicePriceEntry,
  StrainBlueprint,
  StrainPriceEntry,
} from '@/data/schemas/index.js';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const sortByName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'en');

export interface StrainCompatibilityHints {
  methodAffinity: Record<string, number>;
  stressTolerance?: Record<string, number>;
}

export interface StrainDefaultSettings {
  envBands?: StrainBlueprint['envBands'];
  phaseDurations?: StrainBlueprint['phaseDurations'];
  photoperiod?: StrainBlueprint['photoperiod'];
  nutrientDemand?: StrainBlueprint['nutrientDemand'];
  waterDemand?: StrainBlueprint['waterDemand'];
  growthModel?: StrainBlueprint['growthModel'];
  yieldModel?: StrainBlueprint['yieldModel'];
}

export interface StrainTraits {
  morphology?: StrainBlueprint['morphology'];
  noise?: StrainBlueprint['noise'];
}

export interface StrainBlueprintCatalogEntry {
  id: string;
  slug: string;
  name: string;
  lineage: StrainBlueprint['lineage'];
  genotype: StrainBlueprint['genotype'];
  chemotype: StrainBlueprint['chemotype'];
  generalResilience: number;
  germinationRate: number;
  compatibility: StrainCompatibilityHints;
  defaults: StrainDefaultSettings;
  traits: StrainTraits;
  metadata?: StrainBlueprint['meta'];
  price?: StrainPriceEntry;
}

export interface DeviceCompatibilityHints {
  roomPurposes: DeviceBlueprint['roomPurposes'];
}

export interface DeviceDefaultSettings {
  settings: DeviceBlueprint['settings'];
  coverage?: DeviceBlueprint['coverage'];
  limits?: DeviceBlueprint['limits'];
}

export interface DeviceBlueprintCatalogEntry {
  id: string;
  kind: string;
  name: string;
  quality: number;
  complexity: number;
  lifetimeHours: number;
  capexEur?: number;
  efficiencyDegeneration?: number;
  compatibility: DeviceCompatibilityHints;
  defaults: DeviceDefaultSettings;
  maintenance?: DeviceBlueprint['maintenance'];
  metadata?: DeviceBlueprint['meta'];
  price?: DevicePriceEntry;
}

const buildStrainPriceMap = (repository: BlueprintRepository): Map<string, StrainPriceEntry> => {
  if (typeof repository.listStrainPrices !== 'function') {
    return new Map();
  }
  return new Map(repository.listStrainPrices());
};

const buildDevicePriceMap = (repository: BlueprintRepository): Map<string, DevicePriceEntry> => {
  if (typeof repository.listDevicePrices !== 'function') {
    return new Map();
  }
  return new Map(repository.listDevicePrices());
};

export const buildStrainBlueprintCatalog = (
  repository: BlueprintRepository,
): StrainBlueprintCatalogEntry[] => {
  const prices = buildStrainPriceMap(repository);

  return repository
    .listStrains()
    .map((strain) => {
      const defaults: StrainDefaultSettings = {};
      if (strain.envBands) {
        defaults.envBands = clone(strain.envBands);
      }
      if (strain.phaseDurations) {
        defaults.phaseDurations = clone(strain.phaseDurations);
      }
      if (strain.photoperiod) {
        defaults.photoperiod = clone(strain.photoperiod);
      }
      if (strain.nutrientDemand) {
        defaults.nutrientDemand = clone(strain.nutrientDemand);
      }
      if (strain.waterDemand) {
        defaults.waterDemand = clone(strain.waterDemand);
      }
      if (strain.growthModel) {
        defaults.growthModel = clone(strain.growthModel);
      }
      if (strain.yieldModel) {
        defaults.yieldModel = clone(strain.yieldModel);
      }

      const traits: StrainTraits = {};
      if (strain.morphology) {
        traits.morphology = clone(strain.morphology);
      }
      if (strain.noise) {
        traits.noise = clone(strain.noise);
      }

      const compatibility: StrainCompatibilityHints = {
        methodAffinity: clone(strain.methodAffinity ?? {}),
      };
      if (strain.stressTolerance) {
        compatibility.stressTolerance = clone(strain.stressTolerance);
      }

      const entry: StrainBlueprintCatalogEntry = {
        id: strain.id,
        slug: strain.slug,
        name: strain.name,
        lineage: clone(strain.lineage),
        genotype: clone(strain.genotype),
        chemotype: clone(strain.chemotype),
        generalResilience: strain.generalResilience,
        germinationRate: strain.germinationRate,
        compatibility,
        defaults,
        traits,
      };

      if (strain.meta) {
        entry.metadata = clone(strain.meta);
      }

      const price = prices.get(strain.id);
      if (price) {
        entry.price = clone(price);
      }

      return entry;
    })
    .sort(sortByName);
};

export const buildDeviceBlueprintCatalog = (
  repository: BlueprintRepository,
): DeviceBlueprintCatalogEntry[] => {
  const prices = buildDevicePriceMap(repository);

  return repository
    .listDevices()
    .map((device) => {
      const defaults: DeviceDefaultSettings = {
        settings: clone(device.settings),
      };
      if (device.coverage) {
        defaults.coverage = clone(device.coverage);
      }
      if (device.limits) {
        defaults.limits = clone(device.limits);
      }

      const entry: DeviceBlueprintCatalogEntry = {
        id: device.id,
        kind: device.kind,
        name: device.name,
        quality: device.quality,
        complexity: device.complexity,
        lifetimeHours: device.lifetime_h ?? device.lifespan ?? 0,
        capexEur: device.capex_eur,
        efficiencyDegeneration: device.efficiencyDegeneration,
        compatibility: { roomPurposes: clone(device.roomPurposes) },
        defaults,
      };

      if (device.maintenance) {
        entry.maintenance = clone(device.maintenance);
      }

      if (device.meta) {
        entry.metadata = clone(device.meta);
      }

      const price = prices.get(device.id);
      if (price) {
        entry.price = clone(price);
      }

      return entry;
    })
    .sort(sortByName);
};
