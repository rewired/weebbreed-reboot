import { z } from 'zod';
import { uuid } from './commonSchemas.js';
import {
  createServiceCommand,
  type CommandRegistration,
  type GenericCommandRegistration,
  type MissingCommandHandler,
  type ServiceCommandHandler,
} from './commandRegistry.js';

const scheduleScoutingSchema = z
  .object({
    zoneId: uuid,
  })
  .strict();

const applyTreatmentSchema = z
  .object({
    zoneId: uuid,
    optionId: uuid,
  })
  .strict();

const quarantineZoneSchema = z
  .object({
    zoneId: uuid,
    enabled: z.boolean(),
  })
  .strict();

export type ScheduleScoutingIntent = z.infer<typeof scheduleScoutingSchema>;
export type ApplyTreatmentIntent = z.infer<typeof applyTreatmentSchema>;
export type QuarantineZoneIntent = z.infer<typeof quarantineZoneSchema>;

export interface HealthIntentHandlers {
  scheduleScouting: ServiceCommandHandler<ScheduleScoutingIntent>;
  applyTreatment: ServiceCommandHandler<ApplyTreatmentIntent>;
  quarantineZone: ServiceCommandHandler<QuarantineZoneIntent>;
}

export interface HealthCommandRegistry {
  scheduleScouting: CommandRegistration<ScheduleScoutingIntent>;
  applyTreatment: CommandRegistration<ApplyTreatmentIntent>;
  quarantineZone: CommandRegistration<QuarantineZoneIntent>;
  [key: string]: GenericCommandRegistration;
}

export interface HealthCommandOptions {
  services: () => Partial<HealthIntentHandlers>;
  onMissingHandler: MissingCommandHandler;
}

export const buildHealthCommands = ({
  services,
  onMissingHandler,
}: HealthCommandOptions): HealthCommandRegistry => ({
  scheduleScouting: createServiceCommand(
    'health.scheduleScouting',
    scheduleScoutingSchema,
    () => services().scheduleScouting,
    onMissingHandler,
  ),
  applyTreatment: createServiceCommand(
    'health.applyTreatment',
    applyTreatmentSchema,
    () => services().applyTreatment,
    onMissingHandler,
  ),
  quarantineZone: createServiceCommand(
    'health.quarantineZone',
    quarantineZoneSchema,
    () => services().quarantineZone,
    onMissingHandler,
  ),
});

export const schemas = {
  scheduleScoutingSchema,
  applyTreatmentSchema,
  quarantineZoneSchema,
};
