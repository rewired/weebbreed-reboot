import { promises as fs } from 'fs';
import path from 'path';
import type { DeviceBlueprint } from '@/data/schemas/index.js';
import type { RoomPurposeSlug } from '@/engine/roomPurposes/index.js';
import type { StructureBlueprint } from '../models.js';
import type { RngStream } from '@/lib/rng.js';
import { readJsonFile } from './common.js';

interface RawStructureBlueprint {
  id: string;
  name: string;
  footprint: {
    length_m: number;
    width_m: number;
    height_m?: number;
  };
  rentalCostPerSqmPerMonth: number;
  upfrontFee: number;
}

export const DEFAULT_STRUCTURE_HEIGHT_METERS = 2.5;

export interface LoadStructureBlueprintsOptions {
  defaultHeightMeters?: number;
}

const normaliseStructureBlueprint = (
  blueprint: RawStructureBlueprint,
  defaultHeightMeters: number,
): StructureBlueprint => ({
  id: blueprint.id,
  name: blueprint.name,
  footprint: {
    length: blueprint.footprint.length_m,
    width: blueprint.footprint.width_m,
    height:
      typeof blueprint.footprint.height_m === 'number' &&
      Number.isFinite(blueprint.footprint.height_m)
        ? blueprint.footprint.height_m
        : defaultHeightMeters,
  },
  rentalCostPerSqmPerMonth: blueprint.rentalCostPerSqmPerMonth,
  upfrontFee: blueprint.upfrontFee,
});

export const loadStructureBlueprints = async (
  dataDirectory: string,
  options: LoadStructureBlueprintsOptions = {},
): Promise<StructureBlueprint[]> => {
  const defaultHeightMeters = options.defaultHeightMeters ?? DEFAULT_STRUCTURE_HEIGHT_METERS;
  const directory = path.join(dataDirectory, 'blueprints', 'structures');
  let entries: string[] = [];
  try {
    entries = await fs.readdir(directory);
  } catch (error) {
    const cause = error as NodeJS.ErrnoException;
    if (cause.code === 'ENOENT') {
      return [];
    }
    throw new Error(`Failed to read structure blueprints directory: ${cause.message}`);
  }

  const blueprints: StructureBlueprint[] = [];
  for (const entry of entries) {
    if (!entry.endsWith('.json')) {
      continue;
    }
    const filePath = path.join(directory, entry);
    const raw = await readJsonFile<RawStructureBlueprint>(filePath);
    if (!raw) {
      continue;
    }
    blueprints.push(normaliseStructureBlueprint(raw, defaultHeightMeters));
  }
  return blueprints;
};

export const sortBlueprints = <T extends { id: string; name?: string }>(
  items: readonly T[],
): T[] => {
  return [...items].sort((a, b) => {
    const left = a.name ?? a.id;
    const right = b.name ?? b.id;
    return left.localeCompare(right);
  });
};

export const selectBlueprint = <T extends { id: string; name?: string }>(
  items: readonly T[],
  stream: RngStream,
  preferredId?: string,
): T => {
  if (items.length === 0) {
    throw new Error('No blueprints available for selection.');
  }
  if (preferredId) {
    const match = items.find((item) => item.id === preferredId);
    if (match) {
      return match;
    }
  }
  if (items.length === 1) {
    return items[0];
  }
  const sorted = sortBlueprints(items);
  const index = stream.nextInt(sorted.length);
  return sorted[index];
};

const normalizeSlug = (value: string): string => value.trim().toLowerCase();

export const isDeviceCompatibleWithRoomPurpose = (
  device: DeviceBlueprint,
  roomPurpose: RoomPurposeSlug,
): boolean => {
  const compatibility = device.roomPurposes;
  if (!compatibility || compatibility === '*') {
    return true;
  }
  const normalizedRoomPurpose = normalizeSlug(roomPurpose);
  return compatibility.some((slug) => normalizeSlug(slug) === normalizedRoomPurpose);
};

export const chooseDeviceBlueprints = (
  devices: DeviceBlueprint[],
  stream: RngStream,
  roomPurpose: RoomPurposeSlug,
): DeviceBlueprint[] => {
  const compatibleDevices = devices.filter((device) =>
    isDeviceCompatibleWithRoomPurpose(device, roomPurpose),
  );

  const byKind = new Map<string, DeviceBlueprint[]>();
  for (const device of compatibleDevices) {
    const kindEntries = byKind.get(device.kind) ?? [];
    kindEntries.push(device);
    byKind.set(device.kind, kindEntries);
  }

  const selected: DeviceBlueprint[] = [];
  const desiredKinds = ['Lamp', 'ClimateUnit', 'Dehumidifier'];
  for (const kind of desiredKinds) {
    const options = byKind.get(kind);
    if (options && options.length > 0) {
      selected.push(selectBlueprint(options, stream));
    }
  }

  if (selected.length === 0 && compatibleDevices.length > 0) {
    selected.push(selectBlueprint(compatibleDevices, stream));
  }

  return selected;
};
