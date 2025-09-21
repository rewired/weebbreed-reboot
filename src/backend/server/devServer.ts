import { createServer, type Server } from 'node:http';
import process from 'node:process';

import {
  RngService,
  SimulationFacade,
  SocketGateway,
  bootstrap,
  createInitialState,
  type StateFactoryContext,
  type TimeStatus,
} from '../src/index.js';

const DEFAULT_PORT = 7331;
const DEFAULT_SEED = 'dev-server';

const resolvePort = (value: string | undefined): number => {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    console.warn(
      `Invalid WEEBBREED_BACKEND_PORT value '${value}', falling back to ${DEFAULT_PORT}.`,
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
  console.info(
    `[devServer] Loaded blueprint repository from ${dataDirectory} (${summary.loadedFiles} files).`,
  );

  const rngSeed = process.env.WEEBBREED_BACKEND_SEED ?? process.env.WEEBBREED_SEED ?? DEFAULT_SEED;
  const rng = new RngService(rngSeed);
  const context: StateFactoryContext = {
    repository,
    rng,
    dataDirectory,
  };

  const state = await createInitialState(context);
  console.info('[devServer] Initial game state created.');

  const server = createServer();
  const facade = new SimulationFacade({ state });
  const gateway = new SocketGateway({ httpServer: server, facade });

  const port = resolvePort(process.env.WEEBBREED_BACKEND_PORT);
  await startHttpServer(server, port);
  console.info(`[devServer] Listening on http://localhost:${port}.`);

  const startResult = await facade.time.start();
  if (!startResult.ok) {
    const details = startResult.errors?.map((error) => error.message).join(', ') ?? 'unknown error';
    console.error(`[devServer] Failed to start simulation clock: ${details}`);
  } else {
    const statusDescription = formatTimeStatus(startResult.data);
    console.info(`[devServer] Simulation clock started (${statusDescription}).`);
  }

  let shuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.info(`[devServer] Received ${signal}, shutting down...`);

    try {
      gateway.close();
    } catch (error) {
      console.error('[devServer] Error while closing gateway:', error);
    }

    try {
      await new Promise<void>((resolve) => {
        server.close((closeError) => {
          if (closeError) {
            console.error('[devServer] Error while closing HTTP server:', closeError);
          }
          resolve();
        });
      });
    } catch (error) {
      console.error('[devServer] Unexpected error while closing HTTP server:', error);
    }

    if (startResult.ok) {
      try {
        await facade.time.pause();
      } catch (error) {
        console.error('[devServer] Error while pausing simulation during shutdown:', error);
      }
    }

    console.info('[devServer] Shutdown complete.');
  };

  const handleSignal = (signal: NodeJS.Signals) => {
    void shutdown(signal);
  };

  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);
};

main().catch((error) => {
  console.error('[devServer] Fatal error during startup:', error);
  process.exit(1);
});
