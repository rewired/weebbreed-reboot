import { z } from 'zod';

export const growthModelSchema = z
  .object({
    maxBiomassDry_g: z.number().optional(),
    baseLUE_gPerMol: z.number().optional(),
    maintenanceFracPerDay: z.number().optional(),
    dryMatterFraction: z.record(z.string(), z.number()).optional(),
    harvestIndex: z.record(z.string(), z.number()).optional(),
    phaseCapMultiplier: z.record(z.string(), z.number()).optional(),
    temperature: z
      .object({
        Q10: z.number().optional(),
        T_ref_C: z.number().optional(),
        optimum_C: z.number().optional(),
        sigma_C: z.number().optional()
      })
      .optional()
  })
  .strict()
  .partial();

const nutrientDemandSchema = z
  .object({
    dailyNutrientDemand: z
      .record(
        z.string(),
        z.object({
          nitrogen: z.number().nullable().optional(),
          phosphorus: z.number().nullable().optional(),
          potassium: z.number().nullable().optional()
        })
      )
      .optional(),
    npkTolerance: z.number().optional(),
    npkStressIncrement: z.number().optional()
  })
  .partial();

const waterDemandSchema = z
  .object({
    dailyWaterUsagePerSquareMeter: z.record(z.string(), z.number()).optional(),
    minimumFractionRequired: z.number().optional()
  })
  .partial();

const photoperiodSchema = z
  .object({
    vegetationDays: z.number().optional(),
    floweringDays: z.number().optional(),
    transitionTriggerHours: z.number().optional()
  })
  .partial();

const environmentSchema = z
  .object({
    temperature: z
      .object({ optMin_C: z.number(), optMax_C: z.number() })
      .partial()
      .optional(),
    humidity: z
      .object({ optMin: z.number(), optMax: z.number() })
      .partial()
      .optional(),
    light: z
      .object({ ppfdTarget: z.number().optional() })
      .partial()
      .optional()
  })
  .partial();

export const strainSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string().optional(),
    generalResilience: z.number().optional(),
    growthModel: growthModelSchema.optional(),
    morphology: z.record(z.string(), z.number()).optional(),
    environment: environmentSchema.optional(),
    environmentalPreferences: z.record(z.string(), z.any()).optional(),
    nutrientDemand: nutrientDemandSchema.optional(),
    waterDemand: waterDemandSchema.optional(),
    photoperiod: photoperiodSchema.optional()
  })
  .passthrough();

export type StrainSchema = z.infer<typeof strainSchema>;

export const deviceSettingsSchema = z
  .object({
    power: z.number().optional(),
    ppfd: z.number().optional(),
    coverageArea: z.number().optional(),
    heatFraction: z.number().optional(),
    coolingCapacity: z.number().optional(),
    airflow: z.number().optional(),
    targetTemperature: z.number().optional(),
    targetTemperatureRange: z.tuple([z.number(), z.number()]).optional(),
    moistureRemoval_Lph: z.number().optional(),
    injectionRate_ppmPerMin: z.number().optional(),
    targetCO2_ppm: z.number().optional(),
    maxSafeCO2_ppm: z.number().optional()
  })
  .partial()
  .passthrough();

export const deviceBlueprintSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    kind: z.string(),
    quality: z.number().optional(),
    complexity: z.number().optional(),
    lifespanInHours: z.number().optional(),
    allowedRoomPurposes: z.array(z.string()).optional(),
    settings: deviceSettingsSchema
  })
  .passthrough();

export type DeviceBlueprintSchema = z.infer<typeof deviceBlueprintSchema>;

export const cultivationMethodSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    areaPerPlant_m2: z.number().optional()
  })
  .passthrough();

export type CultivationMethodSchema = z.infer<typeof cultivationMethodSchema>;
