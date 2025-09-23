import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { logger } from '@runtime/logger.js';
import type { PersonnelNameDirectory } from '@/state/models.js';
import { readJsonFile } from './common.js';

const provisionLogger = logger.child({ component: 'state.personnelProvisioner' });

const DEFAULT_TARGET_PROFILE_COUNT = 240;
const DEFAULT_BATCH_SIZE = 60;
const DEFAULT_MAX_RETRIES = 2;

interface RandomUserProfile {
  gender?: string;
  name?: { first?: string; last?: string };
  login?: { salt?: string };
}

interface RandomUserResponse {
  results?: RandomUserProfile[];
}

const toGender = (value: unknown): 'male' | 'female' | 'other' | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'male' || normalized === 'female') {
    return normalized;
  }
  if (normalized.length === 0) {
    return undefined;
  }
  return 'other';
};

const normaliseName = (value: string | undefined): string => {
  if (!value) {
    return '';
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return '';
  }
  return trimmed
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const describeError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const mergeNames = (existing: string[] | undefined, additions: Iterable<string>): string[] => {
  const result = new Set<string>();
  const push = (value: string | undefined) => {
    if (!value) {
      return;
    }
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      result.add(trimmed);
    }
  };

  if (Array.isArray(existing)) {
    for (const entry of existing) {
      push(typeof entry === 'string' ? entry : '');
    }
  }

  for (const entry of additions) {
    push(entry);
  }

  return Array.from(result).sort((a, b) => a.localeCompare(b));
};

const readNamesFile = async (filePath: string): Promise<string[] | undefined> => {
  return readJsonFile<string[]>(filePath);
};

const writeJsonFile = async (filePath: string, value: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
};

const fetchProfilesForSeed = async (
  seed: string,
  batchSize: number,
  fetchImpl: typeof globalThis.fetch,
  maxRetries: number,
): Promise<RandomUserProfile[]> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const url = new URL('https://randomuser.me/api/');
      url.searchParams.set('results', String(batchSize));
      url.searchParams.set('inc', 'name,gender,login');
      url.searchParams.set('seed', seed);
      const response = await fetchImpl(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as RandomUserResponse;
      const profiles = Array.isArray(payload?.results) ? payload.results : null;
      if (!profiles) {
        throw new Error('Unexpected response payload.');
      }
      return profiles;
    } catch (error) {
      lastError = error;
      provisionLogger.warn(
        { seed, attempt, error: describeError(error) },
        'Failed to fetch personnel names from RandomUser.',
      );
    }
  }

  throw new Error(`Unable to fetch personnel names for seed ${seed}: ${describeError(lastError)}`);
};

export interface ProvisionPersonnelDirectoryOptions {
  dataDirectory: string;
  rngSeed: string;
  fetchImpl?: typeof globalThis.fetch;
  httpEnabled?: boolean;
  targetProfileCount?: number;
  batchSize?: number;
  maxRetries?: number;
}

export interface ProvisionPersonnelDirectoryResult {
  changed: boolean;
  directory: PersonnelNameDirectory | null;
}

export const provisionPersonnelDirectory = async (
  options: ProvisionPersonnelDirectoryOptions,
): Promise<ProvisionPersonnelDirectoryResult> => {
  const personnelDir = path.join(options.dataDirectory, 'personnel');
  const maleFile = path.join(personnelDir, 'names', 'firstNamesMale.json');
  const femaleFile = path.join(personnelDir, 'names', 'firstNamesFemale.json');
  const lastNamesFile = path.join(personnelDir, 'names', 'lastNames.json');
  const seedsFile = path.join(personnelDir, 'randomSeeds.json');

  const [maleExists, femaleExists, lastExists, seedsExists] = await Promise.all([
    fileExists(maleFile),
    fileExists(femaleFile),
    fileExists(lastNamesFile),
    fileExists(seedsFile),
  ]);

  if (maleExists && femaleExists && lastExists && seedsExists) {
    return { changed: false, directory: null };
  }

  const httpDisabledEnv = process.env.WEEBBREED_DISABLE_JOB_MARKET_HTTP === 'true';
  const httpEnabled = options.httpEnabled ?? !httpDisabledEnv;
  const fetchImpl =
    options.fetchImpl ??
    (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined);

  if (!httpEnabled) {
    throw new Error('HTTP integrations are disabled; personnel names cannot be provisioned.');
  }

  if (!fetchImpl) {
    throw new Error('No fetch implementation available to provision personnel names.');
  }

  const targetProfileCount = Math.max(
    1,
    Math.trunc(options.targetProfileCount ?? DEFAULT_TARGET_PROFILE_COUNT),
  );
  const batchSize = Math.max(1, Math.trunc(options.batchSize ?? DEFAULT_BATCH_SIZE));
  const maxRetries = Math.max(1, Math.trunc(options.maxRetries ?? DEFAULT_MAX_RETRIES));
  const requestCount = Math.ceil(targetProfileCount / batchSize);

  const maleNames = new Set<string>();
  const femaleNames = new Set<string>();
  const lastNames = new Set<string>();
  const seeds: string[] = [];

  for (let index = 0; index < requestCount; index += 1) {
    const seed = `${options.rngSeed}-${index}`;
    const profiles = await fetchProfilesForSeed(seed, batchSize, fetchImpl, maxRetries);
    for (let profileIndex = 0; profileIndex < profiles.length; profileIndex += 1) {
      const profile = profiles[profileIndex];
      const gender = toGender(profile?.gender);
      const firstName = normaliseName(profile?.name?.first);
      const lastName = normaliseName(profile?.name?.last);

      if (firstName) {
        if (gender === 'male') {
          maleNames.add(firstName);
        } else if (gender === 'female') {
          femaleNames.add(firstName);
        } else {
          maleNames.add(firstName);
          femaleNames.add(firstName);
        }
      }

      if (lastName) {
        lastNames.add(lastName);
      }

      const salt = profile?.login?.salt;
      const trimmedSalt = typeof salt === 'string' ? salt.trim() : '';
      const candidateSeed = trimmedSalt.length > 0 ? trimmedSalt : `${seed}-${profileIndex}`;
      seeds.push(candidateSeed);
    }
  }

  if (maleNames.size === 0 && femaleNames.size === 0) {
    throw new Error('RandomUser provisioning returned no usable first names.');
  }

  if (maleNames.size === 0 && femaleNames.size > 0) {
    for (const entry of femaleNames) {
      maleNames.add(entry);
    }
  }

  if (femaleNames.size === 0 && maleNames.size > 0) {
    for (const entry of maleNames) {
      femaleNames.add(entry);
    }
  }

  if (lastNames.size === 0) {
    throw new Error('RandomUser provisioning returned no usable last names.');
  }

  const existingMale = maleExists ? await readNamesFile(maleFile) : undefined;
  const existingFemale = femaleExists ? await readNamesFile(femaleFile) : undefined;
  const existingLastNames = lastExists ? await readNamesFile(lastNamesFile) : undefined;
  const existingSeeds = seedsExists ? await readNamesFile(seedsFile) : undefined;

  const mergedMale = mergeNames(existingMale, maleNames);
  const mergedFemale = mergeNames(existingFemale, femaleNames);
  const mergedLastNames = mergeNames(existingLastNames, lastNames);
  const mergedSeeds = mergeNames(existingSeeds, seeds);

  await writeJsonFile(maleFile, mergedMale);
  await writeJsonFile(femaleFile, mergedFemale);
  await writeJsonFile(lastNamesFile, mergedLastNames);
  await writeJsonFile(seedsFile, mergedSeeds);

  const directory: PersonnelNameDirectory = {
    firstNamesMale: mergedMale,
    firstNamesFemale: mergedFemale,
    lastNames: mergedLastNames,
    traits: [],
    randomSeeds: mergedSeeds,
  };

  provisionLogger.info(
    {
      generated: {
        maleFirstNames: mergedMale.length,
        femaleFirstNames: mergedFemale.length,
        lastNames: mergedLastNames.length,
        seeds: mergedSeeds.length,
      },
    },
    'Provisioned personnel name directory.',
  );

  return { changed: true, directory };
};
