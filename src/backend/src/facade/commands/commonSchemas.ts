import { z } from 'zod';

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

export const settingsRecord = z.record(z.string(), z.unknown());

export const emptyObjectSchema = z.object({}).strict();
