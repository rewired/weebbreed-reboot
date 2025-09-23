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

describe('deviceSchema', () => {
  it('validates the CO₂ injector blueprint', async () => {
    const blueprintSource = await readFile(co2InjectorBlueprintPath, 'utf-8');
    const blueprint = JSON.parse(blueprintSource);

    const result = deviceSchema.safeParse(blueprint);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.settings?.targetCO2).toBe(1100);
    }
  });

  it('rejects non-numeric targetCO2 values', () => {
    const baseBlueprint = {
      id: '00000000-0000-4000-8000-000000000000',
      kind: 'CO2Injector',
      name: 'Invalid Injector',
      quality: 0.8,
      complexity: 0.2,
      lifespan: 3_600,
      roomPurposes: ['growroom'],
      settings: {
        targetCO2: '900',
      },
      meta: {},
    };

    const result = deviceSchema.safeParse(baseBlueprint);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['settings', 'targetCO2']);
    }
  });
});
