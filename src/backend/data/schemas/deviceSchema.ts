import { z } from 'zod';

const rangeTuple = z.tuple([z.number(), z.number()]);

export const deviceSchema = z
  .object({
    id: z.string().uuid(),
    kind: z.string().min(1),
    name: z.string().min(1),
    quality: z.number(),
    complexity: z.number(),
    lifespanInHours: z.number(),
    settings: z
      .object({
        power: z.number().optional(),
        ppfd: z.number().optional(),
        coverageArea: z.number().optional(),
        spectralRange: rangeTuple.optional(),
        heatFraction: z.number().optional(),
        airflow: z.number().optional(),
        coolingCapacity: z.number().optional(),
        moistureRemoval: z.number().optional(),
        targetCo2: z.number().optional(),
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

export type DeviceBlueprint = z.infer<typeof deviceSchema>;
