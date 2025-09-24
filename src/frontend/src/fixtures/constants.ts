export const JOB_ROLES = ['Gardener', 'Technician', 'Operator', 'Janitor', 'Manager'] as const;

export type JobRole = (typeof JOB_ROLES)[number];

export const SKILLS_BY_ROLE: Record<JobRole, readonly string[]> = {
  Gardener: ['Cultivation', 'Pest Control', 'Harvesting'],
  Technician: ['Mechanics', 'Electronics', 'Plumbing'],
  Operator: ['Logistics', 'Packaging', 'Quality Control'],
  Janitor: ['Cleaning', 'Waste Mgmt.', 'Hygiene'],
  Manager: ['Leadership', 'Finance', 'HR'],
} as const;

export const TRAITS = [
  'Hard Worker',
  'Detail-Oriented',
  'Fast Learner',
  'Calm',
  'Lazy',
  'Clumsy',
  'Ambitious',
] as const;

export interface CandidateNameProfile {
  name: string;
  gender: 'male' | 'female';
}

export const NAMES: readonly CandidateNameProfile[] = [
  { name: 'John Smith', gender: 'male' },
  { name: 'Maria Garcia', gender: 'female' },
  { name: 'David Lee', gender: 'male' },
  { name: 'Sarah Miller', gender: 'female' },
  { name: 'Michael Brown', gender: 'male' },
  { name: 'Jessica Davis', gender: 'female' },
  { name: 'Chris Rodriguez', gender: 'male' },
  { name: 'Emily Wilson', gender: 'female' },
  { name: 'Daniel Martinez', gender: 'male' },
  { name: 'Ashley Anderson', gender: 'female' },
  { name: 'James Taylor', gender: 'male' },
  { name: 'Amanda Thomas', gender: 'female' },
] as const;

export const BASE_SALARIES: Record<JobRole, number> = {
  Gardener: 32000,
  Technician: 38000,
  Operator: 35000,
  Janitor: 28000,
  Manager: 55000,
};

export const DEVICE_COSTS: Record<string, number> = {
  'ClimateKing 5000': 1200,
  'Sunstream Pro LED': 850,
  'CO₂ Injector v2': 450,
  'HydroFlow Irrigator': 600,
};
