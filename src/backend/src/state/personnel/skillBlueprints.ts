import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import { readJsonFile } from '../initialization/common.js';
import type { PersonnelSkillBlueprint, SkillName } from '../types.js';

const personnelSkillBlueprintSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    tags: z.array(z.string().min(1)).optional(),
  })
  .passthrough();

const sanitizeSkillTags = (tags: unknown): string[] | undefined => {
  if (!Array.isArray(tags)) {
    return undefined;
  }
  const normalized = tags
    .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
    .filter((tag) => tag.length > 0);
  if (normalized.length === 0) {
    return undefined;
  }
  return Array.from(new Set(normalized));
};

const normalizeSkillBlueprint = (blueprint: PersonnelSkillBlueprint): PersonnelSkillBlueprint => {
  const id = blueprint.id.trim();
  const name = (blueprint.name ?? id).trim() || id;
  const description =
    typeof blueprint.description === 'string' ? blueprint.description.trim() : undefined;
  const tags = sanitizeSkillTags(blueprint.tags);
  return {
    id,
    name,
    ...(description ? { description } : {}),
    ...(tags ? { tags } : {}),
  } satisfies PersonnelSkillBlueprint;
};

const toNormalizedSkillBlueprints = (
  blueprints: readonly PersonnelSkillBlueprint[],
): PersonnelSkillBlueprint[] => {
  const byId = new Map<SkillName, PersonnelSkillBlueprint>();
  for (const entry of blueprints) {
    if (!entry || typeof entry.id !== 'string') {
      continue;
    }
    const normalized = normalizeSkillBlueprint(entry);
    if (normalized.id.length === 0) {
      continue;
    }
    byId.set(normalized.id, normalized);
  }
  return Array.from(byId.values());
};

const PERSONNEL_SKILL_BLUEPRINT_DIR = path.join('personnel', 'skills');
const PERSONNEL_SKILL_BLUEPRINT_EXTENSION = '.json';

export const DEFAULT_PERSONNEL_SKILL_BLUEPRINTS = [
  {
    id: 'Gardening',
    name: 'Gardening',
    description: 'Canopy management, pruning, and growth optimisation skills.',
    tags: ['cultivation'],
  },
  {
    id: 'Maintenance',
    name: 'Maintenance',
    description: 'Upkeep of facilities, devices, and preventive repair routines.',
    tags: ['operations'],
  },
  {
    id: 'Logistics',
    name: 'Logistics',
    description: 'Inventory handling, scheduling, and supply coordination.',
    tags: ['operations'],
  },
  {
    id: 'Cleanliness',
    name: 'Cleanliness',
    description: 'Sanitation, hygiene, and compliance procedures.',
    tags: ['quality'],
  },
  {
    id: 'Administration',
    name: 'Administration',
    description: 'Planning, reporting, and regulatory record keeping.',
    tags: ['management'],
  },
] as const satisfies readonly PersonnelSkillBlueprint[];

const skillBlueprintCache: PersonnelSkillBlueprint[] = [];
const employeeSkillNamesCache: SkillName[] = [];
const skillNameSet = new Set<SkillName>();

const applySkillBlueprints = (source: readonly PersonnelSkillBlueprint[]): void => {
  const normalized = toNormalizedSkillBlueprints(source);
  const effective =
    normalized.length > 0
      ? normalized
      : toNormalizedSkillBlueprints(DEFAULT_PERSONNEL_SKILL_BLUEPRINTS);
  skillBlueprintCache.length = 0;
  skillBlueprintCache.push(...effective.map((entry) => ({ ...entry })));
  skillNameSet.clear();
  employeeSkillNamesCache.length = 0;
  for (const blueprint of skillBlueprintCache) {
    skillNameSet.add(blueprint.id);
    employeeSkillNamesCache.push(blueprint.id);
  }
};

applySkillBlueprints(DEFAULT_PERSONNEL_SKILL_BLUEPRINTS);

export const EMPLOYEE_SKILL_NAMES = employeeSkillNamesCache;

export const getEmployeeSkillNames = (): SkillName[] => [...employeeSkillNamesCache];

export const getPersonnelSkillBlueprints = (): PersonnelSkillBlueprint[] =>
  skillBlueprintCache.map((entry) => ({ ...entry }));

export const isKnownSkillName = (value: unknown): value is SkillName =>
  typeof value === 'string' && skillNameSet.has(value);

export const setPersonnelSkillBlueprints = (
  blueprints: readonly PersonnelSkillBlueprint[],
): void => {
  applySkillBlueprints(blueprints);
};

export const resetPersonnelSkillBlueprints = (): void => {
  applySkillBlueprints(DEFAULT_PERSONNEL_SKILL_BLUEPRINTS);
};

export const normalizePersonnelSkillBlueprints = (
  blueprints: readonly PersonnelSkillBlueprint[] | undefined,
): PersonnelSkillBlueprint[] => {
  if (!blueprints || blueprints.length === 0) {
    return getPersonnelSkillBlueprints();
  }
  const normalized = toNormalizedSkillBlueprints(blueprints);
  return normalized.length > 0 ? normalized : getPersonnelSkillBlueprints();
};

const listSkillBlueprintFiles = async (directory: string): Promise<string[] | undefined> => {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => name.toLowerCase().endsWith(PERSONNEL_SKILL_BLUEPRINT_EXTENSION))
      .sort((a, b) => a.localeCompare(b));
    return files.length > 0 ? files : undefined;
  } catch (error) {
    const cause = error as NodeJS.ErrnoException;
    if (cause.code === 'ENOENT') {
      return undefined;
    }
    throw new Error(
      `Failed to read personnel skill blueprint directory at ${directory}: ${cause.message}`,
    );
  }
};

const parsePersonnelSkillBlueprint = (
  raw: unknown,
  sourceLabel: string,
): PersonnelSkillBlueprint => {
  const parsed = personnelSkillBlueprintSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const pathInfo = issue?.path?.length ? ` at ${issue.path.join('.')}` : '';
    throw new Error(
      `Invalid personnel skill blueprint in ${sourceLabel}${pathInfo}: ${
        issue?.message ?? 'unknown validation error'
      }`,
    );
  }
  return normalizeSkillBlueprint(parsed.data);
};

export const loadPersonnelSkillBlueprints = async (
  dataDirectory: string,
): Promise<PersonnelSkillBlueprint[]> => {
  const blueprintRoot = path.join(dataDirectory, 'blueprints');
  const directoryPath = path.join(blueprintRoot, PERSONNEL_SKILL_BLUEPRINT_DIR);
  const files = await listSkillBlueprintFiles(directoryPath);
  if (!files || files.length === 0) {
    applySkillBlueprints(DEFAULT_PERSONNEL_SKILL_BLUEPRINTS);
    return getPersonnelSkillBlueprints();
  }
  const drafts: PersonnelSkillBlueprint[] = [];
  for (const fileName of files) {
    const filePath = path.join(directoryPath, fileName);
    const raw = await readJsonFile<unknown>(filePath);
    if (raw === undefined) {
      continue;
    }
    drafts.push(parsePersonnelSkillBlueprint(raw, filePath));
  }
  applySkillBlueprints(drafts);
  return getPersonnelSkillBlueprints();
};
