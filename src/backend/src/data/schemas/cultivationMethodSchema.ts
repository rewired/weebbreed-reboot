import { z } from 'zod';

const rangeTuple = z.tuple([z.number(), z.number()]);

export const strainTraitThresholdSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .passthrough();

export const strainTraitCompatibilitySchema = z
  .object({
    preferred: z.record(z.string(), strainTraitThresholdSchema).optional(),
    conflicting: z.record(z.string(), strainTraitThresholdSchema).optional(),
  })
  .passthrough();

export const cultivationMethodSchema = z
  .object({
    id: z.string().uuid(),
    kind: z.string().default('CultivationMethod'),
    name: z.string().min(1),
    setupCost: z.number(),
    laborIntensity: z.number(),
    areaPerPlant: z.number(),
    minimumSpacing: z.number(),
    maxCycles: z.number().int().min(0).optional(),
    substrate: z
      .object({
        type: z.string(),
        costPerSquareMeter: z.number().optional(),
        maxCycles: z.number().optional(),
      })
      .passthrough()
      .optional(),
    containerSpec: z
      .object({
        type: z.string(),
        volumeInLiters: z.number().optional(),
        footprintArea: z.number().optional(),
        reusableCycles: z.number().optional(),
        costPerUnit: z.number().optional(),
        packingDensity: z.number().optional(),
      })
      .passthrough()
      .optional(),
    strainTraitCompatibility: strainTraitCompatibilitySchema.optional(),
    envBias: z
      .object({
        temp_C: z.number().optional(),
        rh_frac: z.number().optional(),
        co2_ppm: z.number().optional(),
        ppfd_umol_m2s: z.number().optional(),
        vpd_kPa: z.number().optional(),
      })
      .optional(),
    capacityHints: z
      .object({
        plantsPer_m2: z.number().positive(),
        canopyHeight_m: z.number().positive(),
      })
      .optional(),
    idealConditions: z
      .object({
        idealTemperature: rangeTuple.optional(),
        idealHumidity: rangeTuple.optional(),
      })
      .passthrough()
      .optional(),
    meta: z
      .object({
        description: z.string().optional(),
        advantages: z.array(z.string()).optional(),
        disadvantages: z.array(z.string()).optional(),
        notes: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type CultivationMethodBlueprint = z.infer<typeof cultivationMethodSchema>;
export type StrainTraitCompatibility = z.infer<typeof strainTraitCompatibilitySchema>;
export type StrainTraitThreshold = z.infer<typeof strainTraitThresholdSchema>;
