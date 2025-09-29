import { promises as fs, Dirent } from 'fs';
import path from 'path';
import { ZodError } from 'zod';
import type { ZodType, ZodTypeDef } from 'zod';
import {
  strainSchema,
  deviceSchema,
  cultivationMethodSchema,
  roomPurposeSchema,
  devicePricesSchema,
  strainPricesSchema,
  utilityPricesSchema,
  cultivationMethodPricesSchema,
  consumablePricesSchema,
  substrateSchema,
  containerSchema,
} from './schemas/index.js';
import type {
  StrainBlueprint,
  DeviceBlueprint,
  CultivationMethodBlueprint,
  RoomPurposeBlueprint,
  DevicePriceEntry,
  StrainPriceEntry,
  UtilityPrices,
  SubstrateBlueprint,
  ContainerBlueprint,
  CultivationMethodPriceEntry,
  SubstratePriceEntry,
  ContainerPriceEntry,
} from './schemas/index.js';

export type IssueLevel = 'error' | 'warning';

export interface DataIssue {
  level: IssueLevel;
  message: string;
  file?: string;
  details?: unknown;
}

export interface DataLoadSummary {
  loadedFiles: number;
  versions: Record<string, string>;
  issues: DataIssue[];
}

export interface BlueprintData {
  strains: Map<string, StrainBlueprint>;
  devices: Map<string, DeviceBlueprint>;
  cultivationMethods: Map<string, CultivationMethodBlueprint>;
  substrates: Map<string, SubstrateBlueprint>;
  substratesByType: Map<string, SubstrateBlueprint[]>;
  containers: Map<string, ContainerBlueprint>;
  containersByType: Map<string, ContainerBlueprint[]>;
  roomPurposes: Map<string, RoomPurposeBlueprint>;
  prices: {
    devices: Map<string, DevicePriceEntry>;
    strains: Map<string, StrainPriceEntry>;
    cultivationMethods: Map<string, CultivationMethodPriceEntry>;
    consumables: {
      substrates: Map<string, SubstratePriceEntry>;
      containers: Map<string, ContainerPriceEntry>;
    };
    utility: UtilityPrices;
  };
}

export interface DataLoadResult {
  data: BlueprintData;
  summary: DataLoadSummary;
}

export interface LoadBlueprintDataOptions {
  /**
   * When true the loader will return the collected summary even if blocking
   * issues were encountered. Callers are responsible for inspecting the
   * returned summary and handling errors appropriately.
   */
  allowErrors?: boolean;
}

export class DataLoaderError extends Error {
  constructor(public readonly issues: DataIssue[]) {
    super('Data loader encountered blocking issues.');
    this.name = 'DataLoaderError';
  }
}

interface CollectionEntry<T> {
  data: T;
  file: string;
}

const JSON_EXTENSION = '.json';

type BlueprintSchema<T> = ZodType<T, ZodTypeDef, unknown>;

const formatRelative = (baseDir: string, filePath: string) =>
  path.relative(baseDir, filePath).split(path.sep).join('/');

const readJsonFile = async (filePath: string): Promise<unknown> => {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
};

const collectZodIssues = (error: ZodError): string[] =>
  error.issues.map((issue) => {
    const location = issue.path.length > 0 ? issue.path.join('.') : '<root>';
    return `${location}: ${issue.message}`;
  });

const normalizeRoomPurposeId = (value: string): string => value.trim().toLowerCase();
const normalizeRoomPurposeName = (value: string): string => value.trim().toLowerCase();
const normalizeRoomPurposeKind = (value: string): string => value.trim().toLowerCase();

const filterDuplicateRoomPurposeIds = (
  entries: CollectionEntry<RoomPurposeBlueprint>[],
  issues: DataIssue[],
): CollectionEntry<RoomPurposeBlueprint>[] => {
  const filtered: CollectionEntry<RoomPurposeBlueprint>[] = [];
  const seen = new Map<string, string>();

  for (const entry of entries) {
    const normalizedId = normalizeRoomPurposeId(entry.data.id);
    const previousFile = seen.get(normalizedId);
    if (previousFile) {
      issues.push({
        level: 'error',
        message: `Duplicate room purpose id '${entry.data.id}' detected`,
        file: entry.file,
        details: { previousFile },
      });
      continue;
    }
    seen.set(normalizedId, entry.file);
    filtered.push(entry);
  }

  return filtered;
};

const filterDuplicateRoomPurposeNames = (
  entries: CollectionEntry<RoomPurposeBlueprint>[],
  issues: DataIssue[],
): CollectionEntry<RoomPurposeBlueprint>[] => {
  const filtered: CollectionEntry<RoomPurposeBlueprint>[] = [];
  const seen = new Map<string, string>();

  for (const entry of entries) {
    const normalizedName = normalizeRoomPurposeName(entry.data.name);
    const previousFile = seen.get(normalizedName);
    if (previousFile) {
      issues.push({
        level: 'error',
        message: `Duplicate room purpose name '${entry.data.name}' detected`,
        file: entry.file,
        details: { previousFile },
      });
      continue;
    }
    seen.set(normalizedName, entry.file);
    filtered.push(entry);
  }

  return filtered;
};

const filterDuplicateRoomPurposeKinds = (
  entries: CollectionEntry<RoomPurposeBlueprint>[],
  issues: DataIssue[],
): CollectionEntry<RoomPurposeBlueprint>[] => {
  const filtered: CollectionEntry<RoomPurposeBlueprint>[] = [];
  const seen = new Map<string, string>();

  for (const entry of entries) {
    const normalizedKind = normalizeRoomPurposeKind(entry.data.kind);
    const previousFile = seen.get(normalizedKind);
    if (previousFile) {
      issues.push({
        level: 'error',
        message: `Duplicate room purpose kind '${entry.data.kind}' detected`,
        file: entry.file,
        details: { previousFile },
      });
      continue;
    }
    seen.set(normalizedKind, entry.file);
    filtered.push(entry);
  }

  return filtered;
};

const filterDuplicateSlugs = <T extends { slug: string }>(
  entries: CollectionEntry<T>[],
  issues: DataIssue[],
  kind: string,
): CollectionEntry<T>[] => {
  const filtered: CollectionEntry<T>[] = [];
  const seen = new Map<string, string>();

  for (const entry of entries) {
    const slug = entry.data.slug.toLowerCase();
    const previousFile = seen.get(slug);
    if (previousFile) {
      issues.push({
        level: 'error',
        message: `Duplicate ${kind} slug '${entry.data.slug}' detected`,
        file: entry.file,
        details: { previousFile },
      });
      continue;
    }
    seen.set(slug, entry.file);
    filtered.push(entry);
  }

  return filtered;
};

async function loadDirectoryCollection<T>(
  directory: string,
  schema: BlueprintSchema<T>,
  baseDir: string,
  summary: DataLoadSummary,
  issues: DataIssue[],
): Promise<CollectionEntry<T>[]> {
  const entries: CollectionEntry<T>[] = [];
  let dirEntries: Dirent[] = [];
  try {
    dirEntries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    issues.push({
      level: 'error',
      message: `Failed to read directory: ${(error as Error).message}`,
      file: formatRelative(baseDir, directory),
    });
    return entries;
  }

  for (const entry of dirEntries) {
    if (!entry.isFile() || !entry.name.endsWith(JSON_EXTENSION)) {
      continue;
    }
    const absoluteFile = path.join(directory, entry.name);
    const relativeFile = formatRelative(baseDir, absoluteFile);
    let payload: unknown;
    try {
      payload = await readJsonFile(absoluteFile);
    } catch (error) {
      issues.push({
        level: 'error',
        message: `Failed to parse JSON: ${(error as Error).message}`,
        file: relativeFile,
      });
      continue;
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const errorMessages = collectZodIssues(parsed.error);
      issues.push({
        level: 'error',
        message: `Schema validation failed`,
        file: relativeFile,
        details: errorMessages,
      });
      continue;
    }

    const rawRecord = payload as Record<string, unknown>;
    if (typeof rawRecord.version === 'string') {
      summary.versions[relativeFile] = rawRecord.version;
    }

    summary.loadedFiles += 1;
    entries.push({ data: parsed.data, file: relativeFile });
  }

  return entries;
}

const toMapWithDuplicateCheck = <T extends { id: string }>(
  entries: CollectionEntry<T>[],
  issues: DataIssue[],
): Map<string, T> => {
  const map = new Map<string, T>();
  const seenFiles = new Map<string, string>();
  for (const entry of entries) {
    const previousFile = seenFiles.get(entry.data.id);
    if (previousFile) {
      issues.push({
        level: 'error',
        message: `Duplicate identifier '${entry.data.id}' detected`,
        file: entry.file,
        details: { previousFile },
      });
      continue;
    }
    seenFiles.set(entry.data.id, entry.file);
    map.set(entry.data.id, entry.data);
  }
  return map;
};

const buildPriceMap = <T>(
  payload: Record<string, T>,
  file: string,
  issues: DataIssue[],
): Map<string, T> => {
  const map = new Map<string, T>();
  for (const [id, price] of Object.entries(payload)) {
    if (map.has(id)) {
      issues.push({
        level: 'error',
        message: `Duplicate price entry for '${id}'`,
        file,
      });
      continue;
    }
    map.set(id, price);
  }
  return map;
};

const runCrossChecks = (
  data: BlueprintData,
  summary: DataLoadSummary,
  context: {
    cultivationEntries: CollectionEntry<CultivationMethodBlueprint>[];
    substrateEntries: CollectionEntry<SubstrateBlueprint>[];
    containerEntries: CollectionEntry<ContainerBlueprint>[];
  },
) => {
  const issues = summary.issues;

  const strainPriceFile = 'prices/strainPrices.json';
  const devicePriceFile = 'prices/devicePrices.json';
  const cultivationMethodPriceFile = 'prices/cultivationMethodPrices.json';
  const consumablePriceFile = 'prices/consumablePrices.json';

  for (const id of data.prices.strains.keys()) {
    if (!data.strains.has(id)) {
      issues.push({
        level: 'error',
        message: `Strain price references unknown strain '${id}'`,
        file: strainPriceFile,
      });
    }
  }

  for (const id of data.prices.devices.keys()) {
    if (!data.devices.has(id)) {
      issues.push({
        level: 'error',
        message: `Device price references unknown device '${id}'`,
        file: devicePriceFile,
      });
    }
  }

  for (const id of data.prices.cultivationMethods.keys()) {
    if (!data.cultivationMethods.has(id)) {
      issues.push({
        level: 'error',
        message: `Cultivation method price references unknown method '${id}'`,
        file: cultivationMethodPriceFile,
      });
    }
  }

  for (const [id] of data.strains) {
    if (!data.prices.strains.has(id)) {
      issues.push({
        level: 'warning',
        message: `Strain '${id}' has no price entry`,
        file: strainPriceFile,
      });
    }
  }

  for (const [id] of data.devices) {
    if (!data.prices.devices.has(id)) {
      issues.push({
        level: 'warning',
        message: `Device '${id}' has no price entry`,
        file: devicePriceFile,
      });
    }
  }

  for (const [id] of data.cultivationMethods) {
    if (!data.prices.cultivationMethods.has(id)) {
      issues.push({
        level: 'warning',
        message: `Cultivation method '${id}' has no price entry`,
        file: cultivationMethodPriceFile,
      });
    }
  }

  const substrateSlugs = new Set(context.substrateEntries.map((entry) => entry.data.slug));
  const substrateTypes = new Map<string, Set<string>>();
  for (const entry of context.substrateEntries) {
    const list = substrateTypes.get(entry.data.type);
    if (list) {
      list.add(entry.data.slug);
    } else {
      substrateTypes.set(entry.data.type, new Set([entry.data.slug]));
    }
  }
  const containerSlugs = new Set(context.containerEntries.map((entry) => entry.data.slug));
  const containerTypes = context.containerEntries.reduce<Map<string, Set<string>>>((acc, entry) => {
    const existing = acc.get(entry.data.type);
    if (existing) {
      existing.add(entry.data.slug);
    } else {
      acc.set(entry.data.type, new Set([entry.data.slug]));
    }
    return acc;
  }, new Map());

  for (const slug of data.prices.consumables.substrates.keys()) {
    if (!substrateSlugs.has(slug)) {
      issues.push({
        level: 'error',
        message: `Substrate price references unknown substrate slug '${slug}'`,
        file: consumablePriceFile,
      });
    }
  }

  for (const slug of data.prices.consumables.containers.keys()) {
    if (!containerSlugs.has(slug)) {
      issues.push({
        level: 'error',
        message: `Container price references unknown container slug '${slug}'`,
        file: consumablePriceFile,
      });
    }
  }

  for (const entry of context.cultivationEntries) {
    const { compatibleSubstrateTypes = [], compatibleContainerTypes = [] } = entry.data;
    for (const type of compatibleSubstrateTypes) {
      const slugsForType = substrateTypes.get(type);
      if (!slugsForType || slugsForType.size === 0) {
        issues.push({
          level: 'error',
          message: `Cultivation method '${entry.data.id}' references unknown substrate type '${type}'`,
          file: entry.file,
        });
        continue;
      }
      const hasPricedSlug = Array.from(slugsForType).some((slug) =>
        data.prices.consumables.substrates.has(slug),
      );
      if (!hasPricedSlug) {
        issues.push({
          level: 'warning',
          message: `Substrate type '${type}' used by cultivation method '${entry.data.id}' has no priced substrate slug`,
          file: consumablePriceFile,
        });
      }
    }
    for (const type of compatibleContainerTypes) {
      const slugsForType = containerTypes.get(type);
      if (!slugsForType || slugsForType.size === 0) {
        issues.push({
          level: 'error',
          message: `Cultivation method '${entry.data.id}' references unknown container type '${type}'`,
          file: entry.file,
        });
        continue;
      }
      const hasPricedSlug = Array.from(slugsForType).some((slug) =>
        data.prices.consumables.containers.has(slug),
      );
      if (!hasPricedSlug) {
        issues.push({
          level: 'warning',
          message: `Container type '${type}' used by cultivation method '${entry.data.id}' has no priced container slug`,
          file: consumablePriceFile,
        });
      }
    }
  }
};

export const loadBlueprintData = async (
  dataDirectory: string,
  options: LoadBlueprintDataOptions = {},
): Promise<DataLoadResult> => {
  const absoluteDataDir = path.resolve(dataDirectory);
  const summary: DataLoadSummary = {
    loadedFiles: 0,
    versions: {},
    issues: [],
  };
  const issues = summary.issues;
  const { allowErrors = false } = options;

  const blueprintsDir = path.join(absoluteDataDir, 'blueprints');
  const strainDir = path.join(blueprintsDir, 'strains');
  const deviceDir = path.join(blueprintsDir, 'devices');
  const cultivationDir = path.join(blueprintsDir, 'cultivationMethods');
  const substrateDir = path.join(blueprintsDir, 'substrates');
  const containerDir = path.join(blueprintsDir, 'containers');
  const roomPurposeDir = path.join(blueprintsDir, 'roomPurposes');
  const pricesDir = path.join(absoluteDataDir, 'prices');

  const strainEntries = await loadDirectoryCollection(
    strainDir,
    strainSchema,
    absoluteDataDir,
    summary,
    issues,
  );
  const deviceEntries = await loadDirectoryCollection(
    deviceDir,
    deviceSchema,
    absoluteDataDir,
    summary,
    issues,
  );
  const cultivationEntries = await loadDirectoryCollection(
    cultivationDir,
    cultivationMethodSchema,
    absoluteDataDir,
    summary,
    issues,
  );
  const substrateEntries = filterDuplicateSlugs(
    await loadDirectoryCollection(substrateDir, substrateSchema, absoluteDataDir, summary, issues),
    issues,
    'substrate',
  );
  const containerEntries = filterDuplicateSlugs(
    await loadDirectoryCollection(containerDir, containerSchema, absoluteDataDir, summary, issues),
    issues,
    'container',
  );
  const roomPurposeEntries = await loadDirectoryCollection(
    roomPurposeDir,
    roomPurposeSchema,
    absoluteDataDir,
    summary,
    issues,
  );

  const strains = toMapWithDuplicateCheck(strainEntries, issues);
  const devices = toMapWithDuplicateCheck(deviceEntries, issues);
  const cultivationMethods = toMapWithDuplicateCheck(cultivationEntries, issues);
  const substrates = toMapWithDuplicateCheck(substrateEntries, issues);
  const containers = toMapWithDuplicateCheck(containerEntries, issues);
  const containersByType = containerEntries.reduce<Map<string, ContainerBlueprint[]>>(
    (acc, entry) => {
      const existing = acc.get(entry.data.type);
      if (existing) {
        existing.push(entry.data);
      } else {
        acc.set(entry.data.type, [entry.data]);
      }
      return acc;
    },
    new Map(),
  );
  const substratesByType = substrateEntries.reduce<Map<string, SubstrateBlueprint[]>>(
    (acc, entry) => {
      const existing = acc.get(entry.data.type);
      if (existing) {
        existing.push(entry.data);
      } else {
        acc.set(entry.data.type, [entry.data]);
      }
      return acc;
    },
    new Map(),
  );
  const filteredRoomPurposeEntries = filterDuplicateRoomPurposeKinds(
    filterDuplicateRoomPurposeNames(
      filterDuplicateRoomPurposeIds(roomPurposeEntries, issues),
      issues,
    ),
    issues,
  );
  const roomPurposes = toMapWithDuplicateCheck(filteredRoomPurposeEntries, issues);

  const loadPriceFile = async <T>(
    fileName: string,
    schema: BlueprintSchema<T>,
  ): Promise<T | undefined> => {
    const absoluteFile = path.join(pricesDir, fileName);
    const relativeFile = formatRelative(absoluteDataDir, absoluteFile);
    let payload: unknown;
    try {
      payload = await readJsonFile(absoluteFile);
    } catch (error) {
      issues.push({
        level: 'error',
        message: `Failed to parse JSON: ${(error as Error).message}`,
        file: relativeFile,
      });
      return undefined;
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      issues.push({
        level: 'error',
        message: `Schema validation failed`,
        file: relativeFile,
        details: collectZodIssues(parsed.error),
      });
      return undefined;
    }
    const rawRecord = payload as Record<string, unknown>;
    if (typeof rawRecord.version === 'string') {
      summary.versions[relativeFile] = rawRecord.version;
    }
    summary.loadedFiles += 1;
    return parsed.data;
  };

  const devicePricePayload = await loadPriceFile('devicePrices.json', devicePricesSchema);
  const strainPricePayload = await loadPriceFile('strainPrices.json', strainPricesSchema);
  const cultivationMethodPricePayload = await loadPriceFile(
    'cultivationMethodPrices.json',
    cultivationMethodPricesSchema,
  );
  const consumablePricePayload = await loadPriceFile(
    'consumablePrices.json',
    consumablePricesSchema,
  );
  const utilityPricePayload = await loadPriceFile('utilityPrices.json', utilityPricesSchema);

  const devicePrices: Map<string, DevicePriceEntry> = devicePricePayload
    ? buildPriceMap(devicePricePayload.devicePrices, 'prices/devicePrices.json', issues)
    : new Map();
  const strainPrices: Map<string, StrainPriceEntry> = strainPricePayload
    ? buildPriceMap(strainPricePayload.strainPrices, 'prices/strainPrices.json', issues)
    : new Map();
  const cultivationMethodPrices: Map<string, CultivationMethodPriceEntry> =
    cultivationMethodPricePayload
      ? buildPriceMap(
          cultivationMethodPricePayload.cultivationMethodPrices,
          'prices/cultivationMethodPrices.json',
          issues,
        )
      : new Map();
  const substratePrices: Map<string, SubstratePriceEntry> = consumablePricePayload
    ? buildPriceMap(
        consumablePricePayload.substrates,
        'prices/consumablePrices.json#substrates',
        issues,
      )
    : new Map();
  const containerPrices: Map<string, ContainerPriceEntry> = consumablePricePayload
    ? buildPriceMap(
        consumablePricePayload.containers,
        'prices/consumablePrices.json#containers',
        issues,
      )
    : new Map();
  const utilityPrices: UtilityPrices =
    utilityPricePayload ??
    ({
      pricePerKwh: 0,
      pricePerLiterWater: 0,
      pricePerGramNutrients: 0,
    } as UtilityPrices);

  const data: BlueprintData = {
    strains,
    devices,
    cultivationMethods,
    substrates,
    substratesByType,
    containers,
    containersByType,
    roomPurposes,
    prices: {
      devices: devicePrices,
      strains: strainPrices,
      cultivationMethods: cultivationMethodPrices,
      consumables: {
        substrates: substratePrices,
        containers: containerPrices,
      },
      utility: utilityPrices,
    },
  };

  runCrossChecks(data, summary, {
    cultivationEntries,
    substrateEntries,
    containerEntries,
  });

  const blockingIssues = summary.issues.filter((item) => item.level === 'error');
  if (blockingIssues.length > 0 && !allowErrors) {
    throw new DataLoaderError(blockingIssues);
  }

  return {
    data,
    summary,
  };
};
