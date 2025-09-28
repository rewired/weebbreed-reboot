import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { DataLoaderError } from '@/data/dataLoader.js';
import { startBackendServer } from '@/server/startServer.js';
import {
  bootstrap,
  formatError,
  logDataLoaderIssues,
  type BootstrapResult,
  type ResolveDataDirectoryOptions,
} from './bootstrap.js';
import { logger } from '@runtime/logger.js';

export * from './bootstrap.js';
export * from './state/models.js';
export * from './lib/rng.js';
export {
  EventBus,
  createEventCollector,
  type EventBufferOptions,
  type EventCollector,
  type EventFilter,
  type EventFilterObject,
  type EventFilterPredicate,
  type EventLevel,
  type EventQueueFunction,
  type SimulationEvent,
} from './lib/eventBus.js';
export {
  eventBus as telemetryEventBus,
  emit,
  emitEvent,
  emitMany,
  events as runtimeEvents,
  bufferedEvents,
  events$ as runtimeEvents$,
  createUiStream,
} from '@runtime/eventBus.js';
export * from './persistence/saveGame.js';
export * from './persistence/hotReload.js';
export * from './stateFactory.js';
export * from './sim/loop.js';
export * from './sim/simScheduler.js';
export { CommandExecutionError, SimulationFacade } from '@/facade/index.js';
export type {
  CommandError,
  CommandExecutionContext,
  CommandResult,
  ServiceCommandHandler,
  ErrorCode,
  TimeStatus,
  TimeStartIntent,
  TimeStepIntent,
  SetSpeedIntent,
  RentStructureIntent,
  GetStructureBlueprintsIntent,
  CreateRoomIntent,
  UpdateRoomIntent,
  DeleteRoomIntent,
  CreateZoneIntent,
  UpdateZoneIntent,
  DeleteZoneIntent,
  RenameStructureIntent,
  DeleteStructureIntent,
  ResetSessionIntent,
  NewGameIntent,
  DuplicateStructureIntent,
  DuplicateRoomIntent,
  DuplicateZoneIntent,
  WorldIntentHandlers,
  InstallDeviceIntent,
  UpdateDeviceIntent,
  MoveDeviceIntent,
  RemoveDeviceIntent,
  ToggleDeviceGroupIntent,
  AdjustLightingCycleIntent,
  DeviceIntentHandlers,
  AdjustLightingCycleResult,
  AddPlantingIntent,
  CullPlantingIntent,
  HarvestPlantingIntent,
  ApplyIrrigationIntent,
  ApplyFertilizerIntent,
  TogglePlantingPlanIntent,
  PlantIntentHandlers,
  ScheduleScoutingIntent,
  ApplyTreatmentIntent,
  QuarantineZoneIntent,
  HealthIntentHandlers,
  RefreshCandidatesIntent,
  HireIntent,
  FireIntent,
  SetOvertimePolicyIntent,
  AssignStructureIntent,
  EnqueueTaskIntent,
  WorkforceIntentHandlers,
  SellInventoryIntent,
  SetUtilityPricesIntent,
  SetMaintenancePolicyIntent,
  FinanceIntentHandlers,
  GetDifficultyConfigIntent,
  ConfigIntentHandlers,
  StateSelector,
  EventSubscriptionHandler,
  Unsubscribe,
  EngineServices,
  SimulationFacadeSchedulerOptions,
  SimulationFacadeOptions,
  TimeIntentAPI,
  WorldIntentAPI,
  DeviceIntentAPI,
  PlantIntentAPI,
  HealthIntentAPI,
  WorkforceIntentAPI,
  FinanceIntentAPI,
  ConfigIntentAPI,
} from '@/facade/index.js';
export * from '@/server/socketGateway.js';
export * from '@/server/sseGateway.js';
export * from './engine/roomPurposes/index.js';
export { startBackendServer } from '@/server/startServer.js';

const moduleFilePath = fileURLToPath(import.meta.url);
const moduleHref = pathToFileURL(moduleFilePath).href;

const startupLogger = logger.child({ component: 'backend.startup' });

const getNormalizedEntryPointHref = (): string | undefined => {
  const entryPointArgument = process.argv[1];

  if (!entryPointArgument) {
    return undefined;
  }

  const normalizedEntryPath = fileURLToPath(
    entryPointArgument.startsWith('file:')
      ? new URL(entryPointArgument)
      : pathToFileURL(path.resolve(entryPointArgument)),
  );

  return pathToFileURL(normalizedEntryPath).href;
};

const registerFatalProcessHandlers = () => {
  process.on('unhandledRejection', (reason) => {
    startupLogger.error(
      { err: reason, details: formatError(reason) },
      'Unhandled promise rejection.',
    );
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    startupLogger.error({ err: error, details: formatError(error) }, 'Uncaught exception.');
    process.exit(1);
  });
};

export const main = async (options?: ResolveDataDirectoryOptions): Promise<BootstrapResult> => {
  const result = await bootstrap(options);
  startupLogger.info(
    {
      loadedFiles: result.summary.loadedFiles,
      dataDirectory: result.dataDirectory,
    },
    'Backend ready.',
  );
  return result;
};

const runCli = async (): Promise<void> => {
  const handle = await startBackendServer();

  startupLogger.info(
    {
      port: handle.port,
      dataDirectory: handle.dataDirectory,
      loadedFiles: handle.summary.loadedFiles,
    },
    'Backend server running.',
  );

  const handleSignal = (signal: NodeJS.Signals) => {
    void handle
      .shutdown(signal)
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        startupLogger.error({ err: error, details: formatError(error) }, 'Error during shutdown.');
        process.exit(1);
      });
  };

  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);
};

const normalizedEntryPointHref = getNormalizedEntryPointHref();

if (normalizedEntryPointHref && normalizedEntryPointHref === moduleHref) {
  registerFatalProcessHandlers();

  runCli().catch((error) => {
    if (error instanceof DataLoaderError) {
      logDataLoaderIssues(error);
    }

    startupLogger.error({ err: error, details: formatError(error) }, 'Boot failed.');
    process.exit(1);
  });
}
