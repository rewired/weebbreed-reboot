import { promises as fs } from 'fs';
import path from 'path';
import type { DeviceBlueprint } from '../../../data/schemas/index.js';
import type { StructureBlueprint } from '../models.js';
import type { RngStream } from '../../lib/rng.js';
import { readJsonFile } from './common.js';

interface RawStructureBlueprint {
  id: string;
  name: string;
  footprint: {
    length_m: number;
    width_m: number;
    height_m: number;
  };
  rentalCostPerSqmPerMonth: number;
  upfrontFee: number;
}

const normaliseStructureBlueprint = (blueprint: RawStructureBlueprint): StructureBlueprint => ({
  id: blueprint.id,
  name: blueprint.name,
  footprint: {
    length: blueprint.footprint.length_m,
    width: blueprint.footprint.width_m,
    height: blueprint.footprint.height_m,
  },
  rentalCostPerSqmPerMonth: blueprint.rentalCostPerSqmPerMonth,
  upfrontFee: blueprint.upfrontFee,
});

export const loadStructureBlueprints = async (
  dataDirectory: string,
): Promise<StructureBlueprint[]> => {
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
    blueprints.push(normaliseStructureBlueprint(raw));
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

export const chooseDeviceBlueprints = (
  devices: DeviceBlueprint[],
  stream: RngStream,
): DeviceBlueprint[] => {
  const byKind = new Map<string, DeviceBlueprint[]>();
  for (const device of devices) {
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

  if (selected.length === 0 && devices.length > 0) {
    selected.push(selectBlueprint(devices, stream));
  }

  return selected;
};
