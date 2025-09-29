import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DataIssue } from '@/data/index.js';
import { BlueprintRepository, DataLoaderError } from '@/data/index.js';
import type { BlueprintRepository as BlueprintRepositoryType } from '@/data/blueprintRepository.js';
import type { StructureBlueprint } from './state/types.js';
import { createInitialState, loadStructureBlueprints } from './stateFactory.js';
import { EventBus } from './lib/eventBus.js';
import { SimulationLoop } from './sim/loop.js';
import type { SimulationPhaseContext } from './sim/loop.js';
import { createPhenologyConfig } from './engine/plants/phenology.js';
import type { PhenologyState } from './engine/plants/phenology.js';
import { updatePlantGrowth } from './engine/plants/growthModel.js';
import { TranspirationFeedbackService } from '@/engine/environment/transpirationFeedback.js';
import { createBlueprintRepositoryStub, createStateFactoryContext } from '@/testing/fixtures.js';
import { logger } from '@runtime/logger.js';

const benchLogger = logger.child({ component: 'bench' });
const dataLogger = benchLogger.child({ scope: 'data' });

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

process.on('uncaughtException', (error) => {
  benchLogger.error({ err: error }, 'Benchmark run failed with an uncaught error.');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  benchLogger.error({ err: reason }, 'Benchmark run failed with an unhandled rejection.');
  process.exit(1);
});

const isDirectory = async (candidate: string): Promise<boolean> => {
  try {
    const stats = await stat(candidate);
    return stats.isDirectory();
  } catch {
    return false;
  }
};

const resolveDataDirectory = async (): Promise<string> => {
  const candidates = [
    process.env.WEEBBREED_DATA_DIR,
    path.resolve(moduleDirectory, '../../..', 'data'),
    path.resolve(process.cwd(), 'data'),
    path.resolve(process.cwd(), '..', 'data'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (!(await isDirectory(candidate))) {
      continue;
    }
    const blueprintsDir = path.join(candidate, 'blueprints');
    if (await isDirectory(blueprintsDir)) {
      return candidate;
    }
  }

  throw new Error('Unable to locate data directory. Set WEEBBREED_DATA_DIR to override.');
};

const safeStringify = (value: unknown): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '<unserializable>';
  }
};

const reportDataIssues = (heading: string, issues: DataIssue[]): void => {
  if (issues.length === 0) {
    return;
  }

  dataLogger.warn({ issueCount: issues.length }, heading);
  for (const issue of issues) {
    const details = safeStringify(issue.details);
    const logMethod =
      issue.level === 'error'
        ? dataLogger.error.bind(dataLogger)
        : dataLogger.warn.bind(dataLogger);
    const context: Record<string, unknown> = {
      issueLevel: issue.level,
    };
    if (issue.file) {
      context.file = issue.file;
    }
    if (details) {
      context.details = details;
    }
    logMethod(context, issue.message);
  }
};

const loadStructureBlueprintsSafe = async (
  dataDirectory?: string,
): Promise<StructureBlueprint[] | undefined> => {
  if (!dataDirectory) {
    return undefined;
  }
  try {
    const blueprints = await loadStructureBlueprints(dataDirectory);
    if (blueprints.length === 0) {
      dataLogger.warn(
        { dataDirectory },
        'No structure blueprints found; using fixture structure blueprints instead.',
      );
      return undefined;
    }
    return blueprints;
  } catch (error) {
    dataLogger.warn(
      { dataDirectory, err: error },
      'Failed to load structure blueprints; fixture data will be used.',
    );
    return undefined;
  }
};

const createPlantPhase = (
  repository: BlueprintRepositoryType,
  phenologies: Map<string, PhenologyState>,
  metrics: Map<number, { biomassDelta: number; avgVpd: number; avgHealth: number }>,
) => {
  const transpirationFeedback = new TranspirationFeedbackService();
  return (context: SimulationPhaseContext) => {
    const tickHours = context.tickLengthMinutes / 60;
    let biomassDelta = 0;
    let vpdSum = 0;
    let healthSum = 0;
    let plantCount = 0;

    for (const structure of context.state.structures) {
      for (const room of structure.rooms) {
        for (const zone of room.zones) {
          const strain = zone.strainId ? repository.getStrain(zone.strainId) : undefined;
          if (!strain) {
            continue;
          }
          const phenologyConfig = createPhenologyConfig(strain);
          let zoneTranspiration = 0;
          let zoneVpdSum = 0;
          let zonePlantCount = 0;
          zone.plants = zone.plants.map((plant) => {
            const result = updatePlantGrowth({
              plant,
              strain,
              environment: zone.environment,
              tickHours,
              tick: context.tick,
              phenology: phenologies.get(plant.id),
              phenologyConfig,
              resourceSupply: {
                waterSupplyFraction: zone.resources.reservoirLevel,
                nutrientSupplyFraction: zone.resources.nutrientStrength,
              },
            });
            phenologies.set(plant.id, result.phenology);
            context.events.queueMany(result.events);
            biomassDelta += result.biomassDelta;
            vpdSum += result.metrics.vpd.value;
            healthSum += result.plant.health;
            plantCount += 1;
            zoneTranspiration += result.transpirationLiters;
            zoneVpdSum += result.metrics.vpd.value;
            zonePlantCount += 1;
            return result.plant;
          });
          if (zonePlantCount > 0) {
            zone.environment.vpd = zoneVpdSum / zonePlantCount;
          }
          transpirationFeedback.apply(zone, zoneTranspiration, context.accounting);
        }
      }
    }

    const divisor = plantCount > 0 ? plantCount : 1;
    metrics.set(context.tick, {
      biomassDelta,
      avgVpd: vpdSum / divisor,
      avgHealth: healthSum / divisor,
    });
  };
};

export const runBenchmark = async (ticks = Number(process.env.WEEBBREED_BENCH_TICKS ?? '24')) => {
  benchLogger.info('Preparing benchmark run.');
  const seed = process.env.WEEBBREED_BENCH_SEED ?? 'bench-reference';

  let dataDirectory: string | undefined;
  try {
    dataDirectory = await resolveDataDirectory();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dataLogger.warn({ err: error, message }, 'Data directory resolution failed.');
  }

  let repository: BlueprintRepositoryType | undefined;
  if (dataDirectory) {
    try {
      repository = await BlueprintRepository.loadFrom(dataDirectory);
      const summary = repository.getSummary();
      reportDataIssues('Blueprint data reported issues:', summary.issues);
    } catch (error) {
      if (error instanceof DataLoaderError) {
        reportDataIssues(
          'Blocking blueprint data issues encountered while loading repository. Falling back to fixture data.',
          error.issues,
        );
      } else {
        dataLogger.warn(
          { dataDirectory, err: error },
          'Failed to load blueprint repository; fixture data will be used.',
        );
      }
    }
  }

  const structureBlueprints = await loadStructureBlueprintsSafe(dataDirectory);

  let usingFixtureRepository = false;
  if (!repository) {
    usingFixtureRepository = true;
    dataLogger.warn('Using fixture repository data for benchmark run.');
    repository = createBlueprintRepositoryStub();
  }

  const context = createStateFactoryContext(seed, {
    repository,
    dataDirectory,
    structureBlueprints:
      structureBlueprints && structureBlueprints.length > 0 ? structureBlueprints : undefined,
  });

  const state = await createInitialState(context);

  const phenologies = new Map<string, PhenologyState>();
  const metrics = new Map<number, { biomassDelta: number; avgVpd: number; avgHealth: number }>();
  const eventBus = new EventBus();
  const loop = new SimulationLoop({
    state,
    eventBus,
    phases: {
      updatePlants: createPlantPhase(context.repository, phenologies, metrics),
    },
  });

  const dataDescription = dataDirectory
    ? usingFixtureRepository
      ? `fixture data (failed to load ${dataDirectory})`
      : `data at ${dataDirectory}`
    : 'fixture data (no data directory found)';

  benchLogger.info({ seed, ticks, dataSource: dataDescription }, 'Starting benchmark run.');
  let totalDuration = 0;
  let totalEvents = 0;

  for (let index = 0; index < ticks; index += 1) {
    const result = await loop.processTick();
    const tickTiming = result.phaseTimings.commit.completedAt;
    totalDuration += tickTiming;
    totalEvents += result.events.length;

    const tickMetrics = metrics.get(result.tick) ?? { biomassDelta: 0, avgVpd: 0, avgHealth: 0 };
    const biomassDelta = tickMetrics.biomassDelta.toFixed(3);
    const avgVpd = tickMetrics.avgVpd.toFixed(3);
    const avgHealth = tickMetrics.avgHealth.toFixed(3);

    benchLogger.info(
      {
        tick: result.tick,
        durationMs: Number(tickTiming.toFixed(2)),
        eventCount: result.events.length,
        biomassDelta: Number.parseFloat(biomassDelta),
        avgVpd: Number.parseFloat(avgVpd),
        avgHealth: Number.parseFloat(avgHealth),
      },
      'Benchmark tick processed.',
    );
  }

  const averageDuration = totalDuration / Math.max(ticks, 1);
  benchLogger.info(
    { averageTickDurationMs: Number(averageDuration.toFixed(2)), ticks, totalEvents },
    'Benchmark run complete.',
  );
};

if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmark().catch((error) => {
    benchLogger.error({ err: error }, 'Benchmark run failed.');
    process.exitCode = 1;
  });
}
