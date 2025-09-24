/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  CLICKDUMMY_SEED,
  createDeterministicManager,
  createDeterministicSequence,
  type DeterministicSequence,
} from '../store/utils/deterministic';
import { ROLES, SKILLS_BY_ROLE, TRAITS, NAMES, BASE_SALARIES } from './constants';
import { GameData, Plant, Candidate } from '../types/domain';

interface SequenceSourceOptions {
  sequence?: DeterministicSequence;
  seed?: number | string;
  idPrefix?: string;
}

const fixtureDeterministic = createDeterministicManager(CLICKDUMMY_SEED);

const idSequence = fixtureDeterministic.sequence('ids', { idPrefix: 'id' });
const candidateSequence = fixtureDeterministic.sequence('candidates', { idPrefix: 'candidate' });
const plantSequence = fixtureDeterministic.sequence('plants', { idPrefix: 'plant' });

const resolveSequence = (
  base: DeterministicSequence,
  options: SequenceSourceOptions | undefined,
  cloneByDefault: boolean,
): DeterministicSequence => {
  if (options?.sequence) {
    return options.sequence;
  }
  if (options?.seed !== undefined) {
    return createDeterministicSequence(options.seed, {
      idPrefix: options.idPrefix ?? base.getState().idPrefix,
    });
  }
  return cloneByDefault ? base.clone() : base;
};

export const nextDeterministicId = (prefix?: string) => idSequence.nextId(prefix);

// --- DATA GENERATORS ---
interface CandidateGenerationOptions extends SequenceSourceOptions {}

export const generateCandidates = (
  count = 8,
  options: CandidateGenerationOptions = {},
): Candidate[] => {
  const rng = resolveSequence(candidateSequence, options, false);
  const candidates: Candidate[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i += 1) {
    let candidateName: string;
    do {
      candidateName = rng.pick(NAMES).name;
    } while (usedNames.has(candidateName) && usedNames.size < NAMES.length);
    usedNames.add(candidateName);

    const role = rng.pick(ROLES);
    const baseSalary = BASE_SALARIES[role];

    const skills: { [key: string]: number } = {};
    let skillSum = 0;
    SKILLS_BY_ROLE[role].forEach((skill) => {
      const level = rng.nextInt(1, 6); // 1 to 5
      skills[skill] = level;
      skillSum += level;
    });

    const traits: string[] = [];
    if (rng.nextFloat() > 0.4) {
      traits.push(rng.pick(TRAITS));
    }

    const salary =
      Math.round((baseSalary * (1 + (skillSum - 6) * 0.05) + rng.nextFloat() * 2000) / 100) * 100;

    candidates.push({
      id: nextDeterministicId(options.idPrefix ?? 'candidate'),
      name: candidateName,
      desiredRole: role,
      expectedSalary: salary,
      skills,
      traits,
    });
  }

  return candidates;
};

interface PlantFactoryOptions extends SequenceSourceOptions {}

export const createPlant = (
  props: Partial<Plant>,
  options: PlantFactoryOptions = {},
): Plant => {
  const rng = resolveSequence(plantSequence, options, false);
  const plant: Plant = {
    id: nextDeterministicId(options.idPrefix ?? 'plant'),
    stress: rng.nextInt(0, 31),
    status: 'healthy',
    name: 'Unnamed Strain',
    health: 100,
    progress: 0,
    harvestable: false,
    ...props,
  };
  plant.harvestable = (plant.progress ?? 0) >= 65;
  return plant;
};

// --- INITIAL MOCK DATA ---
export const initialMockData: GameData = {
  globalStats: {
    time: 'Day 7, 14:00 (Tick 158)',
    balance: 99875420,
    dailyOpex: 12450,
    water: '1,500 L',
  },
  structures: [
    {
      id: 'struct-1',
      name: 'Medium Warehouse 1',
      footprint: { width: 100, length: 50, height: 10 }, // in meters
      totalArea: 5000,
      usedArea: 400,
      dailyCost: 1850,
      rooms: [
        {
          id: 'room-1',
          name: 'Grow Room A',
          purpose: 'growroom',
          area: 200,
          zones: [
            {
              id: 'zone-1',
              name: 'Zone A1',
              method: 'Sea of Green',
              area: 50,
              maxPlants: 20,
              strain: 'OG Kush',
              phase: 'Flowering (Day 23)',
              estYield: 25, // g/day
              stress: 0.15, // 0 to 1
              kpis: [
                { title: 'PPFD', value: '882', unit: 'µmol/m²/s', target: 900, status: 'optimal' },
                { title: 'VPD', value: '1.2', unit: 'kPa', target: 1.1, status: 'warning' },
              ],
              plants: [
                ...Array(10)
                  .fill(0)
                  .map(() => createPlant({ name: 'OG Kush', health: 95, progress: 60 })),
                createPlant({ name: 'OG Kush', health: 98, progress: 70 }),
                createPlant({ name: 'OG Kush', health: 99, progress: 72 }),
                createPlant({ name: 'OG Kush', health: 80, progress: 68, status: 'pest' }),
                createPlant({ name: 'OG Kush', health: 75, progress: 66, status: 'disease' }),
                createPlant({ name: 'White Widow', health: 85, progress: 75, status: 'treatment' }),
                createPlant({ name: 'White Widow', health: 90, progress: 80, status: 'healthy' }),
              ],
              devices: [
                { id: nextDeterministicId('device'), name: 'ClimateKing 5000', type: 'HVAC' },
                { id: nextDeterministicId('device'), name: 'ClimateKing 5000', type: 'HVAC' },
                { id: nextDeterministicId('device'), name: 'Sunstream Pro LED', type: 'Lighting' },
                { id: nextDeterministicId('device'), name: 'Sunstream Pro LED', type: 'Lighting' },
                { id: nextDeterministicId('device'), name: 'Sunstream Pro LED', type: 'Lighting' },
                { id: nextDeterministicId('device'), name: 'CO₂ Injector v2', type: 'Climate' },
              ],
              controls: {
                temperature: { value: 24.5, min: 15, max: 35, target: 25 },
                humidity: { value: 52, min: 30, max: 80, target: 50 },
                co2: { value: 1150, min: 400, max: 2000, target: 1200 },
                light: { power: 98, on: true, cycle: '12h/12h' },
              },
            },
            {
              id: 'zone-2',
              name: 'Zone A2',
              method: 'SCROG',
              area: 50,
              maxPlants: 15,
              strain: 'White Widow',
              phase: 'Flowering (Day 19)',
              estYield: 18,
              stress: 0.25,
              kpis: [
                { title: 'PPFD', value: '0', unit: 'µmol/m²/s', target: 900, status: 'danger' },
                { title: 'VPD', value: '1.1', unit: 'kPa', target: 1.1, status: 'optimal' },
              ],
              plants: Array(12)
                .fill(0)
                .map(() =>
                  createPlant({ name: 'White Widow', health: 92, progress: 55, status: 'healthy' }),
                ),
              devices: [
                { id: nextDeterministicId('device'), name: 'ClimateKing 5000', type: 'HVAC' },
                { id: nextDeterministicId('device'), name: 'CO₂ Injector v2', type: 'Climate' },
              ],
              controls: {
                temperature: { value: 23.1, min: 15, max: 35, target: 24 },
                humidity: { value: 55, min: 30, max: 80, target: 50 },
                co2: { value: 1250, min: 400, max: 2000, target: 1200 },
                light: { power: 0, on: false, cycle: '12h/12h' },
              },
            },
            {
              id: 'zone-3',
              name: 'Zone A3',
              method: 'Sea of Green',
              area: 100,
              maxPlants: 40,
              strain: 'Blue Dream',
              phase: 'Vegetative (Day 12)',
              devices: [],
              plants: Array(35)
                .fill(0)
                .map(() =>
                  createPlant({ name: 'Blue Dream', health: 98, progress: 30, status: 'healthy' }),
                ),
              estYield: 0,
              stress: 0.1,
              controls: {
                temperature: { value: 24, min: 15, max: 35, target: 24 },
                humidity: { value: 60, min: 30, max: 80, target: 60 },
                co2: { value: 800, min: 400, max: 2000, target: 800 },
                light: { power: 100, on: true, cycle: '18h/6h' },
              },
              kpis: [],
            },
          ],
        },
        {
          id: 'room-2',
          name: 'Grow Room B',
          purpose: 'growroom',
          area: 150,
          zones: [
            {
              id: 'zone-4',
              name: 'Zone B1',
              method: 'Sea of Green',
              area: 75,
              maxPlants: 30,
              strain: 'OG Kush',
              phase: 'Drying',
              devices: [],
              plants: [],
              estYield: 0,
              stress: 0,
              controls: {
                temperature: { value: 18, min: 15, max: 35, target: 18 },
                humidity: { value: 55, min: 30, max: 80, target: 55 },
                co2: { value: 400, min: 400, max: 2000, target: 400 },
                light: { power: 0, on: false, cycle: '0h/24h' },
              },
              kpis: [],
            },
            {
              id: 'zone-5',
              name: 'Zone B2',
              method: 'Empty',
              area: 75,
              maxPlants: 0,
              strain: '-',
              phase: 'Cleaning',
              devices: [],
              plants: [],
              estYield: 0,
              stress: 0,
              controls: {
                temperature: { value: 20, min: 15, max: 35, target: 20 },
                humidity: { value: 50, min: 30, max: 80, target: 50 },
                co2: { value: 400, min: 400, max: 2000, target: 400 },
                light: { power: 0, on: false, cycle: '12h/12h' },
              },
              kpis: [],
            },
          ],
        },
        {
          id: 'room-3',
          name: 'Break Room',
          purpose: 'breakroom',
          area: 25,
          zones: [],
          occupancy: { current: 3 },
        },
        {
          id: 'room-4',
          name: 'Processing Room',
          purpose: 'processing',
          area: 25,
          zones: [],
          curingBatches: [
            { id: 'batch-1', strain: 'OG Kush', yield: 1250, thc: 22.5, cbd: 0.8, progress: 75 },
            { id: 'batch-2', strain: 'White Widow', yield: 980, thc: 19.2, cbd: 1.1, progress: 40 },
          ],
        },
      ],
    },
  ],
  availableStructures: [
    {
      id: 's_warehouse',
      name: 'Small Warehouse',
      totalArea: 1000,
      footprint: { width: 50, length: 20, height: 8 },
      cost: 5000000,
    },
    {
      id: 'm_warehouse',
      name: 'Medium Warehouse',
      totalArea: 5000,
      footprint: { width: 100, length: 50, height: 10 },
      cost: 20000000,
    },
    {
      id: 'l_warehouse',
      name: 'Large Warehouse',
      totalArea: 20000,
      footprint: { width: 200, length: 100, height: 12 },
      cost: 75000000,
    },
  ],
  employees: [
    {
      id: nextDeterministicId('employee'),
      name: 'Alice',
      desiredRole: 'Gardener',
      assignment: 'struct-1',
      skills: { Cultivation: 4, 'Pest Control': 3 },
      traits: ['Hard Worker'],
      expectedSalary: 34000,
    },
    {
      id: nextDeterministicId('employee'),
      name: 'Bob',
      desiredRole: 'Technician',
      assignment: 'struct-1',
      skills: { Mechanics: 5, Electronics: 4 },
      traits: ['Detail-Oriented'],
      expectedSalary: 42000,
    },
  ],
  candidates: generateCandidates(),
  finance: {
    netIncome7d: 191920,
    opex7d: 90650,
    capex7d: 325000,
    revenue: {
      total: 282570,
      breakdown: [
        { item: 'OG Kush Batch #28', amount: 150200 },
        { item: 'White Widow Batch #14', amount: 87270 },
        { item: 'Blue Dream Batch #5', amount: 45100 },
        { item: 'Genetics Licensing', amount: 12000 },
      ],
    },
    opex: {
      total: 90650,
      breakdown: [
        { item: 'Labor', amount: 53200 },
        { item: 'Utilities', amount: 18500 },
        { item: 'Supplies', amount: 9800 },
        { item: 'Maintenance', amount: 5650 },
        { item: 'Insurance', amount: 3500 },
      ],
    },
    capex: {
      total: 325000,
      breakdown: [
        { item: 'Structure Rental', amount: 150000 },
        { item: 'Device Purchases', amount: 100000 },
        { item: 'Research Equipment', amount: 75000 },
      ],
    },
  },
  events: [
    { time: '13:45', message: 'Nutrient reservoir in Zone A1 refilled.', type: 'info' },
    {
      time: '13:10',
      message: 'Humidity in Zone A1 exceeds target by 2%. Dehumidifier activated.',
      type: 'warning',
    },
    { time: '12:00', message: 'Shift change completed. 4 gardeners now on duty.', type: 'info' },
    {
      time: '11:30',
      message: 'Technician completed maintenance on Climate Unit in Grow Room A.',
      type: 'success',
    },
  ],
};
