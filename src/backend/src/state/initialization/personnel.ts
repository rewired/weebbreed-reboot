import path from 'path';
import {
  DEFAULT_MAX_MINUTES_PER_TICK,
  NORMALIZED_DEFAULT_ROLE_BLUEPRINTS,
  NORMALIZED_DEFAULT_ROLE_MAP,
  normalizePersonnelRoleBlueprints,
} from '../personnel/roleBlueprints.js';
import type {
  EmployeeRole,
  EmployeeShiftAssignment,
  EmployeeSkills,
  EmployeeState,
  PersonnelNameDirectory,
  PersonnelRoleBlueprint,
  PersonnelRoster,
} from '../types.js';
import { RngService, RngStream, RNG_STREAM_IDS } from '@/lib/rng.js';
import { generateId, readJsonFile } from './common.js';

const MINUTES_PER_DAY = 24 * 60;

const SHIFT_TEMPLATES: readonly EmployeeShiftAssignment[] = [
  { shiftId: 'shift.day', name: 'Day Shift', startHour: 6, durationHours: 12, overlapMinutes: 60 },
  {
    shiftId: 'shift.night',
    name: 'Night Shift',
    startHour: 18,
    durationHours: 12,
    overlapMinutes: 60,
  },
];

const toUniqueSortedList = (values: readonly string[] | undefined): string[] => {
  if (!values) {
    return [];
  }
  const filtered = values
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
  return Array.from(new Set(filtered)).sort((a, b) => a.localeCompare(b));
};

const toUniqueOrderedList = (values: readonly string[] | undefined): string[] => {
  if (!values) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of values) {
    if (typeof entry !== 'string') {
      continue;
    }
    const trimmed = entry.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
};

const combineFirstNames = (...lists: Array<readonly string[] | undefined>): string[] => {
  const combined = new Set<string>();
  for (const entries of lists) {
    if (!entries) {
      continue;
    }
    for (const entry of entries) {
      if (typeof entry !== 'string') {
        continue;
      }
      const trimmed = entry.trim();
      if (trimmed.length > 0) {
        combined.add(trimmed);
      }
    }
  }
  return Array.from(combined).sort((a, b) => a.localeCompare(b));
};

export const loadPersonnelDirectory = async (
  dataDirectory: string,
): Promise<PersonnelNameDirectory> => {
  const personnelDir = path.join(dataDirectory, 'personnel');
  const [firstNamesMaleRaw, firstNamesFemaleRaw, lastNamesRaw, traits, randomSeedsRaw] =
    await Promise.all([
      readJsonFile<string[]>(path.join(personnelDir, 'names', 'firstNamesMale.json')),
      readJsonFile<string[]>(path.join(personnelDir, 'names', 'firstNamesFemale.json')),
      readJsonFile<string[]>(path.join(personnelDir, 'names', 'lastNames.json')),
      readJsonFile<PersonnelNameDirectory['traits']>(path.join(personnelDir, 'traits.json')),
      readJsonFile<string[]>(path.join(personnelDir, 'randomSeeds.json')),
    ]);

  const firstNamesMale = toUniqueSortedList(firstNamesMaleRaw);
  const firstNamesFemale = toUniqueSortedList(firstNamesFemaleRaw);
  const lastNames = toUniqueSortedList(lastNamesRaw);
  const randomSeeds = toUniqueOrderedList(randomSeedsRaw);

  return {
    firstNamesMale,
    firstNamesFemale,
    lastNames,
    traits: traits ?? [],
    randomSeeds,
  } satisfies PersonnelNameDirectory;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const drawUnique = <T>(items: readonly T[], count: number, stream: RngStream): T[] => {
  if (items.length === 0 || count <= 0) {
    return [];
  }
  const pool = [...items];
  const picks = Math.min(count, pool.length);
  const result: T[] = [];
  for (let index = 0; index < picks; index += 1) {
    const chosenIndex = stream.nextInt(pool.length);
    result.push(pool.splice(chosenIndex, 1)[0]);
  }
  return result;
};

const sanitizeSkillLevel = (value: number | undefined): number => {
  if (!isFiniteNumber(value)) {
    return 0;
  }
  return Math.max(0, value);
};

const createEmployeeSkillsFromBlueprint = (blueprint: PersonnelRoleBlueprint): EmployeeSkills => {
  const skills: EmployeeSkills = {};
  const primary = blueprint.skillProfile.primary;
  skills[primary.skill] = sanitizeSkillLevel(primary.startingLevel);
  const secondary = blueprint.skillProfile.secondary;
  if (secondary) {
    skills[secondary.skill] = sanitizeSkillLevel(secondary.startingLevel);
  }
  return skills;
};

const createExperienceStub = (skills: EmployeeSkills): EmployeeSkills => {
  return Object.fromEntries(Object.keys(skills).map((skill) => [skill, 0])) as EmployeeSkills;
};

const isShiftActiveAtMinute = (shift: EmployeeShiftAssignment, minuteOfDay: number): boolean => {
  if (!Number.isFinite(shift.startHour) || !Number.isFinite(shift.durationHours)) {
    return true;
  }
  const overlap = Math.max(shift.overlapMinutes, 0);
  const startMinutes =
    (((shift.startHour * 60 - overlap) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const durationMinutes = Math.max(shift.durationHours * 60, 0);
  if (durationMinutes >= MINUTES_PER_DAY) {
    return true;
  }
  const endMinutes = (startMinutes + overlap + durationMinutes) % MINUTES_PER_DAY;
  if (startMinutes < endMinutes) {
    return minuteOfDay >= startMinutes && minuteOfDay < endMinutes;
  }
  return minuteOfDay >= startMinutes || minuteOfDay < endMinutes;
};

export interface CreatePersonnelOptions {
  roleBlueprints?: readonly PersonnelRoleBlueprint[];
}

export const createPersonnel = (
  structureId: string | undefined,
  counts: Record<EmployeeRole, number>,
  directory: PersonnelNameDirectory | undefined,
  rng: RngService,
  idStream: RngStream,
  options: CreatePersonnelOptions = {},
): PersonnelRoster => {
  const normalizedRoles =
    options.roleBlueprints && options.roleBlueprints.length > 0
      ? normalizePersonnelRoleBlueprints(options.roleBlueprints)
      : NORMALIZED_DEFAULT_ROLE_BLUEPRINTS;
  const roleMap = new Map<string, PersonnelRoleBlueprint>(
    normalizedRoles.map((role) => [role.id, role]),
  );

  const getRoleBlueprint = (role: EmployeeRole): PersonnelRoleBlueprint => {
    const blueprint = roleMap.get(role);
    if (blueprint) {
      return blueprint;
    }
    const fallback = NORMALIZED_DEFAULT_ROLE_MAP.get(role);
    if (fallback) {
      roleMap.set(role, fallback);
      return fallback;
    }
    return NORMALIZED_DEFAULT_ROLE_BLUEPRINTS[0]!;
  };

  const firstNames = combineFirstNames(directory?.firstNamesMale, directory?.firstNamesFemale);
  const lastNames = directory?.lastNames ?? [];
  const traits = directory?.traits ?? [];
  const nameStream = rng.getStream(RNG_STREAM_IDS.personnelNames);
  const traitStream = rng.getStream(RNG_STREAM_IDS.personnelTraits);
  const moraleStream = rng.getStream(RNG_STREAM_IDS.personnelMorale);
  const employees: EmployeeState[] = [];
  const shiftCounts = new Map<string, number>();
  let shiftCursor = 0;

  const recordShift = (shift: EmployeeShiftAssignment) => {
    const current = shiftCounts.get(shift.shiftId) ?? 0;
    shiftCounts.set(shift.shiftId, current + 1);
  };

  const chooseBalancedShift = (): EmployeeShiftAssignment => {
    const templates = SHIFT_TEMPLATES.map((template) => ({
      template,
      count: shiftCounts.get(template.shiftId) ?? 0,
    }));
    if (templates.length === 0) {
      return {
        shiftId: 'shift.default',
        name: 'Default Shift',
        startHour: 0,
        durationHours: 24,
        overlapMinutes: 0,
      } satisfies EmployeeShiftAssignment;
    }
    const minCount = Math.min(...templates.map((entry) => entry.count));
    for (let offset = 0; offset < templates.length; offset += 1) {
      const index = (shiftCursor + offset) % templates.length;
      const entry = templates[index];
      if (entry.count === minCount) {
        shiftCursor = (index + 1) % templates.length;
        recordShift(entry.template);
        return { ...entry.template } satisfies EmployeeShiftAssignment;
      }
    }
    const fallback = templates[0];
    shiftCursor = (shiftCursor + 1) % templates.length;
    recordShift(fallback.template);
    return { ...fallback.template } satisfies EmployeeShiftAssignment;
  };

  const assignShift = (role: EmployeeRole): EmployeeShiftAssignment => {
    const preferredId = getRoleBlueprint(role).preferredShiftId;
    if (preferredId) {
      const template =
        SHIFT_TEMPLATES.find((item) => item.shiftId === preferredId) ?? SHIFT_TEMPLATES[0];
      const index = SHIFT_TEMPLATES.findIndex((item) => item.shiftId === template.shiftId);
      if (index >= 0) {
        shiftCursor = (index + 1) % SHIFT_TEMPLATES.length;
      }
      recordShift(template);
      return { ...template } satisfies EmployeeShiftAssignment;
    }
    return chooseBalancedShift();
  };

  for (const role of Object.keys(counts) as EmployeeRole[]) {
    const count = counts[role] ?? 0;
    const roleBlueprint = getRoleBlueprint(role);
    for (let index = 0; index < count; index += 1) {
      const firstName = firstNames.length > 0 ? nameStream.pick(firstNames) : `Crew${index + 1}`;
      const lastName = lastNames.length > 0 ? nameStream.pick(lastNames) : role;
      const fullName = `${firstName} ${lastName}`;
      const skills = createEmployeeSkillsFromBlueprint(roleBlueprint);
      const employeeTraits = drawUnique(
        traits,
        traits.length > 0 ? 1 + Number(traitStream.nextBoolean(0.35)) : 0,
        traitStream,
      ).map((trait) => trait.id);
      const shift = assignShift(role);
      const isActiveAtStart = isShiftActiveAtMinute(shift, 0);
      const maxMinutesPerTick = Math.max(
        0,
        isFiniteNumber(roleBlueprint.maxMinutesPerTick)
          ? roleBlueprint.maxMinutesPerTick
          : DEFAULT_MAX_MINUTES_PER_TICK,
      );
      const baseSalary = isFiniteNumber(roleBlueprint.salary.basePerTick)
        ? roleBlueprint.salary.basePerTick
        : 20;
      employees.push({
        id: generateId(idStream, 'emp'),
        name: fullName,
        role,
        salaryPerTick: baseSalary,
        status: isActiveAtStart ? 'idle' : 'offShift',
        morale: 0.82 + moraleStream.nextRange(0, 0.08),
        energy: 1,
        maxMinutesPerTick,
        skills,
        experience: createExperienceStub(skills),
        traits: employeeTraits,
        certifications: [],
        shift,
        hoursWorkedToday: 0,
        overtimeHours: 0,
        lastShiftResetTick: 0,
        assignedStructureId: structureId || '',
      });
    }
  }

  const morale =
    employees.length > 0
      ? employees.reduce((sum, employee) => sum + employee.morale, 0) / employees.length
      : 1;

  return {
    employees,
    applicants: [],
    trainingPrograms: [],
    overallMorale: morale,
  };
};

export { SHIFT_TEMPLATES };
