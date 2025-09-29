import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const containerBlueprintSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().min(1).regex(slugPattern, {
      message: 'slug must be lowercase and may include numbers or dashes only.',
    }),
    kind: z.string().default('Container'),
    name: z.string().min(1),
    type: z.string().min(1),
    volumeInLiters: z.number().positive().optional(),
    footprintArea: z.number().positive().optional(),
    reusableCycles: z.number().int().min(0).optional(),
    packingDensity: z.number().positive().optional(),
  })
  .passthrough();

export type ContainerBlueprint = z.infer<typeof containerBlueprintSchema>;
