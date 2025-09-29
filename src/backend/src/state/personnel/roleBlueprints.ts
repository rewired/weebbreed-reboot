import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import { readJsonFile } from '../initialization/common.js';
import type {
  PersonnelRoleBlueprint,
  PersonnelRoleBlueprintDraft,
  PersonnelRoleSalaryConfig,
  PersonnelRoleSalaryRandomRange,
  PersonnelRoleSkillRoll,
  PersonnelRoleSkillTemplate,
  PersonnelRoleTertiarySkillConfig,
  SkillName,
} from '../types.js';
import {
  DEFAULT_PERSONNEL_SKILL_BLUEPRINTS,
  getEmployeeSkillNames,
  isKnownSkillName,
  loadPersonnelSkillBlueprints,
  setPersonnelSkillBlueprints,
} from './skillBlueprints.js';

export const DEFAULT_MAX_MINUTES_PER_TICK = 90;

export const DEFAULT_PERSONNEL_ROLE_BLUEPRINTS = [
  {
    id: 'Gardener',
    name: 'Gardener',
    maxMinutesPerTick: 90,
    roleWeight: 0.35,
    salary: {
      basePerTick: 24,
      skillFactor: { base: 0.85, perPoint: 0.04, min: 0.85, max: 1.45 },
      randomRange: { min: 0.9, max: 1.1 },
      skillWeights: { primary: 1.2, secondary: 0.6, tertiary: 0.35 },
    },
    skillProfile: {
      primary: {
        skill: 'Gardening',
        startingLevel: 4,
        roll: { min: 3, max: 5 },
      },
      secondary: {
        skill: 'Cleanliness',
        startingLevel: 2,
        roll: { min: 1, max: 4 },
      },
      tertiary: {
        chance: 0.25,
        roll: { min: 1, max: 3 },
        candidates: [
          { skill: 'Logistics', startingLevel: 1 },
          { skill: 'Administration', startingLevel: 1 },
          { skill: 'Maintenance', startingLevel: 1 },
        ],
      },
    },
  },
  {
    id: 'Technician',
    name: 'Technician',
    maxMinutesPerTick: 120,
    roleWeight: 0.2,
    salary: {
      basePerTick: 28,
      skillFactor: { base: 0.85, perPoint: 0.04, min: 0.85, max: 1.45 },
      randomRange: { min: 0.9, max: 1.12 },
      skillWeights: { primary: 1.25, secondary: 0.65, tertiary: 0.4 },
    },
    skillProfile: {
      primary: {
        skill: 'Maintenance',
        startingLevel: 4,
        roll: { min: 3, max: 5 },
      },
      secondary: {
        skill: 'Logistics',
        startingLevel: 2,
        roll: { min: 1, max: 4 },
      },
      tertiary: {
        chance: 0.25,
        roll: { min: 1, max: 3 },
        candidates: [
          { skill: 'Gardening', startingLevel: 1 },
          { skill: 'Administration', startingLevel: 1 },
          { skill: 'Cleanliness', startingLevel: 1 },
        ],
      },
    },
  },
  {
    id: 'Janitor',
    name: 'Janitor',
    maxMinutesPerTick: 75,
    preferredShiftId: 'shift.night',
    roleWeight: 0.15,
    salary: {
      basePerTick: 18,
      skillFactor: { base: 0.85, perPoint: 0.04, min: 0.85, max: 1.45 },
      randomRange: { min: 0.88, max: 1.08 },
      skillWeights: { primary: 1.1, secondary: 0.55, tertiary: 0.3 },
    },
    skillProfile: {
      primary: {
        skill: 'Cleanliness',
        startingLevel: 4,
        roll: { min: 3, max: 5 },
      },
      secondary: {
        skill: 'Logistics',
        startingLevel: 1,
        roll: { min: 0, max: 3 },
      },
      tertiary: {
        chance: 0.3,
        roll: { min: 1, max: 3 },
        candidates: [
          { skill: 'Administration', startingLevel: 1 },
          { skill: 'Gardening', startingLevel: 1 },
          { skill: 'Maintenance', startingLevel: 1 },
        ],
      },
    },
  },
  {
    id: 'Operator',
    name: 'Operator',
    maxMinutesPerTick: 90,
    preferredShiftId: 'shift.day',
    roleWeight: 0.18,
    salary: {
      basePerTick: 22,
      skillFactor: { base: 0.85, perPoint: 0.04, min: 0.85, max: 1.45 },
      randomRange: { min: 0.9, max: 1.1 },
      skillWeights: { primary: 1.15, secondary: 0.6, tertiary: 0.35 },
    },
    skillProfile: {
      primary: {
        skill: 'Logistics',
        startingLevel: 3,
        roll: { min: 2, max: 4 },
      },
      secondary: {
        skill: 'Administration',
        startingLevel: 2,
        roll: { min: 1, max: 4 },
      },
      tertiary: {
        chance: 0.25,
        roll: { min: 1, max: 3 },
        candidates: [
          { skill: 'Cleanliness', startingLevel: 1 },
          { skill: 'Gardening', startingLevel: 1 },
          { skill: 'Maintenance', startingLevel: 1 },
        ],
      },
    },
  },
  {
    id: 'Manager',
    name: 'Manager',
    maxMinutesPerTick: 60,
    preferredShiftId: 'shift.day',
    roleWeight: 0.12,
    salary: {
      basePerTick: 35,
      skillFactor: { base: 0.85, perPoint: 0.04, min: 0.85, max: 1.5 },
      randomRange: { min: 0.95, max: 1.18 },
      skillWeights: { primary: 1.3, secondary: 0.7, tertiary: 0.45 },
    },
    skillProfile: {
      primary: {
        skill: 'Administration',
        startingLevel: 4,
        roll: { min: 3, max: 5 },
      },
      secondary: {
        skill: 'Logistics',
        startingLevel: 2,
        roll: { min: 1, max: 4 },
      },
      tertiary: {
        chance: 0.4,
        roll: { min: 1, max: 3 },
        candidates: [{ skill: 'Cleanliness', startingLevel: 2, weight: 2 }],
      },
    },
  },
] as const satisfies readonly PersonnelRoleBlueprint[];

const PERSONNEL_ROLE_BLUEPRINT_DIR = path.join('personnel', 'roles');
const PERSONNEL_ROLE_BLUEPRINT_EXTENSION = '.json';
const LEGACY_PERSONNEL_ROLE_BLUEPRINT_FILE = 'personnelRoles.json';

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

const skillNameSchema: z.ZodType<SkillName> = z
  .string()
  .min(1)
  .superRefine((value, ctx) => {
    if (!isKnownSkillName(value)) {
      const allowed = getEmployeeSkillNames();
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          allowed.length > 0
            ? `Unknown skill "${value}". Allowed skills: ${allowed.join(', ')}`
            : `Unknown skill "${value}".`,
      });
    }
  }) as z.ZodType<SkillName>;

const skillTemplateSchema: z.ZodType<PersonnelRoleSkillTemplate> = z
  .object({
    skill: skillNameSchema,
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
    basePerTick: z.number().optional(),
    skillFactor: salaryFactorSchema.optional(),
    randomRange: salaryRandomRangeSchema.optional(),
    skillWeights: salaryWeightsSchema.optional(),
  })
  .passthrough();

export const roleBlueprintSchema: z.ZodType<PersonnelRoleBlueprintDraft> = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    preferredShiftId: z.string().optional(),
    maxMinutesPerTick: z.number().positive().optional(),
    roleWeight: z.number().nonnegative().optional(),
    salary: salarySchema.optional(),
    skillProfile: z
      .object({
        primary: skillTemplateSchema.optional(),
        secondary: skillTemplateSchema.optional(),
        tertiary: tertiarySkillSchema.optional(),
      })
      .optional(),
  })
  .passthrough();

export const roleFileSchema = z
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
  fallback: PersonnelRoleSalaryRandomRange,
  override: PersonnelRoleSalaryRandomRange | undefined,
): PersonnelRoleSalaryRandomRange | undefined => {
  const min = isFiniteNumber(override?.min) ? override!.min : fallback.min;
  const max = isFiniteNumber(override?.max) ? override!.max : fallback.max;
  if (!isFiniteNumber(min) && !isFiniteNumber(max)) {
    return undefined;
  }
  const normalized: PersonnelRoleSalaryRandomRange = {};
  if (isFiniteNumber(min)) {
    normalized.min = min;
  }
  if (isFiniteNumber(max)) {
    normalized.max = max;
  }
  if (
    normalized.min !== undefined &&
    normalized.max !== undefined &&
    normalized.max < normalized.min
  ) {
    const temp = normalized.min;
    normalized.min = normalized.max;
    normalized.max = temp;
  }
  return normalized;
};

const normalizeTertiarySkills = (
  fallback: PersonnelRoleTertiarySkillConfig | undefined,
  override: PersonnelRoleTertiarySkillConfig | undefined,
): PersonnelRoleTertiarySkillConfig | undefined => {
  if (!fallback && !override) {
    return undefined;
  }
  const fallbackCandidates = new Map<string, PersonnelRoleSkillTemplate>();
  if (fallback?.candidates) {
    for (const candidate of fallback.candidates) {
      fallbackCandidates.set(candidate.skill, candidate);
    }
  }
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

const normalizePersonnelRole = (
  role: PersonnelRoleBlueprintDraft | PersonnelRoleBlueprint,
): PersonnelRoleBlueprint => {
  const fallback = FALLBACK_ROLE_INDEX.get(role.id);
  const overrideSalary = role.salary;
  const basePerTick = isFiniteNumber(overrideSalary?.basePerTick)
    ? overrideSalary.basePerTick
    : (fallback?.salary.basePerTick ?? 20);
  const fallbackFactor = fallback?.salary.skillFactor ?? GENERIC_SALARY_FACTOR;
  const fallbackRandomRange = fallback?.salary.randomRange ?? GENERIC_SALARY_RANDOM_RANGE;
  const fallbackSkillWeights = fallback?.salary.skillWeights ?? GENERIC_SALARY_WEIGHTS;
  const salary: PersonnelRoleSalaryConfig = {
    basePerTick,
    skillFactor: {
      ...fallbackFactor,
      ...(overrideSalary?.skillFactor ?? {}),
    },
    randomRange:
      mergeRandomRange(fallbackRandomRange, overrideSalary?.randomRange) ?? fallbackRandomRange,
    skillWeights: {
      ...fallbackSkillWeights,
      ...(overrideSalary?.skillWeights ?? {}),
    },
  } satisfies PersonnelRoleSalaryConfig;

  const primarySource = role.skillProfile?.primary ?? fallback?.skillProfile.primary;
  if (!primarySource) {
    throw new Error(`Personnel role blueprint "${role.id}" is missing a primary skill definition.`);
  }
  const primary = normalizeSkillTemplate(primarySource, fallback?.skillProfile.primary);
  const secondarySource = role.skillProfile?.secondary ?? fallback?.skillProfile.secondary;
  const secondary = secondarySource
    ? normalizeSkillTemplate(secondarySource, fallback?.skillProfile.secondary)
    : undefined;
  const tertiary = normalizeTertiarySkills(
    fallback?.skillProfile.tertiary,
    role.skillProfile?.tertiary,
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
  roles: readonly (PersonnelRoleBlueprintDraft | PersonnelRoleBlueprint)[] | undefined,
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

const listBlueprintFiles = async (directory: string): Promise<string[] | undefined> => {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => name.toLowerCase().endsWith(PERSONNEL_ROLE_BLUEPRINT_EXTENSION))
      .sort((a, b) => a.localeCompare(b));
    return files.length > 0 ? files : undefined;
  } catch (error) {
    const cause = error as NodeJS.ErrnoException;
    if (cause.code === 'ENOENT') {
      return undefined;
    }
    throw new Error(
      `Failed to read personnel role blueprint directory at ${directory}: ${cause.message}`,
    );
  }
};

const parseRoleBlueprintDraft = (
  raw: unknown,
  sourceLabel: string,
): PersonnelRoleBlueprintDraft => {
  const parsed = roleBlueprintSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const pathInfo = issue?.path?.length ? ` at ${issue.path.join('.')}` : '';
    throw new Error(
      `Invalid personnel role blueprint in ${sourceLabel}${pathInfo}: ${issue?.message ?? 'unknown validation error'}`,
    );
  }
  return parsed.data;
};

const loadBlueprintDraftsFromDirectory = async (
  blueprintDirectory: string,
): Promise<PersonnelRoleBlueprintDraft[] | undefined> => {
  const files = await listBlueprintFiles(blueprintDirectory);
  if (!files) {
    return undefined;
  }
  const drafts: PersonnelRoleBlueprintDraft[] = [];
  for (const fileName of files) {
    const filePath = path.join(blueprintDirectory, fileName);
    const raw = await readJsonFile<unknown>(filePath);
    if (raw === undefined) {
      continue;
    }
    drafts.push(parseRoleBlueprintDraft(raw, filePath));
  }
  return drafts;
};

const loadLegacyBlueprintDrafts = async (
  blueprintPath: string,
): Promise<PersonnelRoleBlueprintDraft[] | undefined> => {
  const raw = await readJsonFile<unknown>(blueprintPath);
  if (!raw) {
    return undefined;
  }
  const parsed = roleFileSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const pathInfo = issue?.path?.length ? ` at ${issue.path.join('.')}` : '';
    throw new Error(
      `Invalid personnel role blueprint in ${blueprintPath}${pathInfo}: ${
        issue?.message ?? 'unknown validation error'
      }`,
    );
  }
  return parsed.data.roles;
};

export const loadPersonnelRoleBlueprints = async (
  dataDirectory: string,
): Promise<PersonnelRoleBlueprint[]> => {
  try {
    await loadPersonnelSkillBlueprints(dataDirectory);
  } catch (error) {
    setPersonnelSkillBlueprints(DEFAULT_PERSONNEL_SKILL_BLUEPRINTS);
    throw error;
  }
  const blueprintRoot = path.join(dataDirectory, 'blueprints');
  const directoryPath = path.join(blueprintRoot, PERSONNEL_ROLE_BLUEPRINT_DIR);
  const draftsFromDirectory = await loadBlueprintDraftsFromDirectory(directoryPath);
  if (draftsFromDirectory && draftsFromDirectory.length > 0) {
    return normalizePersonnelRoleBlueprints(draftsFromDirectory);
  }
  const legacyPath = path.join(blueprintRoot, LEGACY_PERSONNEL_ROLE_BLUEPRINT_FILE);
  const draftsFromLegacy = await loadLegacyBlueprintDrafts(legacyPath);
  if (draftsFromLegacy && draftsFromLegacy.length > 0) {
    return normalizePersonnelRoleBlueprints(draftsFromLegacy);
  }
  return normalizePersonnelRoleBlueprints(DEFAULT_PERSONNEL_ROLE_BLUEPRINTS);
};

export const NORMALIZED_DEFAULT_ROLE_BLUEPRINTS = normalizePersonnelRoleBlueprints(
  DEFAULT_PERSONNEL_ROLE_BLUEPRINTS,
);

export const NORMALIZED_DEFAULT_ROLE_MAP = new Map<string, PersonnelRoleBlueprint>(
  NORMALIZED_DEFAULT_ROLE_BLUEPRINTS.map((role) => [role.id, role]),
);
