import { z } from 'zod';
import type { RoomPurpose } from '../../../engine/roomPurposes/index.js';

export const roomPurposeSchema: z.ZodType<RoomPurpose> = z
  .object({
    id: z.string().uuid(),
    kind: z.literal('RoomPurpose'),
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
