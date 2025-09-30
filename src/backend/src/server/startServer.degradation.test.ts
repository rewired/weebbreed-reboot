import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startBackendServer } from '@/server/startServer.js';
import { eventBus as telemetryEventBus } from '@runtime/eventBus.js';
import type { SimulationEvent } from '@/lib/eventBus.js';

const createEmptyJsonFile = async (target: string, payload: unknown) => {
  await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
};

const createIncompleteDataDirectory = async (): Promise<string> => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'weebbreed-incomplete-data-'));
  const blueprintRoot = path.join(root, 'blueprints');
  const subdirectories = [
    ['blueprints'],
    ['blueprints', 'strains'],
    ['blueprints', 'devices'],
    ['blueprints', 'cultivationMethods'],
    ['blueprints', 'roomPurposes'],
    ['blueprints', 'structures'],
    ['blueprints', 'substrates'],
    ['blueprints', 'containers'],
    ['configs'],
    ['prices'],
    ['personnel'],
    ['personnel', 'names'],
  ];

  for (const segments of subdirectories) {
    await mkdir(path.join(root, ...segments), { recursive: true });
  }

  await createEmptyJsonFile(path.join(root, 'prices', 'devicePrices.json'), {
    version: 'test',
    devicePrices: {},
  });
  await createEmptyJsonFile(path.join(root, 'prices', 'strainPrices.json'), {
    version: 'test',
    strainPrices: {},
  });
  await createEmptyJsonFile(path.join(root, 'prices', 'cultivationMethodPrices.json'), {
    version: 'test',
    cultivationMethodPrices: {},
  });
  await createEmptyJsonFile(path.join(root, 'prices', 'consumablePrices.json'), {
    version: 'test',
    substrates: {},
    containers: {},
  });
  await createEmptyJsonFile(path.join(root, 'prices', 'utilityPrices.json'), {
    version: 'test',
    pricePerKwh: 0,
    pricePerLiterWater: 0,
    pricePerGramNutrients: 0,
  });

  await createEmptyJsonFile(path.join(root, 'configs', 'difficulty.json'), {
    easy: {
      name: 'Easy',
      description: 'Testing preset - easy',
      modifiers: {
        plantStress: {
          optimalRangeMultiplier: 1,
          stressAccumulationMultiplier: 1,
        },
        deviceFailure: {
          mtbfMultiplier: 1,
        },
        economics: {
          initialCapital: 0,
          itemPriceMultiplier: 1,
          harvestPriceMultiplier: 1,
          rentPerSqmStructurePerTick: 0,
          rentPerSqmRoomPerTick: 0,
        },
      },
    },
    normal: {
      name: 'Normal',
      description: 'Testing preset - normal',
      modifiers: {
        plantStress: {
          optimalRangeMultiplier: 1,
          stressAccumulationMultiplier: 1,
        },
        deviceFailure: {
          mtbfMultiplier: 1,
        },
        economics: {
          initialCapital: 0,
          itemPriceMultiplier: 1,
          harvestPriceMultiplier: 1,
          rentPerSqmStructurePerTick: 0,
          rentPerSqmRoomPerTick: 0,
        },
      },
    },
    hard: {
      name: 'Hard',
      description: 'Testing preset - hard',
      modifiers: {
        plantStress: {
          optimalRangeMultiplier: 1,
          stressAccumulationMultiplier: 1,
        },
        deviceFailure: {
          mtbfMultiplier: 1,
        },
        economics: {
          initialCapital: 0,
          itemPriceMultiplier: 1,
          harvestPriceMultiplier: 1,
          rentPerSqmStructurePerTick: 0,
          rentPerSqmRoomPerTick: 0,
        },
      },
    },
  });

  // Provide a placeholder room purpose so the loader succeeds while the state
  // factory still records degradation because the grow room purpose is absent.
  await createEmptyJsonFile(path.join(blueprintRoot, 'roomPurposes', 'breakroom.json'), {
    id: 'break-room',
    name: 'Break Room',
    kind: 'breakroom',
  });

  const personnelNamesDir = path.join(root, 'personnel', 'names');
  await createEmptyJsonFile(path.join(personnelNamesDir, 'firstNamesMale.json'), ['Alex']);
  await createEmptyJsonFile(path.join(personnelNamesDir, 'firstNamesFemale.json'), ['Jamie']);
  await createEmptyJsonFile(path.join(personnelNamesDir, 'lastNames.json'), ['Taylor']);
  await createEmptyJsonFile(path.join(root, 'personnel', 'traits.json'), []);
  await createEmptyJsonFile(path.join(root, 'personnel', 'randomSeeds.json'), ['seed-1']);

  return root;
};

describe('startBackendServer (degradation handling)', () => {
  let dataDirectory: string;

  beforeEach(async () => {
    dataDirectory = await createIncompleteDataDirectory();
  });

  afterEach(async () => {
    await rm(dataDirectory, { recursive: true, force: true });
  });

  it('keeps the server responsive and emits degradation telemetry when blueprints are missing', async () => {
    const captured: SimulationEvent[] = [];
    const subscription = telemetryEventBus
      .events(
        (event) => event.type.startsWith('bootstrap.') || event.type.startsWith('stateFactory.'),
      )
      .subscribe((event) => {
        captured.push(event);
      });

    const handle = await startBackendServer({
      dataDirectoryOverride: dataDirectory,
      port: 7332,
    });

    try {
      const pauseResult = await handle.facade.time.pause();
      expect(pauseResult.ok).toBe(true);

      const summaryEvent = captured.find((event) => event.type === 'bootstrap.dataSummary');
      expect(summaryEvent).toBeDefined();
      expect(summaryEvent?.payload).toMatchObject({ issueCount: expect.any(Number) });

      const degradationTypes = captured
        .filter((event) => event.type.startsWith('stateFactory.'))
        .map((event) => event.type)
        .sort();

      expect(degradationTypes).toEqual(
        expect.arrayContaining([
          'stateFactory.structures.missingBlueprints',
          'stateFactory.strains.missingBlueprints',
          'stateFactory.methods.missingBlueprints',
          'stateFactory.devices.missingBlueprints',
          'stateFactory.roomPurpose.growRoomMissing',
        ]),
      );

      expect(handle.summary.loadedFiles).toBeGreaterThanOrEqual(0);
      expect(handle.facade).toBeDefined();
    } finally {
      subscription.unsubscribe();
      await handle.shutdown();
    }
  });
});
