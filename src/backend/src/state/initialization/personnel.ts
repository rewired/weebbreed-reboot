import path from 'path';
import { z } from 'zod';
import { DEFAULT_PERSONNEL_ROLE_BLUEPRINTS, EMPLOYEE_SKILL_NAMES } from '../models.js';
import type {
  PersonnelNameDirectory,
  PersonnelRoster,
  EmployeeRole,
  EmployeeState,
  EmployeeSkills,
  EmployeeShiftAssignment,
  PersonnelRoleBlueprint,
  PersonnelRoleSalaryConfig,
  PersonnelRoleSkillRoll,
  PersonnelRoleSkillTemplate,
  PersonnelRoleTertiarySkillConfig,
} from '../models.js';
import { RngService, RngStream, RNG_STREAM_IDS } from '@/lib/rng.js';
import { generateId, readJsonFile } from './common.js';

const DEFAULT_MAX_MINUTES_PER_TICK = 90;
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

const PERSONNEL_ROLE_BLUEPRINT_FILE = 'personnelRoles.json';

const FALLBACK_ROLE_INDEX = new Map<string, PersonnelRoleBlueprint>(
  DEFAULT_PERSONNEL_ROLE_BLUEPRINTS.map((role) => [role.id, role]),
);

const GENERIC_SALARY_FACTOR: Required<PersonnelRoleSalaryConfig['skillFactor']> = {
  base: 0.85,
  perPoint: 0.04,
  min: 0.85,
  max: 1.45,
};

const GENERIC_SALARY_RANDOM_RANGE: Required<PersonnelRoleSalaryConfig['randomRange']> = {
  min: 0.9,
  max: 1.1,
};

const GENERIC_SALARY_WEIGHTS: Required<PersonnelRoleSalaryConfig['skillWeights']> = {
  primary: 1.2,
  secondary: 0.6,
  tertiary: 0.35,
};

const skillRollSchema = z
  .object({
    min: z.number(),
    max: z.number(),
  })
  .superRefine((value, ctx) => {
    if (!Number.isFinite(value.min) || !Number.isFinite(value.max)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'roll bounds must be finite numbers',
      });
    } else if (value.max < value.min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'roll.max must be greater than or equal to roll.min',
      });
    }
  });

const skillTemplateSchema: z.ZodType<PersonnelRoleSkillTemplate> = z
  .object({
    skill: z.enum(EMPLOYEE_SKILL_NAMES),
    startingLevel: z.number(),
    roll: skillRollSchema.optional(),
    weight: z.number().optional(),
  })
  .passthrough();

const tertiarySkillSchema: z.ZodType<PersonnelRoleTertiarySkillConfig> = z
  .object({
    chance: z.number().min(0).max(1).optional(),
    roll: skillRollSchema.optional(),
    candidates: z.array(skillTemplateSchema).min(1),
  })
  .passthrough();

const salaryFactorSchema = z
  .object({
    base: z.number().optional(),
    perPoint: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .passthrough();

const salaryWeightsSchema = z
  .object({
    primary: z.number().optional(),
    secondary: z.number().optional(),
    tertiary: z.number().optional(),
  })
  .passthrough();

const salaryRandomRangeSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .passthrough();

const salarySchema = z
  .object({
    basePerTick: z.number(),
    skillFactor: salaryFactorSchema.optional(),
    randomRange: salaryRandomRangeSchema.optional(),
    skillWeights: salaryWeightsSchema.optional(),
  })
  .passthrough();

const roleBlueprintSchema: z.ZodType<PersonnelRoleBlueprint> = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    preferredShiftId: z.string().optional(),
    maxMinutesPerTick: z.number().positive().optional(),
    roleWeight: z.number().nonnegative().optional(),
    salary: salarySchema,
    skillProfile: z.object({
      primary: skillTemplateSchema,
      secondary: skillTemplateSchema.optional(),
      tertiary: tertiarySkillSchema.optional(),
    }),
  })
  .passthrough();

const roleFileSchema = z
  .object({
    version: z.string().optional(),
    roles: z.array(roleBlueprintSchema),
  })
  .passthrough();

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const clampProbability = (value: number | undefined): number | undefined => {
  if (!isFiniteNumber(value)) {
    return undefined;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
};

const normalizeRoll = (
  roll: PersonnelRoleSkillRoll | undefined,
): PersonnelRoleSkillRoll | undefined => {
  if (!roll) {
    return undefined;
  }
  const min = isFiniteNumber(roll.min) ? roll.min : 0;
  const max = isFiniteNumber(roll.max) ? roll.max : min;
  if (max < min) {
    return { min: max, max: min } satisfies PersonnelRoleSkillRoll;
  }
  return { min, max } satisfies PersonnelRoleSkillRoll;
};

const mergeRoll = (
  fallback: PersonnelRoleSkillRoll | undefined,
  override: PersonnelRoleSkillRoll | undefined,
): PersonnelRoleSkillRoll | undefined => {
  if (!fallback && !override) {
    return undefined;
  }
  const merged: PersonnelRoleSkillRoll = {
    min: override?.min ?? fallback?.min ?? 0,
    max: override?.max ?? fallback?.max ?? override?.min ?? fallback?.min ?? 0,
  } satisfies PersonnelRoleSkillRoll;
  return normalizeRoll(merged);
};

const normalizeSkillTemplate = (
  template: PersonnelRoleSkillTemplate,
  fallback?: PersonnelRoleSkillTemplate,
): PersonnelRoleSkillTemplate => {
  const startingLevel = isFiniteNumber(template.startingLevel)
    ? template.startingLevel
    : (fallback?.startingLevel ?? 1);
  const normalized: PersonnelRoleSkillTemplate = {
    skill: template.skill,
    startingLevel,
  } satisfies PersonnelRoleSkillTemplate;
  const mergedRoll = mergeRoll(fallback?.roll, template.roll);
  if (mergedRoll) {
    normalized.roll = mergedRoll;
  }
  if (isFiniteNumber(template.weight)) {
    normalized.weight = template.weight;
  } else if (fallback?.weight !== undefined) {
    normalized.weight = fallback.weight;
  }
  return normalized;
};

const mergeRandomRange = (
  fallbackRange: PersonnelRoleSalaryConfig['randomRange'] | undefined,
  overrideRange: PersonnelRoleSalaryConfig['randomRange'] | undefined,
): PersonnelRoleSalaryConfig['randomRange'] | undefined => {
  if (!fallbackRange && !overrideRange) {
    return undefined;
  }
  const min = overrideRange?.min ?? fallbackRange?.min;
  const max = overrideRange?.max ?? fallbackRange?.max;
  if (min === undefined && max === undefined) {
    return undefined;
  }
  if (isFiniteNumber(min) && isFiniteNumber(max) && max < min) {
    return { min: max, max: min } satisfies PersonnelRoleSalaryConfig['randomRange'];
  }
  const result: PersonnelRoleSalaryConfig['randomRange'] = {};
  if (isFiniteNumber(min)) {
    result.min = min;
  }
  if (isFiniteNumber(max)) {
    result.max = max;
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

const normalizeTertiarySkills = (
  fallback: PersonnelRoleTertiarySkillConfig | undefined,
  override: PersonnelRoleTertiarySkillConfig | undefined,
): PersonnelRoleTertiarySkillConfig | undefined => {
  if (!fallback && !override) {
    return undefined;
  }
  const fallbackCandidates = new Map<string, PersonnelRoleSkillTemplate>(
    (fallback?.candidates ?? []).map((candidate) => [candidate.skill, candidate]),
  );
  const sourceCandidates = override?.candidates ?? fallback?.candidates ?? [];
  if (sourceCandidates.length === 0) {
    return undefined;
  }
  const candidates = sourceCandidates.map((candidate) =>
    normalizeSkillTemplate(candidate, fallbackCandidates.get(candidate.skill)),
  );
  const normalized: PersonnelRoleTertiarySkillConfig = {
    candidates,
  } satisfies PersonnelRoleTertiarySkillConfig;
  const roll = mergeRoll(fallback?.roll, override?.roll);
  if (roll) {
    normalized.roll = roll;
  }
  const chance = clampProbability(override?.chance ?? fallback?.chance);
  if (chance !== undefined) {
    normalized.chance = chance;
  }
  return normalized;
};

const normalizePersonnelRole = (role: PersonnelRoleBlueprint): PersonnelRoleBlueprint => {
  const fallback = FALLBACK_ROLE_INDEX.get(role.id);
  const basePerTick = isFiniteNumber(role.salary?.basePerTick)
    ? role.salary.basePerTick
    : (fallback?.salary.basePerTick ?? 20);
  const fallbackFactor = fallback?.salary.skillFactor ?? GENERIC_SALARY_FACTOR;
  const fallbackRandomRange = fallback?.salary.randomRange ?? GENERIC_SALARY_RANDOM_RANGE;
  const fallbackSkillWeights = fallback?.salary.skillWeights ?? GENERIC_SALARY_WEIGHTS;
  const salary: PersonnelRoleSalaryConfig = {
    basePerTick,
    skillFactor: {
      ...fallbackFactor,
      ...(role.salary.skillFactor ?? {}),
    },
    randomRange:
      mergeRandomRange(fallbackRandomRange, role.salary.randomRange) ?? fallbackRandomRange,
    skillWeights: {
      ...fallbackSkillWeights,
      ...(role.salary.skillWeights ?? {}),
    },
  } satisfies PersonnelRoleSalaryConfig;

  const primary = normalizeSkillTemplate(role.skillProfile.primary, fallback?.skillProfile.primary);
  const secondarySource = role.skillProfile.secondary ?? fallback?.skillProfile.secondary;
  const secondary = secondarySource
    ? normalizeSkillTemplate(secondarySource, fallback?.skillProfile.secondary)
    : undefined;
  const tertiary = normalizeTertiarySkills(
    fallback?.skillProfile.tertiary,
    role.skillProfile.tertiary,
  );

  const skillProfile: PersonnelRoleBlueprint['skillProfile'] = { primary };
  if (secondary) {
    skillProfile.secondary = secondary;
  }
  if (tertiary) {
    skillProfile.tertiary = tertiary;
  }

  const normalized: PersonnelRoleBlueprint = {
    id: role.id,
    name: role.name ?? fallback?.name ?? role.id,
    description: role.description ?? fallback?.description,
    preferredShiftId: role.preferredShiftId ?? fallback?.preferredShiftId,
    maxMinutesPerTick:
      role.maxMinutesPerTick ?? fallback?.maxMinutesPerTick ?? DEFAULT_MAX_MINUTES_PER_TICK,
    roleWeight: role.roleWeight ?? fallback?.roleWeight,
    salary,
    skillProfile,
  } satisfies PersonnelRoleBlueprint;

  return normalized;
};

export const normalizePersonnelRoleBlueprints = (
  roles: readonly PersonnelRoleBlueprint[] | undefined,
): PersonnelRoleBlueprint[] => {
  const result = new Map<string, PersonnelRoleBlueprint>();
  for (const fallback of DEFAULT_PERSONNEL_ROLE_BLUEPRINTS) {
    result.set(fallback.id, normalizePersonnelRole(fallback));
  }
  if (roles) {
    for (const role of roles) {
      result.set(role.id, normalizePersonnelRole(role));
    }
  }
  return Array.from(result.values());
};

export const loadPersonnelRoleBlueprints = async (
  dataDirectory: string,
): Promise<PersonnelRoleBlueprint[]> => {
  const blueprintPath = path.join(dataDirectory, 'blueprints', PERSONNEL_ROLE_BLUEPRINT_FILE);
  const raw = await readJsonFile<unknown>(blueprintPath);
  if (!raw) {
    return normalizePersonnelRoleBlueprints(DEFAULT_PERSONNEL_ROLE_BLUEPRINTS);
  }
  const parsed = roleFileSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const pathInfo = issue?.path?.length ? ` at ${issue.path.join('.')}` : '';
    throw new Error(
      `Invalid personnel role blueprint${pathInfo}: ${issue?.message ?? 'unknown validation error'}`,
    );
  }
  return normalizePersonnelRoleBlueprints(parsed.data.roles);
};

const NORMALIZED_DEFAULT_ROLE_BLUEPRINTS = normalizePersonnelRoleBlueprints(
  DEFAULT_PERSONNEL_ROLE_BLUEPRINTS,
);

const NORMALIZED_DEFAULT_ROLE_MAP = new Map<string, PersonnelRoleBlueprint>(
  NORMALIZED_DEFAULT_ROLE_BLUEPRINTS.map((role) => [role.id, role]),
);

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
  structureId: string,
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

export { SHIFT_TEMPLATES };
