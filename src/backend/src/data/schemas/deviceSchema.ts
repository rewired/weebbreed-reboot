import { z } from 'zod';

const roomPurposeCompatibilitySchema = z.union([z.literal('*'), z.array(z.string().min(1)).min(1)]);

const numericSetting = z.number();
const rangeTuple = z.tuple([numericSetting, numericSetting]);
const optionalNumericSetting = numericSetting.optional();
const optionalRangeTuple = rangeTuple.optional();

const canonicalSetpointKeys = new Map(
  [
    'targetTemperature',
    'targetTemperatureRange',
    'targetHumidity',
    'targetCO2',
    'targetCO2Range',
  ].map((key) => [key.toLowerCase(), key] as const),
);

const settingsSchema = z
  .object({
    power: optionalNumericSetting,
    ppfd: optionalNumericSetting,
    coverageArea: optionalNumericSetting,
    spectralRange: optionalRangeTuple,
    heatFraction: optionalNumericSetting,
    airflow: optionalNumericSetting,
    coolingCapacity: optionalNumericSetting,
    moistureRemoval: optionalNumericSetting,
    targetTemperature: optionalNumericSetting,
    targetTemperatureRange: optionalRangeTuple,
    targetHumidity: optionalNumericSetting,
    targetCO2: optionalNumericSetting,
    targetCO2Range: optionalRangeTuple,
  })
  .passthrough()
  .superRefine((settings, ctx) => {
    if (!settings || typeof settings !== 'object') {
      return;
    }

    for (const key of Object.keys(settings as Record<string, unknown>)) {
      const canonicalKey = canonicalSetpointKeys.get(key.toLowerCase());

      if (canonicalKey && canonicalKey !== key) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `Unrecognized setting "${key}". Did you mean "${canonicalKey}"?`,
        });
      }
    }
  });

// Coverage schema for different device types
const coverageSchema = z
  .object({
    maxArea_m2: z.number().positive().optional(),
    maxVolume_m3: z.number().positive().optional(),
    effectivePPFD_at_m: z.number().positive().optional(),
    beamProfile: z.enum(['wide', 'focused', 'directional']).optional(),
    airflowPattern: z.enum(['directional', 'omnidirectional']).optional(),
    distributionPattern: z.enum(['point-source', 'diffused', 'ambient']).optional(),
    ventilationPattern: z.enum(['intake', 'exhaust', 'circulation']).optional(),
    removalPattern: z.enum(['ambient', 'targeted']).optional(),
    controlPattern: z.enum(['single-mode', 'dual-mode', 'multi-zone']).optional(),
  })
  .passthrough();

// Limits schema for device operational boundaries
const limitsSchema = z
  .object({
    power_W: z.number().positive().optional(),
    maxPPFD: z.number().positive().optional(),
    minPPFD: z.number().positive().optional(),
    coolingCapacity_kW: z.number().positive().optional(),
    airflow_m3_h: z.number().positive().optional(),
    maxAirflow_m3_h: z.number().positive().optional(),
    minAirflow_m3_h: z.number().positive().optional(),
    maxStaticPressure_Pa: z.number().positive().optional(),
    co2Rate_ppm_min: z.number().positive().optional(),
    maxCO2_ppm: z.number().positive().optional(),
    minCO2_ppm: z.number().positive().optional(),
    removalRate_kg_h: z.number().positive().optional(),
    capacity_kg_h: z.number().positive().optional(),
    minTemperature_C: z.number().optional(),
    maxTemperature_C: z.number().optional(),
    minHumidity_percent: z.number().min(0).max(100).optional(),
    maxHumidity_percent: z.number().min(0).max(100).optional(),
  })
  .passthrough();

// Maintenance schema for service requirements
const maintenanceSchema = z.object({
  intervalDays: z.number().positive(),
  costPerService_eur: z.number().nonnegative(),
  hoursPerService: z.number().positive(),
});

export const deviceSchema = z
  .object({
    id: z.string().uuid(),
    kind: z.string().min(1),
    name: z.string().min(1),
    quality: numericSetting,
    complexity: numericSetting,
    lifetime_h: numericSetting,
    roomPurposes: roomPurposeCompatibilitySchema,
    capex_eur: z.number().nonnegative().optional(),
    coverage: coverageSchema.optional(),
    limits: limitsSchema.optional(),
    efficiencyDegeneration: z.number().nonnegative().optional(),
    maintenance: maintenanceSchema.optional(),
    settings: settingsSchema,
    meta: z
      .object({
        description: z.string().optional(),
        advantages: z.array(z.string()).optional(),
        disadvantages: z.array(z.string()).optional(),
        notes: z.string().optional(),
      })
      .passthrough(),
    // Legacy field for backward compatibility
    lifespan: numericSetting.optional(),
  })
  .passthrough();

export type DeviceRoomPurposeCompatibility = z.infer<typeof roomPurposeCompatibilitySchema>;
export type DeviceBlueprint = z.infer<typeof deviceSchema>;
