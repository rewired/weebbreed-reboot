import { promises as fs } from 'node:fs';
import path from 'node:path';
import { strainSchema, deviceBlueprintSchema, cultivationMethodSchema } from '../schemas/blueprints.js';
import type {
  Strain,
  DeviceBlueprint,
  CultivationMethod
} from '../../shared/domain.js';

async function loadJsonFile<T>(filePath: string): Promise<T> {
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data) as T;
}

async function loadCollection<T>(dir: string, loader: (file: string) => Promise<T>): Promise<T[]> {
  const entries = await fs.readdir(dir);
  const jsonFiles = entries.filter((entry) => entry.endsWith('.json'));
  const results: T[] = [];
  for (const file of jsonFiles) {
    const filePath = path.join(dir, file);
    results.push(await loader(filePath));
  }
  return results;
}

export interface BlueprintRegistry {
  strains: Strain[];
  devices: DeviceBlueprint[];
  cultivationMethods: CultivationMethod[];
}

export async function loadBlueprintRegistry(dataPath: string): Promise<BlueprintRegistry> {
  const strainsDir = path.join(dataPath, 'blueprints', 'strains');
  const devicesDir = path.join(dataPath, 'blueprints', 'devices');
  const cultivationDir = path.join(dataPath, 'blueprints', 'cultivationMethods');

  const strains = await loadCollection(strainsDir, async (file) => {
    const json = await loadJsonFile<unknown>(file);
    const parsed = strainSchema.parse(json);
    return parsed as Strain;
  });

  const devices = await loadCollection(devicesDir, async (file) => {
    const json = await loadJsonFile<unknown>(file);
    const parsed = deviceBlueprintSchema.parse(json);
    return parsed as DeviceBlueprint;
  });

  const cultivationMethods = await loadCollection(cultivationDir, async (file) => {
    const json = await loadJsonFile<unknown>(file);
    const parsed = cultivationMethodSchema.parse(json);
    return parsed as CultivationMethod;
  });

  return {
    strains,
    devices,
    cultivationMethods
  };
}
