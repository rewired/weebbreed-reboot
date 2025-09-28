import { loadStructureBlueprints } from '@/state/initialization/blueprints.js';
import { loadDifficultyConfig } from '@/data/configs/difficulty.js';

import { createServer, type Server } from 'node:http';
import process from 'node:process';

import { createUiStream, eventBus as telemetryEventBus } from '@runtime/eventBus.js';
import { logger, type Logger } from '@runtime/logger.js';
import { CostAccountingService } from '@/engine/economy/costAccounting.js';
import { createPriceCatalogFromRepository } from '@/engine/economy/catalog.js';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import type { DataLoadSummary } from '@/data/dataLoader.js';
import { buildSimulationSnapshot } from '@/lib/uiSnapshot.js';
import { RngService, getRegisteredRngStreamIds } from '@/lib/rng.js';
import {
  SimulationFacade,
  type TimeStatus,
  type SetUtilityPricesIntent,
  type CommandResult,
  type CommandExecutionContext,
} from '@/facade/index.js';
import {
  buildDeviceBlueprintCatalog,
  buildStrainBlueprintCatalog,
} from '@/facade/blueprintCatalog.js';
import { SocketGateway } from '@/server/socketGateway.js';
import { SseGateway } from '@/server/sseGateway.js';
import { bootstrap } from '@/bootstrap.js';
import {
  createInitialState,
  loadPersonnelDirectory,
  type StateFactoryContext,
} from '@/stateFactory.js';
import type { GameState, PersonnelNameDirectory } from '@/state/models.js';
import { provisionPersonnelDirectory } from '@/state/initialization/personnelProvisioner.js';
import { SimulationLoop, type SimulationPhaseHandler } from '@/sim/loop.js';
import { BlueprintHotReloadManager } from '@/persistence/hotReload.js';
import { WorldService } from '@/engine/world/worldService.js';
import { DeviceGroupService } from '@/engine/devices/deviceGroupService.js';
import { DeviceInstallationService } from '@/engine/devices/deviceInstallationService.js';
import { PlantingPlanService } from '@/engine/plants/plantingPlanService.js';
import { PlantingService } from '@/engine/plants/plantingService.js';
import { JobMarketService } from '@/engine/workforce/jobMarketService.js';
import type { UtilityPrices } from '@/data/schemas/index.js';

const DEFAULT_PORT = 7331;
const DEFAULT_SEED = 'dev-server';

const serverLogger = logger.child({ component: 'backend.server' });

const resolvePort = (value: number | string | undefined): number => {
  if (typeof value === 'number') {
    if (Number.isFinite(value) && value > 0) {
      return Math.trunc(value);
    }
    serverLogger.warn(
      { providedPort: value, defaultPort: DEFAULT_PORT },
      'Invalid numeric port override; falling back to default.',
    );
    return DEFAULT_PORT;
  }

  if (value === undefined || value === null || value === '') {
    return DEFAULT_PORT;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    serverLogger.warn(
      { providedPort: value, defaultPort: DEFAULT_PORT },
      'Invalid WEEBBREED_BACKEND_PORT value; falling back to default.',
    );
    return DEFAULT_PORT;
  }

  return parsed;
};

const startHttpServer = (server: Server, port: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const handleError = (error: Error) => {
      server.off('error', handleError);
      reject(error);
    };

    server.once('error', handleError);
    server.listen(port, () => {
      server.off('error', handleError);
      resolve();
    });
  });
};

const formatTimeStatus = (status: TimeStatus | undefined): string => {
  if (!status) {
    return 'unknown status';
  }
  return `running=${status.running} paused=${status.paused} tick=${status.tick}`;
};

interface UtilityPriceUpdateHandlerOptions {
  state: GameState;
  repository: BlueprintRepository;
  costAccounting: CostAccountingService;
  logger: Logger;
}

const sanitizePrice = (value: number | undefined, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return value;
};

const convertWaterCostPerLiter = (value: number | undefined, fallback: number): number => {
  if (value === undefined) {
    return fallback;
  }
  return sanitizePrice(value / 1000, fallback);
};

const convertNutrientCostPerGram = (value: number | undefined, fallback: number): number => {
  if (value === undefined) {
    return fallback;
  }
  return sanitizePrice(value / 1000, fallback);
};

export const createUtilityPriceUpdateHandler = ({
  state,
  repository,
  costAccounting,
  logger,
}: UtilityPriceUpdateHandlerOptions) => {
  return (
    intent: SetUtilityPricesIntent,
    context: CommandExecutionContext,
  ): CommandResult<{ utilityPrices: UtilityPrices }> => {
    const basePrices = state.finances.utilityPrices ?? repository.getUtilityPrices();
    const updated: UtilityPrices = {
      pricePerKwh: sanitizePrice(intent.electricityCostPerKWh, basePrices.pricePerKwh),
      pricePerLiterWater: convertWaterCostPerLiter(
        intent.waterCostPerM3,
        basePrices.pricePerLiterWater,
      ),
      pricePerGramNutrients: convertNutrientCostPerGram(
        intent.nutrientsCostPerKg,
        basePrices.pricePerGramNutrients,
      ),
    };

    state.finances.utilityPrices = { ...updated };

    const catalog = createPriceCatalogFromRepository(repository);
    catalog.utilityPrices = { ...updated };
    costAccounting.updatePriceCatalog(catalog);

    context.events.queue(
      'finance.utilityPricesUpdated',
      { utilityPrices: { ...updated } },
      context.tick,
      'info',
    );

    logger.info(
      {
        tick: context.tick,
        utilityPrices: updated,
      },
      'Utility prices updated.',
    );

    return { ok: true, data: { utilityPrices: { ...updated } } };
  };
};

export interface StartServerOptions {
  port?: number;
  rngSeed?: string;
  dataDirectoryOverride?: string;
}

export interface BackendServerHandle {
  port: number;
  repository: BlueprintRepository;
  dataDirectory: string;
  summary: DataLoadSummary;
  facade: SimulationFacade;
  shutdown(signal?: NodeJS.Signals): Promise<void>;
}

export const startBackendServer = async (
  options: StartServerOptions = {},
): Promise<BackendServerHandle> => {
  const { repository, dataDirectory, summary } = await bootstrap({
    envOverride: options.dataDirectoryOverride,
  });
  const rngSeed =
    options.rngSeed ??
    process.env.WEEBBREED_BACKEND_SEED ??
    process.env.WEEBBREED_SEED ??
    DEFAULT_SEED;
  const rng = new RngService(rngSeed);
  serverLogger.info(
    {
      dataDirectory,
      loadedFiles: summary.loadedFiles,
      rng: {
        seed: rng.getSeed(),
        streamIds: getRegisteredRngStreamIds(),
      },
    },
    'Loaded blueprint repository.',
  );

  try {
    const provisioning = await provisionPersonnelDirectory({
      dataDirectory,
      rngSeed: rng.getSeed(),
    });
    if (provisioning.changed) {
      const stats = provisioning.directory;
      serverLogger.info(
        {
          personnelBootstrap: {
            male: stats?.firstNamesMale.length ?? 0,
            female: stats?.firstNamesFemale.length ?? 0,
            lastNames: stats?.lastNames.length ?? 0,
            seeds: stats?.randomSeeds.length ?? 0,
          },
        },
        'Provisioned personnel directory assets.',
      );
    }
  } catch (error) {
    serverLogger.error(
      { err: error },
      'Failed to provision personnel directory assets; aborting startup.',
    );
    throw error;
  }
  const priceCatalog = createPriceCatalogFromRepository(repository);
  const costAccountingService = new CostAccountingService(priceCatalog);
  const difficultyConfig = await loadDifficultyConfig(dataDirectory);
  const context: StateFactoryContext = {
    repository,
    rng,
    dataDirectory,
    difficultyConfig,
  };

  const state = await createInitialState(context);
  serverLogger.info('Initial game state created.');

  costAccountingService.updatePriceCatalog({
    ...priceCatalog,
    utilityPrices: { ...state.finances.utilityPrices },
  });

  let personnelDirectory: PersonnelNameDirectory | undefined;
  try {
    personnelDirectory = await loadPersonnelDirectory(dataDirectory);
  } catch (error) {
    serverLogger.warn(
      { err: error },
      'Failed to load personnel directory; job market fallback will synthesise names.',
    );
    personnelDirectory = undefined;
  }
  const jobMarketService = new JobMarketService({
    state,
    rng,
    personnelDirectory,
    dataDirectory,
  });

  const hotReloadManager = new BlueprintHotReloadManager(
    repository,
    telemetryEventBus,
    () => state.clock.tick,
  );
  const enableHotReload = process.env.NODE_ENV !== 'production';
  if (enableHotReload) {
    await hotReloadManager.start();
    hotReloadManager.onReloadCommitted((result) => {
      const updatedCatalog = createPriceCatalogFromRepository(repository);
      const override = state.finances.utilityPrices;
      if (override) {
        updatedCatalog.utilityPrices = { ...override };
      }
      costAccountingService.updatePriceCatalog(updatedCatalog);
      serverLogger.info(
        {
          tick: state.clock.tick,
          dataReload: {
            loadedFiles: result.summary.loadedFiles,
            issues: result.summary.issues.length,
          },
        },
        'Blueprint repository hot-reload committed.',
      );
    });
  } else {
    serverLogger.info('Blueprint hot-reload disabled in production mode.');
  }
  const hotReloadCommitHook = hotReloadManager.createCommitHook();
  const jobMarketCommitHook = jobMarketService.createCommitHook();
  const commitHook: SimulationPhaseHandler = async (context) => {
    await jobMarketCommitHook(context);
    await hotReloadCommitHook(context);
  };

  const httpServer = createServer();
  const loop = new SimulationLoop({
    state,
    eventBus: telemetryEventBus,
    accounting: { service: costAccountingService },
    phases: { commit: commitHook },
  });
  const facade = new SimulationFacade({
    state,
    accounting: { service: costAccountingService },
    loop,
  });
  const structureBlueprints = await loadStructureBlueprints(dataDirectory);
  const worldService = new WorldService({
    state,
    rng,
    costAccounting: costAccountingService,
    structureBlueprints,
    roomPurposeSource: repository,
    difficultyConfig,
  });
  const deviceGroupService = new DeviceGroupService({ state, rng });
  const deviceInstallationService = new DeviceInstallationService({
    state,
    rng,
    repository,
  });
  const plantingPlanService = new PlantingPlanService({ state, rng });
  const plantingService = new PlantingService({ state, rng, repository });

  facade.updateServices({
    config: {
      getDifficultyConfig: () => ({
        ok: true,
        data: difficultyConfig,
      }),
    },
    world: {
      rentStructure: (intent, context) => worldService.rentStructure(intent.structureId, context),
      getStructureBlueprints: () => worldService.getStructureBlueprints(),
      getStrainBlueprints: () =>
        ({
          ok: true,
          data: buildStrainBlueprintCatalog(repository),
        }) satisfies CommandResult<ReturnType<typeof buildStrainBlueprintCatalog>>,
      getDeviceBlueprints: () =>
        ({
          ok: true,
          data: buildDeviceBlueprintCatalog(repository),
        }) satisfies CommandResult<ReturnType<typeof buildDeviceBlueprintCatalog>>,
      createRoom: (intent, context) => worldService.createRoom(intent, context),
      createZone: (intent, context) => worldService.createZone(intent, context),
      renameStructure: (intent, context) =>
        worldService.renameStructure(intent.structureId, intent.name, context),
      deleteStructure: (intent, context) =>
        worldService.deleteStructure(intent.structureId, context),
      resetSession: (intent, context) => worldService.resetSession(context),
      newGame: (intent, context) =>
        worldService.newGame(intent.difficulty || 'normal', intent.modifiers, intent.seed, context),
      duplicateStructure: (intent, context) =>
        worldService.duplicateStructure(intent.structureId, intent.name, context),
      duplicateRoom: (intent, context) =>
        worldService.duplicateRoom(intent.roomId, intent.name, context),
      duplicateZone: (intent, context) =>
        worldService.duplicateZone(intent.zoneId, intent.name, context),
    },
    devices: {
      installDevice: (intent, context) =>
        deviceInstallationService.installDevice(
          intent.targetId,
          intent.deviceId,
          intent.settings,
          context,
        ),
      toggleDeviceGroup: (intent, context) =>
        deviceGroupService.toggleDeviceGroup(intent.zoneId, intent.kind, intent.enabled, context),
    },
    plants: {
      addPlanting: (intent, context) =>
        plantingService.addPlanting(
          intent.zoneId,
          intent.strainId,
          intent.count,
          intent.startTick,
          context,
        ),
      togglePlantingPlan: (intent, context) =>
        plantingPlanService.togglePlantingPlan(intent.zoneId, intent.enabled, context),
    },
    workforce: {
      refreshCandidates: (intent, serviceContext) =>
        jobMarketService.refreshCandidates(intent, serviceContext),
    },
    finance: {
      setUtilityPrices: createUtilityPriceUpdateHandler({
        state,
        repository,
        costAccounting: costAccountingService,
        logger: serverLogger,
      }),
    },
  });

  const initialRefresh = await facade.workforce.refreshCandidates({ force: true });
  if (!initialRefresh.ok) {
    serverLogger.warn({ errors: initialRefresh.errors }, 'Initial job market refresh failed.');
  } else {
    const summary = initialRefresh.data;
    if (summary) {
      serverLogger.info(
        {
          jobMarket: {
            seed: summary.seed,
            source: summary.source,
            count: summary.count,
            week: summary.week,
            retries: summary.retries,
          },
          warnings: initialRefresh.warnings,
        },
        'Job market candidates seeded.',
      );
    }
  }
  const uiStream$ = createUiStream({
    snapshotProvider: () => facade.select((value) => buildSimulationSnapshot(value, repository)),
    timeStatusProvider: () => facade.getTimeStatus(),
  });
  const socketGateway = new SocketGateway({
    httpServer,
    facade,
    roomPurposeSource: repository,
    uiStream$,
  });
  const sseGateway = new SseGateway({
    httpServer,
    facade,
    roomPurposeSource: repository,
    uiStream$,
  });

  const port = resolvePort(options.port ?? process.env.WEEBBREED_BACKEND_PORT);
  await startHttpServer(httpServer, port);
  serverLogger.info({ port }, 'Listening for HTTP connections.');

  // Start the simulation clock but immediately pause it for new games
  const startResult = await facade.time.start();
  if (!startResult.ok) {
    const details = startResult.errors?.map((error) => error.message).join(', ') ?? 'unknown error';
    serverLogger.error({ details }, 'Failed to start simulation clock.');
  } else {
    const pauseResult = await facade.time.pause();
    if (!pauseResult.ok) {
      serverLogger.warn(
        { errors: pauseResult.errors },
        'Failed to pause simulation after startup.',
      );
    }
    const statusDescription = formatTimeStatus(pauseResult.data ?? startResult.data);
    serverLogger.info(
      { status: pauseResult.data ?? startResult.data, statusDescription },
      'Simulation clock started and paused.',
    );
  }

  let shuttingDown = false;
  const shutdown = async (signal?: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    serverLogger.info({ signal }, 'Received shutdown request.');

    try {
      socketGateway.close();
      sseGateway.close();
    } catch (error) {
      serverLogger.error({ err: error }, 'Error while closing gateway.');
    }

    try {
      await new Promise<void>((resolve) => {
        httpServer.close((closeError) => {
          if (closeError) {
            serverLogger.error({ err: closeError }, 'Error while closing HTTP server.');
          }
          resolve();
        });
      });
    } catch (error) {
      serverLogger.error({ err: error }, 'Unexpected error while closing HTTP server.');
    }

    if (startResult.ok) {
      try {
        await facade.time.pause();
      } catch (error) {
        serverLogger.error({ err: error }, 'Error while pausing simulation during shutdown.');
      }
    }

    try {
      await hotReloadManager.stop();
    } catch (error) {
      serverLogger.error({ err: error }, 'Error while stopping data hot-reload manager.');
    }

    serverLogger.info('Shutdown complete.');
  };

  return {
    port,
    repository,
    dataDirectory,
    summary,
    facade,
    shutdown,
  };
};
