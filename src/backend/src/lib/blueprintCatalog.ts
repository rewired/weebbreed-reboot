import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import type {
  DeviceBlueprint,
  DeviceRoomPurposeCompatibility,
} from '@/data/schemas/deviceSchema.js';
import type { CultivationMethodBlueprint } from '@/data/schemas/cultivationMethodSchema.js';
import type { StrainBlueprint } from '@/data/schemas/strainsSchema.js';

export interface BlueprintCatalogStrainDto {
  id: string;
  slug: string;
  name: string;
  genotype: StrainBlueprint['genotype'];
  chemotype: StrainBlueprint['chemotype'];
  morphology: Pick<StrainBlueprint['morphology'], 'growthRate' | 'yieldFactor' | 'leafAreaIndex'>;
  photoperiod: StrainBlueprint['photoperiod'];
  harvestWindow: StrainBlueprint['harvestWindow'];
  generalResilience: number;
  germinationRate: number;
}

export type RoomPurposeCompatibilitySummary =
  | { mode: 'all' }
  | { mode: 'restricted'; roomPurposes: string[] };

export type DeviceSettingsSummaryValue = number | readonly number[];

export type DeviceSettingsSummary = Record<string, DeviceSettingsSummaryValue>;

export interface BlueprintCatalogDeviceDto {
  id: string;
  name: string;
  kind: DeviceBlueprint['kind'];
  quality: number;
  complexity: number;
  lifespan: number;
  compatibility: RoomPurposeCompatibilitySummary;
  settings: DeviceSettingsSummary;
}

export interface BlueprintCatalogCultivationMethodDto {
  id: string;
  name: string;
  areaPerPlant: number;
  minimumSpacing: number;
  strainTraitCompatibility?: CultivationMethodBlueprint['strainTraitCompatibility'];
}

export interface BlueprintCatalogDto {
  strains: BlueprintCatalogStrainDto[];
  devices: BlueprintCatalogDeviceDto[];
  cultivationMethods: BlueprintCatalogCultivationMethodDto[];
}

export type BlueprintCatalogSource = Pick<
  BlueprintRepository,
  'listStrains' | 'listDevices' | 'listCultivationMethods'
>;

const normaliseCompatibility = (
  value: DeviceRoomPurposeCompatibility,
): RoomPurposeCompatibilitySummary => {
  if (value === '*') {
    return { mode: 'all' };
  }
  return { mode: 'restricted', roomPurposes: [...value] };
};

const createDeviceSettingsSummary = (blueprint: DeviceBlueprint): DeviceSettingsSummary => {
  const settings = blueprint.settings;
  const summary: DeviceSettingsSummary = {};
  if (!settings) {
    return summary;
  }
  for (const [key, rawValue] of Object.entries(settings)) {
    if (typeof rawValue === 'number') {
      summary[key] = rawValue;
      continue;
    }
    if (Array.isArray(rawValue) && rawValue.every((item) => typeof item === 'number')) {
      summary[key] = [...rawValue];
    }
  }
  return summary;
};

const mapDevice = (blueprint: DeviceBlueprint): BlueprintCatalogDeviceDto => ({
  id: blueprint.id,
  name: blueprint.name,
  kind: blueprint.kind,
  quality: blueprint.quality,
  complexity: blueprint.complexity,
  lifespan: blueprint.lifespan,
  compatibility: normaliseCompatibility(blueprint.roomPurposes),
  settings: createDeviceSettingsSummary(blueprint),
});

const mapCultivationMethod = (
  blueprint: CultivationMethodBlueprint,
): BlueprintCatalogCultivationMethodDto => ({
  id: blueprint.id,
  name: blueprint.name,
  areaPerPlant: blueprint.areaPerPlant,
  minimumSpacing: blueprint.minimumSpacing,
  strainTraitCompatibility: blueprint.strainTraitCompatibility
    ? {
        preferred: blueprint.strainTraitCompatibility.preferred
          ? { ...blueprint.strainTraitCompatibility.preferred }
          : undefined,
        conflicting: blueprint.strainTraitCompatibility.conflicting
          ? { ...blueprint.strainTraitCompatibility.conflicting }
          : undefined,
      }
    : undefined,
});

const mapStrain = (blueprint: StrainBlueprint): BlueprintCatalogStrainDto => ({
  id: blueprint.id,
  slug: blueprint.slug,
  name: blueprint.name,
  genotype: { ...blueprint.genotype },
  chemotype: { ...blueprint.chemotype },
  morphology: {
    growthRate: blueprint.morphology.growthRate,
    yieldFactor: blueprint.morphology.yieldFactor,
    leafAreaIndex: blueprint.morphology.leafAreaIndex,
  },
  photoperiod: {
    vegetationTime: blueprint.photoperiod.vegetationTime,
    floweringTime: blueprint.photoperiod.floweringTime,
    transitionTrigger: blueprint.photoperiod.transitionTrigger,
  },
  harvestWindow: [...blueprint.harvestWindow],
  generalResilience: blueprint.generalResilience,
  germinationRate: blueprint.germinationRate,
});

export const createBlueprintCatalog = (source: BlueprintCatalogSource): BlueprintCatalogDto => {
  const strains = source.listStrains().map(mapStrain);
  const devices = source.listDevices().map(mapDevice);
  const cultivationMethods = source.listCultivationMethods().map(mapCultivationMethod);
  return {
    strains,
    devices,
    cultivationMethods,
  };
};

export default createBlueprintCatalog;
