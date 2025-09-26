import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { DifficultyLevel } from '@/state/models.js';

const difficultyModifiersSchema = z
  .object({
    plantStress: z
      .object({
        optimalRangeMultiplier: z.number(),
        stressAccumulationMultiplier: z.number(),
      })
      .strict(),
    deviceFailure: z
      .object({
        mtbfMultiplier: z.number(),
      })
      .strict(),
    economics: z
      .object({
        initialCapital: z.number(),
        itemPriceMultiplier: z.number(),
        harvestPriceMultiplier: z.number(),
        rentPerSqmStructurePerTick: z.number(),
        rentPerSqmRoomPerTick: z.number(),
      })
      .strict(),
  })
  .strict();

const difficultyPresetSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    modifiers: difficultyModifiersSchema,
  })
  .strict();

const difficultyConfigSchema = z.object({
  easy: difficultyPresetSchema,
  normal: difficultyPresetSchema,
  hard: difficultyPresetSchema,
});

export type DifficultyModifiers = z.infer<typeof difficultyModifiersSchema>;
export type DifficultyPreset = z.infer<typeof difficultyPresetSchema>;
export type DifficultyConfig = z.infer<typeof difficultyConfigSchema>;

export const DIFFICULTY_CONFIG_FILENAME = 'difficulty.json';

export const resolveDifficultyConfigPath = (dataDirectory: string): string =>
  path.join(dataDirectory, 'configs', DIFFICULTY_CONFIG_FILENAME);

export class DifficultyConfigError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'DifficultyConfigError';
  }
}

export const loadDifficultyConfig = async (dataDirectory: string): Promise<DifficultyConfig> => {
  const filePath = resolveDifficultyConfigPath(dataDirectory);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    const cause = error as NodeJS.ErrnoException;
    if (cause.code === 'ENOENT') {
      throw new DifficultyConfigError(
        `Difficulty configuration file not found at ${filePath}.`,
        error,
      );
    }
    throw new DifficultyConfigError(
      `Failed to read difficulty configuration at ${filePath}: ${cause.message}`,
      error,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    throw new DifficultyConfigError(
      `Invalid JSON in difficulty configuration at ${filePath}.`,
      error,
    );
  }

  try {
    return difficultyConfigSchema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formatted = error.issues
        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; ');
      throw new DifficultyConfigError(
        `Difficulty configuration validation failed: ${formatted}`,
        error,
      );
    }
    throw new DifficultyConfigError('Unknown error validating difficulty configuration.', error);
  }
};

export const listDifficultyLevels = (): DifficultyLevel[] => ['easy', 'normal', 'hard'];
