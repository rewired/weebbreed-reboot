import { z } from 'zod';
import type { RoomPurpose } from '@/engine/roomPurposes/index.js';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const roomPurposeSchema: z.ZodType<RoomPurpose> = z
  .object({
    id: z.string().uuid(),
    kind: z.string().min(1).regex(slugPattern, {
      message: 'kind must be a lowercase slug (letters, numbers, dashes).',
    }),
    name: z.string().min(1),
    description: z.string().optional(),
    flags: z.record(z.boolean()).optional(),
    economy: z
      .object({
        areaCost: z.number().min(0).optional(),
        baseRentPerTick: z.number().min(0).optional(),
      })
      .strict()
      .optional(),
  })
  .passthrough();

export type RoomPurposeBlueprint = z.infer<typeof roomPurposeSchema>;
