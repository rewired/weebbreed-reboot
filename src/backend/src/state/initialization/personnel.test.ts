import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { RngService, RNG_STREAM_IDS } from '@/lib/rng.js';
import type { PersonnelNameDirectory } from '@/state/models.js';
import { createPersonnel, loadPersonnelDirectory } from './personnel.js';

describe('state/initialization/personnel', () => {
  it('loads personnel name directories with gender-specific files', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wb-personnel-'));
    try {
      const personnelDir = path.join(tempDir, 'personnel');
      const namesDir = path.join(personnelDir, 'names');
      await fs.mkdir(personnelDir, { recursive: true });
      await fs.mkdir(namesDir, { recursive: true });
      await fs.writeFile(
        path.join(namesDir, 'firstNamesMale.json'),
        JSON.stringify(['Alex', 'Brian']),
      );
      await fs.writeFile(
        path.join(namesDir, 'firstNamesFemale.json'),
        JSON.stringify(['Alice', 'Beatrice']),
      );
      await fs.writeFile(path.join(namesDir, 'lastNames.json'), JSON.stringify(['Patel']));
      await fs.writeFile(path.join(personnelDir, 'randomSeeds.json'), JSON.stringify(['seed-0']));
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

      expect(directory.firstNamesMale).toEqual(['Alex', 'Brian']);
      expect(directory.firstNamesFemale).toEqual(['Alice', 'Beatrice']);
      expect(directory.randomSeeds).toEqual(['seed-0']);
      expect(directory.lastNames).toContain('Patel');
      expect(directory.traits[0]?.id).toBe('trait_detail');
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('creates personnel with role-based shift preferences and morale averages', () => {
    const rng = new RngService('personnel-roster');
    const idStream = rng.getStream(RNG_STREAM_IDS.ids);
    const directory: PersonnelNameDirectory = {
      firstNamesMale: ['Morgan', 'Drew'],
      firstNamesFemale: ['Sasha'],
      lastNames: ['Nguyen', 'Lopez'],
      traits: [],
      randomSeeds: [],
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
    expect(manager?.maxMinutesPerTick).toBe(60);
    expect(janitor?.maxMinutesPerTick).toBe(75);
    expect(roster.overallMorale).toBeGreaterThan(0);
    expect(roster.overallMorale).toBeLessThanOrEqual(1);
  });
});
