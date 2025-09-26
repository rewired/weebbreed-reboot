import { z, ZodError } from 'zod';
import {
  EventBus,
  type SimulationEvent,
  type EventFilter,
  type EventCollector,
  createEventCollector,
} from '@/lib/eventBus.js';
import { eventBus as telemetryEventBus } from '@runtime/eventBus.js';
import type {
  GameState,
  SimulationClockState,
  ZoneControlState,
  ZoneState,
} from '@/state/models.js';
import { SimulationLoop, type SimulationLoopAccountingOptions } from '@/sim/loop.js';
import { SimulationScheduler } from '@/sim/simScheduler.js';
import type { SimulationSchedulerOptions } from '@/sim/simScheduler.js';
import type { ZoneEnvironmentOptions } from '@/engine/environment/zoneEnvironment.js';
import type {
  DuplicateStructureResult,
  DuplicateRoomResult,
  CreateRoomResult,
  CreateZoneResult,
  DuplicateZoneResult,
} from '@/engine/world/worldService.js';
import type { DeviceGroupToggleResult } from '@/engine/devices/deviceGroupService.js';
import type { PlantingPlanToggleResult } from '@/engine/plants/plantingPlanService.js';
import { findZone } from '@/engine/world/stateSelectors.js';
import { saturationVaporPressure } from '@/engine/physio/vpd.js';
import type { DifficultyConfig } from '@/data/configs/difficulty.js';

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
  | 'ERR_INSUFFICIENT_FUNDS'
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
const prefixedIdentifier = z.string().regex(/^[a-z]+_[a-z0-9]{6,}$/i, {
  message: 'Value must be a UUID or prefixed identifier.',
});
const entityIdentifier = z.union([uuid, prefixedIdentifier]);
const nonEmptyString = z.string().trim().min(1, { message: 'Value must not be empty.' });
const finiteNumber = z
  .number({ invalid_type_error: 'Value must be a number.' })
  .finite({ message: 'Value must be finite.' });
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

type ZoneSetpointMetric = 'temperature' | 'relativeHumidity' | 'co2' | 'ppfd' | 'vpd';

const TEMPERATURE_DEVICE_KINDS = new Set(['ClimateUnit', 'HVAC']);
const HUMIDITY_DEVICE_KINDS = new Set(['HumidityControlUnit']);
const CO2_DEVICE_KINDS = new Set(['CO2Injector']);
const LIGHT_DEVICE_KINDS = new Set(['Lamp']);

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
    structureId: entityIdentifier,
  })
  .strict();
const getStructureBlueprintsSchema = z.object({}).strict();
const getDifficultyConfigSchema = z.object({}).strict();
const createRoomSchema = z
  .object({
    structureId: entityIdentifier,
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
    roomId: entityIdentifier,
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
    roomId: entityIdentifier,
  })
  .strict();
const createZoneSchema = z
  .object({
    roomId: entityIdentifier,
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
    zoneId: entityIdentifier,
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
    zoneId: entityIdentifier,
  })
  .strict();

const renameStructureSchema = z
  .object({
    structureId: entityIdentifier,
    name: nonEmptyString,
  })
  .strict();

const deleteStructureSchema = z
  .object({
    structureId: entityIdentifier,
  })
  .strict();
const resetSessionSchema = z.object({}).strict();

const newGameSchema = z
  .object({
    difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
    seed: z.string().optional(),
    modifiers: z
      .object({
        plantStress: z
          .object({
            optimalRangeMultiplier: z.number().min(0.5).max(1.5),
            stressAccumulationMultiplier: z.number().min(0.5).max(1.5),
          })
          .strict(),
        deviceFailure: z
          .object({
            mtbfMultiplier: z.number().min(0.5).max(1.5),
          })
          .strict(),
        economics: z
          .object({
            initialCapital: z.number().min(50000).max(1000000000),
            itemPriceMultiplier: z.number().min(0.5).max(1.5),
            harvestPriceMultiplier: z.number().min(0.5).max(1.5),
            rentPerSqmStructurePerTick: z.number().min(0.1).max(1.5),
            rentPerSqmRoomPerTick: z.number().min(0.1).max(1.5),
          })
          .strict(),
      })
      .strict()
      .optional(),
  })
  .strict();
const duplicateStructureSchema = z
  .object({
    structureId: entityIdentifier,
    name: nonEmptyString.optional(),
  })
  .strict();

const duplicateRoomSchema = z
  .object({
    roomId: entityIdentifier,
    name: nonEmptyString.optional(),
  })
  .strict();

const duplicateZoneSchema = z
  .object({
    zoneId: entityIdentifier,
    name: nonEmptyString.optional(),
  })
  .strict();

const toggleDeviceGroupSchema = z
  .object({
    zoneId: entityIdentifier,
    kind: nonEmptyString,
    enabled: z.boolean(),
  })
  .strict();

const togglePlantingPlanSchema = z
  .object({
    zoneId: entityIdentifier,
    enabled: z.boolean(),
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
export type GetStructureBlueprintsIntent = z.infer<typeof getStructureBlueprintsSchema>;
export type GetDifficultyConfigIntent = z.infer<typeof getDifficultyConfigSchema>;
export type CreateRoomIntent = z.infer<typeof createRoomSchema>;
export type UpdateRoomIntent = z.infer<typeof updateRoomSchema>;
export type DeleteRoomIntent = z.infer<typeof deleteRoomSchema>;
export type CreateZoneIntent = z.infer<typeof createZoneSchema>;
export type UpdateZoneIntent = z.infer<typeof updateZoneSchema>;
export type DeleteZoneIntent = z.infer<typeof deleteZoneSchema>;
export type RenameStructureIntent = z.infer<typeof renameStructureSchema>;
export type DeleteStructureIntent = z.infer<typeof deleteStructureSchema>;
export type ResetSessionIntent = z.infer<typeof resetSessionSchema>;
export type NewGameIntent = z.infer<typeof newGameSchema>;
export type DuplicateStructureIntent = z.infer<typeof duplicateStructureSchema>;
export type DuplicateRoomIntent = z.infer<typeof duplicateRoomSchema>;
export type DuplicateZoneIntent = z.infer<typeof duplicateZoneSchema>;

export type InstallDeviceIntent = z.infer<typeof installDeviceSchema>;
export type UpdateDeviceIntent = z.infer<typeof updateDeviceSchema>;
export type MoveDeviceIntent = z.infer<typeof moveDeviceSchema>;
export type RemoveDeviceIntent = z.infer<typeof removeDeviceSchema>;
export type ToggleDeviceGroupIntent = z.infer<typeof toggleDeviceGroupSchema>;

export type AddPlantingIntent = z.infer<typeof addPlantingSchema>;
export type CullPlantingIntent = z.infer<typeof cullPlantingSchema>;
export type HarvestPlantingIntent = z.infer<typeof harvestPlantingSchema>;
export type ApplyIrrigationIntent = z.infer<typeof applyIrrigationSchema>;
export type ApplyFertilizerIntent = z.infer<typeof applyFertilizerSchema>;
export type TogglePlantingPlanIntent = z.infer<typeof togglePlantingPlanSchema>;

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
  rentStructure: ServiceCommandHandler<RentStructureIntent, DuplicateStructureResult>;
  getStructureBlueprints: ServiceCommandHandler<GetStructureBlueprintsIntent, StructureBlueprint[]>;
  createRoom: ServiceCommandHandler<CreateRoomIntent, CreateRoomResult>;
  updateRoom: ServiceCommandHandler<UpdateRoomIntent>;
  deleteRoom: ServiceCommandHandler<DeleteRoomIntent>;
  createZone: ServiceCommandHandler<CreateZoneIntent, CreateZoneResult>;
  updateZone: ServiceCommandHandler<UpdateZoneIntent>;
  deleteZone: ServiceCommandHandler<DeleteZoneIntent>;
  renameStructure: ServiceCommandHandler<RenameStructureIntent>;
  deleteStructure: ServiceCommandHandler<DeleteStructureIntent>;
  resetSession: ServiceCommandHandler<ResetSessionIntent, DuplicateStructureResult>;
  newGame: ServiceCommandHandler<NewGameIntent>;
  duplicateStructure: ServiceCommandHandler<DuplicateStructureIntent, DuplicateStructureResult>;
  duplicateRoom: ServiceCommandHandler<DuplicateRoomIntent, DuplicateRoomResult>;
  duplicateZone: ServiceCommandHandler<DuplicateZoneIntent, DuplicateZoneResult>;
}

export interface DeviceIntentHandlers {
  installDevice: ServiceCommandHandler<InstallDeviceIntent>;
  updateDevice: ServiceCommandHandler<UpdateDeviceIntent>;
  moveDevice: ServiceCommandHandler<MoveDeviceIntent>;
  removeDevice: ServiceCommandHandler<RemoveDeviceIntent>;
  toggleDeviceGroup: ServiceCommandHandler<ToggleDeviceGroupIntent, DeviceGroupToggleResult>;
}

export interface PlantIntentHandlers {
  addPlanting: ServiceCommandHandler<AddPlantingIntent>;
  cullPlanting: ServiceCommandHandler<CullPlantingIntent>;
  harvestPlanting: ServiceCommandHandler<HarvestPlantingIntent>;
  applyIrrigation: ServiceCommandHandler<ApplyIrrigationIntent>;
  applyFertilizer: ServiceCommandHandler<ApplyFertilizerIntent>;
  togglePlantingPlan: ServiceCommandHandler<TogglePlantingPlanIntent, PlantingPlanToggleResult>;
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

export interface ConfigIntentHandlers {
  getDifficultyConfig: ServiceCommandHandler<GetDifficultyConfigIntent, DifficultyConfig>;
}

export interface EngineServices {
  world?: Partial<WorldIntentHandlers>;
  devices?: Partial<DeviceIntentHandlers>;
  plants?: Partial<PlantIntentHandlers>;
  health?: Partial<HealthIntentHandlers>;
  workforce?: Partial<WorkforceIntentHandlers>;
  finance?: Partial<FinanceIntentHandlers>;
  config?: Partial<ConfigIntentHandlers>;
}

type InternalCommandHandler<Payload, Result> = ServiceCommandHandler<Payload, Result>;

interface CommandRegistration<Payload, Result = unknown> {
  name: string;
  schema: z.ZodType<Payload>;
  handler: InternalCommandHandler<Payload, Result>;
  preprocess?: (payload: unknown) => unknown;
}

type GenericCommandRegistration = CommandRegistration<unknown, unknown>;

type DomainCommandRegistryMap = Record<string, GenericCommandRegistration>;

type DomainApi<Commands extends DomainCommandRegistryMap> = {
  [Key in keyof Commands]: Commands[Key] extends CommandRegistration<infer Payload, infer Result>
    ? (payload?: Payload) => Promise<CommandResult<Result>>
    : never;
};

type DomainCommandInvoker = (payload?: unknown) => Promise<CommandResult<unknown>>;

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
  rentStructure(intent: RentStructureIntent): Promise<CommandResult<DuplicateStructureResult>>;
  getStructureBlueprints(
    intent?: GetStructureBlueprintsIntent,
  ): Promise<CommandResult<StructureBlueprint[]>>;
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
}

export interface PlantIntentAPI {
  addPlanting(intent: AddPlantingIntent): Promise<CommandResult>;
  cullPlanting(intent: CullPlantingIntent): Promise<CommandResult>;
  harvestPlanting(intent: HarvestPlantingIntent): Promise<CommandResult>;
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

interface TimeCommandRegistry {
  start: CommandRegistration<TimeStartIntent, TimeStatus>;
  pause: CommandRegistration<z.infer<typeof emptyObjectSchema>, TimeStatus>;
  resume: CommandRegistration<z.infer<typeof emptyObjectSchema>, TimeStatus>;
  step: CommandRegistration<TimeStepIntent, TimeStatus>;
  setSpeed: CommandRegistration<SetSpeedIntent, TimeStatus>;
}

interface WorldCommandRegistry {
  rentStructure: CommandRegistration<RentStructureIntent, DuplicateStructureResult>;
  getStructureBlueprints: CommandRegistration<GetStructureBlueprintsIntent, StructureBlueprint[]>;
  createRoom: CommandRegistration<CreateRoomIntent>;
  updateRoom: CommandRegistration<UpdateRoomIntent>;
  deleteRoom: CommandRegistration<DeleteRoomIntent>;
  createZone: CommandRegistration<CreateZoneIntent>;
  updateZone: CommandRegistration<UpdateZoneIntent>;
  deleteZone: CommandRegistration<DeleteZoneIntent>;
  renameStructure: CommandRegistration<RenameStructureIntent>;
  deleteStructure: CommandRegistration<DeleteStructureIntent>;
  resetSession: CommandRegistration<ResetSessionIntent, DuplicateStructureResult>;
  newGame: CommandRegistration<NewGameIntent>;
  duplicateStructure: CommandRegistration<DuplicateStructureIntent, DuplicateStructureResult>;
  duplicateRoom: CommandRegistration<DuplicateRoomIntent, DuplicateRoomResult>;
  duplicateZone: CommandRegistration<DuplicateZoneIntent, DuplicateZoneResult>;
}

interface DeviceCommandRegistry {
  installDevice: CommandRegistration<InstallDeviceIntent>;
  updateDevice: CommandRegistration<UpdateDeviceIntent>;
  moveDevice: CommandRegistration<MoveDeviceIntent>;
  removeDevice: CommandRegistration<RemoveDeviceIntent>;
  toggleDeviceGroup: CommandRegistration<ToggleDeviceGroupIntent, DeviceGroupToggleResult>;
}

interface PlantCommandRegistry {
  addPlanting: CommandRegistration<AddPlantingIntent>;
  cullPlanting: CommandRegistration<CullPlantingIntent>;
  harvestPlanting: CommandRegistration<HarvestPlantingIntent>;
  applyIrrigation: CommandRegistration<ApplyIrrigationIntent>;
  applyFertilizer: CommandRegistration<ApplyFertilizerIntent>;
  togglePlantingPlan: CommandRegistration<TogglePlantingPlanIntent, PlantingPlanToggleResult>;
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

interface ConfigCommandRegistry {
  getDifficultyConfig: CommandRegistration<GetDifficultyConfigIntent, DifficultyConfig>;
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

  private readonly domainRegistrations = new Map<
    string,
    Record<string, CommandRegistration<unknown, unknown>>
  >();

  private readonly domainHandlers = new Map<
    string,
    Record<string, (payload?: unknown) => Promise<CommandResult<unknown>>>
  >();

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

    this.timeCommands = this.buildTimeCommands();
    const worldCommands = this.buildWorldCommands();
    const deviceCommands = this.buildDeviceCommands();
    const plantCommands = this.buildPlantCommands();
    const healthCommands = this.buildHealthCommands();
    const workforceCommands = this.buildWorkforceCommands();
    const financeCommands = this.buildFinanceCommands();
    const configCommands = this.buildConfigCommands();

    this.time = {
      start: (intent?: TimeStartIntent) => this.executeCommand(this.timeCommands.start, intent),
      pause: () => this.executeCommand(this.timeCommands.pause, undefined),
      resume: () => this.executeCommand(this.timeCommands.resume, undefined),
      step: (intent?: TimeStepIntent) => this.executeCommand(this.timeCommands.step, intent),
      setSpeed: (intent: SetSpeedIntent) => this.executeCommand(this.timeCommands.setSpeed, intent),
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
    const { context, flush } = this.createCommandContext(command);
    try {
      if (!Number.isFinite(rawValue)) {
        return this.createFailure('ERR_VALIDATION', 'Setpoint value must be finite.', command);
      }

      const lookup = findZone(this.state, zoneId);
      if (!lookup) {
        return this.createFailure('ERR_INVALID_STATE', `Zone ${zoneId} is not available.`, command);
      }

      const { zone } = lookup;
      const warnings: string[] = [];
      const control = this.ensureZoneControl(zone);
      let effectiveValue = rawValue;
      let effectiveHumidity: number | undefined;

      switch (metric) {
        case 'temperature': {
          const devices = this.filterZoneDevices(zone, TEMPERATURE_DEVICE_KINDS);
          if (devices.length === 0) {
            return this.createFailure(
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
          const devices = this.filterZoneDevices(zone, HUMIDITY_DEVICE_KINDS);
          if (devices.length === 0) {
            return this.createFailure(
              'ERR_INVALID_STATE',
              `Zone ${zoneId} does not support humidity control.`,
              command,
            );
          }
          const humidity = this.sanitizeRelativeHumidity(rawValue, warnings);
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
          const devices = this.filterZoneDevices(zone, CO2_DEVICE_KINDS);
          if (devices.length === 0) {
            return this.createFailure(
              'ERR_INVALID_STATE',
              `Zone ${zoneId} does not support CO2 control.`,
              command,
            );
          }
          const target = this.sanitizeNonNegative(
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
          const devices = this.filterZoneDevices(zone, LIGHT_DEVICE_KINDS);
          if (devices.length === 0) {
            return this.createFailure(
              'ERR_INVALID_STATE',
              `Zone ${zoneId} does not have controllable lighting.`,
              command,
            );
          }
          const target = this.sanitizeNonNegative(
            rawValue,
            warnings,
            'PPFD setpoint was clamped to zero or greater.',
          );
          for (const device of devices) {
            const settings = device.settings;
            const previousPpfd = this.extractFiniteNumber(settings.ppfd);
            const previousPower = this.extractFiniteNumber(settings.power);
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
          const devices = this.filterZoneDevices(zone, HUMIDITY_DEVICE_KINDS);
          if (devices.length === 0) {
            return this.createFailure(
              'ERR_INVALID_STATE',
              `Zone ${zoneId} does not support humidity control.`,
              command,
            );
          }
          const vpd = this.sanitizeNonNegative(
            rawValue,
            warnings,
            'VPD setpoint was clamped to zero or greater.',
          );
          const referenceTemperature = this.resolveTemperatureForVpd(zone);
          const humidity = this.computeHumidityForVpd(referenceTemperature, vpd, warnings);
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
          return this.createFailure(
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
        warnings: this.normalizeWarnings(warnings),
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
      getStructureBlueprints: this.createServiceCommand(
        'world.getStructureBlueprints',
        getStructureBlueprintsSchema,
        () => this.services.world?.getStructureBlueprints,
      ),
      createRoom: this.createServiceCommand<CreateRoomIntent, CreateRoomResult>(
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
      createZone: this.createServiceCommand<CreateZoneIntent, CreateZoneResult>(
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
      renameStructure: this.createServiceCommand(
        'world.renameStructure',
        renameStructureSchema,
        () => this.services.world?.renameStructure,
      ),
      deleteStructure: this.createServiceCommand(
        'world.deleteStructure',
        deleteStructureSchema,
        () => this.services.world?.deleteStructure,
      ),
      resetSession: this.createServiceCommand<ResetSessionIntent, DuplicateStructureResult>(
        'world.resetSession',
        resetSessionSchema,
        () => this.services.world?.resetSession,
        (payload) => payload ?? {},
      ),
      newGame: this.createServiceCommand<NewGameIntent>(
        'world.newGame',
        newGameSchema,
        () => this.services.world?.newGame,
        (payload) => payload ?? {},
      ),
      duplicateStructure: this.createServiceCommand<
        DuplicateStructureIntent,
        DuplicateStructureResult
      >(
        'world.duplicateStructure',
        duplicateStructureSchema,
        () => this.services.world?.duplicateStructure,
      ),
      duplicateRoom: this.createServiceCommand<DuplicateRoomIntent, DuplicateRoomResult>(
        'world.duplicateRoom',
        duplicateRoomSchema,
        () => this.services.world?.duplicateRoom,
      ),
      duplicateZone: this.createServiceCommand<DuplicateZoneIntent, DuplicateZoneResult>(
        'world.duplicateZone',
        duplicateZoneSchema,
        () => this.services.world?.duplicateZone,
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
      toggleDeviceGroup: this.createServiceCommand<
        ToggleDeviceGroupIntent,
        DeviceGroupToggleResult
      >(
        'devices.toggleDeviceGroup',
        toggleDeviceGroupSchema,
        () => this.services.devices?.toggleDeviceGroup,
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
      togglePlantingPlan: this.createServiceCommand<
        TogglePlantingPlanIntent,
        PlantingPlanToggleResult
      >(
        'plants.togglePlantingPlan',
        togglePlantingPlanSchema,
        () => this.services.plants?.togglePlantingPlan,
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

  private buildConfigCommands(): ConfigCommandRegistry {
    return {
      getDifficultyConfig: this.createServiceCommand(
        'config.getDifficultyConfig',
        getDifficultyConfigSchema,
        () => this.services.config?.getDifficultyConfig,
        (payload) => payload ?? {},
      ),
    } satisfies ConfigCommandRegistry;
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
    context.events.queue('sim.resumed', status, context.tick, 'info');
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
    const sanitizedPayload = this.stripIntentMetadata(rawPayload);
    const input = registration.preprocess
      ? registration.preprocess(sanitizedPayload)
      : sanitizedPayload;
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

  private filterZoneDevices(zone: ZoneState, kinds: ReadonlySet<string>): ZoneState['devices'] {
    return zone.devices.filter((device) => kinds.has(device.kind));
  }

  private ensureZoneControl(zone: ZoneState): ZoneControlState {
    if (!zone.control) {
      zone.control = { setpoints: {} } as ZoneControlState;
    } else if (!zone.control.setpoints) {
      zone.control.setpoints = {};
    }
    return zone.control;
  }

  private stripIntentMetadata(payload: unknown): unknown {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return payload;
    }
    const rest = { ...(payload as Record<string, unknown>) };
    delete rest.requestId;
    return rest;
  }

  private sanitizeRelativeHumidity(value: number, warnings: string[]): number {
    const clamped = Math.min(Math.max(value, 0), 1);
    if (clamped !== value) {
      warnings.push('Relative humidity setpoint was clamped to the [0, 1] range.');
    }
    return clamped;
  }

  private sanitizeNonNegative(value: number, warnings: string[], message: string): number {
    const clamped = Math.max(value, 0);
    if (clamped !== value) {
      warnings.push(message);
    }
    return clamped;
  }

  private extractFiniteNumber(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return undefined;
    }
    return value;
  }

  private resolveTemperatureForVpd(zone: ZoneState): number {
    const controlTemperature = this.extractFiniteNumber(zone.control?.setpoints.temperature);
    if (controlTemperature !== undefined) {
      return controlTemperature;
    }
    const environmentTemperature = this.extractFiniteNumber(zone.environment.temperature);
    if (environmentTemperature !== undefined) {
      return environmentTemperature;
    }
    return 24;
  }

  private computeHumidityForVpd(temperature: number, vpd: number, warnings: string[]): number {
    const saturation = Math.max(saturationVaporPressure(temperature), Number.EPSILON);
    const humidity = 1 - vpd / saturation;
    const clamped = Math.min(Math.max(humidity, 0), 1);
    if (clamped !== humidity) {
      warnings.push('Derived humidity target was clamped to the [0, 1] range.');
    }
    return clamped;
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
    this.eventBus.emit('sim.schedulerError', { message }, this.state.clock.tick, 'error');
    if (this.externalSchedulerErrorHandler) {
      this.externalSchedulerErrorHandler(error);
    }
  }
}
