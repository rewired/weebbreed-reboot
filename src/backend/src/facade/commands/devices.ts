import { z } from 'zod';
import type { DeviceGroupToggleResult } from '@/engine/devices/deviceGroupService.js';
import { entityIdentifier, settingsRecord, uuid } from './commonSchemas.js';
import {
  createServiceCommand,
  type CommandRegistration,
  type MissingCommandHandler,
  type ServiceCommandHandler,
} from './commandRegistry.js';

const installDeviceSchema = z
  .object({
    targetId: uuid,
    deviceId: uuid,
    settings: settingsRecord.optional(),
  })
  .strict();

const updateDeviceSchema = z
  .object({
    instanceId: uuid,
    settings: settingsRecord
      .refine((value) => Object.keys(value).length > 0, {
        message: 'Settings patch must include at least one property.',
      })
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
    instanceId: uuid,
  })
  .strict();

const toggleDeviceGroupSchema = z
  .object({
    zoneId: entityIdentifier,
    kind: z.string().trim().min(1),
    enabled: z.boolean(),
  })
  .strict();

export type InstallDeviceIntent = z.infer<typeof installDeviceSchema>;
export type UpdateDeviceIntent = z.infer<typeof updateDeviceSchema>;
export type MoveDeviceIntent = z.infer<typeof moveDeviceSchema>;
export type RemoveDeviceIntent = z.infer<typeof removeDeviceSchema>;
export type ToggleDeviceGroupIntent = z.infer<typeof toggleDeviceGroupSchema>;

export interface DeviceIntentHandlers {
  installDevice: ServiceCommandHandler<InstallDeviceIntent>;
  updateDevice: ServiceCommandHandler<UpdateDeviceIntent>;
  moveDevice: ServiceCommandHandler<MoveDeviceIntent>;
  removeDevice: ServiceCommandHandler<RemoveDeviceIntent>;
  toggleDeviceGroup: ServiceCommandHandler<ToggleDeviceGroupIntent, DeviceGroupToggleResult>;
}

export interface DeviceCommandRegistry {
  installDevice: CommandRegistration<InstallDeviceIntent>;
  updateDevice: CommandRegistration<UpdateDeviceIntent>;
  moveDevice: CommandRegistration<MoveDeviceIntent>;
  removeDevice: CommandRegistration<RemoveDeviceIntent>;
  toggleDeviceGroup: CommandRegistration<ToggleDeviceGroupIntent, DeviceGroupToggleResult>;
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
});

export const schemas = {
  installDeviceSchema,
  updateDeviceSchema,
  moveDeviceSchema,
  removeDeviceSchema,
  toggleDeviceGroupSchema,
};
