import { z } from 'zod';
import type {
  CreateRoomResult,
  CreateZoneResult,
  DuplicateRoomResult,
  DuplicateStructureResult,
  DuplicateZoneResult,
} from '@/engine/world/worldService.js';
import type { StructureBlueprint } from '@/state/models.js';
import {
  emptyObjectSchema,
  entityIdentifier,
  nonEmptyString,
  positiveInteger,
  positiveNumber,
  uuid,
} from './commonSchemas.js';
import {
  createServiceCommand,
  type CommandRegistration,
  type MissingCommandHandler,
  type ServiceCommandHandler,
} from './commandRegistry.js';

const rentStructureSchema = z
  .object({
    structureId: entityIdentifier,
  })
  .strict();

const getStructureBlueprintsSchema = emptyObjectSchema;
const createRoomSchema = z
  .object({
    structureId: entityIdentifier,
    room: z
      .object({
        name: nonEmptyString,
        purpose: nonEmptyString,
        area: positiveNumber,
        height: positiveNumber.optional(),
      })
      .strict(),
  })
  .strict();

const updateRoomSchema = z
  .object({
    roomId: entityIdentifier,
    patch: z
      .object({
        name: nonEmptyString.optional(),
        purpose: nonEmptyString.optional(),
        area: positiveNumber.optional(),
        height: positiveNumber.optional(),
      })
      .strict()
      .refine((patch) => Object.keys(patch).length > 0, {
        message: 'At least one field must be provided in patch.',
      }),
  })
  .strict();

const deleteRoomSchema = z
  .object({
    roomId: entityIdentifier,
  })
  .strict();

const createZoneSchema = z
  .object({
    roomId: entityIdentifier,
    zone: z
      .object({
        name: nonEmptyString,
        area: positiveNumber,
        methodId: uuid,
        targetPlantCount: positiveInteger.optional(),
      })
      .strict(),
  })
  .strict();

const updateZoneSchema = z
  .object({
    zoneId: entityIdentifier,
    patch: z
      .object({
        name: nonEmptyString.optional(),
        area: positiveNumber.optional(),
        methodId: uuid.optional(),
        targetPlantCount: positiveInteger.optional(),
      })
      .strict()
      .refine((patch) => Object.keys(patch).length > 0, {
        message: 'At least one field must be provided in patch.',
      }),
  })
  .strict();

const deleteZoneSchema = z
  .object({
    zoneId: entityIdentifier,
  })
  .strict();

const renameStructureSchema = z
  .object({
    structureId: entityIdentifier,
    name: nonEmptyString,
  })
  .strict();

const deleteStructureSchema = z
  .object({
    structureId: entityIdentifier,
  })
  .strict();

const resetSessionSchema = emptyObjectSchema;

const newGameSchema = z
  .object({
    difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
    seed: z.string().optional(),
    modifiers: z
      .object({
        plantStress: z
          .object({
            optimalRangeMultiplier: z.number().min(0.5).max(1.5),
            stressAccumulationMultiplier: z.number().min(0.5).max(1.5),
          })
          .strict(),
        deviceFailure: z
          .object({
            mtbfMultiplier: z.number().min(0.5).max(1.5),
          })
          .strict(),
        economics: z
          .object({
            initialCapital: z.number().min(50000).max(1000000000),
            itemPriceMultiplier: z.number().min(0.5).max(1.5),
            harvestPriceMultiplier: z.number().min(0.5).max(1.5),
            rentPerSqmStructurePerTick: z.number().min(0.1).max(1.5),
            rentPerSqmRoomPerTick: z.number().min(0.1).max(1.5),
          })
          .strict(),
      })
      .strict()
      .optional(),
  })
  .strict();

const duplicateStructureSchema = z
  .object({
    structureId: entityIdentifier,
    name: nonEmptyString.optional(),
  })
  .strict();

const duplicateRoomSchema = z
  .object({
    roomId: entityIdentifier,
    name: nonEmptyString.optional(),
  })
  .strict();

const duplicateZoneSchema = z
  .object({
    zoneId: entityIdentifier,
    name: nonEmptyString.optional(),
  })
  .strict();

export type RentStructureIntent = z.infer<typeof rentStructureSchema>;
export type GetStructureBlueprintsIntent = z.infer<typeof getStructureBlueprintsSchema>;
export type CreateRoomIntent = z.infer<typeof createRoomSchema>;
export type UpdateRoomIntent = z.infer<typeof updateRoomSchema>;
export type DeleteRoomIntent = z.infer<typeof deleteRoomSchema>;
export type CreateZoneIntent = z.infer<typeof createZoneSchema>;
export type UpdateZoneIntent = z.infer<typeof updateZoneSchema>;
export type DeleteZoneIntent = z.infer<typeof deleteZoneSchema>;
export type RenameStructureIntent = z.infer<typeof renameStructureSchema>;
export type DeleteStructureIntent = z.infer<typeof deleteStructureSchema>;
export type ResetSessionIntent = z.infer<typeof resetSessionSchema>;
export type NewGameIntent = z.infer<typeof newGameSchema>;
export type DuplicateStructureIntent = z.infer<typeof duplicateStructureSchema>;
export type DuplicateRoomIntent = z.infer<typeof duplicateRoomSchema>;
export type DuplicateZoneIntent = z.infer<typeof duplicateZoneSchema>;

export interface WorldIntentHandlers {
  rentStructure: ServiceCommandHandler<RentStructureIntent, DuplicateStructureResult>;
  getStructureBlueprints: ServiceCommandHandler<GetStructureBlueprintsIntent, StructureBlueprint[]>;
  createRoom: ServiceCommandHandler<CreateRoomIntent, CreateRoomResult>;
  updateRoom: ServiceCommandHandler<UpdateRoomIntent>;
  deleteRoom: ServiceCommandHandler<DeleteRoomIntent>;
  createZone: ServiceCommandHandler<CreateZoneIntent, CreateZoneResult>;
  updateZone: ServiceCommandHandler<UpdateZoneIntent>;
  deleteZone: ServiceCommandHandler<DeleteZoneIntent>;
  renameStructure: ServiceCommandHandler<RenameStructureIntent>;
  deleteStructure: ServiceCommandHandler<DeleteStructureIntent>;
  resetSession: ServiceCommandHandler<ResetSessionIntent, DuplicateStructureResult>;
  newGame: ServiceCommandHandler<NewGameIntent>;
  duplicateStructure: ServiceCommandHandler<DuplicateStructureIntent, DuplicateStructureResult>;
  duplicateRoom: ServiceCommandHandler<DuplicateRoomIntent, DuplicateRoomResult>;
  duplicateZone: ServiceCommandHandler<DuplicateZoneIntent, DuplicateZoneResult>;
}

export interface WorldCommandRegistry {
  rentStructure: CommandRegistration<RentStructureIntent, DuplicateStructureResult>;
  getStructureBlueprints: CommandRegistration<GetStructureBlueprintsIntent, StructureBlueprint[]>;
  createRoom: CommandRegistration<CreateRoomIntent>;
  updateRoom: CommandRegistration<UpdateRoomIntent>;
  deleteRoom: CommandRegistration<DeleteRoomIntent>;
  createZone: CommandRegistration<CreateZoneIntent, CreateZoneResult>;
  updateZone: CommandRegistration<UpdateZoneIntent>;
  deleteZone: CommandRegistration<DeleteZoneIntent>;
  renameStructure: CommandRegistration<RenameStructureIntent>;
  deleteStructure: CommandRegistration<DeleteStructureIntent>;
  resetSession: CommandRegistration<ResetSessionIntent, DuplicateStructureResult>;
  newGame: CommandRegistration<NewGameIntent>;
  duplicateStructure: CommandRegistration<DuplicateStructureIntent, DuplicateStructureResult>;
  duplicateRoom: CommandRegistration<DuplicateRoomIntent, DuplicateRoomResult>;
  duplicateZone: CommandRegistration<DuplicateZoneIntent, DuplicateZoneResult>;
}

export interface WorldCommandOptions {
  services: () => Partial<WorldIntentHandlers>;
  onMissingHandler: MissingCommandHandler;
}

export const buildWorldCommands = ({
  services,
  onMissingHandler,
}: WorldCommandOptions): WorldCommandRegistry => ({
  rentStructure: createServiceCommand(
    'world.rentStructure',
    rentStructureSchema,
    () => services().rentStructure,
    onMissingHandler,
  ),
  getStructureBlueprints: createServiceCommand(
    'world.getStructureBlueprints',
    getStructureBlueprintsSchema,
    () => services().getStructureBlueprints,
    onMissingHandler,
  ),
  createRoom: createServiceCommand<CreateRoomIntent, CreateRoomResult>(
    'world.createRoom',
    createRoomSchema,
    () => services().createRoom,
    onMissingHandler,
  ),
  updateRoom: createServiceCommand(
    'world.updateRoom',
    updateRoomSchema,
    () => services().updateRoom,
    onMissingHandler,
  ),
  deleteRoom: createServiceCommand(
    'world.deleteRoom',
    deleteRoomSchema,
    () => services().deleteRoom,
    onMissingHandler,
  ),
  createZone: createServiceCommand<CreateZoneIntent, CreateZoneResult>(
    'world.createZone',
    createZoneSchema,
    () => services().createZone,
    onMissingHandler,
  ),
  updateZone: createServiceCommand(
    'world.updateZone',
    updateZoneSchema,
    () => services().updateZone,
    onMissingHandler,
  ),
  deleteZone: createServiceCommand(
    'world.deleteZone',
    deleteZoneSchema,
    () => services().deleteZone,
    onMissingHandler,
  ),
  renameStructure: createServiceCommand(
    'world.renameStructure',
    renameStructureSchema,
    () => services().renameStructure,
    onMissingHandler,
  ),
  deleteStructure: createServiceCommand(
    'world.deleteStructure',
    deleteStructureSchema,
    () => services().deleteStructure,
    onMissingHandler,
  ),
  resetSession: createServiceCommand<ResetSessionIntent, DuplicateStructureResult>(
    'world.resetSession',
    resetSessionSchema,
    () => services().resetSession,
    onMissingHandler,
    (payload) => payload ?? {},
  ),
  newGame: createServiceCommand<NewGameIntent>(
    'world.newGame',
    newGameSchema,
    () => services().newGame,
    onMissingHandler,
    (payload) => payload ?? {},
  ),
  duplicateStructure: createServiceCommand<DuplicateStructureIntent, DuplicateStructureResult>(
    'world.duplicateStructure',
    duplicateStructureSchema,
    () => services().duplicateStructure,
    onMissingHandler,
  ),
  duplicateRoom: createServiceCommand<DuplicateRoomIntent, DuplicateRoomResult>(
    'world.duplicateRoom',
    duplicateRoomSchema,
    () => services().duplicateRoom,
    onMissingHandler,
  ),
  duplicateZone: createServiceCommand<DuplicateZoneIntent, DuplicateZoneResult>(
    'world.duplicateZone',
    duplicateZoneSchema,
    () => services().duplicateZone,
    onMissingHandler,
  ),
});

export const schemas = {
  rentStructureSchema,
  getStructureBlueprintsSchema,
  createRoomSchema,
  updateRoomSchema,
  deleteRoomSchema,
  createZoneSchema,
  updateZoneSchema,
  deleteZoneSchema,
  renameStructureSchema,
  deleteStructureSchema,
  resetSessionSchema,
  newGameSchema,
  duplicateStructureSchema,
  duplicateRoomSchema,
  duplicateZoneSchema,
};
