import { describe, expect, it } from 'vitest';
import { getApplicantPersonalSeed, type ApplicantState } from './models.js';

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
