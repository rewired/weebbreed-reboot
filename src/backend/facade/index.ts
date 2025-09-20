import { z, ZodError } from 'zod';
import {
  EventBus,
  type SimulationEvent,
  type EventFilter,
  type EventCollector,
  createEventCollector,
} from '../src/lib/eventBus.js';
import type { GameState, SimulationClockState } from '../src/state/models.js';
import { SimulationLoop } from '../src/sim/loop.js';
import { SimulationScheduler } from '../src/sim/simScheduler.js';
import type { SimulationSchedulerOptions } from '../src/sim/simScheduler.js';
import type { ZoneEnvironmentOptions } from '../src/engine/environment/zoneEnvironment.js';

const cloneState = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

export type ErrorCode =
  | 'ERR_NOT_FOUND'
  | 'ERR_FORBIDDEN'
  | 'ERR_CONFLICT'
  | 'ERR_INVALID_STATE'
  | 'ERR_VALIDATION'
  | 'ERR_RATE_LIMIT'
  | 'ERR_DATA_RELOAD_PENDING'
  | 'ERR_INTERNAL';

export interface CommandError {
  code: ErrorCode;
  message: string;
  path?: string[];
}

export interface CommandResult<T = void> {
  ok: boolean;
  data?: T;
  warnings?: string[];
  errors?: CommandError[];
}

export class CommandExecutionError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly path?: string[],
  ) {
    super(message);
    this.name = 'CommandExecutionError';
  }
}

export type StateSelector<T> = (state: Readonly<GameState>) => T;
export type EventSubscriptionHandler = (event: SimulationEvent) => void;
export type Unsubscribe = () => void;

export interface CommandExecutionContext {
  readonly command: string;
  readonly state: GameState;
  readonly clock: SimulationClockState;
  readonly tick: number;
  readonly events: EventCollector;
}

export type ServiceCommandHandler<Payload, Result = unknown> = (
  payload: Payload,
  context: CommandExecutionContext,
) => Promise<CommandResult<Result>> | CommandResult<Result>;

const uuid = z.string().uuid();
const nonEmptyString = z.string().trim().min(1, { message: 'Value must not be empty.' });
const finiteNumber = z
  .number({ invalid_type_error: 'Value must be a number.' })
  .refine((value) => Number.isFinite(value), { message: 'Value must be finite.' });
const positiveNumber = finiteNumber.gt(0, { message: 'Value must be greater than zero.' });
const nonNegativeNumber = finiteNumber.min(0, {
  message: 'Value must be greater than or equal to zero.',
});
const positiveInteger = z
  .number({ invalid_type_error: 'Value must be a number.' })
  .int({ message: 'Value must be an integer.' })
  .min(1, { message: 'Value must be greater than zero.' });
const nonNegativeInteger = z
  .number({ invalid_type_error: 'Value must be a number.' })
  .int({ message: 'Value must be an integer.' })
  .min(0, { message: 'Value must be zero or greater.' });
const settingsRecord = z.record(z.string(), z.unknown());
const emptyObjectSchema = z.object({}).strict();

const timeStartSchema = z
  .object({
    gameSpeed: positiveNumber.optional(),
    maxTicksPerFrame: positiveInteger.optional(),
  })
  .strict();
const timeStepSchema = z
  .object({
    ticks: positiveInteger.optional(),
  })
  .strict();
const setSpeedSchema = z
  .object({
    multiplier: positiveNumber,
  })
  .strict();

const rentStructureSchema = z
  .object({
    structureId: uuid,
  })
  .strict();
const createRoomSchema = z
  .object({
    structureId: uuid,
    room: z
      .object({
        name: nonEmptyString,
        purpose: nonEmptyString,
        area: positiveNumber,
        height: positiveNumber.optional(),
      })
      .strict(),
  })
  .strict();
const updateRoomSchema = z
  .object({
    roomId: uuid,
    patch: z
      .object({
        name: nonEmptyString.optional(),
        purpose: nonEmptyString.optional(),
        area: positiveNumber.optional(),
        height: positiveNumber.optional(),
      })
      .strict()
      .refine((patch) => Object.keys(patch).length > 0, {
        message: 'At least one field must be provided in patch.',
      }),
  })
  .strict();
const deleteRoomSchema = z
  .object({
    roomId: uuid,
  })
  .strict();
const createZoneSchema = z
  .object({
    roomId: uuid,
    zone: z
      .object({
        name: nonEmptyString,
        area: positiveNumber,
        methodId: uuid,
        targetPlantCount: positiveInteger.optional(),
      })
      .strict(),
  })
  .strict();
const updateZoneSchema = z
  .object({
    zoneId: uuid,
    patch: z
      .object({
        name: nonEmptyString.optional(),
        area: positiveNumber.optional(),
        methodId: uuid.optional(),
        targetPlantCount: positiveInteger.optional(),
      })
      .strict()
      .refine((patch) => Object.keys(patch).length > 0, {
        message: 'At least one field must be provided in patch.',
      }),
  })
  .strict();
const deleteZoneSchema = z
  .object({
    zoneId: uuid,
  })
  .strict();

const installDeviceSchema = z
  .object({
    targetId: uuid,
    deviceId: uuid,
    settings: settingsRecord.optional(),
  })
  .strict();
const updateDeviceSchema = z
  .object({
    instanceId: uuid,
    settings: settingsRecord
      .refine((value) => Object.keys(value).length > 0, {
        message: 'Settings patch must include at least one property.',
      })
      .optional(),
  })
  .strict();
const moveDeviceSchema = z
  .object({
    instanceId: uuid,
    targetZoneId: uuid,
  })
  .strict();
const removeDeviceSchema = z
  .object({
    instanceId: uuid,
  })
  .strict();

const addPlantingSchema = z
  .object({
    zoneId: uuid,
    strainId: uuid,
    count: positiveInteger,
    startTick: nonNegativeInteger.optional(),
  })
  .strict();
const cullPlantingSchema = z
  .object({
    plantingId: uuid,
    count: positiveInteger.optional(),
  })
  .strict();
const harvestPlantingSchema = z
  .object({
    plantingId: uuid,
  })
  .strict();
const applyIrrigationSchema = z
  .object({
    zoneId: uuid,
    liters: nonNegativeNumber,
  })
  .strict();
const applyFertilizerSchema = z
  .object({
    zoneId: uuid,
    nutrients: z
      .object({
        n: nonNegativeNumber,
        p: nonNegativeNumber,
        k: nonNegativeNumber,
      })
      .strict(),
  })
  .strict();

const scheduleScoutingSchema = z
  .object({
    zoneId: uuid,
  })
  .strict();
const applyTreatmentSchema = z
  .object({
    zoneId: uuid,
    optionId: uuid,
  })
  .strict();
const quarantineZoneSchema = z
  .object({
    zoneId: uuid,
    enabled: z.boolean(),
  })
  .strict();

const refreshCandidatesSchema = z
  .object({
    seed: z.string().optional(),
    policyId: nonEmptyString.optional(),
    force: z.boolean().optional(),
  })
  .strict();
const hireSchema = z
  .object({
    candidateId: uuid,
    role: nonEmptyString,
    wage: nonNegativeNumber.optional(),
  })
  .strict();
const fireSchema = z
  .object({
    employeeId: uuid,
  })
  .strict();
const setOvertimePolicySchema = z
  .object({
    policy: z.enum(['payout', 'timeOff']),
    multiplier: positiveNumber.optional(),
  })
  .strict();
const assignStructureSchema = z
  .object({
    employeeId: uuid,
    structureId: uuid.optional(),
  })
  .strict();
const enqueueTaskSchema = z
  .object({
    taskKind: nonEmptyString,
    payload: settingsRecord.optional(),
  })
  .strict();

const sellInventorySchema = z
  .object({
    lotId: uuid,
    grams: nonNegativeNumber,
  })
  .strict();
const setUtilityPricesSchema = z
  .object({
    electricityCostPerKWh: nonNegativeNumber.optional(),
    waterCostPerM3: nonNegativeNumber.optional(),
    nutrientsCostPerKg: nonNegativeNumber.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.electricityCostPerKWh !== undefined ||
      value.waterCostPerM3 !== undefined ||
      value.nutrientsCostPerKg !== undefined,
    { message: 'At least one utility price must be provided.' },
  );
const setMaintenancePolicySchema = z
  .object({
    strategy: nonEmptyString.optional(),
    multiplier: positiveNumber.optional(),
  })
  .strict()
  .refine((value) => value.strategy !== undefined || value.multiplier !== undefined, {
    message: 'At least one maintenance policy field must be provided.',
  });

export type TimeStartIntent = z.infer<typeof timeStartSchema>;
export type TimeStepIntent = z.infer<typeof timeStepSchema>;
export type SetSpeedIntent = z.infer<typeof setSpeedSchema>;

export type RentStructureIntent = z.infer<typeof rentStructureSchema>;
export type CreateRoomIntent = z.infer<typeof createRoomSchema>;
export type UpdateRoomIntent = z.infer<typeof updateRoomSchema>;
export type DeleteRoomIntent = z.infer<typeof deleteRoomSchema>;
export type CreateZoneIntent = z.infer<typeof createZoneSchema>;
export type UpdateZoneIntent = z.infer<typeof updateZoneSchema>;
export type DeleteZoneIntent = z.infer<typeof deleteZoneSchema>;

export type InstallDeviceIntent = z.infer<typeof installDeviceSchema>;
export type UpdateDeviceIntent = z.infer<typeof updateDeviceSchema>;
export type MoveDeviceIntent = z.infer<typeof moveDeviceSchema>;
export type RemoveDeviceIntent = z.infer<typeof removeDeviceSchema>;

export type AddPlantingIntent = z.infer<typeof addPlantingSchema>;
export type CullPlantingIntent = z.infer<typeof cullPlantingSchema>;
export type HarvestPlantingIntent = z.infer<typeof harvestPlantingSchema>;
export type ApplyIrrigationIntent = z.infer<typeof applyIrrigationSchema>;
export type ApplyFertilizerIntent = z.infer<typeof applyFertilizerSchema>;

export type ScheduleScoutingIntent = z.infer<typeof scheduleScoutingSchema>;
export type ApplyTreatmentIntent = z.infer<typeof applyTreatmentSchema>;
export type QuarantineZoneIntent = z.infer<typeof quarantineZoneSchema>;

export type RefreshCandidatesIntent = z.infer<typeof refreshCandidatesSchema>;
export type HireIntent = z.infer<typeof hireSchema>;
export type FireIntent = z.infer<typeof fireSchema>;
export type SetOvertimePolicyIntent = z.infer<typeof setOvertimePolicySchema>;
export type AssignStructureIntent = z.infer<typeof assignStructureSchema>;
export type EnqueueTaskIntent = z.infer<typeof enqueueTaskSchema>;

export type SellInventoryIntent = z.infer<typeof sellInventorySchema>;
export type SetUtilityPricesIntent = z.infer<typeof setUtilityPricesSchema>;
export type SetMaintenancePolicyIntent = z.infer<typeof setMaintenancePolicySchema>;

export interface WorldIntentHandlers {
  rentStructure: ServiceCommandHandler<RentStructureIntent>;
  createRoom: ServiceCommandHandler<CreateRoomIntent>;
  updateRoom: ServiceCommandHandler<UpdateRoomIntent>;
  deleteRoom: ServiceCommandHandler<DeleteRoomIntent>;
  createZone: ServiceCommandHandler<CreateZoneIntent>;
  updateZone: ServiceCommandHandler<UpdateZoneIntent>;
  deleteZone: ServiceCommandHandler<DeleteZoneIntent>;
}

export interface DeviceIntentHandlers {
  installDevice: ServiceCommandHandler<InstallDeviceIntent>;
  updateDevice: ServiceCommandHandler<UpdateDeviceIntent>;
  moveDevice: ServiceCommandHandler<MoveDeviceIntent>;
  removeDevice: ServiceCommandHandler<RemoveDeviceIntent>;
}

export interface PlantIntentHandlers {
  addPlanting: ServiceCommandHandler<AddPlantingIntent>;
  cullPlanting: ServiceCommandHandler<CullPlantingIntent>;
  harvestPlanting: ServiceCommandHandler<HarvestPlantingIntent>;
  applyIrrigation: ServiceCommandHandler<ApplyIrrigationIntent>;
  applyFertilizer: ServiceCommandHandler<ApplyFertilizerIntent>;
}

export interface HealthIntentHandlers {
  scheduleScouting: ServiceCommandHandler<ScheduleScoutingIntent>;
  applyTreatment: ServiceCommandHandler<ApplyTreatmentIntent>;
  quarantineZone: ServiceCommandHandler<QuarantineZoneIntent>;
}

export interface WorkforceIntentHandlers {
  refreshCandidates: ServiceCommandHandler<RefreshCandidatesIntent>;
  hire: ServiceCommandHandler<HireIntent>;
  fire: ServiceCommandHandler<FireIntent>;
  setOvertimePolicy: ServiceCommandHandler<SetOvertimePolicyIntent>;
  assignStructure: ServiceCommandHandler<AssignStructureIntent>;
  enqueueTask: ServiceCommandHandler<EnqueueTaskIntent>;
}

export interface FinanceIntentHandlers {
  sellInventory: ServiceCommandHandler<SellInventoryIntent>;
  setUtilityPrices: ServiceCommandHandler<SetUtilityPricesIntent>;
  setMaintenancePolicy: ServiceCommandHandler<SetMaintenancePolicyIntent>;
}

export interface EngineServices {
  world?: Partial<WorldIntentHandlers>;
  devices?: Partial<DeviceIntentHandlers>;
  plants?: Partial<PlantIntentHandlers>;
  health?: Partial<HealthIntentHandlers>;
  workforce?: Partial<WorkforceIntentHandlers>;
  finance?: Partial<FinanceIntentHandlers>;
}

type InternalCommandHandler<Payload, Result> = ServiceCommandHandler<Payload, Result>;

interface CommandRegistration<Payload, Result = unknown> {
  name: string;
  schema: z.ZodType<Payload>;
  handler: InternalCommandHandler<Payload, Result>;
  preprocess?: (payload: unknown) => unknown;
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
}

export interface TimeStatus {
  running: boolean;
  paused: boolean;
  speed: number;
  tick: number;
  targetTickRate: number;
}

export interface TimeIntentAPI {
  start(intent?: TimeStartIntent): Promise<CommandResult<TimeStatus>>;
  pause(): Promise<CommandResult<TimeStatus>>;
  resume(): Promise<CommandResult<TimeStatus>>;
  step(intent?: TimeStepIntent): Promise<CommandResult<TimeStatus>>;
  setSpeed(intent: SetSpeedIntent): Promise<CommandResult<TimeStatus>>;
}

export interface WorldIntentAPI {
  rentStructure(intent: RentStructureIntent): Promise<CommandResult>;
  createRoom(intent: CreateRoomIntent): Promise<CommandResult>;
  updateRoom(intent: UpdateRoomIntent): Promise<CommandResult>;
  deleteRoom(intent: DeleteRoomIntent): Promise<CommandResult>;
  createZone(intent: CreateZoneIntent): Promise<CommandResult>;
  updateZone(intent: UpdateZoneIntent): Promise<CommandResult>;
  deleteZone(intent: DeleteZoneIntent): Promise<CommandResult>;
}

export interface DeviceIntentAPI {
  installDevice(intent: InstallDeviceIntent): Promise<CommandResult>;
  updateDevice(intent: UpdateDeviceIntent): Promise<CommandResult>;
  moveDevice(intent: MoveDeviceIntent): Promise<CommandResult>;
  removeDevice(intent: RemoveDeviceIntent): Promise<CommandResult>;
}

export interface PlantIntentAPI {
  addPlanting(intent: AddPlantingIntent): Promise<CommandResult>;
  cullPlanting(intent: CullPlantingIntent): Promise<CommandResult>;
  harvestPlanting(intent: HarvestPlantingIntent): Promise<CommandResult>;
  applyIrrigation(intent: ApplyIrrigationIntent): Promise<CommandResult>;
  applyFertilizer(intent: ApplyFertilizerIntent): Promise<CommandResult>;
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

interface TimeCommandRegistry {
  start: CommandRegistration<TimeStartIntent, TimeStatus>;
  pause: CommandRegistration<z.infer<typeof emptyObjectSchema>, TimeStatus>;
  resume: CommandRegistration<z.infer<typeof emptyObjectSchema>, TimeStatus>;
  step: CommandRegistration<TimeStepIntent, TimeStatus>;
  setSpeed: CommandRegistration<SetSpeedIntent, TimeStatus>;
}

interface WorldCommandRegistry {
  rentStructure: CommandRegistration<RentStructureIntent>;
  createRoom: CommandRegistration<CreateRoomIntent>;
  updateRoom: CommandRegistration<UpdateRoomIntent>;
  deleteRoom: CommandRegistration<DeleteRoomIntent>;
  createZone: CommandRegistration<CreateZoneIntent>;
  updateZone: CommandRegistration<UpdateZoneIntent>;
  deleteZone: CommandRegistration<DeleteZoneIntent>;
}

interface DeviceCommandRegistry {
  installDevice: CommandRegistration<InstallDeviceIntent>;
  updateDevice: CommandRegistration<UpdateDeviceIntent>;
  moveDevice: CommandRegistration<MoveDeviceIntent>;
  removeDevice: CommandRegistration<RemoveDeviceIntent>;
}

interface PlantCommandRegistry {
  addPlanting: CommandRegistration<AddPlantingIntent>;
  cullPlanting: CommandRegistration<CullPlantingIntent>;
  harvestPlanting: CommandRegistration<HarvestPlantingIntent>;
  applyIrrigation: CommandRegistration<ApplyIrrigationIntent>;
  applyFertilizer: CommandRegistration<ApplyFertilizerIntent>;
}

interface HealthCommandRegistry {
  scheduleScouting: CommandRegistration<ScheduleScoutingIntent>;
  applyTreatment: CommandRegistration<ApplyTreatmentIntent>;
  quarantineZone: CommandRegistration<QuarantineZoneIntent>;
}

interface WorkforceCommandRegistry {
  refreshCandidates: CommandRegistration<RefreshCandidatesIntent>;
  hire: CommandRegistration<HireIntent>;
  fire: CommandRegistration<FireIntent>;
  setOvertimePolicy: CommandRegistration<SetOvertimePolicyIntent>;
  assignStructure: CommandRegistration<AssignStructureIntent>;
  enqueueTask: CommandRegistration<EnqueueTaskIntent>;
}

interface FinanceCommandRegistry {
  sellInventory: CommandRegistration<SellInventoryIntent>;
  setUtilityPrices: CommandRegistration<SetUtilityPricesIntent>;
  setMaintenancePolicy: CommandRegistration<SetMaintenancePolicyIntent>;
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

  private readonly timeCommands: TimeCommandRegistry;

  private readonly worldCommands: WorldCommandRegistry;

  private readonly deviceCommands: DeviceCommandRegistry;

  private readonly plantCommands: PlantCommandRegistry;

  private readonly healthCommands: HealthCommandRegistry;

  private readonly workforceCommands: WorkforceCommandRegistry;

  private readonly financeCommands: FinanceCommandRegistry;

  public readonly time: TimeIntentAPI;

  public readonly world: WorldIntentAPI;

  public readonly devices: DeviceIntentAPI;

  public readonly plants: PlantIntentAPI;

  public readonly health: HealthIntentAPI;

  public readonly workforce: WorkforceIntentAPI;

  public readonly finance: FinanceIntentAPI;

  constructor(options: SimulationFacadeOptions) {
    this.state = options.state;
    this.eventBus = options.eventBus ?? new EventBus();
    this.loop =
      options.loop ??
      new SimulationLoop({
        state: this.state,
        eventBus: this.eventBus,
        environment: options.environment,
      });
    this.services = {
      world: options.services?.world ? { ...options.services.world } : {},
      devices: options.services?.devices ? { ...options.services.devices } : {},
      plants: options.services?.plants ? { ...options.services.plants } : {},
      health: options.services?.health ? { ...options.services.health } : {},
      workforce: options.services?.workforce ? { ...options.services.workforce } : {},
      finance: options.services?.finance ? { ...options.services.finance } : {},
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

    this.timeCommands = this.buildTimeCommands();
    this.worldCommands = this.buildWorldCommands();
    this.deviceCommands = this.buildDeviceCommands();
    this.plantCommands = this.buildPlantCommands();
    this.healthCommands = this.buildHealthCommands();
    this.workforceCommands = this.buildWorkforceCommands();
    this.financeCommands = this.buildFinanceCommands();

    this.time = {
      start: (intent?: TimeStartIntent) => this.executeCommand(this.timeCommands.start, intent),
      pause: () => this.executeCommand(this.timeCommands.pause, {}),
      resume: () => this.executeCommand(this.timeCommands.resume, {}),
      step: (intent?: TimeStepIntent) => this.executeCommand(this.timeCommands.step, intent),
      setSpeed: (intent: SetSpeedIntent) => this.executeCommand(this.timeCommands.setSpeed, intent),
    } satisfies TimeIntentAPI;

    this.world = {
      rentStructure: (intent: RentStructureIntent) =>
        this.executeCommand(this.worldCommands.rentStructure, intent),
      createRoom: (intent: CreateRoomIntent) =>
        this.executeCommand(this.worldCommands.createRoom, intent),
      updateRoom: (intent: UpdateRoomIntent) =>
        this.executeCommand(this.worldCommands.updateRoom, intent),
      deleteRoom: (intent: DeleteRoomIntent) =>
        this.executeCommand(this.worldCommands.deleteRoom, intent),
      createZone: (intent: CreateZoneIntent) =>
        this.executeCommand(this.worldCommands.createZone, intent),
      updateZone: (intent: UpdateZoneIntent) =>
        this.executeCommand(this.worldCommands.updateZone, intent),
      deleteZone: (intent: DeleteZoneIntent) =>
        this.executeCommand(this.worldCommands.deleteZone, intent),
    } satisfies WorldIntentAPI;

    this.devices = {
      installDevice: (intent: InstallDeviceIntent) =>
        this.executeCommand(this.deviceCommands.installDevice, intent),
      updateDevice: (intent: UpdateDeviceIntent) =>
        this.executeCommand(this.deviceCommands.updateDevice, intent),
      moveDevice: (intent: MoveDeviceIntent) =>
        this.executeCommand(this.deviceCommands.moveDevice, intent),
      removeDevice: (intent: RemoveDeviceIntent) =>
        this.executeCommand(this.deviceCommands.removeDevice, intent),
    } satisfies DeviceIntentAPI;

    this.plants = {
      addPlanting: (intent: AddPlantingIntent) =>
        this.executeCommand(this.plantCommands.addPlanting, intent),
      cullPlanting: (intent: CullPlantingIntent) =>
        this.executeCommand(this.plantCommands.cullPlanting, intent),
      harvestPlanting: (intent: HarvestPlantingIntent) =>
        this.executeCommand(this.plantCommands.harvestPlanting, intent),
      applyIrrigation: (intent: ApplyIrrigationIntent) =>
        this.executeCommand(this.plantCommands.applyIrrigation, intent),
      applyFertilizer: (intent: ApplyFertilizerIntent) =>
        this.executeCommand(this.plantCommands.applyFertilizer, intent),
    } satisfies PlantIntentAPI;

    this.health = {
      scheduleScouting: (intent: ScheduleScoutingIntent) =>
        this.executeCommand(this.healthCommands.scheduleScouting, intent),
      applyTreatment: (intent: ApplyTreatmentIntent) =>
        this.executeCommand(this.healthCommands.applyTreatment, intent),
      quarantineZone: (intent: QuarantineZoneIntent) =>
        this.executeCommand(this.healthCommands.quarantineZone, intent),
    } satisfies HealthIntentAPI;

    this.workforce = {
      refreshCandidates: (intent?: RefreshCandidatesIntent) =>
        this.executeCommand(this.workforceCommands.refreshCandidates, intent),
      hire: (intent: HireIntent) => this.executeCommand(this.workforceCommands.hire, intent),
      fire: (intent: FireIntent) => this.executeCommand(this.workforceCommands.fire, intent),
      setOvertimePolicy: (intent: SetOvertimePolicyIntent) =>
        this.executeCommand(this.workforceCommands.setOvertimePolicy, intent),
      assignStructure: (intent: AssignStructureIntent) =>
        this.executeCommand(this.workforceCommands.assignStructure, intent),
      enqueueTask: (intent: EnqueueTaskIntent) =>
        this.executeCommand(this.workforceCommands.enqueueTask, intent),
    } satisfies WorkforceIntentAPI;

    this.finance = {
      sellInventory: (intent: SellInventoryIntent) =>
        this.executeCommand(this.financeCommands.sellInventory, intent),
      setUtilityPrices: (intent: SetUtilityPricesIntent) =>
        this.executeCommand(this.financeCommands.setUtilityPrices, intent),
      setMaintenancePolicy: (intent: SetMaintenancePolicyIntent) =>
        this.executeCommand(this.financeCommands.setMaintenancePolicy, intent),
    } satisfies FinanceIntentAPI;
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
      return this.createFailure(
        'ERR_VALIDATION',
        'Tick length must be greater than zero.',
        'time.setTickLength',
      );
    }
    const tickIntervalMs = minutes * 60 * 1000;
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
    this.eventBus.emit({
      type: 'sim.tickLengthChanged',
      level: 'info',
      tick: this.state.clock.tick,
      payload: {
        minutes,
        tickIntervalMs,
        status,
      },
    });

    return { ok: true, data: status };
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
  }

  private buildTimeCommands(): TimeCommandRegistry {
    return {
      start: {
        name: 'time.start',
        schema: timeStartSchema,
        preprocess: (payload) => payload ?? {},
        handler: (intent, context) => this.handleStart(intent, context),
      },
      pause: {
        name: 'time.pause',
        schema: emptyObjectSchema,
        preprocess: () => ({}),
        handler: (_intent, context) => this.handlePause(context),
      },
      resume: {
        name: 'time.resume',
        schema: emptyObjectSchema,
        preprocess: () => ({}),
        handler: (_intent, context) => this.handleResume(context),
      },
      step: {
        name: 'time.step',
        schema: timeStepSchema,
        preprocess: (payload) => payload ?? {},
        handler: (intent) => this.handleStep(intent),
      },
      setSpeed: {
        name: 'time.setSpeed',
        schema: setSpeedSchema,
        handler: (intent, context) => this.handleSetSpeed(intent, context),
      },
    } satisfies TimeCommandRegistry;
  }

  private buildWorldCommands(): WorldCommandRegistry {
    return {
      rentStructure: this.createServiceCommand(
        'world.rentStructure',
        rentStructureSchema,
        () => this.services.world?.rentStructure,
      ),
      createRoom: this.createServiceCommand(
        'world.createRoom',
        createRoomSchema,
        () => this.services.world?.createRoom,
      ),
      updateRoom: this.createServiceCommand(
        'world.updateRoom',
        updateRoomSchema,
        () => this.services.world?.updateRoom,
      ),
      deleteRoom: this.createServiceCommand(
        'world.deleteRoom',
        deleteRoomSchema,
        () => this.services.world?.deleteRoom,
      ),
      createZone: this.createServiceCommand(
        'world.createZone',
        createZoneSchema,
        () => this.services.world?.createZone,
      ),
      updateZone: this.createServiceCommand(
        'world.updateZone',
        updateZoneSchema,
        () => this.services.world?.updateZone,
      ),
      deleteZone: this.createServiceCommand(
        'world.deleteZone',
        deleteZoneSchema,
        () => this.services.world?.deleteZone,
      ),
    } satisfies WorldCommandRegistry;
  }

  private buildDeviceCommands(): DeviceCommandRegistry {
    return {
      installDevice: this.createServiceCommand(
        'devices.installDevice',
        installDeviceSchema,
        () => this.services.devices?.installDevice,
      ),
      updateDevice: this.createServiceCommand(
        'devices.updateDevice',
        updateDeviceSchema,
        () => this.services.devices?.updateDevice,
      ),
      moveDevice: this.createServiceCommand(
        'devices.moveDevice',
        moveDeviceSchema,
        () => this.services.devices?.moveDevice,
      ),
      removeDevice: this.createServiceCommand(
        'devices.removeDevice',
        removeDeviceSchema,
        () => this.services.devices?.removeDevice,
      ),
    } satisfies DeviceCommandRegistry;
  }

  private buildPlantCommands(): PlantCommandRegistry {
    return {
      addPlanting: this.createServiceCommand(
        'plants.addPlanting',
        addPlantingSchema,
        () => this.services.plants?.addPlanting,
      ),
      cullPlanting: this.createServiceCommand(
        'plants.cullPlanting',
        cullPlantingSchema,
        () => this.services.plants?.cullPlanting,
      ),
      harvestPlanting: this.createServiceCommand(
        'plants.harvestPlanting',
        harvestPlantingSchema,
        () => this.services.plants?.harvestPlanting,
      ),
      applyIrrigation: this.createServiceCommand(
        'plants.applyIrrigation',
        applyIrrigationSchema,
        () => this.services.plants?.applyIrrigation,
      ),
      applyFertilizer: this.createServiceCommand(
        'plants.applyFertilizer',
        applyFertilizerSchema,
        () => this.services.plants?.applyFertilizer,
      ),
    } satisfies PlantCommandRegistry;
  }

  private buildHealthCommands(): HealthCommandRegistry {
    return {
      scheduleScouting: this.createServiceCommand(
        'health.scheduleScouting',
        scheduleScoutingSchema,
        () => this.services.health?.scheduleScouting,
      ),
      applyTreatment: this.createServiceCommand(
        'health.applyTreatment',
        applyTreatmentSchema,
        () => this.services.health?.applyTreatment,
      ),
      quarantineZone: this.createServiceCommand(
        'health.quarantineZone',
        quarantineZoneSchema,
        () => this.services.health?.quarantineZone,
      ),
    } satisfies HealthCommandRegistry;
  }

  private buildWorkforceCommands(): WorkforceCommandRegistry {
    return {
      refreshCandidates: this.createServiceCommand(
        'workforce.refreshCandidates',
        refreshCandidatesSchema,
        () => this.services.workforce?.refreshCandidates,
        (payload) => payload ?? {},
      ),
      hire: this.createServiceCommand(
        'workforce.hire',
        hireSchema,
        () => this.services.workforce?.hire,
      ),
      fire: this.createServiceCommand(
        'workforce.fire',
        fireSchema,
        () => this.services.workforce?.fire,
      ),
      setOvertimePolicy: this.createServiceCommand(
        'workforce.setOvertimePolicy',
        setOvertimePolicySchema,
        () => this.services.workforce?.setOvertimePolicy,
      ),
      assignStructure: this.createServiceCommand(
        'workforce.assignStructure',
        assignStructureSchema,
        () => this.services.workforce?.assignStructure,
      ),
      enqueueTask: this.createServiceCommand(
        'workforce.enqueueTask',
        enqueueTaskSchema,
        () => this.services.workforce?.enqueueTask,
        (raw) => {
          const base = (raw ?? {}) as EnqueueTaskIntent;
          return { ...base, payload: base.payload ?? {} };
        },
      ),
    } satisfies WorkforceCommandRegistry;
  }

  private buildFinanceCommands(): FinanceCommandRegistry {
    return {
      sellInventory: this.createServiceCommand(
        'finance.sellInventory',
        sellInventorySchema,
        () => this.services.finance?.sellInventory,
      ),
      setUtilityPrices: this.createServiceCommand(
        'finance.setUtilityPrices',
        setUtilityPricesSchema,
        () => this.services.finance?.setUtilityPrices,
      ),
      setMaintenancePolicy: this.createServiceCommand(
        'finance.setMaintenancePolicy',
        setMaintenancePolicySchema,
        () => this.services.finance?.setMaintenancePolicy,
      ),
    } satisfies FinanceCommandRegistry;
  }

  private handleStart(
    intent: TimeStartIntent,
    context: CommandExecutionContext,
  ): CommandResult<TimeStatus> {
    if (this.scheduler.isRunning()) {
      return this.createFailure('ERR_CONFLICT', 'Simulation is already running.', 'time.start');
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
    context.events.queue({
      type: 'sim.resumed',
      level: 'info',
      payload: status,
      tick: context.tick,
    });
    return { ok: true, data: status };
  }

  private handlePause(context: CommandExecutionContext): CommandResult<TimeStatus> {
    if (!this.scheduler.isRunning()) {
      return this.createFailure('ERR_INVALID_STATE', 'Simulation is not running.', 'time.pause');
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
    context.events.queue({
      type: 'sim.paused',
      level: 'info',
      payload: status,
      tick: context.tick,
    });
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
    context.events.queue({
      type: 'sim.resumed',
      level: 'info',
      payload: status,
      tick: context.tick,
    });
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
    context.events.queue({
      type: 'sim.speedChanged',
      level: 'info',
      payload: status,
      tick: context.tick,
    });
    return { ok: true, data: status };
  }

  private createServiceCommand<Payload, Result = unknown>(
    name: string,
    schema: z.ZodType<Payload>,
    resolve: () => ServiceCommandHandler<Payload, Result> | undefined,
    preprocess?: (payload: unknown) => unknown,
  ): CommandRegistration<Payload, Result> {
    return {
      name,
      schema,
      preprocess,
      handler: async (intent, context) => {
        const handler = resolve();
        if (!handler) {
          return this.createFailure(
            'ERR_INVALID_STATE',
            `Command handler for ${name} is not configured.`,
            name,
          );
        }
        return handler(intent, context);
      },
    };
  }

  private async executeCommand<Payload, Result = unknown>(
    registration: CommandRegistration<Payload, Result>,
    rawPayload: unknown,
  ): Promise<CommandResult<Result>> {
    const input = registration.preprocess ? registration.preprocess(rawPayload) : rawPayload;
    const parsed = registration.schema.safeParse(input);
    if (!parsed.success) {
      return this.handleValidationError(registration.name, parsed.error);
    }

    const { context, flush } = this.createCommandContext(registration.name);

    try {
      const outcome = await registration.handler(parsed.data, context);
      const normalized = this.normalizeResult(outcome);
      if (normalized.ok) {
        flush();
      }
      return normalized;
    } catch (error) {
      return this.handleCommandError(registration.name, error);
    }
  }

  private normalizeResult<T>(result?: CommandResult<T>): CommandResult<T> {
    if (!result) {
      return { ok: true };
    }
    const warnings = this.normalizeWarnings(result.warnings);
    if (!result.ok) {
      const errors = this.normalizeErrors(result.errors);
      return {
        ok: false,
        warnings,
        errors:
          errors.length > 0
            ? errors
            : [this.createError('ERR_INVALID_STATE', 'Command failed without error details.')],
      };
    }
    return {
      ok: true,
      data: result.data,
      warnings,
    };
  }

  private normalizeWarnings(warnings?: string[]): string[] | undefined {
    if (!warnings || warnings.length === 0) {
      return undefined;
    }
    const unique = Array.from(new Set(warnings.map((entry) => entry.trim()).filter(Boolean)));
    return unique.length > 0 ? unique : undefined;
  }

  private normalizeErrors(errors?: CommandError[]): CommandError[] {
    if (!errors) {
      return [];
    }
    return errors
      .map((error) => ({
        code: error.code,
        message: error.message,
        path: error.path && error.path.length > 0 ? error.path : undefined,
      }))
      .filter((error) => Boolean(error.message));
  }

  private handleValidationError(command: string, error: ZodError): CommandResult {
    const issues = error.issues;
    if (issues.length === 0) {
      return this.createFailure('ERR_VALIDATION', 'Invalid payload.', command);
    }
    const errors = issues.map((issue) =>
      this.createError('ERR_VALIDATION', issue.message, [
        command,
        ...issue.path.map((segment) => String(segment)),
      ]),
    );
    return { ok: false, errors };
  }

  private handleCommandError(command: string, error: unknown): CommandResult {
    if (error instanceof CommandExecutionError) {
      return {
        ok: false,
        errors: [
          this.createError(
            error.code,
            error.message,
            error.path && error.path.length > 0 ? error.path : [command],
          ),
        ],
      };
    }
    if (error instanceof ZodError) {
      return this.handleValidationError(command, error);
    }
    const message = error instanceof Error ? error.message : String(error);
    return this.createFailure('ERR_INTERNAL', message, command);
  }

  private createCommandContext(command: string): {
    context: CommandExecutionContext;
    flush: () => void;
  } {
    const tick = this.state.clock.tick;
    const buffer: SimulationEvent[] = [];
    const collector = createEventCollector(buffer, tick);
    return {
      context: {
        command,
        state: this.state,
        clock: this.state.clock,
        tick,
        events: collector,
      },
      flush: () => {
        if (buffer.length === 0) {
          return;
        }
        const timestamp = Date.now();
        const events = buffer.map((event) => ({
          ...event,
          tick: event.tick ?? tick,
          ts: event.ts ?? timestamp,
        }));
        buffer.length = 0;
        this.eventBus.emitMany(events);
      },
    };
  }

  private createFailure(code: ErrorCode, message: string, command: string): CommandResult {
    return {
      ok: false,
      errors: [this.createError(code, message, [command])],
    };
  }

  private createError(code: ErrorCode, message: string, path?: string[]): CommandError {
    return { code, message, path };
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
      return minutes * 60 * 1000;
    }
    return 60 * 60 * 1000;
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
    this.eventBus.emit({
      type: 'sim.schedulerError',
      level: 'error',
      payload: { message },
      tick: this.state.clock.tick,
    });
    if (this.externalSchedulerErrorHandler) {
      this.externalSchedulerErrorHandler(error);
    }
  }
}
