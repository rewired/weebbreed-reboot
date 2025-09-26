import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { deviceSchema } from './deviceSchema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const co2InjectorBlueprintPath = path.resolve(
  __dirname,
  '../../../../../data/blueprints/devices/co2injector-01.json',
);
const climateUnitBlueprintPath = path.resolve(
  __dirname,
  '../../../../../data/blueprints/devices/climate_unit_01.json',
);
const humidityControlBlueprintPath = path.resolve(
  __dirname,
  '../../../../../data/blueprints/devices/humidity_control_unit_01.json',
);

const loadBlueprint = async (blueprintPath: string) => {
  const blueprintSource = await readFile(blueprintPath, 'utf-8');
  return JSON.parse(blueprintSource);
};

const createDeviceBlueprint = (kind: string, settings: Record<string, unknown>) => ({
  id: '00000000-0000-4000-8000-000000000000',
  kind,
  name: `${kind} Test Device`,
  quality: 0.8,
  complexity: 0.2,
  lifespan: 3_600,
  roomPurposes: ['growroom'],
  settings,
  meta: {},
});

describe('deviceSchema', () => {
  it('validates the CO₂ injector blueprint', async () => {
    const blueprint = await loadBlueprint(co2InjectorBlueprintPath);

    const result = deviceSchema.safeParse(blueprint);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.settings?.targetCO2).toBe(1100);
      expect(result.data.settings?.targetCO2Range).toEqual([400, 1500]);
    }
  });

  it('validates the climate unit blueprint', async () => {
    const blueprint = await loadBlueprint(climateUnitBlueprintPath);

    const result = deviceSchema.safeParse(blueprint);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.settings?.targetTemperature).toBe(24);
      expect(result.data.settings?.targetTemperatureRange).toEqual([18, 30]);
    }
  });

  it('validates the humidity control blueprint', async () => {
    const blueprint = await loadBlueprint(humidityControlBlueprintPath);

    const result = deviceSchema.safeParse(blueprint);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.settings?.targetHumidity).toBeCloseTo(0.6);
    }
  });

  it('rejects non-numeric targetCO2 values', () => {
    const blueprint = createDeviceBlueprint('CO2Injector', {
      targetCO2: '900',
    });

    const result = deviceSchema.safeParse(blueprint);

    expect(result.success).toBe(false);
    if (!result.success) {
      // Collect all failing paths so this stays robust against issue ordering
      const paths = result.error.issues.map((issue) => issue.path);
      expect(paths).toContainEqual(['settings', 'targetCO2']);
    }
  });

  it('rejects non-numeric targetTemperature values', () => {
    const blueprint = createDeviceBlueprint('ClimateUnit', {
      targetTemperature: 'warm',
    });

    const result = deviceSchema.safeParse(blueprint);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toContainEqual([
        'settings',
        'targetTemperature',
      ]);
    }
  });

  it('rejects malformed targetTemperatureRange tuples', () => {
    const blueprint = createDeviceBlueprint('ClimateUnit', {
      targetTemperatureRange: [20, '30'],
    });

    const result = deviceSchema.safeParse(blueprint);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toContainEqual([
        'settings',
        'targetTemperatureRange',
        1,
      ]);
    }
  });

  it('rejects non-numeric targetHumidity values', () => {
    const blueprint = createDeviceBlueprint('HumidityControlUnit', {
      targetHumidity: '0.5',
    });

    const result = deviceSchema.safeParse(blueprint);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toContainEqual([
        'settings',
        'targetHumidity',
      ]);
    }
  });

  it('rejects malformed targetCO2Range tuples', () => {
    const blueprint = createDeviceBlueprint('CO2Injector', {
      targetCO2Range: 'invalid',
    });

    const result = deviceSchema.safeParse(blueprint);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toContainEqual([
        'settings',
        'targetCO2Range',
      ]);
    }
  });
});
