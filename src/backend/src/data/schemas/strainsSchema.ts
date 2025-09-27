import { z } from 'zod';

const rangeTuple = z.tuple([z.number(), z.number()]);

const nutrientTripleSchema = z.object({
  nitrogen: z.number(),
  phosphorus: z.number(),
  potassium: z.number(),
});

// Environmental band schemas for the new envBands system
const envBandSchema = z.object({
  green: rangeTuple,
  yellowLow: z.number(),
  yellowHigh: z.number(),
});

const phaseEnvBandsSchema = z
  .object({
    temp_C: envBandSchema.optional(),
    rh_frac: envBandSchema.optional(),
    co2_ppm: envBandSchema.optional(),
    ppfd_umol_m2s: envBandSchema.optional(),
    vpd_kPa: envBandSchema.optional(),
  })
  .passthrough();

const envBandsSchema = z
  .object({
    default: phaseEnvBandsSchema,
    veg: phaseEnvBandsSchema.optional(),
    flower: phaseEnvBandsSchema.optional(),
    seedling: phaseEnvBandsSchema.optional(),
    ripening: phaseEnvBandsSchema.optional(),
  })
  .passthrough();

const stressToleranceSchema = z
  .object({
    vpd_kPa: z.number().optional(),
    temp_C: z.number().optional(),
    rh_frac: z.number().optional(),
    co2_ppm: z.number().optional(),
    ppfd_umol_m2s: z.number().optional(),
  })
  .passthrough();

const methodAffinitySchema = z.record(z.string().uuid(), z.number().min(0).max(1));

const phaseDurationsSchema = z
  .object({
    seedlingDays: z.number().min(0).optional(),
    vegDays: z.number().min(0).optional(),
    flowerDays: z.number().min(0).optional(),
    ripeningDays: z.number().min(0).optional(),
  })
  .passthrough();

const yieldModelSchema = z
  .object({
    baseGmPerPlant: z.number().min(0),
    qualityFactors: z
      .object({
        vpd: z.number().min(0).max(1).optional(),
        ppfd: z.number().min(0).max(1).optional(),
        temp: z.number().min(0).max(1).optional(),
        rh: z.number().min(0).max(1).optional(),
      })
      .passthrough(),
    co2Response: z
      .object({
        saturation_ppm: z.number().min(0),
        halfMax_ppm: z.number().min(0),
      })
      .optional(),
  })
  .passthrough();

const harvestIndexSchema = z
  .object({
    targetFlowering: z.number().min(0).max(1).optional(),
    targetVegetation: z.number().min(0).max(1).optional(),
    targetRipening: z.number().min(0).max(1).optional(),
    targetHarvestReady: z.number().min(0).max(1).optional(),
  })
  .passthrough();

const temperatureResponseSchema = z
  .object({
    Q10: z.number().positive().optional(),
    T_ref_C: z.number().optional(),
    min_C: z.number().optional(),
    max_C: z.number().optional(),
  })
  .passthrough();

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
    // NEW ENHANCED FIELDS
    envBands: envBandsSchema.optional(),
    stressTolerance: stressToleranceSchema.optional(),
    methodAffinity: methodAffinitySchema.optional(),
    phaseDurations: phaseDurationsSchema.optional(),
    yieldModel: yieldModelSchema.optional(),
    // END NEW FIELDS
    growthModel: z
      .object({
        maxBiomassDry: z.number(),
        baseLightUseEfficiency: z.number(),
        maintenanceFracPerDay: z.number(),
        harvestIndex: harvestIndexSchema.optional(),
        temperature: temperatureResponseSchema.optional(),
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
