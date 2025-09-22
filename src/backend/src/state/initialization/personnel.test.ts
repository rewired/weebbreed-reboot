import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { RngService, RNG_STREAM_IDS } from '@/lib/rng.js';
import { createPersonnel, loadPersonnelDirectory } from './personnel.js';

describe('state/initialization/personnel', () => {
  it('loads personnel name directories with graceful fallbacks', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wb-personnel-'));
    try {
      const personnelDir = path.join(tempDir, 'personnel');
      await fs.mkdir(personnelDir, { recursive: true });
      await fs.writeFile(path.join(personnelDir, 'firstNames.json'), JSON.stringify(['Alex']));
      await fs.writeFile(path.join(personnelDir, 'lastNames.json'), JSON.stringify(['Patel']));
      await fs.writeFile(
        path.join(personnelDir, 'traits.json'),
        JSON.stringify([
          {
            id: 'trait_detail',
            name: 'Detail Oriented',
            description: 'Keeps things tidy.',
            type: 'positive',
          },
        ]),
      );

      const directory = await loadPersonnelDirectory(tempDir);

      expect(directory.firstNames).toContain('Alex');
      expect(directory.lastNames).toContain('Patel');
      expect(directory.traits[0]?.id).toBe('trait_detail');
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('creates personnel with role-based shift preferences and morale averages', () => {
    const rng = new RngService('personnel-roster');
    const idStream = rng.getStream(RNG_STREAM_IDS.ids);
    const directory = {
      firstNames: ['Morgan', 'Drew', 'Sasha'],
      lastNames: ['Nguyen', 'Lopez'],
      traits: [],
    };

    const roster = createPersonnel(
      'structure-alpha',
      { Manager: 1, Janitor: 1, Gardener: 2 },
      directory,
      rng,
      idStream,
    );

    expect(roster.employees).toHaveLength(4);
    const manager = roster.employees.find((employee) => employee.role === 'Manager');
    const janitor = roster.employees.find((employee) => employee.role === 'Janitor');

    expect(manager?.shift.shiftId).toBe('shift.day');
    expect(janitor?.shift.shiftId).toBe('shift.night');
    expect(roster.overallMorale).toBeGreaterThan(0);
    expect(roster.overallMorale).toBeLessThanOrEqual(1);
  });
});
