/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- JOB MARKET DATA ---
export const ROLES = ['Gardener', 'Technician', 'Operator', 'Janitor', 'Manager'];
export const SKILLS_BY_ROLE: { [key: string]: string[] } = {
  Gardener: ['Cultivation', 'Pest Control', 'Harvesting'],
  Technician: ['Mechanics', 'Electronics', 'Plumbing'],
  Operator: ['Logistics', 'Packaging', 'Quality Control'],
  Janitor: ['Cleaning', 'Waste Mgmt.', 'Hygiene'],
  Manager: ['Leadership', 'Finance', 'HR'],
};
export const TRAITS = [
  'Hard Worker',
  'Detail-Oriented',
  'Fast Learner',
  'Calm',
  'Lazy',
  'Clumsy',
  'Ambitious',
];
export const NAMES = [
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
];
export const BASE_SALARIES: { [key: string]: number } = {
  Gardener: 32000,
  Technician: 38000,
  Operator: 35000,
  Janitor: 28000,
  Manager: 55000,
};

// --- FINANCIAL DATA ---
export const DEVICE_COSTS = {
  'ClimateKing 5000': 1200,
  'Sunstream Pro LED': 850,
  'CO₂ Injector v2': 450,
  'HydroFlow Irrigator': 600,
};
