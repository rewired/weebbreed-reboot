import { z } from 'zod';

const rangeTuple = z.tuple([z.number(), z.number()]);

const nutrientTripleSchema = z.object({
  nitrogen: z.number(),
  phosphorus: z.number(),
  potassium: z.number(),
});

export const strainSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().min(1),
    name: z.string().min(1),
    lineage: z
      .object({
        parents: z.array(z.string()),
      })
      .passthrough(),
    genotype: z
      .object({
        sativa: z.number(),
        indica: z.number(),
        ruderalis: z.number(),
      })
      .passthrough(),
    generalResilience: z.number(),
    germinationRate: z.number(),
    chemotype: z
      .object({
        thcContent: z.number(),
        cbdContent: z.number(),
      })
      .passthrough(),
    morphology: z
      .object({
        growthRate: z.number(),
        yieldFactor: z.number(),
        leafAreaIndex: z.number(),
      })
      .passthrough(),
    growthModel: z
      .object({
        maxBiomassDry: z.number(),
        baseLightUseEfficiency: z.number(),
        maintenanceFracPerDay: z.number(),
      })
      .passthrough(),
    noise: z
      .object({
        enabled: z.boolean(),
        pct: z.number(),
      })
      .passthrough()
      .optional(),
    environmentalPreferences: z
      .object({
        lightSpectrum: z.record(rangeTuple).optional(),
        lightIntensity: z.record(rangeTuple).optional(),
        lightCycle: z.record(rangeTuple).optional(),
        idealTemperature: z.record(rangeTuple).optional(),
        idealHumidity: z.record(rangeTuple).optional(),
        phRange: rangeTuple.optional(),
      })
      .passthrough(),
    nutrientDemand: z
      .object({
        dailyNutrientDemand: z.record(z.string(), nutrientTripleSchema),
        npkTolerance: z.number(),
        npkStressIncrement: z.number(),
      })
      .passthrough(),
    waterDemand: z
      .object({
        dailyWaterUsagePerSquareMeter: z.record(z.string(), z.number()),
        minimumFractionRequired: z.number(),
      })
      .passthrough(),
    diseaseResistance: z
      .object({
        dailyInfectionIncrement: z.number(),
        infectionThreshold: z.number(),
        recoveryRate: z.number(),
      })
      .passthrough(),
    photoperiod: z
      .object({
        vegetationTime: z.number(),
        floweringTime: z.number(),
        transitionTrigger: z.number(),
      })
      .passthrough(),
    stageChangeThresholds: z.record(z.string(), z.object({}).passthrough()),
    harvestWindow: rangeTuple,
    harvestProperties: z
      .object({
        ripeningTime: z.number(),
        maxStorageTime: z.number(),
        qualityDecayRate: z.number(),
      })
      .passthrough(),
    meta: z
      .object({
        description: z.string().optional(),
        advantages: z.array(z.string()).optional(),
        disadvantages: z.array(z.string()).optional(),
        notes: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export type StrainBlueprint = z.infer<typeof strainSchema>;
