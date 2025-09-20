import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DataIssue } from '../data/index.js';
import { BlueprintRepository, DataLoaderError } from '../data/index.js';
import type { BlueprintRepository as BlueprintRepositoryType } from '../data/blueprintRepository.js';
import type { StructureBlueprint } from './state/models.js';
import { createInitialState, loadStructureBlueprints } from './stateFactory.js';
import { EventBus } from './lib/eventBus.js';
import { SimulationLoop } from './sim/loop.js';
import type { SimulationPhaseContext } from './sim/loop.js';
import { createPhenologyConfig } from './engine/plants/phenology.js';
import type { PhenologyState } from './engine/plants/phenology.js';
import { updatePlantGrowth } from './engine/plants/growthModel.js';
import { createBlueprintRepositoryStub, createStateFactoryContext } from './testing/fixtures.js';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

process.on('uncaughtException', (error) => {
  console.error('Benchmark run failed with an uncaught error:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Benchmark run failed with an unhandled rejection:', reason);
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

  console.warn(heading);
  for (const issue of issues) {
    const location = issue.file ? ` (${issue.file})` : '';
    const details = safeStringify(issue.details);
    const suffix = details ? ` details=${details}` : '';
    const logger = issue.level === 'error' ? console.error : console.warn;
    logger(`  - [${issue.level.toUpperCase()}] ${issue.message}${location}${suffix}`);
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
      console.warn(
        `No structure blueprints found in ${dataDirectory}; using fixture structure blueprints instead.`,
      );
      return undefined;
    }
    return blueprints;
  } catch (error) {
    console.warn(`Failed to load structure blueprints from ${dataDirectory}:`, error);
    return undefined;
  }
};

const createPlantPhase = (
  repository: BlueprintRepositoryType,
  phenologies: Map<string, PhenologyState>,
  metrics: Map<number, { biomassDelta: number; avgVpd: number; avgHealth: number }>,
) => {
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
            return result.plant;
          });
          if (plantCount > 0) {
            zone.environment.vpd = vpdSum / plantCount;
          }
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
  console.log('Preparing benchmark run...');
  const seed = process.env.WEEBBREED_BENCH_SEED ?? 'bench-reference';

  let dataDirectory: string | undefined;
  try {
    dataDirectory = await resolveDataDirectory();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Data directory resolution failed: ${message}`);
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
        console.warn(`Failed to load blueprint repository from ${dataDirectory}:`, error);
      }
    }
  }

  const structureBlueprints = await loadStructureBlueprintsSafe(dataDirectory);

  let usingFixtureRepository = false;
  if (!repository) {
    usingFixtureRepository = true;
    console.warn('Using fixture repository data for benchmark run.');
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

  console.log(`Running benchmark with seed "${seed}" for ${ticks} ticks using ${dataDescription}.`);
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

    console.log(
      `tick ${result.tick.toString().padStart(3, ' ')} | duration ${tickTiming.toFixed(
        2,
      )} ms | events ${result.events.length} | Δbiomass ${biomassDelta} g | avgVPD ${avgVpd} kPa | avgHealth ${avgHealth}`,
    );
  }

  const averageDuration = totalDuration / Math.max(ticks, 1);
  console.log(`Average tick duration: ${averageDuration.toFixed(2)} ms`);
  console.log(`Total events emitted: ${totalEvents}`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmark().catch((error) => {
    console.error('Benchmark run failed:', error);
    process.exitCode = 1;
  });
}
