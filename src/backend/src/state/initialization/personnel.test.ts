import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { RngService, RNG_STREAM_IDS } from '@/lib/rng.js';
import type { PersonnelNameDirectory, PersonnelRoleBlueprintDraft } from '@/state/models.js';
import { getEmployeeSkillNames, resetPersonnelSkillBlueprints } from '@/state/models.js';
import {
  createPersonnel,
  loadPersonnelDirectory,
  loadPersonnelRoleBlueprints,
} from './personnel.js';

afterEach(() => {
  resetPersonnelSkillBlueprints();
});

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

  it('loads and normalizes personnel role blueprints with fallback data', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wb-role-blueprints-'));
    try {
      const blueprintDir = path.join(tempDir, 'blueprints');
      const rolesDir = path.join(blueprintDir, 'personnel', 'roles');
      await fs.mkdir(rolesDir, { recursive: true });
      const gardenerDraft: PersonnelRoleBlueprintDraft = {
        id: 'Gardener',
        name: 'Field Gardener',
        salary: { basePerTick: 26 },
        skillProfile: {
          primary: { skill: 'Gardening', startingLevel: 5, roll: { min: 3, max: 5 } },
        },
      };
      await fs.writeFile(
        path.join(rolesDir, 'Gardener.json'),
        JSON.stringify(gardenerDraft, null, 2),
      );
      const specialistDraft: PersonnelRoleBlueprintDraft = {
        id: 'Specialist',
        name: 'IPM Specialist',
        roleWeight: 0.05,
        salary: { basePerTick: 30 },
        skillProfile: {
          primary: { skill: 'Cleanliness', startingLevel: 4, roll: { min: 2, max: 4 } },
        },
      };
      await fs.writeFile(
        path.join(rolesDir, 'Specialist.json'),
        JSON.stringify(specialistDraft, null, 2),
      );

      const roles = await loadPersonnelRoleBlueprints(tempDir);
      const gardener = roles.find((role) => role.id === 'Gardener');
      const specialist = roles.find((role) => role.id === 'Specialist');
      const technician = roles.find((role) => role.id === 'Technician');

      expect(gardener?.salary.basePerTick).toBe(26);
      expect(gardener?.skillProfile.secondary?.skill).toBe('Cleanliness');
      expect(gardener?.salary.skillFactor?.perPoint).toBeCloseTo(0.04);

      expect(specialist?.maxMinutesPerTick).toBeGreaterThan(0);
      expect(specialist?.skillProfile.primary.skill).toBe('Cleanliness');
      expect(specialist?.skillProfile.secondary).toBeUndefined();
      expect(specialist?.salary.skillFactor?.base).toBeGreaterThan(0);
      expect(technician).toBeDefined();
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects personnel role blueprints referencing unknown skills', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wb-role-skills-unknown-'));
    try {
      const blueprintDir = path.join(tempDir, 'blueprints');
      const skillsDir = path.join(blueprintDir, 'personnel', 'skills');
      const rolesDir = path.join(blueprintDir, 'personnel', 'roles');
      await fs.mkdir(skillsDir, { recursive: true });
      await fs.mkdir(rolesDir, { recursive: true });

      await fs.writeFile(
        path.join(skillsDir, 'Research.json'),
        JSON.stringify({ id: 'Research', name: 'Research' }),
      );

      await fs.writeFile(
        path.join(rolesDir, 'Researcher.json'),
        JSON.stringify(
          {
            id: 'Researcher',
            name: 'Researcher',
            salary: { basePerTick: 32 },
            skillProfile: {
              primary: { skill: 'UnknownSkill', startingLevel: 4 },
            },
          } satisfies PersonnelRoleBlueprintDraft,
          null,
          2,
        ),
      );

      await expect(loadPersonnelRoleBlueprints(tempDir)).rejects.toThrow(
        /Unknown skill "UnknownSkill"/i,
      );
      expect(getEmployeeSkillNames()).toEqual(['Research']);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('loads role blueprints with skills defined by skill blueprints', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wb-role-skills-custom-'));
    try {
      const blueprintDir = path.join(tempDir, 'blueprints');
      const skillsDir = path.join(blueprintDir, 'personnel', 'skills');
      const rolesDir = path.join(blueprintDir, 'personnel', 'roles');
      await fs.mkdir(skillsDir, { recursive: true });
      await fs.mkdir(rolesDir, { recursive: true });

      await fs.writeFile(
        path.join(skillsDir, 'Research.json'),
        JSON.stringify({
          id: 'Research',
          name: 'Research',
          description: 'Applied plant science and analytics.',
        }),
      );

      await fs.writeFile(
        path.join(rolesDir, 'Researcher.json'),
        JSON.stringify(
          {
            id: 'Researcher',
            name: 'Research Scientist',
            salary: { basePerTick: 34 },
            skillProfile: {
              primary: { skill: 'Research', startingLevel: 5, roll: { min: 3, max: 5 } },
            },
          } satisfies PersonnelRoleBlueprintDraft,
          null,
          2,
        ),
      );

      const roles = await loadPersonnelRoleBlueprints(tempDir);
      const researcher = roles.find((role) => role.id === 'Researcher');

      expect(researcher).toBeDefined();
      expect(researcher?.skillProfile.primary.skill).toBe('Research');
      expect(getEmployeeSkillNames()).toEqual(['Research']);
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
