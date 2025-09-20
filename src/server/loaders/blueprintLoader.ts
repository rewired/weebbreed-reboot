import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  BlueprintBundle,
  CultivationMethodBlueprint,
  DeviceBlueprint,
  StrainBlueprint
} from '../../shared/types/blueprints';
import { toSlug } from '../../shared/utils/string';
import { validateBlueprintBundle } from '../../shared/schemas/index';
import { logger } from '../services/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');
const blueprintsDir = path.join(projectRoot, 'data', 'blueprints');

const loadJsonFiles = async <T extends object>(dir: string): Promise<T[]> => {
  const entries = await fs.readdir(dir);
  const items: T[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      items.push(...(await loadJsonFiles<T>(fullPath)));
      continue;
    }

    if (!entry.endsWith('.json')) {
      continue;
    }

    const raw = await fs.readFile(fullPath, 'utf-8');
    const parsed = JSON.parse(raw) as T;
    items.push(parsed);
  }

  return items;
};

const normalizeStrain = (strain: StrainBlueprint): StrainBlueprint => ({
  ...strain,
  slug: strain.slug ?? toSlug(strain.name)
});

const normalizeDevice = (device: DeviceBlueprint, origin: string): DeviceBlueprint => ({
  ...device,
  slug: device.slug ?? toSlug(device.name ?? origin),
  coverageArea_m2:
    device.coverageArea_m2 ?? (typeof device.settings?.coverageArea === 'number' ? (device.settings.coverageArea as number) : undefined),
  power_kW: device.power_kW ?? (typeof device.settings?.power === 'number' ? (device.settings.power as number) : undefined),
  ppfd_umol_m2_s:
    device.ppfd_umol_m2_s ?? (typeof device.settings?.ppfd === 'number' ? (device.settings.ppfd as number) : undefined)
});

const normalizeCultivationMethod = (method: CultivationMethodBlueprint, origin: string): CultivationMethodBlueprint => ({
  ...method,
  slug: method.slug ?? toSlug(method.name ?? origin)
});

export const loadBlueprints = async (): Promise<BlueprintBundle> => {
  const strainsRaw = await loadJsonFiles<StrainBlueprint>(path.join(blueprintsDir, 'strains'));
  const devicesRaw = await loadJsonFiles<DeviceBlueprint>(path.join(blueprintsDir, 'devices'));
  const cultivationRaw = await loadJsonFiles<CultivationMethodBlueprint>(path.join(blueprintsDir, 'cultivationMethods'));

  const strains = strainsRaw.map((strain) => normalizeStrain(strain));
  const devices = devicesRaw.map((device) => normalizeDevice(device, device.id));
  const cultivationMethods = cultivationRaw.map((method) => normalizeCultivationMethod(method, method.id));

  const bundle: BlueprintBundle = {
    strains,
    devices,
    cultivationMethods
  };

  validateBlueprintBundle(bundle);
  logger.info({ count: bundle.strains.length }, 'Loaded strain blueprints');
  logger.info({ count: bundle.devices.length }, 'Loaded device blueprints');
  logger.info({ count: bundle.cultivationMethods.length }, 'Loaded cultivation methods');

  return bundle;
};
