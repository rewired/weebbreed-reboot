import { z } from 'zod';
import type { DeviceGroupToggleResult } from '@/engine/devices/deviceGroupService.js';
import type { AdjustLightingCycleResult } from '@/engine/devices/lightingCycleService.js';
import {
  deviceSettingsPatchSchema,
  deviceSettingsSchema,
  entityIdentifier,
  uuid,
} from './commonSchemas.js';
import {
  createServiceCommand,
  type CommandRegistration,
  type GenericCommandRegistration,
  type MissingCommandHandler,
  type ServiceCommandHandler,
} from './commandRegistry.js';

const installDeviceSchema = z
  .object({
    targetId: entityIdentifier,
    deviceId: uuid,
    settings: deviceSettingsSchema.optional(),
  })
  .strict();

const updateDeviceSchema = z
  .object({
    instanceId: uuid,
    settings: deviceSettingsPatchSchema
      .refine(
        (value) => (value ? Object.values(value).some((setting) => setting !== undefined) : false),
        {
          message: 'Settings patch must include at least one property.',
        },
      )
      .optional(),
  })
  .strict();

const moveDeviceSchema = z
  .object({
    instanceId: uuid,
    targetZoneId: uuid,
  })
  .strict();

const removeDeviceSchema = z
  .object({
    instanceId: entityIdentifier,
  })
  .strict();

const toggleDeviceGroupSchema = z
  .object({
    zoneId: entityIdentifier,
    kind: z.string().trim().min(1),
    enabled: z.boolean(),
  })
  .strict();

const adjustLightingCycleSchema = z
  .object({
    zoneId: entityIdentifier,
    photoperiodHours: z
      .object({
        on: z.number().finite().min(1).max(23),
        off: z.number().finite().min(1).max(23),
      })
      .strict(),
  })
  .strict();

export type InstallDeviceIntent = z.infer<typeof installDeviceSchema>;
export type UpdateDeviceIntent = z.infer<typeof updateDeviceSchema>;
export type MoveDeviceIntent = z.infer<typeof moveDeviceSchema>;
export type RemoveDeviceIntent = z.infer<typeof removeDeviceSchema>;
export type ToggleDeviceGroupIntent = z.infer<typeof toggleDeviceGroupSchema>;
export type AdjustLightingCycleIntent = z.infer<typeof adjustLightingCycleSchema>;

export interface DeviceIntentHandlers {
  installDevice: ServiceCommandHandler<InstallDeviceIntent>;
  updateDevice: ServiceCommandHandler<UpdateDeviceIntent>;
  moveDevice: ServiceCommandHandler<MoveDeviceIntent>;
  removeDevice: ServiceCommandHandler<RemoveDeviceIntent>;
  toggleDeviceGroup: ServiceCommandHandler<ToggleDeviceGroupIntent, DeviceGroupToggleResult>;
  adjustLightingCycle: ServiceCommandHandler<AdjustLightingCycleIntent, AdjustLightingCycleResult>;
}

export interface DeviceCommandRegistry {
  installDevice: CommandRegistration<InstallDeviceIntent>;
  updateDevice: CommandRegistration<UpdateDeviceIntent>;
  moveDevice: CommandRegistration<MoveDeviceIntent>;
  removeDevice: CommandRegistration<RemoveDeviceIntent>;
  toggleDeviceGroup: CommandRegistration<ToggleDeviceGroupIntent, DeviceGroupToggleResult>;
  adjustLightingCycle: CommandRegistration<AdjustLightingCycleIntent, AdjustLightingCycleResult>;
  [key: string]: GenericCommandRegistration;
}

export interface DeviceCommandOptions {
  services: () => Partial<DeviceIntentHandlers>;
  onMissingHandler: MissingCommandHandler;
}

export const buildDeviceCommands = ({
  services,
  onMissingHandler,
}: DeviceCommandOptions): DeviceCommandRegistry => ({
  installDevice: createServiceCommand(
    'devices.installDevice',
    installDeviceSchema,
    () => services().installDevice,
    onMissingHandler,
  ),
  updateDevice: createServiceCommand(
    'devices.updateDevice',
    updateDeviceSchema,
    () => services().updateDevice,
    onMissingHandler,
  ),
  moveDevice: createServiceCommand(
    'devices.moveDevice',
    moveDeviceSchema,
    () => services().moveDevice,
    onMissingHandler,
  ),
  removeDevice: createServiceCommand(
    'devices.removeDevice',
    removeDeviceSchema,
    () => services().removeDevice,
    onMissingHandler,
  ),
  toggleDeviceGroup: createServiceCommand<ToggleDeviceGroupIntent, DeviceGroupToggleResult>(
    'devices.toggleDeviceGroup',
    toggleDeviceGroupSchema,
    () => services().toggleDeviceGroup,
    onMissingHandler,
  ),
  adjustLightingCycle: createServiceCommand<AdjustLightingCycleIntent, AdjustLightingCycleResult>(
    'devices.adjustLightingCycle',
    adjustLightingCycleSchema,
    () => services().adjustLightingCycle,
    onMissingHandler,
  ),
});

export const schemas = {
  installDeviceSchema,
  updateDeviceSchema,
  moveDeviceSchema,
  removeDeviceSchema,
  toggleDeviceGroupSchema,
  adjustLightingCycleSchema,
};
