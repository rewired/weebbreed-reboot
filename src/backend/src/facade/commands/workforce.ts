import { z } from 'zod';
import type { JobMarketRefreshSummary } from '@/engine/workforce/jobMarketService.js';
import {
  emptyObjectSchema,
  nonEmptyString,
  nonNegativeNumber,
  positiveNumber,
  settingsRecord,
  uuid,
} from './commonSchemas.js';
import {
  createServiceCommand,
  type CommandRegistration,
  type MissingCommandHandler,
  type ServiceCommandHandler,
} from './commandRegistry.js';

const refreshCandidatesSchema = emptyObjectSchema
  .extend({
    seed: z.string().optional(),
    policyId: nonEmptyString.optional(),
    force: z.boolean().optional(),
  })
  .strict();

const hireSchema = z
  .object({
    candidateId: uuid,
    role: nonEmptyString,
    wage: nonNegativeNumber.optional(),
  })
  .strict();

const fireSchema = z
  .object({
    employeeId: uuid,
  })
  .strict();

const setOvertimePolicySchema = z
  .object({
    policy: z.enum(['payout', 'timeOff']),
    multiplier: positiveNumber.optional(),
  })
  .strict();

const assignStructureSchema = z
  .object({
    employeeId: uuid,
    structureId: uuid.optional(),
  })
  .strict();

const enqueueTaskSchema = z
  .object({
    taskKind: nonEmptyString,
    payload: settingsRecord.optional(),
  })
  .strict();

export type RefreshCandidatesIntent = z.infer<typeof refreshCandidatesSchema>;
export type HireIntent = z.infer<typeof hireSchema>;
export type FireIntent = z.infer<typeof fireSchema>;
export type SetOvertimePolicyIntent = z.infer<typeof setOvertimePolicySchema>;
export type AssignStructureIntent = z.infer<typeof assignStructureSchema>;
export type EnqueueTaskIntent = z.infer<typeof enqueueTaskSchema>;

export interface WorkforceIntentHandlers {
  refreshCandidates: ServiceCommandHandler<RefreshCandidatesIntent, JobMarketRefreshSummary>;
  hire: ServiceCommandHandler<HireIntent>;
  fire: ServiceCommandHandler<FireIntent>;
  setOvertimePolicy: ServiceCommandHandler<SetOvertimePolicyIntent>;
  assignStructure: ServiceCommandHandler<AssignStructureIntent>;
  enqueueTask: ServiceCommandHandler<EnqueueTaskIntent>;
}

export interface WorkforceCommandRegistry {
  refreshCandidates: CommandRegistration<RefreshCandidatesIntent, JobMarketRefreshSummary>;
  hire: CommandRegistration<HireIntent>;
  fire: CommandRegistration<FireIntent>;
  setOvertimePolicy: CommandRegistration<SetOvertimePolicyIntent>;
  assignStructure: CommandRegistration<AssignStructureIntent>;
  enqueueTask: CommandRegistration<EnqueueTaskIntent>;
}

export interface WorkforceCommandOptions {
  services: () => Partial<WorkforceIntentHandlers>;
  onMissingHandler: MissingCommandHandler;
}

export const buildWorkforceCommands = ({
  services,
  onMissingHandler,
}: WorkforceCommandOptions): WorkforceCommandRegistry => ({
  refreshCandidates: createServiceCommand<RefreshCandidatesIntent, JobMarketRefreshSummary>(
    'workforce.refreshCandidates',
    refreshCandidatesSchema,
    () => services().refreshCandidates,
    onMissingHandler,
    (payload) => payload ?? {},
  ),
  hire: createServiceCommand('workforce.hire', hireSchema, () => services().hire, onMissingHandler),
  fire: createServiceCommand('workforce.fire', fireSchema, () => services().fire, onMissingHandler),
  setOvertimePolicy: createServiceCommand(
    'workforce.setOvertimePolicy',
    setOvertimePolicySchema,
    () => services().setOvertimePolicy,
    onMissingHandler,
  ),
  assignStructure: createServiceCommand(
    'workforce.assignStructure',
    assignStructureSchema,
    () => services().assignStructure,
    onMissingHandler,
  ),
  enqueueTask: createServiceCommand(
    'workforce.enqueueTask',
    enqueueTaskSchema,
    () => services().enqueueTask,
    onMissingHandler,
    (raw) => {
      const base = (raw ?? {}) as EnqueueTaskIntent;
      return { ...base, payload: base.payload ?? {} };
    },
  ),
});

export const schemas = {
  refreshCandidatesSchema,
  hireSchema,
  fireSchema,
  setOvertimePolicySchema,
  assignStructureSchema,
  enqueueTaskSchema,
};
