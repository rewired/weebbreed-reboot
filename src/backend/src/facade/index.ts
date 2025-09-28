import { eventBus as telemetryEventBus } from '@runtime/eventBus.js';
import { DEFAULT_TICK_INTERVAL_MS, MINUTES_PER_HOUR } from '@/constants/time.js';
import { EventBus, type EventFilter } from '@/lib/eventBus.js';
import {
  computeHumidityForVpd,
  ensureZoneControl,
  extractFiniteNumber,
  filterZoneDevices,
  HUMIDITY_DEVICE_KINDS,
  LIGHT_DEVICE_KINDS,
  sanitizeNonNegative,
  sanitizeRelativeHumidity,
  TEMPERATURE_DEVICE_KINDS,
  CO2_DEVICE_KINDS,
  resolveTemperatureForVpd,
} from './commands/envSetpoints.js';
import {
  buildConfigCommands,
  type ConfigIntentHandlers,
  type GetDifficultyConfigIntent,
} from './commands/config.js';
import {
  buildDeviceCommands,
  type DeviceIntentHandlers,
  type InstallDeviceIntent,
  type UpdateDeviceIntent,
  type MoveDeviceIntent,
  type RemoveDeviceIntent,
  type ToggleDeviceGroupIntent,
  type AdjustLightingCycleIntent,
} from './commands/devices.js';
import type { AdjustLightingCycleResult } from '@/engine/devices/lightingCycleService.js';
import {
  buildFinanceCommands,
  type FinanceIntentHandlers,
  type SellInventoryIntent,
  type SetUtilityPricesIntent,
  type SetMaintenancePolicyIntent,
} from './commands/finance.js';
import {
  buildHealthCommands,
  type HealthIntentHandlers,
  type ScheduleScoutingIntent,
  type ApplyTreatmentIntent,
  type QuarantineZoneIntent,
} from './commands/health.js';
import {
  buildPlantCommands,
  type PlantIntentHandlers,
  type AddPlantingIntent,
  type CullPlantingIntent,
  type HarvestPlantingIntent,
  type HarvestPlantIntent,
  type CullPlantIntent,
  type ApplyIrrigationIntent,
  type ApplyFertilizerIntent,
  type TogglePlantingPlanIntent,
} from './commands/plants.js';
import {
  buildTimeCommands,
  type TimeStatus,
  type TimeStartIntent,
  type TimeStepIntent,
  type SetSpeedIntent,
} from './commands/time.js';
import {
  buildWorkforceCommands,
  type WorkforceIntentHandlers,
  type RefreshCandidatesIntent,
  type HireIntent,
  type FireIntent,
  type SetOvertimePolicyIntent,
  type AssignStructureIntent,
  type EnqueueTaskIntent,
} from './commands/workforce.js';
import {
  buildWorldCommands,
  type WorldIntentHandlers,
  type RentStructureIntent,
  type GetStructureBlueprintsIntent,
  type GetStrainBlueprintsIntent,
  type GetDeviceBlueprintsIntent,
  type CreateRoomIntent,
  type UpdateRoomIntent,
  type DeleteRoomIntent,
  type CreateZoneIntent,
  type UpdateZoneIntent,
  type DeleteZoneIntent,
  type RenameStructureIntent,
  type DeleteStructureIntent,
  type ResetSessionIntent,
  type NewGameIntent,
  type DuplicateStructureIntent,
  type DuplicateRoomIntent,
  type DuplicateZoneIntent,
} from './commands/world.js';
import {
  createCommandContextFactory,
  createFailure,
  executeCommand,
  normalizeWarnings,
  type CommandContextFactory,
  type CommandExecutionContext,
  type CommandRegistration,
  type CommandResult,
  type DomainApi,
  type DomainCommandInvoker,
  type DomainCommandRegistryMap,
  type MissingCommandHandler,
} from './commands/commandRegistry.js';
import type { GameState, StructureBlueprint } from '@/state/models.js';
import type {
  DeviceBlueprintCatalogEntry,
  StrainBlueprintCatalogEntry,
} from './blueprintCatalog.js';
import { SimulationLoop, type SimulationLoopAccountingOptions } from '@/sim/loop.js';
import { SimulationScheduler } from '@/sim/simScheduler.js';
import type { SimulationSchedulerOptions } from '@/sim/simScheduler.js';
import type { ZoneEnvironmentOptions } from '@/engine/environment/zoneEnvironment.js';
import { findZone } from '@/engine/world/stateSelectors.js';
import type {
  DuplicateStructureResult,
  DuplicateRoomResult,
  DuplicateZoneResult,
} from '@/engine/world/worldService.js';
import type { DeviceGroupToggleResult } from '@/engine/devices/deviceGroupService.js';
import type { PlantingPlanToggleResult } from '@/engine/plants/plantingPlanService.js';
import type {
  HarvestPlantResult,
  DiscardPlantResult,
} from '@/engine/plants/plantLifecycleService.js';
import type { DifficultyConfig } from '@/data/configs/difficulty.js';

const cloneState = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

export { CommandExecutionError } from './commands/commandRegistry.js';
export type {
  CommandError,
  CommandResult,
  CommandExecutionContext,
  ServiceCommandHandler,
  ErrorCode,
} from './commands/commandRegistry.js';
export type {
  TimeStatus,
  TimeStartIntent,
  TimeStepIntent,
  SetSpeedIntent,
} from './commands/time.js';
export type {
  RentStructureIntent,
  GetStructureBlueprintsIntent,
  GetStrainBlueprintsIntent,
  GetDeviceBlueprintsIntent,
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
} from './commands/world.js';
export type {
  StrainBlueprintCatalogEntry,
  DeviceBlueprintCatalogEntry,
} from './blueprintCatalog.js';
export type {
  InstallDeviceIntent,
  UpdateDeviceIntent,
  MoveDeviceIntent,
  RemoveDeviceIntent,
  ToggleDeviceGroupIntent,
  AdjustLightingCycleIntent,
  DeviceIntentHandlers,
} from './commands/devices.js';
export type { AdjustLightingCycleResult } from '@/engine/devices/lightingCycleService.js';
export type {
  AddPlantingIntent,
  CullPlantingIntent,
  HarvestPlantingIntent,
  HarvestPlantIntent,
  CullPlantIntent,
  ApplyIrrigationIntent,
  ApplyFertilizerIntent,
  TogglePlantingPlanIntent,
  PlantIntentHandlers,
} from './commands/plants.js';
export type {
  HarvestPlantResult,
  DiscardPlantResult,
} from '@/engine/plants/plantLifecycleService.js';
export type {
  ScheduleScoutingIntent,
  ApplyTreatmentIntent,
  QuarantineZoneIntent,
  HealthIntentHandlers,
} from './commands/health.js';
export type {
  RefreshCandidatesIntent,
  HireIntent,
  FireIntent,
  SetOvertimePolicyIntent,
  AssignStructureIntent,
  EnqueueTaskIntent,
  WorkforceIntentHandlers,
} from './commands/workforce.js';
export type {
  SellInventoryIntent,
  SetUtilityPricesIntent,
  SetMaintenancePolicyIntent,
  FinanceIntentHandlers,
} from './commands/finance.js';
export type { GetDifficultyConfigIntent, ConfigIntentHandlers } from './commands/config.js';

export type StateSelector<T> = (state: Readonly<GameState>) => T;
export type EventSubscriptionHandler = (event: SimulationEvent) => void;
export type Unsubscribe = () => void;

type SimulationEvent = Parameters<EventBus['emit']>[1];

type ZoneSetpointMetric = 'temperature' | 'relativeHumidity' | 'co2' | 'ppfd' | 'vpd';

export interface EngineServices {
  world?: Partial<WorldIntentHandlers>;
  devices?: Partial<DeviceIntentHandlers>;
  plants?: Partial<PlantIntentHandlers>;
  health?: Partial<HealthIntentHandlers>;
  workforce?: Partial<WorkforceIntentHandlers>;
  finance?: Partial<FinanceIntentHandlers>;
  config?: Partial<ConfigIntentHandlers>;
}

export interface SimulationFacadeSchedulerOptions
  extends Partial<
    Pick<
      SimulationSchedulerOptions,
      'maxTicksPerFrame' | 'speed' | 'timeProvider' | 'frameScheduler' | 'frameCanceler'
    >
  > {
  tickIntervalMs?: number;
  onError?: (error: unknown) => void;
}

export interface SimulationFacadeOptions {
  state: GameState;
  environment?: ZoneEnvironmentOptions;
  eventBus?: EventBus;
  loop?: SimulationLoop;
  services?: EngineServices;
  scheduler?: SimulationFacadeSchedulerOptions;
  accounting?: SimulationLoopAccountingOptions;
}

export interface TimeIntentAPI {
  start(intent?: TimeStartIntent): Promise<CommandResult<TimeStatus>>;
  pause(): Promise<CommandResult<TimeStatus>>;
  resume(): Promise<CommandResult<TimeStatus>>;
  step(intent?: TimeStepIntent): Promise<CommandResult<TimeStatus>>;
  setSpeed(intent: SetSpeedIntent): Promise<CommandResult<TimeStatus>>;
}

export interface WorldIntentAPI {
  rentStructure(intent: RentStructureIntent): Promise<CommandResult<DuplicateStructureResult>>;
  getStructureBlueprints(
    intent?: GetStructureBlueprintsIntent,
  ): Promise<CommandResult<StructureBlueprint[]>>;
  getStrainBlueprints(
    intent?: GetStrainBlueprintsIntent,
  ): Promise<CommandResult<StrainBlueprintCatalogEntry[]>>;
  getDeviceBlueprints(
    intent?: GetDeviceBlueprintsIntent,
  ): Promise<CommandResult<DeviceBlueprintCatalogEntry[]>>;
  createRoom(intent: CreateRoomIntent): Promise<CommandResult>;
  updateRoom(intent: UpdateRoomIntent): Promise<CommandResult>;
  deleteRoom(intent: DeleteRoomIntent): Promise<CommandResult>;
  createZone(intent: CreateZoneIntent): Promise<CommandResult>;
  updateZone(intent: UpdateZoneIntent): Promise<CommandResult>;
  deleteZone(intent: DeleteZoneIntent): Promise<CommandResult>;
  renameStructure(intent: RenameStructureIntent): Promise<CommandResult>;
  deleteStructure(intent: DeleteStructureIntent): Promise<CommandResult>;
  resetSession(intent?: ResetSessionIntent): Promise<CommandResult<DuplicateStructureResult>>;
  newGame(intent?: NewGameIntent): Promise<CommandResult>;
  duplicateStructure(
    intent: DuplicateStructureIntent,
  ): Promise<CommandResult<DuplicateStructureResult>>;
  duplicateRoom(intent: DuplicateRoomIntent): Promise<CommandResult<DuplicateRoomResult>>;
  duplicateZone(intent: DuplicateZoneIntent): Promise<CommandResult<DuplicateZoneResult>>;
}

export interface DeviceIntentAPI {
  installDevice(intent: InstallDeviceIntent): Promise<CommandResult>;
  updateDevice(intent: UpdateDeviceIntent): Promise<CommandResult>;
  moveDevice(intent: MoveDeviceIntent): Promise<CommandResult>;
  removeDevice(intent: RemoveDeviceIntent): Promise<CommandResult>;
  toggleDeviceGroup(
    intent: ToggleDeviceGroupIntent,
  ): Promise<CommandResult<DeviceGroupToggleResult>>;
  adjustLightingCycle(
    intent: AdjustLightingCycleIntent,
  ): Promise<CommandResult<AdjustLightingCycleResult>>;
}

export interface PlantIntentAPI {
  addPlanting(intent: AddPlantingIntent): Promise<CommandResult>;
  cullPlanting(intent: CullPlantingIntent): Promise<CommandResult>;
  harvestPlanting(intent: HarvestPlantingIntent): Promise<CommandResult>;
  harvestPlant(intent: HarvestPlantIntent): Promise<CommandResult<HarvestPlantResult>>;
  cullPlant(intent: CullPlantIntent): Promise<CommandResult<DiscardPlantResult>>;
  applyIrrigation(intent: ApplyIrrigationIntent): Promise<CommandResult>;
  applyFertilizer(intent: ApplyFertilizerIntent): Promise<CommandResult>;
  togglePlantingPlan(
    intent: TogglePlantingPlanIntent,
  ): Promise<CommandResult<PlantingPlanToggleResult>>;
}

export interface HealthIntentAPI {
  scheduleScouting(intent: ScheduleScoutingIntent): Promise<CommandResult>;
  applyTreatment(intent: ApplyTreatmentIntent): Promise<CommandResult>;
  quarantineZone(intent: QuarantineZoneIntent): Promise<CommandResult>;
}

export interface WorkforceIntentAPI {
  refreshCandidates(intent?: RefreshCandidatesIntent): Promise<CommandResult>;
  hire(intent: HireIntent): Promise<CommandResult>;
  fire(intent: FireIntent): Promise<CommandResult>;
  setOvertimePolicy(intent: SetOvertimePolicyIntent): Promise<CommandResult>;
  assignStructure(intent: AssignStructureIntent): Promise<CommandResult>;
  enqueueTask(intent: EnqueueTaskIntent): Promise<CommandResult>;
}

export interface FinanceIntentAPI {
  sellInventory(intent: SellInventoryIntent): Promise<CommandResult>;
  setUtilityPrices(intent: SetUtilityPricesIntent): Promise<CommandResult>;
  setMaintenancePolicy(intent: SetMaintenancePolicyIntent): Promise<CommandResult>;
}

export interface ConfigIntentAPI {
  getDifficultyConfig(intent?: GetDifficultyConfigIntent): Promise<CommandResult<DifficultyConfig>>;
}

interface SchedulerConfiguration {
  maxTicksPerFrame?: number;
  speed: number;
  timeProvider?: () => number;
  frameScheduler?: (callback: () => void) => unknown;
  frameCanceler?: (handle: unknown) => void;
}

export class SimulationFacade {
  private readonly state: GameState;

  private readonly eventBus: EventBus;

  private readonly loop: SimulationLoop;

  private scheduler: SimulationScheduler;

  private services: EngineServices;

  private readonly schedulerConfig: SchedulerConfiguration;

  private tickIntervalMs: number;

  private readonly externalSchedulerErrorHandler?: (error: unknown) => void;

  private readonly createContext: CommandContextFactory;

  private readonly timeCommands: TimeCommandRegistry;

  private readonly domainRegistrations = new Map<
    string,
    Record<string, CommandRegistration<unknown, unknown>>
  >();

  private readonly domainHandlers = new Map<string, Record<string, DomainCommandInvoker>>();

  private readonly intentCatalog = new Map<string, string[]>();

  public readonly time: TimeIntentAPI;

  public readonly world: WorldIntentAPI;

  public readonly devices: DeviceIntentAPI;

  public readonly plants: PlantIntentAPI;

  public readonly health: HealthIntentAPI;

  public readonly workforce: WorkforceIntentAPI;

  public readonly finance: FinanceIntentAPI;

  public readonly config: ConfigIntentAPI;

  constructor(options: SimulationFacadeOptions) {
    this.state = options.state;
    this.eventBus = options.eventBus ?? telemetryEventBus;
    this.loop =
      options.loop ??
      new SimulationLoop({
        state: this.state,
        eventBus: this.eventBus,
        environment: options.environment,
        accounting: options.accounting,
      });
    this.services = {
      world: options.services?.world ? { ...options.services.world } : {},
      devices: options.services?.devices ? { ...options.services.devices } : {},
      plants: options.services?.plants ? { ...options.services.plants } : {},
      health: options.services?.health ? { ...options.services.health } : {},
      workforce: options.services?.workforce ? { ...options.services.workforce } : {},
      finance: options.services?.finance ? { ...options.services.finance } : {},
      config: options.services?.config ? { ...options.services.config } : {},
    };

    const schedulerOptions = options.scheduler ?? {};
    this.tickIntervalMs = this.resolveTickInterval(schedulerOptions.tickIntervalMs);
    this.schedulerConfig = {
      maxTicksPerFrame: schedulerOptions.maxTicksPerFrame,
      speed: schedulerOptions.speed ?? 1,
      timeProvider: schedulerOptions.timeProvider,
      frameScheduler: schedulerOptions.frameScheduler,
      frameCanceler: schedulerOptions.frameCanceler,
    };
    this.externalSchedulerErrorHandler = schedulerOptions.onError;
    this.scheduler = this.createScheduler({
      maxTicksPerFrame: this.schedulerConfig.maxTicksPerFrame,
      speed: this.schedulerConfig.speed,
    });

    this.createContext = createCommandContextFactory(this.state, this.eventBus);

    this.timeCommands = buildTimeCommands({
      handleStart: (intent, context) => this.handleStart(intent, context),
      handlePause: (context) => this.handlePause(context),
      handleResume: (context) => this.handleResume(context),
      handleStep: (intent) => this.handleStep(intent),
      handleSetSpeed: (intent, context) => this.handleSetSpeed(intent, context),
    });

    const onMissingHandler: MissingCommandHandler = (command) =>
      createFailure(
        'ERR_INVALID_STATE',
        `Command handler for ${command} is not configured.`,
        command,
      );

    const worldCommands = buildWorldCommands({
      services: () => this.services.world ?? {},
      onMissingHandler,
    });
    const deviceCommands = buildDeviceCommands({
      services: () => this.services.devices ?? {},
      onMissingHandler,
    });
    const plantCommands = buildPlantCommands({
      services: () => this.services.plants ?? {},
      onMissingHandler,
    });
    const healthCommands = buildHealthCommands({
      services: () => this.services.health ?? {},
      onMissingHandler,
    });
    const workforceCommands = buildWorkforceCommands({
      services: () => this.services.workforce ?? {},
      onMissingHandler,
    });
    const financeCommands = buildFinanceCommands({
      services: () => this.services.finance ?? {},
      onMissingHandler,
    });
    const configCommands = buildConfigCommands({
      services: () => this.services.config ?? {},
      onMissingHandler,
    });

    const timeDomain = this.registerDomain('time', this.timeCommands);
    this.time = {
      start: (intent?: TimeStartIntent) => timeDomain.start(intent),
      pause: () => timeDomain.pause(),
      resume: () => timeDomain.resume(),
      step: (intent?: TimeStepIntent) => timeDomain.step(intent),
      setSpeed: (intent: SetSpeedIntent) => timeDomain.setSpeed(intent),
    } satisfies TimeIntentAPI;

    this.world = this.registerDomain('world', worldCommands);
    this.devices = this.registerDomain('devices', deviceCommands);
    this.plants = this.registerDomain('plants', plantCommands);
    this.health = this.registerDomain('health', healthCommands);
    this.workforce = this.registerDomain('workforce', workforceCommands);
    this.finance = this.registerDomain('finance', financeCommands);
    this.config = this.registerDomain('config', configCommands);
  }

  getState(): Readonly<GameState> {
    return cloneState(this.state);
  }

  select<T>(selector: StateSelector<T>): T {
    return selector(this.getState());
  }

  subscribe(handler: EventSubscriptionHandler): Unsubscribe;
  subscribe(filter: EventFilter, handler: EventSubscriptionHandler): Unsubscribe;
  subscribe(
    filterOrHandler: EventFilter | EventSubscriptionHandler,
    handler?: EventSubscriptionHandler,
  ): Unsubscribe {
    if (typeof filterOrHandler === 'function') {
      const subscription = this.eventBus
        .asObservable()
        .subscribe((event) => filterOrHandler(event));
      return () => subscription.unsubscribe();
    }
    if (!handler) {
      throw new Error('Event handler is required when subscribing with a filter.');
    }
    const subscription = this.eventBus.events(filterOrHandler).subscribe((event) => handler(event));
    return () => subscription.unsubscribe();
  }

  start(intent?: TimeStartIntent): Promise<CommandResult<TimeStatus>> {
    return this.time.start(intent);
  }

  pause(): Promise<CommandResult<TimeStatus>> {
    return this.time.pause();
  }

  resume(): Promise<CommandResult<TimeStatus>> {
    return this.time.resume();
  }

  step(intent?: TimeStepIntent): Promise<CommandResult<TimeStatus>> {
    return this.time.step(intent);
  }

  setSpeed(intent: SetSpeedIntent): Promise<CommandResult<TimeStatus>> {
    return this.time.setSpeed(intent);
  }

  setTickLength(minutes: number): CommandResult<TimeStatus> {
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return createFailure(
        'ERR_VALIDATION',
        'Tick length must be greater than zero.',
        'time.setTickLength',
      );
    }
    const tickIntervalMs = minutes * MINUTES_PER_HOUR * 1000;
    if (Math.abs(tickIntervalMs - this.tickIntervalMs) < Number.EPSILON) {
      return {
        ok: true,
        data: this.getTimeStatus(),
        warnings: ['Tick length unchanged.'],
      };
    }

    const wasRunning = this.scheduler.isRunning();
    const wasPaused = this.scheduler.isPaused();

    this.scheduler.stop();

    this.tickIntervalMs = tickIntervalMs;
    this.state.metadata.tickLengthMinutes = minutes;

    this.scheduler = this.createScheduler({
      maxTicksPerFrame: this.schedulerConfig.maxTicksPerFrame,
      speed: this.schedulerConfig.speed,
    });

    if (wasRunning) {
      this.scheduler.start();
      if (wasPaused) {
        this.scheduler.pause();
      }
    }

    const status = this.getTimeStatus();
    this.eventBus.emit(
      'sim.tickLengthChanged',
      { minutes, tickIntervalMs, status },
      this.state.clock.tick,
      'info',
    );

    return { ok: true, data: status };
  }

  setZoneSetpoint(
    zoneId: string,
    metric: ZoneSetpointMetric,
    rawValue: number,
  ): CommandResult<TimeStatus> {
    const command = 'config.setSetpoint';
    const { context, flush } = this.createContext(command);
    try {
      if (!Number.isFinite(rawValue)) {
        return createFailure('ERR_VALIDATION', 'Setpoint value must be finite.', command);
      }

      const lookup = findZone(this.state, zoneId);
      if (!lookup) {
        return createFailure('ERR_INVALID_STATE', `Zone ${zoneId} is not available.`, command);
      }

      const { zone } = lookup;
      const warnings: string[] = [];
      const control = ensureZoneControl(zone);
      let effectiveValue = rawValue;
      let effectiveHumidity: number | undefined;

      switch (metric) {
        case 'temperature': {
          const devices = filterZoneDevices(zone, TEMPERATURE_DEVICE_KINDS);
          if (devices.length === 0) {
            return createFailure(
              'ERR_INVALID_STATE',
              `Zone ${zoneId} does not support temperature control.`,
              command,
            );
          }
          for (const device of devices) {
            device.settings.targetTemperature = rawValue;
          }
          control.setpoints.temperature = rawValue;
          break;
        }

        case 'relativeHumidity': {
          const devices = filterZoneDevices(zone, HUMIDITY_DEVICE_KINDS);
          if (devices.length === 0) {
            return createFailure(
              'ERR_INVALID_STATE',
              `Zone ${zoneId} does not support humidity control.`,
              command,
            );
          }
          const humidity = sanitizeRelativeHumidity(rawValue, warnings);
          for (const device of devices) {
            device.settings.targetHumidity = humidity;
          }
          control.setpoints.humidity = humidity;
          delete control.setpoints.vpd;
          effectiveValue = humidity;
          effectiveHumidity = humidity;
          break;
        }

        case 'co2': {
          const devices = filterZoneDevices(zone, CO2_DEVICE_KINDS);
          if (devices.length === 0) {
            return createFailure(
              'ERR_INVALID_STATE',
              `Zone ${zoneId} does not support CO2 control.`,
              command,
            );
          }
          const target = sanitizeNonNegative(
            rawValue,
            warnings,
            'CO₂ setpoint was clamped to zero or greater.',
          );
          for (const device of devices) {
            device.settings.targetCO2 = target;
          }
          control.setpoints.co2 = target;
          effectiveValue = target;
          break;
        }

        case 'ppfd': {
          const devices = filterZoneDevices(zone, LIGHT_DEVICE_KINDS);
          if (devices.length === 0) {
            return createFailure(
              'ERR_INVALID_STATE',
              `Zone ${zoneId} does not have controllable lighting.`,
              command,
            );
          }
          const target = sanitizeNonNegative(
            rawValue,
            warnings,
            'PPFD setpoint was clamped to zero or greater.',
          );
          for (const device of devices) {
            const settings = device.settings;
            const previousPpfd = extractFiniteNumber(settings.ppfd);
            const previousPower = extractFiniteNumber(settings.power);
            settings.ppfd = target;
            if (previousPower !== undefined) {
              if (target <= 0) {
                settings.power = 0;
              } else if (previousPpfd && previousPpfd > 0) {
                const ratio = target / previousPpfd;
                settings.power = Math.max(previousPower * ratio, 0);
              }
            }
          }
          control.setpoints.ppfd = target;
          effectiveValue = target;
          break;
        }

        case 'vpd': {
          const devices = filterZoneDevices(zone, HUMIDITY_DEVICE_KINDS);
          if (devices.length === 0) {
            return createFailure(
              'ERR_INVALID_STATE',
              `Zone ${zoneId} does not support humidity control.`,
              command,
            );
          }
          const vpd = sanitizeNonNegative(
            rawValue,
            warnings,
            'VPD setpoint was clamped to zero or greater.',
          );
          const referenceTemperature = resolveTemperatureForVpd(zone);
          const humidity = computeHumidityForVpd(referenceTemperature, vpd, warnings);
          for (const device of devices) {
            device.settings.targetHumidity = humidity;
          }
          control.setpoints.vpd = vpd;
          control.setpoints.humidity = humidity;
          effectiveValue = vpd;
          effectiveHumidity = humidity;
          break;
        }

        default:
          return createFailure(
            'ERR_INVALID_STATE',
            `Unsupported setpoint metric: ${String(metric)}`,
            command,
          );
      }

      const eventPayload: Record<string, unknown> = {
        zoneId,
        metric,
        value: effectiveValue,
        control: { ...control.setpoints },
      };
      if (effectiveHumidity !== undefined) {
        eventPayload.effectiveHumidity = effectiveHumidity;
      }
      context.events.queue('env.setpointUpdated', eventPayload, context.tick, 'info');

      return {
        ok: true,
        data: this.getTimeStatus(),
        warnings: normalizeWarnings(warnings),
      } satisfies CommandResult<TimeStatus>;
    } finally {
      flush();
    }
  }

  updateServices(services: Partial<EngineServices>): void {
    if (services.world) {
      this.services.world = { ...this.services.world, ...services.world };
    }
    if (services.devices) {
      this.services.devices = { ...this.services.devices, ...services.devices };
    }
    if (services.plants) {
      this.services.plants = { ...this.services.plants, ...services.plants };
    }
    if (services.health) {
      this.services.health = { ...this.services.health, ...services.health };
    }
    if (services.workforce) {
      this.services.workforce = { ...this.services.workforce, ...services.workforce };
    }
    if (services.finance) {
      this.services.finance = { ...this.services.finance, ...services.finance };
    }
    if (services.config) {
      this.services.config = { ...this.services.config, ...services.config };
    }
  }

  listIntentDomains(): readonly string[] {
    return Array.from(this.intentCatalog.keys());
  }

  hasIntentDomain(domain: string): boolean {
    return this.intentCatalog.has(domain);
  }

  getIntentHandler(domain: string, action: string): DomainCommandInvoker | undefined {
    return this.domainHandlers.get(domain)?.[action];
  }

  private registerDomain<Commands extends DomainCommandRegistryMap>(
    domain: string,
    commands: Commands,
  ): DomainApi<Commands> {
    this.domainRegistrations.set(domain, commands);
    const actions: string[] = [];
    const invokers: Record<string, DomainCommandInvoker> = {};
    const api = {} as DomainApi<Commands>;

    for (const [actionKey, registration] of Object.entries(commands) as [
      keyof Commands,
      Commands[keyof Commands],
    ][]) {
      const actionName = String(actionKey);
      actions.push(actionName);
      invokers[actionName] = (payload?: unknown) =>
        this.executeCommand(registration, payload) as Promise<CommandResult<unknown>>;
      (api as Record<string, unknown>)[actionName] = ((payload?: unknown) =>
        this.executeCommand(registration, payload)) as DomainApi<Commands>[typeof actionKey];
    }

    this.domainHandlers.set(domain, invokers);
    this.intentCatalog.set(domain, actions);

    return api;
  }

  private handleStart(
    intent: TimeStartIntent,
    context: CommandExecutionContext,
  ): CommandResult<TimeStatus> {
    if (this.scheduler.isRunning()) {
      return createFailure('ERR_CONFLICT', 'Simulation is already running.', 'time.start');
    }

    const currentSpeed = this.scheduler.getSpeed();
    const requestedSpeed = intent.gameSpeed ?? currentSpeed;

    if (intent.maxTicksPerFrame !== undefined) {
      this.scheduler.stop();
      this.schedulerConfig.maxTicksPerFrame = intent.maxTicksPerFrame;
      this.schedulerConfig.speed = requestedSpeed;
      this.scheduler = this.createScheduler({
        maxTicksPerFrame: intent.maxTicksPerFrame,
        speed: requestedSpeed,
      });
    } else {
      this.scheduler.stop();
      this.schedulerConfig.speed = requestedSpeed;
      this.scheduler.setSpeed(requestedSpeed);
    }

    if (intent.gameSpeed !== undefined) {
      this.scheduler.setSpeed(intent.gameSpeed);
      this.schedulerConfig.speed = intent.gameSpeed;
    }

    this.scheduler.start();
    const status = this.getTimeStatus();
    context.events.queue('sim.resumed', status, context.tick, 'info');
    return { ok: true, data: status };
  }

  private handlePause(context: CommandExecutionContext): CommandResult<TimeStatus> {
    if (!this.scheduler.isRunning()) {
      return createFailure('ERR_INVALID_STATE', 'Simulation is not running.', 'time.pause');
    }
    if (this.scheduler.isPaused()) {
      return {
        ok: true,
        data: this.getTimeStatus(),
        warnings: ['Simulation is already paused.'],
      };
    }
    this.scheduler.pause();
    const status = this.getTimeStatus();
    context.events.queue('sim.paused', status, context.tick, 'info');
    return { ok: true, data: status };
  }

  private handleResume(context: CommandExecutionContext): CommandResult<TimeStatus> {
    const wasRunning = this.scheduler.isRunning();
    const wasPaused = this.scheduler.isPaused();
    this.scheduler.resume();
    const status = this.getTimeStatus();
    if (wasRunning && !wasPaused) {
      return {
        ok: true,
        data: status,
        warnings: ['Simulation is already running.'],
      };
    }
    context.events.queue('sim.resumed', status, context.tick, 'info');
    return { ok: true, data: status };
  }

  private async handleStep(intent: TimeStepIntent): Promise<CommandResult<TimeStatus>> {
    const steps = intent.ticks ?? 1;
    await this.scheduler.step(steps);
    return { ok: true, data: this.getTimeStatus() };
  }

  private handleSetSpeed(
    intent: SetSpeedIntent,
    context: CommandExecutionContext,
  ): CommandResult<TimeStatus> {
    const currentSpeed = this.scheduler.getSpeed();
    if (Math.abs(intent.multiplier - currentSpeed) < Number.EPSILON) {
      return {
        ok: true,
        data: this.getTimeStatus(),
        warnings: ['Speed multiplier unchanged.'],
      };
    }
    this.scheduler.setSpeed(intent.multiplier);
    this.schedulerConfig.speed = this.scheduler.getSpeed();
    const status = this.getTimeStatus();
    context.events.queue('sim.speedChanged', status, context.tick, 'info');
    return { ok: true, data: status };
  }

  private executeCommand<Payload, Result = unknown>(
    registration: CommandRegistration<Payload, Result>,
    rawPayload: unknown,
  ): Promise<CommandResult<Result>> {
    return executeCommand(registration, rawPayload, this.createContext);
  }

  public getTimeStatus(): TimeStatus {
    return {
      running: this.scheduler.isRunning(),
      paused: this.scheduler.isPaused(),
      speed: this.scheduler.getSpeed(),
      tick: this.state.clock.tick,
      targetTickRate: this.state.clock.targetTickRate,
    };
  }

  private resolveTickInterval(provided?: number): number {
    if (provided && Number.isFinite(provided) && provided > 0) {
      return provided;
    }
    const minutes = this.state.metadata.tickLengthMinutes;
    if (Number.isFinite(minutes) && minutes > 0) {
      return minutes * MINUTES_PER_HOUR * 1000;
    }
    return DEFAULT_TICK_INTERVAL_MS;
  }

  private createScheduler(
    overrides?: Partial<Pick<SimulationSchedulerOptions, 'maxTicksPerFrame' | 'speed'>>,
  ): SimulationScheduler {
    const options: SimulationSchedulerOptions = {
      tickIntervalMs: this.tickIntervalMs,
      clock: this.state.clock,
      maxTicksPerFrame: overrides?.maxTicksPerFrame ?? this.schedulerConfig.maxTicksPerFrame,
      speed: overrides?.speed ?? this.schedulerConfig.speed,
      timeProvider: this.schedulerConfig.timeProvider,
      frameScheduler: this.schedulerConfig.frameScheduler,
      frameCanceler: this.schedulerConfig.frameCanceler,
      onError: (error) => this.emitSchedulerError(error),
    };
    return new SimulationScheduler(() => this.loop.processTick(), options);
  }

  private emitSchedulerError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.eventBus.emit('sim.schedulerError', { message }, this.state.clock.tick, 'error');
    if (this.externalSchedulerErrorHandler) {
      this.externalSchedulerErrorHandler(error);
    }
  }
}
