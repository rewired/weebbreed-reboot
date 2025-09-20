import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { createDeviceBlueprint, createStructureBlueprint } from '../../testing/fixtures.js';
import { RngService } from '../../lib/rng.js';
import { chooseDeviceBlueprints, loadStructureBlueprints, selectBlueprint } from './blueprints.js';

describe('state/initialization/blueprints', () => {
  it('selects the preferred blueprint when available', () => {
    const rng = new RngService('blueprint-select');
    const preferred = { id: 'preferred', name: 'Preferred' };
    const options = [{ id: 'a', name: 'Alpha' }, preferred, { id: 'b', name: 'Beta' }];

    const chosen = selectBlueprint(options, rng.getStream('options'), preferred.id);

    expect(chosen).toBe(preferred);
  });

  it('chooses representative device blueprints per desired kind', () => {
    const rng = new RngService('device-choice');
    const lamp = createDeviceBlueprint({ kind: 'Lamp', id: 'lamp-choice' });
    const climate = createDeviceBlueprint({ kind: 'ClimateUnit', id: 'climate-choice' });
    const dehumidifier = createDeviceBlueprint({ kind: 'Dehumidifier', id: 'dehu-choice' });
    const misc = createDeviceBlueprint({ kind: 'IrrigationPump', id: 'misc-choice' });

    const selected = chooseDeviceBlueprints(
      [lamp, climate, dehumidifier, misc],
      rng.getStream('devices'),
    );
    const kinds = selected.map((device) => device.kind);

    expect(kinds).toContain('Lamp');
    expect(kinds).toContain('ClimateUnit');
    expect(kinds).toContain('Dehumidifier');
    expect(kinds).not.toContain('IrrigationPump');
  });

  it('loads structure blueprints from disk and normalises the footprint keys', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wb-blueprints-'));
    try {
      const structuresDir = path.join(tempDir, 'blueprints', 'structures');
      await fs.mkdir(structuresDir, { recursive: true });
      const blueprint = createStructureBlueprint({
        id: 'structure-1',
        footprint: { length: 12, width: 7, height: 5 },
      });

      const raw = {
        id: blueprint.id,
        name: blueprint.name,
        footprint: {
          length_m: blueprint.footprint.length,
          width_m: blueprint.footprint.width,
          height_m: blueprint.footprint.height,
        },
        rentalCostPerSqmPerMonth: blueprint.rentalCostPerSqmPerMonth,
        upfrontFee: blueprint.upfrontFee,
      } satisfies Record<string, unknown>;

      await fs.writeFile(path.join(structuresDir, 'structure.json'), JSON.stringify(raw));

      const loaded = await loadStructureBlueprints(tempDir);

      expect(loaded).toHaveLength(1);
      expect(loaded[0]).toMatchObject({
        id: blueprint.id,
        footprint: blueprint.footprint,
      });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
