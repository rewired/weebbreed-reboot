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

export const deviceSchema = z
  .object({
    id: z.string().uuid(),
    kind: z.string().min(1),
    name: z.string().min(1),
    quality: numericSetting,
    complexity: numericSetting,
    lifespan: numericSetting,
    roomPurposes: roomPurposeCompatibilitySchema,
    settings: settingsSchema,
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

export type DeviceRoomPurposeCompatibility = z.infer<typeof roomPurposeCompatibilitySchema>;
export type DeviceBlueprint = z.infer<typeof deviceSchema>;
