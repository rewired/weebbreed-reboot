import {
  CLICKDUMMY_SEED,
  createDeterministicManager,
  createDeterministicSequence,
  type DeterministicManager,
  type DeterministicSequence,
} from './deterministic';
export { CLICKDUMMY_SEED } from './deterministic';
import { BASE_SALARIES, JOB_ROLES, NAMES, SKILLS_BY_ROLE, TRAITS, type JobRole } from './constants';
import type { ClickDummyCandidate, ClickDummyGameData, ClickDummyPlant } from './types';

export interface FixtureFactoryContext {
  manager: DeterministicManager;
  idSequence: DeterministicSequence;
  candidateSequence: DeterministicSequence;
  plantSequence: DeterministicSequence;
}

export interface SequenceSourceOptions {
  sequence?: DeterministicSequence;
  seed?: number | string;
  idPrefix?: string;
}

export type CandidateGenerationOptions = SequenceSourceOptions;

export type PlantFactoryOptions = SequenceSourceOptions;

export interface ClickDummyFixtureOptions {
  seed?: number | string;
}

export interface ClickDummyFixtureResult {
  data: ClickDummyGameData;
  context: FixtureFactoryContext;
}

const createContextFromManager = (manager: DeterministicManager): FixtureFactoryContext => ({
  manager,
  idSequence: manager.sequence('ids', { idPrefix: 'id' }),
  candidateSequence: manager.sequence('candidates', { idPrefix: 'candidate' }),
  plantSequence: manager.sequence('plants', { idPrefix: 'plant' }),
});

export const createFixtureFactoryContext = (
  seed: number | string = CLICKDUMMY_SEED,
): FixtureFactoryContext => {
  const manager = createDeterministicManager(seed);
  return createContextFromManager(manager);
};

const resolveSequence = (
  base: DeterministicSequence,
  options: SequenceSourceOptions | undefined,
  cloneByDefault: boolean,
): DeterministicSequence => {
  if (options?.sequence) {
    return options.sequence;
  }
  if (options?.seed !== undefined) {
    const baseState = base.getState();
    return createDeterministicSequence(options.seed, {
      idPrefix: options.idPrefix ?? baseState.idPrefix,
    });
  }
  return cloneByDefault ? base.clone() : base;
};

export const nextDeterministicId = (context: FixtureFactoryContext, prefix?: string): string =>
  context.idSequence.nextId(prefix);

export const generateCandidates = (
  context: FixtureFactoryContext,
  count = 8,
  options: CandidateGenerationOptions = {},
): ClickDummyCandidate[] => {
  const rng = resolveSequence(context.candidateSequence, options, false);
  const candidates: ClickDummyCandidate[] = [];
  const usedNames = new Set<string>();

  for (let index = 0; index < count; index += 1) {
    let candidateName: string;
    do {
      candidateName = rng.pick(NAMES).name;
    } while (usedNames.has(candidateName) && usedNames.size < NAMES.length);
    usedNames.add(candidateName);

    const role = rng.pick(JOB_ROLES);
    const baseSalary = BASE_SALARIES[role];

    const skills: Record<string, number> = {};
    let skillSum = 0;
    SKILLS_BY_ROLE[role].forEach((skill) => {
      const level = rng.nextInt(1, 6);
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
      id: nextDeterministicId(context, options.idPrefix ?? 'candidate'),
      name: candidateName,
      desiredRole: role,
      expectedSalary: salary,
      skills,
      traits,
    });
  }

  return candidates;
};

export const createPlant = (
  context: FixtureFactoryContext,
  props: Partial<ClickDummyPlant>,
  options: PlantFactoryOptions = {},
): ClickDummyPlant => {
  const rng = resolveSequence(context.plantSequence, options, false);
  const plant: ClickDummyPlant = {
    id: nextDeterministicId(context, options.idPrefix ?? 'plant'),
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

const createEmployees = (context: FixtureFactoryContext) => {
  const employees: ClickDummyGameData['employees'] = [];
  const employeeProfiles: Array<{
    name: string;
    desiredRole: JobRole | string;
    assignment: string;
    skills: Record<string, number>;
    traits: string[];
    expectedSalary: number;
  }> = [
    {
      name: 'Alice',
      desiredRole: 'Gardener',
      assignment: 'struct-1',
      skills: { Cultivation: 4, 'Pest Control': 3 },
      traits: ['Hard Worker'],
      expectedSalary: 34000,
    },
    {
      name: 'Bob',
      desiredRole: 'Technician',
      assignment: 'struct-1',
      skills: { Mechanics: 5, Electronics: 4 },
      traits: ['Detail-Oriented'],
      expectedSalary: 42000,
    },
  ];

  employeeProfiles.forEach((profile) => {
    employees.push({
      id: nextDeterministicId(context, 'employee'),
      name: profile.name,
      desiredRole: profile.desiredRole,
      assignment: profile.assignment,
      skills: profile.skills,
      traits: profile.traits,
      expectedSalary: profile.expectedSalary,
    });
  });

  return employees;
};

const buildFixtureData = (context: FixtureFactoryContext): ClickDummyGameData => {
  const zoneA1Plants: ClickDummyPlant[] = [
    ...Array.from({ length: 10 }, () =>
      createPlant(context, { name: 'OG Kush', health: 95, progress: 60 }),
    ),
    createPlant(context, { name: 'OG Kush', health: 98, progress: 70 }),
    createPlant(context, { name: 'OG Kush', health: 99, progress: 72 }),
    createPlant(context, { name: 'OG Kush', health: 80, progress: 68, status: 'pest' }),
    createPlant(context, { name: 'OG Kush', health: 75, progress: 66, status: 'disease' }),
    createPlant(context, { name: 'White Widow', health: 85, progress: 75, status: 'treatment' }),
    createPlant(context, { name: 'White Widow', health: 90, progress: 80, status: 'healthy' }),
  ];

  const zoneA2Plants = Array.from({ length: 12 }, () =>
    createPlant(context, { name: 'White Widow', health: 92, progress: 55, status: 'healthy' }),
  );

  const zoneA3Plants = Array.from({ length: 35 }, () =>
    createPlant(context, { name: 'Blue Dream', health: 98, progress: 30, status: 'healthy' }),
  );

  return {
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
        footprint: { width: 100, length: 50, height: 10 },
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
                estYield: 25,
                stress: 0.15,
                kpis: [
                  {
                    title: 'PPFD',
                    value: '882',
                    unit: 'µmol/m²/s',
                    target: 900,
                    status: 'optimal',
                  },
                  { title: 'VPD', value: '1.2', unit: 'kPa', target: 1.1, status: 'warning' },
                  {
                    title: 'Temperature',
                    value: '25.2 °C',
                    unit: '°C',
                    target: 25,
                    status: 'optimal',
                  },
                  { title: 'Humidity', value: '52 %', unit: '%', target: 50, status: 'optimal' },
                  {
                    title: 'CO₂ level',
                    value: '1,180',
                    unit: 'ppm',
                    target: 1200,
                    status: 'warning',
                  },
                  {
                    title: 'Water reserve',
                    value: '1,200 L',
                    unit: 'L',
                    target: 1000,
                    status: 'warning',
                  },
                  {
                    title: 'Nutrient solution',
                    value: '480 L',
                    unit: 'L',
                    target: 450,
                    status: 'warning',
                  },
                  {
                    title: 'Nutrient strength',
                    value: '90 %',
                    unit: '%',
                    target: 100,
                    status: 'warning',
                  },
                  {
                    title: 'Reservoir level',
                    value: '68%',
                    unit: '%',
                    target: 70,
                    status: 'warning',
                  },
                  {
                    title: 'Substrate health',
                    value: '82 %',
                    unit: '%',
                    target: 90,
                    status: 'warning',
                  },
                  {
                    title: 'Transpiration',
                    value: '14 L',
                    unit: 'L',
                    target: 12,
                    status: 'warning',
                  },
                  {
                    title: 'Stress level',
                    value: '45 %',
                    unit: '%',
                    target: 30,
                    status: 'warning',
                  },
                  {
                    title: 'Pending treatments',
                    value: '3',
                    unit: '',
                    target: 0,
                    status: 'danger',
                  },
                  {
                    title: 'Applied treatments',
                    value: '1',
                    unit: '',
                    target: 0,
                    status: 'warning',
                  },
                  { title: 'Disease incidents', value: '2', unit: '', target: 0, status: 'danger' },
                  { title: 'Pest sightings', value: '1', unit: '', target: 0, status: 'warning' },
                  { title: 'Re-entry wait', value: '12', unit: 'h', target: 0, status: 'warning' },
                  {
                    title: 'Pre-harvest interval',
                    value: '2',
                    unit: 'days',
                    target: 0,
                    status: 'warning',
                  },
                  {
                    title: 'Daily water consumption',
                    value: '180',
                    unit: 'L/day',
                    target: 150,
                    status: 'warning',
                  },
                  {
                    title: 'Daily nutrient consumption',
                    value: '90',
                    unit: 'L/day',
                    target: 80,
                    status: 'warning',
                  },
                  { title: 'DLI', value: '32', unit: 'mol/m²/d', target: 30, status: 'optimal' },
                ],
                plants: zoneA1Plants,
                devices: [
                  {
                    id: nextDeterministicId(context, 'device'),
                    name: 'ClimateKing 5000',
                    type: 'HVAC',
                  },
                  {
                    id: nextDeterministicId(context, 'device'),
                    name: 'ClimateKing 5000',
                    type: 'HVAC',
                  },
                  {
                    id: nextDeterministicId(context, 'device'),
                    name: 'Sunstream Pro LED',
                    type: 'Lighting',
                  },
                  {
                    id: nextDeterministicId(context, 'device'),
                    name: 'Sunstream Pro LED',
                    type: 'Lighting',
                  },
                  {
                    id: nextDeterministicId(context, 'device'),
                    name: 'Sunstream Pro LED',
                    type: 'Lighting',
                  },
                  {
                    id: nextDeterministicId(context, 'device'),
                    name: 'CO₂ Injector v2',
                    type: 'Climate',
                  },
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
                plants: zoneA2Plants,
                devices: [
                  {
                    id: nextDeterministicId(context, 'device'),
                    name: 'ClimateKing 5000',
                    type: 'HVAC',
                  },
                  {
                    id: nextDeterministicId(context, 'device'),
                    name: 'CO₂ Injector v2',
                    type: 'Climate',
                  },
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
                plants: zoneA3Plants,
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
              {
                id: 'batch-2',
                strain: 'White Widow',
                yield: 980,
                thc: 19.2,
                cbd: 1.1,
                progress: 40,
              },
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
    employees: createEmployees(context),
    candidates: generateCandidates(context),
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
};

export const createClickDummyFixture = (
  options: ClickDummyFixtureOptions = {},
): ClickDummyFixtureResult => {
  const context = createFixtureFactoryContext(options.seed ?? CLICKDUMMY_SEED);
  return {
    context,
    data: buildFixtureData(context),
  };
};
