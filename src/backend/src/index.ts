import { stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BlueprintRepository } from '../data/index.js';

export * from './state/models.js';
export * from './lib/rng.js';
export * from './lib/eventBus.js';
export * from './persistence/saveGame.js';
export * from './persistence/hotReload.js';
export * from './stateFactory.js';
export * from './sim/loop.js';
export * from './sim/simScheduler.js';
export * from '../facade/index.js';
export * from '../server/socketGateway.js';

const defaultModuleDirectory = path.dirname(fileURLToPath(import.meta.url));

export interface ResolveDataDirectoryOptions {
  moduleDirectory?: string;
  cwd?: string;
  envOverride?: string | undefined;
}

const getNormalizedEntryPointHref = (): string | undefined => {
  const entryPointArgument = process.argv[1];

  if (!entryPointArgument) {
    return undefined;
  }

  const entryUrl = entryPointArgument.startsWith('file:')
    ? new URL(entryPointArgument)
    : pathToFileURL(path.resolve(entryPointArgument));

  const normalizedEntryPath = fileURLToPath(entryUrl);

  return pathToFileURL(normalizedEntryPath).href;
};

const expectedBlueprintSubdirectories: string[][] = [
  ['blueprints', 'strains'],
  ['blueprints', 'devices'],
  ['blueprints', 'cultivationMethods'],
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
  const moduleDirectory = options.moduleDirectory ?? defaultModuleDirectory;
  const cwd = options.cwd ?? process.cwd();
  const envCandidate = Object.prototype.hasOwnProperty.call(options, 'envOverride')
    ? options.envOverride
    : process.env.WEEBBREED_DATA_DIR;

  const envOverride = envCandidate ? path.resolve(envCandidate) : undefined;

  const candidates = [
    envOverride,
    path.resolve(moduleDirectory, '..', 'data'),
    path.resolve(moduleDirectory, '../../..', 'data'),
    path.resolve(moduleDirectory, '../../../..', 'data'),
    path.resolve(cwd, 'data'),
    path.resolve(cwd, '..', 'data'),
  ].filter(Boolean) as string[];

  const checked = new Set<string>();

  for (const candidate of candidates) {
    if (checked.has(candidate)) {
      continue;
    }
    checked.add(candidate);

    if (await isValidDataDirectory(candidate)) {
      return candidate;
    }
  }

  throw new Error('Unable to locate data directory. Set WEEBBREED_DATA_DIR to override.');
};

export const bootstrap = async (options?: ResolveDataDirectoryOptions) => {
  const dataDirectory = await resolveDataDirectory(options);
  const repository = await BlueprintRepository.loadFrom(dataDirectory);
  const summary = repository.getSummary();

  console.log(
    `Loaded blueprint data from ${dataDirectory} (${summary.loadedFiles} files, versions: ${Object.keys(summary.versions).length})`,
  );

  if (process.env.NODE_ENV !== 'production') {
    repository.onHotReload(
      (result) => {
        console.log(`Blueprint data hot-reloaded (${result.summary.loadedFiles} files validated).`);
      },
      {
        onHotReloadError: (error) => {
          console.error('Blueprint data reload failed', error);
        },
      },
    );
  }

  return repository;
};

const normalizedEntryPointHref = getNormalizedEntryPointHref();

if (normalizedEntryPointHref && import.meta.url === normalizedEntryPointHref) {
  bootstrap().catch((error) => {
    console.error('Backend simulation bootstrap failed', error);
    process.exitCode = 1;
  });
}
