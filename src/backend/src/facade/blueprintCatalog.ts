import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import type {
  ContainerBlueprint,
  ContainerPriceEntry,
  CultivationMethodBlueprint,
  CultivationMethodPriceEntry,
  DeviceBlueprint,
  DevicePriceEntry,
  StrainBlueprint,
  StrainPriceEntry,
  SubstrateBlueprint,
  SubstratePriceEntry,
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

export interface CultivationMethodCompatibility {
  compatibleSubstrateTypes?: string[];
  compatibleContainerTypes?: string[];
  strainTraitCompatibility?: CultivationMethodBlueprint['strainTraitCompatibility'];
}

export interface CultivationMethodBlueprintCatalogEntry {
  id: string;
  name: string;
  laborIntensity: number;
  areaPerPlant: number;
  minimumSpacing: number;
  maxCycles?: number;
  compatibility: CultivationMethodCompatibility;
  envBias?: CultivationMethodBlueprint['envBias'];
  capacityHints?: CultivationMethodBlueprint['capacityHints'];
  laborProfile?: CultivationMethodBlueprint['laborProfile'];
  idealConditions?: CultivationMethodBlueprint['idealConditions'];
  metadata?: CultivationMethodBlueprint['meta'];
  price?: CultivationMethodPriceEntry;
}

export interface ContainerBlueprintCatalogEntry {
  id: string;
  slug: string;
  name: string;
  type: string;
  volumeInLiters?: number;
  footprintArea?: number;
  reusableCycles?: number;
  packingDensity?: number;
  metadata?: ContainerBlueprint['meta'];
  price?: ContainerPriceEntry;
}

export interface SubstrateBlueprintCatalogEntry {
  id: string;
  slug: string;
  name: string;
  type: string;
  maxCycles?: number;
  metadata?: SubstrateBlueprint['meta'];
  price?: SubstratePriceEntry;
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

const buildCultivationMethodPriceMap = (
  repository: BlueprintRepository,
): Map<string, CultivationMethodPriceEntry> => {
  if (typeof repository.listCultivationMethodPrices !== 'function') {
    return new Map();
  }
  return new Map(repository.listCultivationMethodPrices());
};

const buildContainerPriceMap = (
  repository: BlueprintRepository,
): Map<string, ContainerPriceEntry> => {
  if (typeof repository.listContainerPrices !== 'function') {
    return new Map();
  }
  return new Map(repository.listContainerPrices());
};

const buildSubstratePriceMap = (
  repository: BlueprintRepository,
): Map<string, SubstratePriceEntry> => {
  if (typeof repository.listSubstratePrices !== 'function') {
    return new Map();
  }
  return new Map(repository.listSubstratePrices());
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

export const buildCultivationMethodBlueprintCatalog = (
  repository: BlueprintRepository,
): CultivationMethodBlueprintCatalogEntry[] => {
  const prices = buildCultivationMethodPriceMap(repository);

  return repository
    .listCultivationMethods()
    .map((method) => {
      const compatibility: CultivationMethodCompatibility = {};
      if (method.compatibleSubstrateTypes) {
        compatibility.compatibleSubstrateTypes = [...method.compatibleSubstrateTypes];
      }
      if (method.compatibleContainerTypes) {
        compatibility.compatibleContainerTypes = [...method.compatibleContainerTypes];
      }
      if (method.strainTraitCompatibility) {
        compatibility.strainTraitCompatibility = clone(method.strainTraitCompatibility);
      }

      const entry: CultivationMethodBlueprintCatalogEntry = {
        id: method.id,
        name: method.name,
        laborIntensity: method.laborIntensity,
        areaPerPlant: method.areaPerPlant,
        minimumSpacing: method.minimumSpacing,
        compatibility,
      };

      if (typeof method.maxCycles === 'number') {
        entry.maxCycles = method.maxCycles;
      }
      if (method.envBias) {
        entry.envBias = clone(method.envBias);
      }
      if (method.capacityHints) {
        entry.capacityHints = clone(method.capacityHints);
      }
      if (method.laborProfile) {
        entry.laborProfile = clone(method.laborProfile);
      }
      if (method.idealConditions) {
        entry.idealConditions = clone(method.idealConditions);
      }
      if (method.meta) {
        entry.metadata = clone(method.meta);
      }

      const price = prices.get(method.id);
      if (price) {
        entry.price = clone(price);
      }

      return entry;
    })
    .sort(sortByName);
};

export const buildContainerBlueprintCatalog = (
  repository: BlueprintRepository,
): ContainerBlueprintCatalogEntry[] => {
  const prices = buildContainerPriceMap(repository);

  return repository
    .listContainers()
    .map((container) => {
      const entry: ContainerBlueprintCatalogEntry = {
        id: container.id,
        slug: container.slug,
        name: container.name,
        type: container.type,
      };

      if (typeof container.volumeInLiters === 'number') {
        entry.volumeInLiters = container.volumeInLiters;
      }
      if (typeof container.footprintArea === 'number') {
        entry.footprintArea = container.footprintArea;
      }
      if (typeof container.reusableCycles === 'number') {
        entry.reusableCycles = container.reusableCycles;
      }
      if (typeof container.packingDensity === 'number') {
        entry.packingDensity = container.packingDensity;
      }
      if (container.meta) {
        entry.metadata = clone(container.meta);
      }

      const price = prices.get(container.slug);
      if (price) {
        entry.price = clone(price);
      }

      return entry;
    })
    .sort(sortByName);
};

export const buildSubstrateBlueprintCatalog = (
  repository: BlueprintRepository,
): SubstrateBlueprintCatalogEntry[] => {
  const prices = buildSubstratePriceMap(repository);

  return repository
    .listSubstrates()
    .map((substrate) => {
      const entry: SubstrateBlueprintCatalogEntry = {
        id: substrate.id,
        slug: substrate.slug,
        name: substrate.name,
        type: substrate.type,
      };

      if (typeof substrate.maxCycles === 'number') {
        entry.maxCycles = substrate.maxCycles;
      }
      if (substrate.meta) {
        entry.metadata = clone(substrate.meta);
      }

      const price = prices.get(substrate.slug);
      if (price) {
        entry.price = clone(price);
      }

      return entry;
    })
    .sort(sortByName);
};
