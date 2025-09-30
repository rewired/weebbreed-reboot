import { z } from 'zod';
import type { DeviceBlueprint } from '@/data/schemas/deviceSchema.js';

export const uuid = z.string().uuid();

export const prefixedIdentifier = z.string().regex(/^[a-z]+(?:[-_][a-z0-9]+)+$/i, {
  message: 'Value must be a UUID or prefixed identifier.',
});

export const entityIdentifier = z.union([uuid, prefixedIdentifier]);

export const nonEmptyString = z.string().trim().min(1, { message: 'Value must not be empty.' });

export const finiteNumber = z
  .number({ invalid_type_error: 'Value must be a number.' })
  .finite({ message: 'Value must be finite.' });

export const positiveNumber = finiteNumber.gt(0, {
  message: 'Value must be greater than zero.',
});

export const nonNegativeNumber = finiteNumber.min(0, {
  message: 'Value must be greater than or equal to zero.',
});

export const positiveInteger = z
  .number({ invalid_type_error: 'Value must be a number.' })
  .int({ message: 'Value must be an integer.' })
  .min(1, { message: 'Value must be greater than zero.' });

export const nonNegativeInteger = z
  .number({ invalid_type_error: 'Value must be a number.' })
  .int({ message: 'Value must be an integer.' })
  .min(0, { message: 'Value must be zero or greater.' });

type DeviceSettings = DeviceBlueprint['settings'];

const deviceSettingsKeys = [
  'power',
  'ppfd',
  'coverageArea',
  'spectralRange',
  'heatFraction',
  'airflow',
  'coolingCapacity',
  'cop',
  'hysteresisK',
  'fullPowerAtDeltaK',
  'moistureRemoval',
  'targetTemperature',
  'targetTemperatureRange',
  'targetHumidity',
  'targetCO2',
  'targetCO2Range',
  'hysteresis',
  'pulsePpmPerTick',
  'latentRemovalKgPerTick',
  'humidifyRateKgPerTick',
  'dehumidifyRateKgPerTick',
] as const;

const canonicalDeviceSettingKeys = new Map(
  deviceSettingsKeys.map((key) => [key.toLowerCase(), key] as const),
);

const numericSetting = finiteNumber;
const rangeTuple = z.tuple([finiteNumber, finiteNumber]);

const deviceSettingsShape = {
  power: numericSetting.optional(),
  ppfd: numericSetting.optional(),
  coverageArea: numericSetting.optional(),
  spectralRange: rangeTuple.optional(),
  heatFraction: numericSetting.optional(),
  airflow: numericSetting.optional(),
  coolingCapacity: numericSetting.optional(),
  cop: numericSetting.optional(),
  hysteresisK: numericSetting.optional(),
  fullPowerAtDeltaK: numericSetting.optional(),
  moistureRemoval: numericSetting.optional(),
  targetTemperature: numericSetting.optional(),
  targetTemperatureRange: rangeTuple.optional(),
  targetHumidity: numericSetting.optional(),
  targetCO2: numericSetting.optional(),
  targetCO2Range: rangeTuple.optional(),
  hysteresis: numericSetting.optional(),
  pulsePpmPerTick: numericSetting.optional(),
  latentRemovalKgPerTick: numericSetting.optional(),
  humidifyRateKgPerTick: numericSetting.optional(),
  dehumidifyRateKgPerTick: numericSetting.optional(),
} satisfies Record<keyof DeviceSettings, z.ZodTypeAny>;

const deviceSettingsBase = z.object(deviceSettingsShape);
const deviceSettingsStrict = deviceSettingsBase.strict();

export const deviceSettingsSchema = deviceSettingsBase
  .passthrough()
  .superRefine((settings, ctx) => {
    if (!settings || typeof settings !== 'object') {
      return;
    }

    for (const key of Object.keys(settings as Record<string, unknown>)) {
      const canonicalKey = canonicalDeviceSettingKeys.get(key.toLowerCase());

      if (canonicalKey && canonicalKey !== key) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `Unrecognized setting "${key}". Did you mean "${canonicalKey}"?`,
        });
      }
    }
  })
  .pipe(deviceSettingsStrict);

export const deviceSettingsPatchSchema = deviceSettingsStrict.partial();

export const settingsRecord = deviceSettingsSchema;

export const looseRecord = z.record(z.string(), z.unknown());

export const emptyObjectSchema = z.object({}).strict();
