import { createServer, type Server } from 'node:http';
import process from 'node:process';

import {
  RngService,
  SimulationFacade,
  SocketGateway,
  SseGateway,
  bootstrap,
  createInitialState,
  type StateFactoryContext,
  type TimeStatus,
  createUiStream,
  getRegisteredRngStreamIds,
} from '../src/index.js';
import { CostAccountingService } from '../src/engine/economy/costAccounting.js';
import { createPriceCatalogFromRepository } from '../src/engine/economy/catalog.js';
import { buildSimulationSnapshot } from '../src/lib/uiSnapshot.js';
import { logger } from '../../runtime/logger.js';

const DEFAULT_PORT = 7331;
const DEFAULT_SEED = 'dev-server';

const devLogger = logger.child({ component: 'backend.devServer' });

const resolvePort = (value: string | undefined): number => {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    devLogger.warn(
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

const main = async (): Promise<void> => {
  const { repository, dataDirectory, summary } = await bootstrap();
  const rngSeed = process.env.WEEBBREED_BACKEND_SEED ?? process.env.WEEBBREED_SEED ?? DEFAULT_SEED;
  const rng = new RngService(rngSeed);
  devLogger.info(
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
  const priceCatalog = createPriceCatalogFromRepository(repository);
  const costAccountingService = new CostAccountingService(priceCatalog);
  const context: StateFactoryContext = {
    repository,
    rng,
    dataDirectory,
  };

  const state = await createInitialState(context);
  devLogger.info('Initial game state created.');

  const server = createServer();
  const facade = new SimulationFacade({ state, accounting: { service: costAccountingService } });
  const uiStream$ = createUiStream({
    snapshotProvider: () => facade.select((value) => buildSimulationSnapshot(value, repository)),
    timeStatusProvider: () => facade.getTimeStatus(),
  });
  const gateway = new SocketGateway({
    httpServer: server,
    facade,
    roomPurposeSource: repository,
    uiStream$,
  });
  const sseGateway = new SseGateway({
    httpServer: server,
    facade,
    roomPurposeSource: repository,
    uiStream$,
  });

  const port = resolvePort(process.env.WEEBBREED_BACKEND_PORT);
  await startHttpServer(server, port);
  devLogger.info({ port }, 'Listening for HTTP connections.');

  const startResult = await facade.time.start();
  if (!startResult.ok) {
    const details = startResult.errors?.map((error) => error.message).join(', ') ?? 'unknown error';
    devLogger.error({ details }, 'Failed to start simulation clock.');
  } else {
    const statusDescription = formatTimeStatus(startResult.data);
    devLogger.info({ status: startResult.data, statusDescription }, 'Simulation clock started.');
  }

  let shuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    devLogger.info({ signal }, 'Received shutdown signal.');

    try {
      gateway.close();
      sseGateway.close();
    } catch (error) {
      devLogger.error({ err: error }, 'Error while closing gateway.');
    }

    try {
      await new Promise<void>((resolve) => {
        server.close((closeError) => {
          if (closeError) {
            devLogger.error({ err: closeError }, 'Error while closing HTTP server.');
          }
          resolve();
        });
      });
    } catch (error) {
      devLogger.error({ err: error }, 'Unexpected error while closing HTTP server.');
    }

    if (startResult.ok) {
      try {
        await facade.time.pause();
      } catch (error) {
        devLogger.error({ err: error }, 'Error while pausing simulation during shutdown.');
      }
    }

    devLogger.info('Shutdown complete.');
  };

  const handleSignal = (signal: NodeJS.Signals) => {
    void shutdown(signal);
  };

  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);
};

main().catch((error) => {
  devLogger.error({ err: error }, 'Fatal error during startup.');
  process.exit(1);
});
