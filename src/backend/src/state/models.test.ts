import { promises as fs } from 'node:fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  getApplicantPersonalSeed,
  getEmployeeSkillNames,
  isKnownSkillName,
  loadPersonnelSkillBlueprints,
  resetPersonnelSkillBlueprints,
  type ApplicantState,
} from './models.js';

describe('getApplicantPersonalSeed', () => {
  const baseApplicant: ApplicantState = {
    id: 'applicant-1',
    name: 'Test Candidate',
    desiredRole: 'Gardener',
    expectedSalary: 15,
    traits: [],
    skills: {},
  };

  it('returns a trimmed personal seed when present', () => {
    const applicant: ApplicantState = { ...baseApplicant, personalSeed: '  seed-123  ' };
    expect(getApplicantPersonalSeed(applicant)).toBe('seed-123');
  });

  it('returns undefined when personal seed is missing or blank', () => {
    expect(getApplicantPersonalSeed(baseApplicant)).toBeUndefined();
    const blankSeed: ApplicantState = { ...baseApplicant, personalSeed: '   ' };
    expect(getApplicantPersonalSeed(blankSeed)).toBeUndefined();
  });
});

describe('personnel skill blueprints', () => {
  it('loads skill blueprints from disk and updates the known skill registry', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wb-skill-blueprints-'));
    try {
      const skillsDir = path.join(tempDir, 'blueprints', 'personnel', 'skills');
      await fs.mkdir(skillsDir, { recursive: true });
      const researchBlueprint = {
        id: 'Research',
        name: 'Research',
        description: 'Lab analytics and cultivar experimentation.',
        tags: ['lab'],
      } as const;
      await fs.writeFile(
        path.join(skillsDir, 'Research.json'),
        JSON.stringify(researchBlueprint, null, 2),
      );

      const loaded = await loadPersonnelSkillBlueprints(tempDir);

      expect(loaded).toEqual([expect.objectContaining({ id: 'Research', name: 'Research' })]);
      expect(getEmployeeSkillNames()).toEqual(['Research']);
      expect(isKnownSkillName('Research')).toBe(true);
      expect(isKnownSkillName('Gardening')).toBe(false);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
      resetPersonnelSkillBlueprints();
    }
  });
});
