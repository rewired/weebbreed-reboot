import type { Server as HttpServer } from 'node:http';
import { Server as IOServer, type ServerOptions as IOServerOptions, type Socket } from 'socket.io';
import { z, type ZodError } from 'zod';
import { requireRoomPurpose, type RoomPurposeSource } from '../../engine/roomPurposes/index.js';
import type {
  CommandError,
  CommandResult,
  EventFilter,
  SimulationFacade,
  TimeStartIntent,
  TimeStatus,
  TimeStepIntent,
  SetSpeedIntent,
  Unsubscribe,
} from '../facade/index.js';
import type { SimulationEvent } from '../../runtime/eventBus.js';
import type { TickCompletedPayload } from '../src/sim/loop.js';
import type {
  ApplicantState,
  DeviceInstanceState,
  EmployeeState,
  GameState,
  PlantState,
  StructureState,
  ZoneEnvironmentState,
  ZoneMetricState,
  ZoneResourceState,
} from '../src/state/models.js';

const DEFAULT_SIMULATION_BATCH_INTERVAL_MS = 120;
const DEFAULT_SIMULATION_BATCH_MAX_SIZE = 5;
const DEFAULT_DOMAIN_BATCH_INTERVAL_MS = 250;
const DEFAULT_DOMAIN_BATCH_MAX_SIZE = 25;

const DOMAIN_EVENT_PATTERN =
  /^(plant|device|zone|market|finance|env|pest|disease|task|hr|world|health)\./;

interface SimulationControlPlay {
  action: 'play';
  gameSpeed?: number;
  maxTicksPerFrame?: number;
}

interface SimulationControlPause {
  action: 'pause';
}

interface SimulationControlResume {
  action: 'resume';
}

interface SimulationControlStep {
  action: 'step';
  ticks?: number;
}

interface SimulationControlFastForward {
  action: 'fastForward';
  multiplier: number;
}

type SimulationControlCommand =
  | SimulationControlPlay
  | SimulationControlPause
  | SimulationControlResume
  | SimulationControlStep
  | SimulationControlFastForward;

interface TickLengthConfig {
  type: 'tickLength';
  minutes: number;
}

interface SetpointConfig {
  type: 'setpoint';
  zoneId: string;
  metric: 'temperature' | 'relativeHumidity' | 'co2' | 'ppfd' | 'vpd';
  value: number;
}

type ConfigUpdateCommand = TickLengthConfig | SetpointConfig;

interface CommandResponse<T> extends CommandResult<T> {
  requestId?: string;
}

interface SimulationEventEnvelope<T = unknown> {
  event: SimulationEvent<T>;
  snapshot: SimulationSnapshot;
}

interface StructureSnapshot {
  id: string;
  name: string;
  status: StructureState['status'];
  footprint: StructureState['footprint'];
  rentPerTick: number;
  roomIds: string[];
}

interface RoomSnapshot {
  id: string;
  name: string;
  structureId: string;
  structureName: string;
  purposeId: string;
  purposeKind: string;
  purposeName: string;
  purposeFlags?: Record<string, boolean>;
  area: number;
  height: number;
  volume: number;
  cleanliness: number;
  maintenanceLevel: number;
  zoneIds: string[];
}

interface DeviceSnapshot {
  id: string;
  blueprintId: string;
  kind: string;
  name: string;
  zoneId: string;
  status: DeviceInstanceState['status'];
  efficiency: number;
  runtimeHours: number;
  maintenance: DeviceInstanceState['maintenance'];
  settings: Record<string, unknown>;
}

interface ZoneHealthSnapshot {
  diseases: number;
  pests: number;
  pendingTreatments: number;
  appliedTreatments: number;
  reentryRestrictedUntilTick?: number;
  preHarvestRestrictedUntilTick?: number;
}

interface ZoneSnapshot {
  id: string;
  name: string;
  structureId: string;
  structureName: string;
  roomId: string;
  roomName: string;
  environment: ZoneEnvironmentState;
  resources: ZoneResourceState;
  metrics: ZoneMetricState;
  devices: DeviceSnapshot[];
  plants: PlantSnapshot[];
  health: ZoneHealthSnapshot;
}

interface PlantSnapshot {
  id: string;
  strainId: string;
  stage: PlantState['stage'];
  health: number;
  stress: number;
  biomassDryGrams: number;
  yieldDryGrams: number;
}

interface EmployeeSnapshot {
  id: string;
  name: string;
  role: EmployeeState['role'];
  salaryPerTick: number;
  morale: number;
  energy: number;
  status: EmployeeState['status'];
  assignedStructureId?: string;
}

interface ApplicantSnapshot {
  id: string;
  name: string;
  desiredRole: ApplicantState['desiredRole'];
  expectedSalary: number;
}

interface PersonnelSnapshot {
  employees: EmployeeSnapshot[];
  applicants: ApplicantSnapshot[];
  overallMorale: number;
}

interface FinanceSummarySnapshot {
  cashOnHand: number;
  reservedCash: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  lastTickRevenue: number;
  lastTickExpenses: number;
}

export interface SimulationSnapshot {
  tick: number;
  clock: {
    tick: number;
    isPaused: boolean;
    targetTickRate: number;
  };
  structures: StructureSnapshot[];
  rooms: RoomSnapshot[];
  zones: ZoneSnapshot[];
  personnel: PersonnelSnapshot;
  finance: FinanceSummarySnapshot;
}

interface SimulationUpdateEntry {
  tick: number;
  ts: number;
  durationMs?: number;
  phaseTimings?: TickCompletedPayload['phaseTimings'];
  events: SimulationEvent[];
  snapshot: SimulationSnapshot;
  time: TimeStatus;
}

interface SimulationUpdateMessage {
  updates: SimulationUpdateEntry[];
}

interface DomainEventMessage {
  events: SimulationEvent[];
}

const requestMetadataSchema = z.object({
  requestId: z.string().trim().min(1).optional(),
});

const positiveNumberSchema = z
  .number({ invalid_type_error: 'Value must be a number.' })
  .refine((value) => Number.isFinite(value) && value > 0, {
    message: 'Value must be a finite number greater than zero.',
  });

const positiveIntegerSchema = z
  .number({ invalid_type_error: 'Value must be a number.' })
  .int({ message: 'Value must be an integer.' })
  .refine((value) => value > 0, { message: 'Value must be greater than zero.' });

const simulationControlSchema = requestMetadataSchema.and(
  z.discriminatedUnion('action', [
    z.object({
      action: z.literal('play'),
      gameSpeed: positiveNumberSchema.optional(),
      maxTicksPerFrame: positiveIntegerSchema.optional(),
    }),
    z.object({ action: z.literal('pause') }),
    z.object({ action: z.literal('resume') }),
    z.object({
      action: z.literal('step'),
      ticks: positiveIntegerSchema.optional(),
    }),
    z.object({
      action: z.literal('fastForward'),
      multiplier: positiveNumberSchema,
    }),
  ]),
);

const configUpdateSchema = requestMetadataSchema.and(
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('tickLength'),
      minutes: positiveNumberSchema,
    }),
    z.object({
      type: z.literal('setpoint'),
      zoneId: z.string().uuid({ message: 'zoneId must be a UUID.' }),
      metric: z.enum(['temperature', 'relativeHumidity', 'co2', 'ppfd', 'vpd']),
      value: z.number({ invalid_type_error: 'Value must be a number.' }),
    }),
  ]),
);

type FacadeDomain = 'world' | 'devices' | 'plants' | 'health' | 'workforce' | 'finance';

interface FacadeIntentCommand {
  domain: FacadeDomain;
  action: string;
  payload?: unknown;
  requestId?: string;
}

const FACADE_DOMAINS: readonly FacadeDomain[] = [
  'world',
  'devices',
  'plants',
  'health',
  'workforce',
  'finance',
] as const;

const isFacadeDomain = (value: unknown): value is FacadeDomain =>
  typeof value === 'string' && (FACADE_DOMAINS as readonly string[]).includes(value);

export interface SocketGatewayOptions {
  httpServer: HttpServer;
  facade: SimulationFacade;
  serverOptions?: Partial<IOServerOptions>;
  simulationBatchIntervalMs?: number;
  simulationBatchMaxSize?: number;
  domainBatchIntervalMs?: number;
  domainBatchMaxSize?: number;
  roomPurposeSource: RoomPurposeSource;
}

type AckCallback<T> = (response: CommandResponse<T>) => void;

const sanitizeEvent = (event: SimulationEvent): SimulationEvent => ({
  type: event.type,
  payload: event.payload,
  tick: event.tick,
  ts: event.ts ?? Date.now(),
  level: event.level,
  tags: event.tags ? [...event.tags] : undefined,
});

const summarizeHealth = (
  zone: GameState['structures'][number]['rooms'][number]['zones'][number],
): ZoneHealthSnapshot => {
  const plantHealthEntries = Object.values(zone.health.plantHealth ?? {});
  const diseaseCount = plantHealthEntries.reduce(
    (accumulator, item) => accumulator + (item?.diseases?.length ?? 0),
    0,
  );
  const pestCount = plantHealthEntries.reduce(
    (accumulator, item) => accumulator + (item?.pests?.length ?? 0),
    0,
  );

  return {
    diseases: diseaseCount,
    pests: pestCount,
    pendingTreatments: zone.health.pendingTreatments.length,
    appliedTreatments: zone.health.appliedTreatments.length,
    reentryRestrictedUntilTick: zone.health.reentryRestrictedUntilTick,
    preHarvestRestrictedUntilTick: zone.health.preHarvestRestrictedUntilTick,
  };
};

const cloneResources = (resources: ZoneResourceState): ZoneResourceState => ({
  waterLiters: resources.waterLiters,
  nutrientSolutionLiters: resources.nutrientSolutionLiters,
  nutrientStrength: resources.nutrientStrength,
  substrateHealth: resources.substrateHealth,
  reservoirLevel: resources.reservoirLevel,
});

const buildSnapshot = (
  state: GameState,
  roomPurposeSource: RoomPurposeSource,
): SimulationSnapshot => {
  const structures: StructureSnapshot[] = [];
  const rooms: RoomSnapshot[] = [];
  const zones: ZoneSnapshot[] = [];

  for (const structure of state.structures) {
    const roomIds: string[] = [];

    for (const room of structure.rooms) {
      roomIds.push(room.id);
      const zoneIds: string[] = [];

      for (const zone of room.zones) {
        zoneIds.push(zone.id);
        zones.push({
          id: zone.id,
          name: zone.name,
          structureId: structure.id,
          structureName: structure.name,
          roomId: room.id,
          roomName: room.name,
          environment: { ...zone.environment },
          resources: cloneResources(zone.resources),
          metrics: { ...zone.metrics },
          devices: zone.devices.map((device) => ({
            id: device.id,
            blueprintId: device.blueprintId,
            kind: device.kind,
            name: device.name,
            zoneId: device.zoneId,
            status: device.status,
            efficiency: device.efficiency,
            runtimeHours: device.runtimeHours,
            maintenance: { ...device.maintenance },
            settings: { ...device.settings },
          })),
          plants: zone.plants.map((plant) => ({
            id: plant.id,
            strainId: plant.strainId,
            stage: plant.stage,
            health: plant.health,
            stress: plant.stress,
            biomassDryGrams: plant.biomassDryGrams,
            yieldDryGrams: plant.yieldDryGrams,
          })),
          health: summarizeHealth(zone),
        });
      }

      const purpose = requireRoomPurpose(roomPurposeSource, room.purposeId, { by: 'id' });

      rooms.push({
        id: room.id,
        name: room.name,
        structureId: structure.id,
        structureName: structure.name,
        purposeId: room.purposeId,
        purposeKind: purpose.kind,
        purposeName: purpose.name,
        purposeFlags: purpose.flags ? { ...purpose.flags } : undefined,
        area: room.area,
        height: room.height,
        volume: room.volume,
        cleanliness: room.cleanliness,
        maintenanceLevel: room.maintenanceLevel,
        zoneIds,
      });
    }

    structures.push({
      id: structure.id,
      name: structure.name,
      status: structure.status,
      footprint: { ...structure.footprint },
      rentPerTick: structure.rentPerTick,
      roomIds,
    });
  }

  const personnel: PersonnelSnapshot = {
    employees: state.personnel.employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      role: employee.role,
      salaryPerTick: employee.salaryPerTick,
      morale: employee.morale,
      energy: employee.energy,
      status: employee.status,
      assignedStructureId: employee.assignedStructureId,
    })),
    applicants: state.personnel.applicants.map((applicant) => ({
      id: applicant.id,
      name: applicant.name,
      desiredRole: applicant.desiredRole,
      expectedSalary: applicant.expectedSalary,
    })),
    overallMorale: state.personnel.overallMorale,
  };

  const finance: FinanceSummarySnapshot = {
    cashOnHand: state.finances.cashOnHand,
    reservedCash: state.finances.reservedCash,
    totalRevenue: state.finances.summary.totalRevenue,
    totalExpenses: state.finances.summary.totalExpenses,
    netIncome: state.finances.summary.netIncome,
    lastTickRevenue: state.finances.summary.lastTickRevenue,
    lastTickExpenses: state.finances.summary.lastTickExpenses,
  };

  return {
    tick: state.clock.tick,
    clock: {
      tick: state.clock.tick,
      isPaused: state.clock.isPaused,
      targetTickRate: state.clock.targetTickRate,
    },
    structures,
    rooms,
    zones,
    personnel,
    finance,
  };
};

export class SocketGateway {
  private readonly facade: SimulationFacade;

  private readonly io: IOServer;

  private readonly roomPurposeSource: RoomPurposeSource;

  private readonly simulationBatchInterval: number;

  private readonly simulationBatchMaxSize: number;

  private readonly domainBatchInterval: number;

  private readonly domainBatchMaxSize: number;

  private readonly simulationQueue: SimulationEventEnvelope<TickCompletedPayload>[] = [];

  private readonly domainQueue: SimulationEvent[] = [];

  private simulationFlushTimer: NodeJS.Timeout | null = null;

  private domainFlushTimer: NodeJS.Timeout | null = null;

  private readonly subscriptions: Unsubscribe[] = [];

  private disposed = false;

  constructor(options: SocketGatewayOptions) {
    this.facade = options.facade;
    this.roomPurposeSource = options.roomPurposeSource;
    this.simulationBatchInterval =
      options.simulationBatchIntervalMs ?? DEFAULT_SIMULATION_BATCH_INTERVAL_MS;
    this.simulationBatchMaxSize =
      options.simulationBatchMaxSize ?? DEFAULT_SIMULATION_BATCH_MAX_SIZE;
    this.domainBatchInterval = options.domainBatchIntervalMs ?? DEFAULT_DOMAIN_BATCH_INTERVAL_MS;
    this.domainBatchMaxSize = options.domainBatchMaxSize ?? DEFAULT_DOMAIN_BATCH_MAX_SIZE;

    this.io = new IOServer(options.httpServer, {
      cors: { origin: '*' },
      ...options.serverOptions,
    });

    this.io.on('connection', (socket) => this.handleConnection(socket));

    this.subscriptions.push(
      this.facade.subscribe('sim.tickCompleted', (event) =>
        this.queueSimulationEvent(event as SimulationEvent<TickCompletedPayload>),
      ),
    );

    const domainFilter: EventFilter = {
      predicate: (event) => DOMAIN_EVENT_PATTERN.test(event.type),
    };

    this.subscriptions.push(
      this.facade.subscribe(domainFilter, (event) => this.queueDomainEvent(event)),
    );
  }

  close(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    for (const unsubscribe of this.subscriptions.splice(0)) {
      unsubscribe();
    }
    if (this.simulationFlushTimer) {
      clearTimeout(this.simulationFlushTimer);
      this.simulationFlushTimer = null;
    }
    if (this.domainFlushTimer) {
      clearTimeout(this.domainFlushTimer);
      this.domainFlushTimer = null;
    }
    this.io.removeAllListeners();
    this.io.disconnectSockets(true);
    this.io.close();
  }

  private handleConnection(socket: Socket): void {
    const snapshot = this.facade.select((state) => buildSnapshot(state, this.roomPurposeSource));
    const time = this.facade.getTimeStatus();

    socket.emit('gateway.protocol', { version: 1 });
    socket.emit('time.status', { status: time });

    socket.emit('simulationUpdate', {
      updates: [
        {
          tick: snapshot.tick,
          ts: Date.now(),
          events: [],
          snapshot,
          time,
        } satisfies SimulationUpdateEntry,
      ],
    } satisfies SimulationUpdateMessage);

    socket.on('simulationControl', (payload, ack) =>
      this.handleSimulationControl(socket, payload, ack as AckCallback<TimeStatus> | undefined),
    );
    socket.on('config.update', (payload, ack) =>
      this.handleConfigUpdate(socket, payload, ack as AckCallback<TimeStatus> | undefined),
    );
    socket.on('facade.intent', (payload, ack) =>
      this.handleFacadeIntent(socket, payload, ack as AckCallback<unknown> | undefined),
    );
  }

  private queueSimulationEvent(event: SimulationEvent<TickCompletedPayload>): void {
    if (this.disposed) {
      return;
    }
    const snapshot = this.facade.select((state) => buildSnapshot(state, this.roomPurposeSource));
    this.simulationQueue.push({ event, snapshot });

    if (this.simulationQueue.length >= this.simulationBatchMaxSize) {
      this.flushSimulationQueue();
      return;
    }

    if (!this.simulationFlushTimer) {
      this.simulationFlushTimer = setTimeout(() => {
        this.simulationFlushTimer = null;
        this.flushSimulationQueue();
      }, this.simulationBatchInterval);
    }
  }

  private queueDomainEvent(event: SimulationEvent): void {
    if (this.disposed) {
      return;
    }
    this.domainQueue.push(event);

    if (this.domainQueue.length >= this.domainBatchMaxSize) {
      this.flushDomainQueue();
      return;
    }

    if (!this.domainFlushTimer) {
      this.domainFlushTimer = setTimeout(() => {
        this.domainFlushTimer = null;
        this.flushDomainQueue();
      }, this.domainBatchInterval);
    }
  }

  private flushSimulationQueue(): void {
    if (this.simulationQueue.length === 0) {
      return;
    }
    const entries = this.simulationQueue.splice(0);
    const timeStatus = this.facade.getTimeStatus();

    const updates: SimulationUpdateEntry[] = entries.map(({ event, snapshot }) => {
      const payload = event.payload;
      const events = Array.isArray(payload?.events) ? payload!.events.map(sanitizeEvent) : [];
      const update: SimulationUpdateEntry = {
        tick: event.tick ?? payload?.tick ?? snapshot.tick,
        ts: event.ts ?? Date.now(),
        durationMs: payload?.durationMs,
        phaseTimings: payload?.phaseTimings,
        events,
        snapshot,
        time: timeStatus,
      };
      return update;
    });

    this.io.emit('simulationUpdate', { updates } satisfies SimulationUpdateMessage);

    for (const { event } of entries) {
      this.io.emit('sim.tickCompleted', {
        tick: event.tick ?? event.payload?.tick,
        ts: event.ts ?? Date.now(),
        durationMs: event.payload?.durationMs,
        eventCount: event.payload?.eventCount ?? event.payload?.events?.length ?? updates.length,
        phaseTimings: event.payload?.phaseTimings,
        events: Array.isArray(event.payload?.events)
          ? event.payload!.events.map(sanitizeEvent)
          : [],
      });
    }
  }

  private flushDomainQueue(): void {
    if (this.domainQueue.length === 0) {
      return;
    }
    const events = this.domainQueue.splice(0).map(sanitizeEvent);
    this.io.emit('domainEvents', { events } satisfies DomainEventMessage);

    for (const event of events) {
      this.io.emit(event.type, event.payload ?? null);
    }
  }

  private async handleSimulationControl(
    socket: Socket,
    payload: unknown,
    ack?: AckCallback<TimeStatus>,
  ): Promise<void> {
    const requestId = this.extractRequestId(payload);
    const parsed = simulationControlSchema.safeParse(payload);

    if (!parsed.success) {
      const response = this.buildValidationResult(parsed.error, requestId);
      this.emitCommandResponse(socket, 'simulationControl.result', response, ack);
      return;
    }

    const { requestId: parsedRequestId, ...command } = parsed.data;
    let result: CommandResult<TimeStatus>;

    try {
      result = await this.executeSimulationControl(command);
    } catch (error) {
      result = this.buildInternalError('simulationControl', error);
    }

    this.emitCommandResponse(
      socket,
      'simulationControl.result',
      {
        requestId: parsedRequestId,
        ...result,
      },
      ack,
    );
  }

  private async handleConfigUpdate(
    socket: Socket,
    payload: unknown,
    ack?: AckCallback<TimeStatus>,
  ): Promise<void> {
    const requestId = this.extractRequestId(payload);
    const parsed = configUpdateSchema.safeParse(payload);

    if (!parsed.success) {
      const response = this.buildValidationResult(parsed.error, requestId);
      this.emitCommandResponse(socket, 'config.update.result', response, ack);
      return;
    }

    const { requestId: parsedRequestId, ...command } = parsed.data;
    let result: CommandResult<TimeStatus>;

    try {
      result = await this.executeConfigUpdate(command);
    } catch (error) {
      result = this.buildInternalError('config.update', error);
    }

    this.emitCommandResponse(
      socket,
      'config.update.result',
      {
        requestId: parsedRequestId,
        ...result,
      },
      ack,
    );
  }

  private async handleFacadeIntent(
    socket: Socket,
    payload: unknown,
    ack?: AckCallback<unknown>,
  ): Promise<void> {
    const requestId = this.extractRequestId(payload);

    if (typeof payload !== 'object' || payload === null) {
      const response = this.buildIntentValidationError(
        'Payload must be an object.',
        ['facade.intent'],
        requestId,
      );
      this.emitCommandResponse(socket, 'facade.intent.result', response, ack);
      return;
    }

    const command = payload as FacadeIntentCommand;
    if (!isFacadeDomain(command.domain)) {
      const response = this.buildIntentValidationError(
        `Unsupported intent domain: ${String((payload as FacadeIntentCommand).domain)}`,
        ['facade.intent', 'domain'],
        requestId,
      );
      this.emitCommandResponse(socket, 'facade.intent.result', response, ack);
      return;
    }

    if (typeof command.action !== 'string' || command.action.trim().length === 0) {
      const response = this.buildIntentValidationError(
        'Intent action must be a non-empty string.',
        ['facade.intent', 'action'],
        requestId,
      );
      this.emitCommandResponse(socket, 'facade.intent.result', response, ack);
      return;
    }

    const service = this.facade[command.domain];
    const handler = (service as Record<string, unknown>)[command.action];

    if (typeof handler !== 'function') {
      const response = this.buildIntentValidationError(
        `Unsupported action ${command.domain}.${command.action}.`,
        ['facade.intent', 'action'],
        requestId,
      );
      this.emitCommandResponse(socket, 'facade.intent.result', response, ack);
      return;
    }

    let result: CommandResult<unknown>;
    try {
      const execution = (
        handler as (intent?: unknown) => Promise<CommandResult<unknown>> | CommandResult<unknown>
      )(command.payload);
      result = await Promise.resolve(execution);
    } catch (error) {
      result = this.buildInternalError(`${command.domain}.${command.action}`, error);
    }

    this.emitCommandResponse(
      socket,
      `${command.domain}.intent.result`,
      {
        requestId,
        ...result,
      },
      ack,
    );
  }

  private async executeSimulationControl(
    command: SimulationControlCommand,
  ): Promise<CommandResult<TimeStatus>> {
    switch (command.action) {
      case 'play': {
        const intent: TimeStartIntent = {};
        if (command.gameSpeed !== undefined) {
          intent.gameSpeed = command.gameSpeed;
        }
        if (command.maxTicksPerFrame !== undefined) {
          intent.maxTicksPerFrame = command.maxTicksPerFrame;
        }
        const status = this.facade.getTimeStatus();
        if (!status.running) {
          return this.facade.start(intent);
        }
        if (status.paused) {
          return this.facade.resume();
        }
        return {
          ok: true,
          data: status,
          warnings: ['Simulation is already running.'],
        } satisfies CommandResult<TimeStatus>;
      }
      case 'pause':
        return this.facade.pause();
      case 'resume':
        return this.facade.resume();
      case 'step': {
        const intent: TimeStepIntent | undefined =
          command.ticks !== undefined ? { ticks: command.ticks } : undefined;
        return this.facade.step(intent);
      }
      case 'fastForward': {
        const intent: SetSpeedIntent = { multiplier: command.multiplier };
        return this.facade.setSpeed(intent);
      }
      default:
        return {
          ok: false,
          errors: [
            {
              code: 'ERR_INVALID_STATE',
              message: `Unsupported simulation control action: ${(command as SimulationControlCommand).action}`,
            },
          ],
        } satisfies CommandResult<TimeStatus>;
    }
  }

  private async executeConfigUpdate(
    command: ConfigUpdateCommand,
  ): Promise<CommandResult<TimeStatus>> {
    switch (command.type) {
      case 'tickLength':
        return this.facade.setTickLength(command.minutes);
      case 'setpoint':
        return {
          ok: false,
          errors: [
            {
              code: 'ERR_INVALID_STATE',
              message: 'Setpoint updates are not supported in the current build.',
              path: ['config.update', 'setpoint'],
            },
          ],
        } satisfies CommandResult<TimeStatus>;
      default:
        return {
          ok: false,
          errors: [
            {
              code: 'ERR_INVALID_STATE',
              message: `Unsupported config update type: ${(command as ConfigUpdateCommand).type}`,
            },
          ],
        } satisfies CommandResult<TimeStatus>;
    }
  }

  private buildValidationResult(error: ZodError, requestId?: string): CommandResponse<TimeStatus> {
    const issues: CommandError[] = error.issues.map((issue) => ({
      code: 'ERR_VALIDATION',
      message: issue.message,
      path: issue.path.map((segment) => String(segment)),
    }));
    return {
      ok: false,
      requestId,
      errors: issues,
    } satisfies CommandResponse<TimeStatus>;
  }

  private buildIntentValidationError(
    message: string,
    path: string[],
    requestId?: string,
  ): CommandResponse<unknown> {
    return {
      ok: false,
      requestId,
      errors: [
        {
          code: 'ERR_VALIDATION',
          message,
          path,
        },
      ],
    } satisfies CommandResponse<unknown>;
  }

  private buildInternalError<T>(command: string, error: unknown): CommandResult<T> {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      errors: [
        {
          code: 'ERR_INTERNAL',
          message,
          path: [command],
        },
      ],
    } satisfies CommandResult<T>;
  }

  private emitCommandResponse<T>(
    socket: Socket,
    channel: string,
    response: CommandResponse<T>,
    ack?: AckCallback<T>,
  ): void {
    if (ack) {
      ack(response);
    }
    socket.emit(channel, response);
  }

  private extractRequestId(payload: unknown): string | undefined {
    if (typeof payload !== 'object' || payload === null) {
      return undefined;
    }
    const candidate = (payload as { requestId?: unknown }).requestId;
    return typeof candidate === 'string' ? candidate : undefined;
  }
}
