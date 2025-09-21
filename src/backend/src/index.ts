import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inspect } from 'node:util';
import { BlueprintRepository } from '../data/index.js';
import { DataLoaderError, type DataLoadSummary } from '../data/dataLoader.js';
import { logger } from '../../runtime/logger.js';

export * from './state/models.js';
export * from './lib/rng.js';
export * from './lib/eventBus.js';
export {
  eventBus as telemetryEventBus,
  emit,
  emitEvent,
  emitMany,
  events as runtimeEvents,
  bufferedEvents,
  events$ as runtimeEvents$,
  createUiStream,
} from '../../runtime/eventBus.js';
export * from './persistence/saveGame.js';
export * from './persistence/hotReload.js';
export * from './stateFactory.js';
export * from './sim/loop.js';
export * from './sim/simScheduler.js';
export * from '../facade/index.js';
export * from '../server/socketGateway.js';
export * from '../server/sseGateway.js';
export * from './engine/roomPurposes/index.js';

const moduleFilePath = fileURLToPath(import.meta.url);
const moduleHref = pathToFileURL(moduleFilePath).href;
const defaultModuleDirectory = path.dirname(moduleFilePath);

const startupLogger = logger.child({ component: 'backend.startup' });
const dataLoaderLogger = startupLogger.child({ scope: 'dataLoader' });
const hotReloadLogger = startupLogger.child({ scope: 'hotReload' });

const formatError = (error: unknown): string => {
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

const getNormalizedEntryPointHref = (): string | undefined => {
  const entryPointArgument = process.argv[1];

  if (!entryPointArgument) {
    return undefined;
  }

  const normalizedEntryPath = fileURLToPath(
    entryPointArgument.startsWith('file:')
      ? new URL(entryPointArgument)
      : pathToFileURL(path.resolve(entryPointArgument)),
  );

  return pathToFileURL(normalizedEntryPath).href;
};

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

export interface BootstrapResult {
  repository: BlueprintRepository;
  dataDirectory: string;
  summary: DataLoadSummary;
}

const logDataLoaderIssues = (error: DataLoaderError) => {
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

  if (process.env.NODE_ENV !== 'production') {
    repository.onHotReload(
      async (result) => {
        hotReloadLogger.info(
          { loadedFiles: result.summary.loadedFiles },
          'Blueprint data reloaded.',
        );
      },
      {
        onHotReloadError: (error) => {
          hotReloadLogger.error(
            { err: error, details: formatError(error) },
            'Blueprint data reload failed.',
          );
        },
      },
    );
  }

  return { repository, dataDirectory, summary };
};

const registerFatalProcessHandlers = () => {
  process.on('unhandledRejection', (reason) => {
    startupLogger.error(
      { err: reason, details: formatError(reason) },
      'Unhandled promise rejection.',
    );
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    startupLogger.error({ err: error, details: formatError(error) }, 'Uncaught exception.');
    process.exit(1);
  });
};

const main = async (): Promise<BootstrapResult> => {
  const result = await bootstrap();
  startupLogger.info(
    {
      loadedFiles: result.summary.loadedFiles,
      dataDirectory: result.dataDirectory,
    },
    'Backend ready.',
  );
  return result;
};

const normalizedEntryPointHref = getNormalizedEntryPointHref();

if (normalizedEntryPointHref && normalizedEntryPointHref === moduleHref) {
  registerFatalProcessHandlers();

  main().catch((error) => {
    if (error instanceof DataLoaderError) {
      logDataLoaderIssues(error);
    }

    startupLogger.error({ err: error, details: formatError(error) }, 'Boot failed.');
    process.exit(1);
  });
}
