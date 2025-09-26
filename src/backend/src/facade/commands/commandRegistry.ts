import { z, ZodError } from 'zod';
import { createEventCollector, type EventBus, type SimulationEvent } from '@/lib/eventBus.js';
import type { GameState, SimulationClockState } from '@/state/models.js';

export type ErrorCode =
  | 'ERR_NOT_FOUND'
  | 'ERR_FORBIDDEN'
  | 'ERR_CONFLICT'
  | 'ERR_INVALID_STATE'
  | 'ERR_VALIDATION'
  | 'ERR_RATE_LIMIT'
  | 'ERR_DATA_RELOAD_PENDING'
  | 'ERR_INSUFFICIENT_FUNDS'
  | 'ERR_INTERNAL';

export interface CommandError {
  code: ErrorCode;
  message: string;
  path?: string[];
}

export interface CommandResult<T = void> {
  ok: boolean;
  data?: T;
  warnings?: string[];
  errors?: CommandError[];
}

export class CommandExecutionError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly path?: string[],
  ) {
    super(message);
    this.name = 'CommandExecutionError';
  }
}

export interface CommandExecutionContext {
  readonly command: string;
  readonly state: GameState;
  readonly clock: SimulationClockState;
  readonly tick: number;
  readonly events: ReturnType<typeof createEventCollector>;
}

export type ServiceCommandHandler<Payload, Result = unknown> = (
  payload: Payload,
  context: CommandExecutionContext,
) => Promise<CommandResult<Result>> | CommandResult<Result>;

export interface CommandRegistration<Payload, Result = unknown> {
  name: string;
  schema: z.ZodType<Payload>;
  handler: ServiceCommandHandler<Payload, Result>;
  preprocess?: (payload: unknown) => unknown;
}

export type GenericCommandRegistration = CommandRegistration<unknown, unknown>;

export type DomainCommandRegistryMap = Record<string, GenericCommandRegistration>;

export type DomainApi<Commands extends DomainCommandRegistryMap> = {
  [Key in keyof Commands]: Commands[Key] extends CommandRegistration<infer Payload, infer Result>
    ? (payload?: Payload) => Promise<CommandResult<Result>>
    : never;
};

export type DomainCommandInvoker = (payload?: unknown) => Promise<CommandResult<unknown>>;

export type MissingCommandHandler = <Result>(command: string) => CommandResult<Result>;

export type CommandContextFactory = (command: string) => {
  context: CommandExecutionContext;
  flush: () => void;
};

export const stripIntentMetadata = (payload: unknown): unknown => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }
  const rest = { ...(payload as Record<string, unknown>) };
  delete rest.requestId;
  return rest;
};

export const createError = (code: ErrorCode, message: string, path?: string[]): CommandError => ({
  code,
  message,
  path,
});

export const createFailure = (
  code: ErrorCode,
  message: string,
  command: string,
): CommandResult => ({
  ok: false,
  errors: [createError(code, message, [command])],
});

export const normalizeWarnings = (warnings?: string[]): string[] | undefined => {
  if (!warnings || warnings.length === 0) {
    return undefined;
  }
  const unique = Array.from(new Set(warnings.map((entry) => entry.trim()).filter(Boolean)));
  return unique.length > 0 ? unique : undefined;
};

export const normalizeErrors = (errors?: CommandError[]): CommandError[] => {
  if (!errors) {
    return [];
  }
  return errors
    .map((error) => ({
      code: error.code,
      message: error.message,
      path: error.path && error.path.length > 0 ? error.path : undefined,
    }))
    .filter((error) => Boolean(error.message));
};

export const normalizeResult = <T>(result?: CommandResult<T>): CommandResult<T> => {
  if (!result) {
    return { ok: true };
  }
  const warnings = normalizeWarnings(result.warnings);
  if (!result.ok) {
    const errors = normalizeErrors(result.errors);
    return {
      ok: false,
      warnings,
      errors:
        errors.length > 0
          ? errors
          : [createError('ERR_INVALID_STATE', 'Command failed without error details.')],
    };
  }
  return {
    ok: true,
    data: result.data,
    warnings,
  };
};

export const handleValidationError = (command: string, error: ZodError): CommandResult => {
  const issues = error.issues;
  if (issues.length === 0) {
    return createFailure('ERR_VALIDATION', 'Invalid payload.', command);
  }
  const errors = issues.map((issue) =>
    createError('ERR_VALIDATION', issue.message, [
      command,
      ...issue.path.map((segment) => String(segment)),
    ]),
  );
  return { ok: false, errors };
};

export const handleCommandError = (command: string, error: unknown): CommandResult => {
  if (error instanceof CommandExecutionError) {
    return {
      ok: false,
      errors: [
        createError(
          error.code,
          error.message,
          error.path && error.path.length > 0 ? error.path : [command],
        ),
      ],
    };
  }
  if (error instanceof ZodError) {
    return handleValidationError(command, error);
  }
  const message = error instanceof Error ? error.message : String(error);
  return createFailure('ERR_INTERNAL', message, command);
};

export const createCommandContextFactory = (
  state: GameState,
  eventBus: EventBus,
): CommandContextFactory => {
  return (command: string) => {
    const tick = state.clock.tick;
    const buffer: SimulationEvent[] = [];
    const collector = createEventCollector(buffer, tick);
    return {
      context: {
        command,
        state,
        clock: state.clock,
        tick,
        events: collector,
      },
      flush: () => {
        if (buffer.length === 0) {
          return;
        }
        const timestamp = Date.now();
        const events = buffer.map((event) => ({
          ...event,
          tick: event.tick ?? tick,
          ts: event.ts ?? timestamp,
        }));
        buffer.length = 0;
        eventBus.emitMany(events);
      },
    };
  };
};

export function createServiceCommand<Payload, Result = unknown>(
  name: string,
  schema: z.ZodType<Payload>,
  resolve: () => ServiceCommandHandler<Payload, Result> | undefined,
  onMissingHandler: MissingCommandHandler,
  preprocess?: (payload: unknown) => unknown,
): CommandRegistration<Payload, Result> {
  return {
    name,
    schema,
    preprocess,
    handler: async (intent, context) => {
      const handler = resolve();
      if (!handler) {
        return onMissingHandler(name);
      }
      return handler(intent, context);
    },
  };
}

export async function executeCommand<Payload, Result = unknown>(
  registration: CommandRegistration<Payload, Result>,
  rawPayload: unknown,
  createContext: CommandContextFactory,
): Promise<CommandResult<Result>> {
  const sanitizedPayload = stripIntentMetadata(rawPayload);
  const input = registration.preprocess
    ? registration.preprocess(sanitizedPayload)
    : sanitizedPayload;
  const parsed = registration.schema.safeParse(input);
  if (!parsed.success) {
    return handleValidationError(registration.name, parsed.error);
  }

  const { context, flush } = createContext(registration.name);

  try {
    const outcome = await registration.handler(parsed.data, context);
    const normalized = normalizeResult(outcome);
    if (normalized.ok) {
      flush();
    }
    return normalized;
  } catch (error) {
    return handleCommandError(registration.name, error);
  }
}
