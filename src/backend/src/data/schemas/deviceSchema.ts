import { z } from 'zod';

const roomPurposeCompatibilitySchema = z.union([z.literal('*'), z.array(z.string().min(1)).min(1)]);

const numericSetting = z.number();
const rangeTuple = z.tuple([numericSetting, numericSetting]);
const optionalNumericSetting = numericSetting.optional();
const optionalRangeTuple = rangeTuple.optional();

export const deviceSchema = z
  .object({
    id: z.string().uuid(),
    kind: z.string().min(1),
    name: z.string().min(1),
    quality: numericSetting,
    complexity: numericSetting,
    lifespan: numericSetting,
    roomPurposes: roomPurposeCompatibilitySchema,
    settings: z
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

export type DeviceRoomPurposeCompatibility = z.infer<typeof roomPurposeCompatibilitySchema>;
export type DeviceBlueprint = z.infer<typeof deviceSchema>;
