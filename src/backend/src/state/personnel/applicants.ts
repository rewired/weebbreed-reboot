import type { ApplicantState } from '../types.js';

export const getApplicantPersonalSeed = (applicant: ApplicantState): string | undefined => {
  const value = applicant.personalSeed;
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};
