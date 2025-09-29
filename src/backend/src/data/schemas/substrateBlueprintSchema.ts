import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const substrateBlueprintSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().min(1).regex(slugPattern, {
      message: 'slug must be lowercase and may include numbers or dashes only.',
    }),
    kind: z.string().default('Substrate'),
    name: z.string().min(1),
    type: z.string().min(1),
    maxCycles: z.number().int().min(0).optional(),
  })
  .passthrough();

export type SubstrateBlueprint = z.infer<typeof substrateBlueprintSchema>;
