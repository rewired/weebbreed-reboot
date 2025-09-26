import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  DifficultyConfigError,
  loadDifficultyConfig,
  resolveDifficultyConfigPath,
} from './difficulty.js';

const tempDirectories: string[] = [];

const createTempDir = async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'difficulty-config-'));
  tempDirectories.push(dir);
  return dir;
};

afterEach(async () => {
  while (tempDirectories.length) {
    const dir = tempDirectories.pop();
    if (!dir) {
      continue;
    }
    await rm(dir, { recursive: true, force: true });
  }
});

describe('loadDifficultyConfig', () => {
  it('loads and validates difficulty configuration', async () => {
    const baseDir = await createTempDir();
    const configDir = path.join(baseDir, 'configs');
    await mkdir(configDir, { recursive: true });
    const filePath = resolveDifficultyConfigPath(baseDir);

    await writeFile(
      filePath,
      JSON.stringify({
        easy: {
          name: 'Easy',
          description: 'Relaxed run',
          modifiers: {
            plantStress: {
              optimalRangeMultiplier: 1.2,
              stressAccumulationMultiplier: 0.8,
            },
            deviceFailure: {
              mtbfMultiplier: 1.1,
            },
            economics: {
              initialCapital: 1_000_000,
              itemPriceMultiplier: 0.9,
              harvestPriceMultiplier: 1.1,
              rentPerSqmStructurePerTick: 0.1,
              rentPerSqmRoomPerTick: 0.2,
            },
          },
        },
        normal: {
          name: 'Normal',
          description: 'Baseline run',
          modifiers: {
            plantStress: {
              optimalRangeMultiplier: 1,
              stressAccumulationMultiplier: 1,
            },
            deviceFailure: {
              mtbfMultiplier: 1,
            },
            economics: {
              initialCapital: 750_000,
              itemPriceMultiplier: 1,
              harvestPriceMultiplier: 1,
              rentPerSqmStructurePerTick: 0.15,
              rentPerSqmRoomPerTick: 0.25,
            },
          },
        },
        hard: {
          name: 'Hard',
          description: 'Challenge mode',
          modifiers: {
            plantStress: {
              optimalRangeMultiplier: 0.9,
              stressAccumulationMultiplier: 1.2,
            },
            deviceFailure: {
              mtbfMultiplier: 0.85,
            },
            economics: {
              initialCapital: 250_000,
              itemPriceMultiplier: 1.1,
              harvestPriceMultiplier: 0.9,
              rentPerSqmStructurePerTick: 0.25,
              rentPerSqmRoomPerTick: 0.35,
            },
          },
        },
      }),
    );

    const config = await loadDifficultyConfig(baseDir);

    expect(config.easy.name).toBe('Easy');
    expect(config.hard.modifiers.economics.initialCapital).toBe(250_000);
  });

  it('throws a descriptive error when file is missing', async () => {
    const baseDir = await createTempDir();
    await mkdir(path.join(baseDir, 'configs'), { recursive: true });

    await expect(loadDifficultyConfig(baseDir)).rejects.toThrow(DifficultyConfigError);
  });

  it('throws a descriptive error when schema validation fails', async () => {
    const baseDir = await createTempDir();
    await mkdir(path.join(baseDir, 'configs'), { recursive: true });
    const filePath = resolveDifficultyConfigPath(baseDir);
    await writeFile(filePath, JSON.stringify({ easy: {} }));

    await expect(loadDifficultyConfig(baseDir)).rejects.toThrow(DifficultyConfigError);
  });
});
