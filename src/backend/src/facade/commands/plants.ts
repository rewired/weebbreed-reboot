import { z } from 'zod';
import type { PlantingPlanToggleResult } from '@/engine/plants/plantingPlanService.js';
import { entityIdentifier, nonNegativeNumber, positiveInteger, uuid } from './commonSchemas.js';
import {
  createServiceCommand,
  type CommandRegistration,
  type MissingCommandHandler,
  type ServiceCommandHandler,
} from './commandRegistry.js';

const addPlantingSchema = z
  .object({
    zoneId: entityIdentifier,
    strainId: uuid,
    count: positiveInteger,
    startTick: nonNegativeNumber.optional(),
  })
  .strict();

const cullPlantingSchema = z
  .object({
    plantingId: uuid,
    count: positiveInteger.optional(),
  })
  .strict();

const harvestPlantingSchema = z
  .object({
    plantingId: uuid,
  })
  .strict();

const applyIrrigationSchema = z
  .object({
    zoneId: uuid,
    liters: nonNegativeNumber,
  })
  .strict();

const applyFertilizerSchema = z
  .object({
    zoneId: uuid,
    nutrients: z
      .object({
        n: nonNegativeNumber,
        p: nonNegativeNumber,
        k: nonNegativeNumber,
      })
      .strict(),
  })
  .strict();

const togglePlantingPlanSchema = z
  .object({
    zoneId: entityIdentifier,
    enabled: z.boolean(),
  })
  .strict();

export type AddPlantingIntent = z.infer<typeof addPlantingSchema>;
export type CullPlantingIntent = z.infer<typeof cullPlantingSchema>;
export type HarvestPlantingIntent = z.infer<typeof harvestPlantingSchema>;
export type ApplyIrrigationIntent = z.infer<typeof applyIrrigationSchema>;
export type ApplyFertilizerIntent = z.infer<typeof applyFertilizerSchema>;
export type TogglePlantingPlanIntent = z.infer<typeof togglePlantingPlanSchema>;

export interface PlantIntentHandlers {
  addPlanting: ServiceCommandHandler<AddPlantingIntent>;
  cullPlanting: ServiceCommandHandler<CullPlantingIntent>;
  harvestPlanting: ServiceCommandHandler<HarvestPlantingIntent>;
  applyIrrigation: ServiceCommandHandler<ApplyIrrigationIntent>;
  applyFertilizer: ServiceCommandHandler<ApplyFertilizerIntent>;
  togglePlantingPlan: ServiceCommandHandler<TogglePlantingPlanIntent, PlantingPlanToggleResult>;
}

export interface PlantCommandRegistry {
  addPlanting: CommandRegistration<AddPlantingIntent>;
  cullPlanting: CommandRegistration<CullPlantingIntent>;
  harvestPlanting: CommandRegistration<HarvestPlantingIntent>;
  applyIrrigation: CommandRegistration<ApplyIrrigationIntent>;
  applyFertilizer: CommandRegistration<ApplyFertilizerIntent>;
  togglePlantingPlan: CommandRegistration<TogglePlantingPlanIntent, PlantingPlanToggleResult>;
}

export interface PlantCommandOptions {
  services: () => Partial<PlantIntentHandlers>;
  onMissingHandler: MissingCommandHandler;
}

export const buildPlantCommands = ({
  services,
  onMissingHandler,
}: PlantCommandOptions): PlantCommandRegistry => ({
  addPlanting: createServiceCommand(
    'plants.addPlanting',
    addPlantingSchema,
    () => services().addPlanting,
    onMissingHandler,
  ),
  cullPlanting: createServiceCommand(
    'plants.cullPlanting',
    cullPlantingSchema,
    () => services().cullPlanting,
    onMissingHandler,
  ),
  harvestPlanting: createServiceCommand(
    'plants.harvestPlanting',
    harvestPlantingSchema,
    () => services().harvestPlanting,
    onMissingHandler,
  ),
  applyIrrigation: createServiceCommand(
    'plants.applyIrrigation',
    applyIrrigationSchema,
    () => services().applyIrrigation,
    onMissingHandler,
  ),
  applyFertilizer: createServiceCommand(
    'plants.applyFertilizer',
    applyFertilizerSchema,
    () => services().applyFertilizer,
    onMissingHandler,
  ),
  togglePlantingPlan: createServiceCommand<TogglePlantingPlanIntent, PlantingPlanToggleResult>(
    'plants.togglePlantingPlan',
    togglePlantingPlanSchema,
    () => services().togglePlantingPlan,
    onMissingHandler,
  ),
});

export const schemas = {
  addPlantingSchema,
  cullPlantingSchema,
  harvestPlantingSchema,
  applyIrrigationSchema,
  applyFertilizerSchema,
  togglePlantingPlanSchema,
};
