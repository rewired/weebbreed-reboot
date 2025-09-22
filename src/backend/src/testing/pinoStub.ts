export interface StubLogger {
  level: string;
  bindings: Record<string, unknown>;
  child: (bindings: Record<string, unknown>) => StubLogger;
  isLevelEnabled: (level: string) => boolean;
  trace: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  fatal: (...args: unknown[]) => void;
}

const noop = () => {};

const createLogger = (bindings: Record<string, unknown> = {}): StubLogger => {
  const logger: StubLogger = {
    level: 'info',
    bindings,
    child: (childBindings: Record<string, unknown>) =>
      createLogger({ ...bindings, ...childBindings }),
    isLevelEnabled: () => true,
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
  };
  return logger;
};

const stdTimeFunctions = {
  isoTime: () => new Date().toISOString(),
};

const destination = () => ({}) as unknown;

const pinoStub = Object.assign(() => createLogger(), {
  destination,
  stdTimeFunctions,
});

export { destination, stdTimeFunctions };
export type DestinationStream = unknown;
export type LevelWithSilent = string;
export type LoggerOptions = Record<string, unknown>;
export default pinoStub;
