import { mkdirSync } from 'node:fs';
import path from 'node:path';
import pino, {
  stdTimeFunctions,
  type DestinationStream,
  type LevelWithSilent,
  type LoggerOptions,
} from 'pino';

const LEVEL_ALIASES: Record<string, LevelWithSilent> = {
  trace: 'trace',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  warning: 'warn',
  error: 'error',
  fatal: 'fatal',
  silent: 'silent',
};

const DEFAULT_LEVEL: LevelWithSilent = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

const normalizeLevel = (value: string | undefined): LevelWithSilent => {
  if (!value) {
    return DEFAULT_LEVEL;
  }
  const normalized = value.trim().toLowerCase();
  return LEVEL_ALIASES[normalized] ?? DEFAULT_LEVEL;
};

const resolveLogLevel = (): LevelWithSilent => {
  const explicit = normalizeLevel(process.env.WEEBBREED_LOG_LEVEL);
  if (explicit !== DEFAULT_LEVEL) {
    return explicit;
  }
  const fallback = normalizeLevel(process.env.LOG_LEVEL);
  return fallback;
};

const ensureDirectory = (target: string) => {
  const directory = path.dirname(target);
  mkdirSync(directory, { recursive: true });
};

const resolveDestination = (): DestinationStream | undefined => {
  const destinationSetting = process.env.WEEBBREED_LOG_DESTINATION ?? process.env.LOG_DESTINATION;
  if (!destinationSetting || destinationSetting === 'stdout') {
    return pino.destination({ dest: 1 });
  }
  if (destinationSetting === 'stderr') {
    return pino.destination({ dest: 2 });
  }

  const filePath = destinationSetting.startsWith('file:')
    ? destinationSetting.slice('file:'.length)
    : destinationSetting;
  const trimmedPath = filePath.trim();
  if (!trimmedPath) {
    return pino.destination({ dest: 1 });
  }
  const resolvedPath = path.isAbsolute(trimmedPath)
    ? trimmedPath
    : path.resolve(process.cwd(), trimmedPath);
  ensureDirectory(resolvedPath);
  return pino.destination({ dest: resolvedPath, append: true, sync: false });
};

const options: LoggerOptions = {
  level: resolveLogLevel(),
  base: { service: 'weebbreed-backend' },
  timestamp: stdTimeFunctions.isoTime,
};

const destination = resolveDestination();

export const logger = destination ? pino(options, destination) : pino(options);

export type Logger = typeof logger;

export const createLogger = (bindings: Record<string, unknown>) => logger.child(bindings);
