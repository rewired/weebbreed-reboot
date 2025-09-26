import { z } from 'zod';
import { emptyObjectSchema, positiveInteger, positiveNumber } from './commonSchemas.js';
import type {
  CommandExecutionContext,
  CommandRegistration,
  CommandResult,
} from './commandRegistry.js';

export interface TimeStatus {
  running: boolean;
  paused: boolean;
  speed: number;
  tick: number;
  targetTickRate: number;
}

export const timeStartSchema = z
  .object({
    gameSpeed: positiveNumber.optional(),
    maxTicksPerFrame: positiveInteger.optional(),
  })
  .strict();

export const timeStepSchema = z
  .object({
    ticks: positiveInteger.optional(),
  })
  .strict();

export const setSpeedSchema = z
  .object({
    multiplier: positiveNumber,
  })
  .strict();

export type TimeStartIntent = z.infer<typeof timeStartSchema>;
export type TimeStepIntent = z.infer<typeof timeStepSchema>;
export type SetSpeedIntent = z.infer<typeof setSpeedSchema>;

export interface TimeCommandHandlers {
  handleStart: (
    intent: TimeStartIntent,
    context: CommandExecutionContext,
  ) => CommandResult<TimeStatus>;
  handlePause: (context: CommandExecutionContext) => CommandResult<TimeStatus>;
  handleResume: (context: CommandExecutionContext) => CommandResult<TimeStatus>;
  handleStep: (intent: TimeStepIntent) => Promise<CommandResult<TimeStatus>>;
  handleSetSpeed: (
    intent: SetSpeedIntent,
    context: CommandExecutionContext,
  ) => CommandResult<TimeStatus>;
}

export interface TimeCommandRegistry {
  start: CommandRegistration<TimeStartIntent, TimeStatus>;
  pause: CommandRegistration<z.infer<typeof emptyObjectSchema>, TimeStatus>;
  resume: CommandRegistration<z.infer<typeof emptyObjectSchema>, TimeStatus>;
  step: CommandRegistration<TimeStepIntent, TimeStatus>;
  setSpeed: CommandRegistration<SetSpeedIntent, TimeStatus>;
}

export const buildTimeCommands = (handlers: TimeCommandHandlers): TimeCommandRegistry => ({
  start: {
    name: 'time.start',
    schema: timeStartSchema,
    preprocess: (payload) => payload ?? {},
    handler: handlers.handleStart,
  },
  pause: {
    name: 'time.pause',
    schema: emptyObjectSchema,
    preprocess: () => ({}),
    handler: handlers.handlePause,
  },
  resume: {
    name: 'time.resume',
    schema: emptyObjectSchema,
    preprocess: () => ({}),
    handler: handlers.handleResume,
  },
  step: {
    name: 'time.step',
    schema: timeStepSchema,
    preprocess: (payload) => payload ?? {},
    handler: handlers.handleStep,
  },
  setSpeed: {
    name: 'time.setSpeed',
    schema: setSpeedSchema,
    handler: handlers.handleSetSpeed,
  },
});
