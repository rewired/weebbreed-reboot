import { z } from 'zod';

const zoneEnvironmentSchema = z.object({
  temperature: z.number(),
  humidity: z.number(),
  co2: z.number(),
  ppfd: z.number(),
  vpd: z.number()
});

const plantSchema = z.object({
  id: z.string(),
  strain: z.any(),
  stage: z.string(),
  ageHours: z.number(),
  biomassDryGrams: z.number(),
  health: z.number(),
  stress: z.number(),
  transpiredWater_L: z.number(),
  lastTickPhotosynthesis_g: z.number()
});

const deviceSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
  coverageArea: z.number().optional(),
  blueprint: z.object({
    id: z.string(),
    name: z.string(),
    kind: z.string(),
    settings: z.record(z.string(), z.any())
  })
});

const zoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  area: z.number(),
  height: z.number(),
  volume: z.number(),
  ambient: z.object({ temperature: z.number(), humidity: z.number(), co2: z.number() }),
  environment: zoneEnvironmentSchema,
  devices: z.array(deviceSchema),
  plants: z.array(plantSchema),
  irrigationReservoir_L: z.number(),
  lastIrrigationSatisfaction: z.number(),
  nutrientSatisfaction: z.number(),
  lastWaterSupplied_L: z.number().optional()
});

export const simulationStateSchema = z.object({
  tick: z.number(),
  tickLengthMinutes: z.number(),
  rngSeed: z.string(),
  zones: z.array(zoneSchema),
  isPaused: z.boolean(),
  accumulatedTimeMs: z.number()
});

export const saveGameSchema = z.object({
  kind: z.literal('WeedBreedSave'),
  version: z.string(),
  createdAt: z.string(),
  tickLengthMinutes: z.number(),
  rngSeed: z.string(),
  state: simulationStateSchema
});

export type SaveGame = z.infer<typeof saveGameSchema>;
