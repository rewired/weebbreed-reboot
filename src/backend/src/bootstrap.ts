import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspect } from 'node:util';

import { BlueprintRepository } from '@/data/index.js';
import { DataLoaderError, type DataLoadSummary } from '@/data/dataLoader.js';
import { logger } from '@runtime/logger.js';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const bootstrapLogger = logger.child({ component: 'backend.bootstrap' });
const dataLoaderLogger = bootstrapLogger.child({ scope: 'dataLoader' });

export const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    const stack = error.stack ?? `${error.name}: ${error.message}`;
    const cause =
      'cause' in error && (error as { cause?: unknown }).cause !== undefined
        ? `\nCaused by: ${inspect((error as { cause?: unknown }).cause, { depth: 5 })}`
        : '';
    return `${stack}${cause}`;
  }

  return inspect(error, { depth: 5 });
};

export interface ResolveDataDirectoryOptions {
  moduleDirectory?: string;
  cwd?: string;
  envOverride?: string | undefined;
}

const expectedBlueprintSubdirectories: string[][] = [
  ['blueprints', 'strains'],
  ['blueprints', 'devices'],
  ['blueprints', 'cultivationMethods'],
  ['blueprints', 'roomPurposes'],
  ['prices'],
];

const isDirectory = async (target: string): Promise<boolean> => {
  try {
    const stats = await stat(target);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
};

const isValidDataDirectory = async (candidate: string): Promise<boolean> => {
  if (!(await isDirectory(candidate))) {
    return false;
  }

  for (const segments of expectedBlueprintSubdirectories) {
    if (!(await isDirectory(path.join(candidate, ...segments)))) {
      return false;
    }
  }

  return true;
};

export const resolveDataDirectory = async (
  options: ResolveDataDirectoryOptions = {},
): Promise<string> => {
  const baseDirectory = path.resolve(options.moduleDirectory ?? moduleDirectory);
  const cwd = options.cwd ?? process.cwd();
  const envCandidate = Object.prototype.hasOwnProperty.call(options, 'envOverride')
    ? options.envOverride
    : process.env.WEEBBREED_DATA_DIR;

  const envOverride = envCandidate ? path.resolve(envCandidate) : undefined;
  const checked = new Set<string>();
  const candidates: string[] = [];

  const addCandidate = (candidate: string | undefined) => {
    if (!candidate) {
      return;
    }
    const resolved = path.resolve(candidate);
    if (checked.has(resolved)) {
      return;
    }
    checked.add(resolved);
    candidates.push(resolved);
  };

  addCandidate(envOverride);

  let ancestor: string | undefined = baseDirectory;
  while (ancestor) {
    addCandidate(path.join(ancestor, 'data'));

    const parent = path.dirname(ancestor);
    ancestor = parent === ancestor ? undefined : parent;
  }

  addCandidate(path.resolve(baseDirectory, '..', 'data'));
  addCandidate(path.resolve(baseDirectory, '../../..', 'data'));
  addCandidate(path.resolve(baseDirectory, '../../../..', 'data'));
  addCandidate(path.resolve(cwd, 'data'));
  addCandidate(path.resolve(cwd, '..', 'data'));

  for (const candidate of candidates) {
    if (await isValidDataDirectory(candidate)) {
      return candidate;
    }
  }

  throw new Error('Unable to locate data directory. Set WEEBBREED_DATA_DIR to override.');
};

export interface BootstrapResult {
  repository: BlueprintRepository;
  dataDirectory: string;
  summary: DataLoadSummary;
}

export const logDataLoaderIssues = (error: DataLoaderError) => {
  dataLoaderLogger.error({ issueCount: error.issues.length }, 'Blueprint validation failed.');

  if (error.issues.length === 0) {
    dataLoaderLogger.error('No issue details were provided by the data loader.');
    return;
  }

  for (const issue of error.issues) {
    const context: Record<string, unknown> = {
      level: issue.level,
      file: issue.file ?? '<unknown file>',
    };
    if (issue.details) {
      context.details = inspect(issue.details, { depth: 3 });
    }
    dataLoaderLogger.error(context, issue.message);
  }
};

export const bootstrap = async (
  options?: ResolveDataDirectoryOptions,
): Promise<BootstrapResult> => {
  const dataDirectory = await resolveDataDirectory(options);
  const repository = await BlueprintRepository.loadFrom(dataDirectory);
  const summary = repository.getSummary();

  return { repository, dataDirectory, summary };
};
