import path from 'path';
import type {
  PersonnelNameDirectory,
  PersonnelRoster,
  EmployeeRole,
  EmployeeState,
  EmployeeSkills,
  EmployeeShiftAssignment,
} from '../models.js';
import { RngService, RngStream, RNG_STREAM_IDS } from '../../lib/rng.js';
import { generateId, readJsonFile } from './common.js';

const DEFAULT_SALARY_BY_ROLE: Record<EmployeeRole, number> = {
  Gardener: 24,
  Technician: 28,
  Janitor: 18,
  Operator: 22,
  Manager: 35,
};

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

const ROLE_SHIFT_PREFERENCES: Partial<Record<EmployeeRole, string>> = {
  Janitor: 'shift.night',
  Operator: 'shift.day',
  Manager: 'shift.day',
};

export const loadPersonnelDirectory = async (
  dataDirectory: string,
): Promise<PersonnelNameDirectory> => {
  const personnelDir = path.join(dataDirectory, 'personnel');
  const [firstNames, lastNames, traits] = await Promise.all([
    readJsonFile<string[]>(path.join(personnelDir, 'firstNames.json')),
    readJsonFile<string[]>(path.join(personnelDir, 'lastNames.json')),
    readJsonFile<PersonnelNameDirectory['traits']>(path.join(personnelDir, 'traits.json')),
  ]);

  return {
    firstNames: firstNames ?? [],
    lastNames: lastNames ?? [],
    traits: traits ?? [],
  };
};

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

const createEmployeeSkills = (role: EmployeeRole): EmployeeSkills => {
  switch (role) {
    case 'Gardener':
      return { Gardening: 4, Cleanliness: 2 };
    case 'Technician':
      return { Maintenance: 4, Logistics: 2 };
    case 'Janitor':
      return { Cleanliness: 4, Logistics: 1 };
    case 'Operator':
      return { Logistics: 3, Administration: 2 };
    case 'Manager':
      return { Administration: 4, Logistics: 2 };
    default:
      return {};
  }
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

export const createPersonnel = (
  structureId: string,
  counts: Record<EmployeeRole, number>,
  directory: PersonnelNameDirectory | undefined,
  rng: RngService,
  idStream: RngStream,
): PersonnelRoster => {
  const firstNames = directory?.firstNames ?? [];
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
    const preferredId = ROLE_SHIFT_PREFERENCES[role];
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
    for (let index = 0; index < count; index += 1) {
      const firstName = firstNames.length > 0 ? nameStream.pick(firstNames) : `Crew${index + 1}`;
      const lastName = lastNames.length > 0 ? nameStream.pick(lastNames) : role;
      const fullName = `${firstName} ${lastName}`;
      const skills = createEmployeeSkills(role);
      const employeeTraits = drawUnique(
        traits,
        traits.length > 0 ? 1 + Number(traitStream.nextBoolean(0.35)) : 0,
        traitStream,
      ).map((trait) => trait.id);
      const shift = assignShift(role);
      const isActiveAtStart = isShiftActiveAtMinute(shift, 0);
      employees.push({
        id: generateId(idStream, 'emp'),
        name: fullName,
        role,
        salaryPerTick: DEFAULT_SALARY_BY_ROLE[role] ?? 20,
        status: isActiveAtStart ? 'idle' : 'offShift',
        morale: 0.82 + moraleStream.nextRange(0, 0.08),
        energy: 1,
        skills,
        experience: createExperienceStub(skills),
        traits: employeeTraits,
        certifications: [],
        shift,
        hoursWorkedToday: 0,
        overtimeHours: 0,
        lastShiftResetTick: 0,
        assignedStructureId: structureId,
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

export { DEFAULT_SALARY_BY_ROLE, SHIFT_TEMPLATES, ROLE_SHIFT_PREFERENCES };
