import type { Server as HttpServer } from 'node:http';
import { Server as IOServer, type ServerOptions as IOServerOptions, type Socket } from 'socket.io';
import type { Observable, Subscription } from 'rxjs';
import { z, type ZodError } from 'zod';
import type { RoomPurposeSource } from '@/engine/roomPurposes/index.js';
import type {
  CommandError,
  CommandResult,
  SimulationFacade,
  TimeStartIntent,
  TimeStatus,
  TimeStepIntent,
  SetSpeedIntent,
} from '@/facade/index.js';
import {
  createUiStream,
  type EventBus,
  type UiSimulationUpdateEntry,
  type UiSimulationUpdateMessage,
  type UiStreamPacket,
} from '@runtime/eventBus.js';
import { buildSimulationSnapshot, type SimulationSnapshot } from '@/lib/uiSnapshot.js';
import { logger } from '@runtime/logger.js';

export type { SimulationSnapshot } from '@/lib/uiSnapshot.js';

const DEFAULT_SIMULATION_BATCH_INTERVAL_MS = 120;
const DEFAULT_SIMULATION_BATCH_MAX_SIZE = 5;
const DEFAULT_DOMAIN_BATCH_INTERVAL_MS = 250;
const DEFAULT_DOMAIN_BATCH_MAX_SIZE = 25;

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

export type SimulationUpdateEntry = UiSimulationUpdateEntry<SimulationSnapshot, TimeStatus>;

type SimulationUpdateMessage = UiSimulationUpdateMessage<SimulationSnapshot, TimeStatus>;

const gatewayLogger = logger.child({ component: 'backend.socketGateway' });

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

const zoneIdSchema = z
  .string({ invalid_type_error: 'zoneId must be a string.' })
  .trim()
  .min(1, { message: 'zoneId must be a non-empty string.' });

const configUpdateSchema = requestMetadataSchema.and(
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('tickLength'),
      minutes: positiveNumberSchema,
    }),
    z.object({
      type: z.literal('setpoint'),
      zoneId: zoneIdSchema,
      metric: z.enum(['temperature', 'relativeHumidity', 'co2', 'ppfd', 'vpd']),
      value: z.number({ invalid_type_error: 'Value must be a number.' }),
    }),
  ]),
);

interface FacadeIntentCommand {
  domain: string;
  action: string;
  payload?: unknown;
  requestId?: string;
}

export interface SocketGatewayOptions {
  httpServer: HttpServer;
  facade: SimulationFacade;
  serverOptions?: Partial<IOServerOptions>;
  simulationBatchIntervalMs?: number;
  simulationBatchMaxSize?: number;
  domainBatchIntervalMs?: number;
  domainBatchMaxSize?: number;
  roomPurposeSource: RoomPurposeSource;
  eventBus?: EventBus;
  uiStream$?: Observable<UiStreamPacket<SimulationSnapshot, TimeStatus>>;
}

type AckCallback<T> = (response: CommandResponse<T>) => void;

export class SocketGateway {
  private readonly facade: SimulationFacade;

  private readonly io: IOServer;

  private readonly roomPurposeSource: RoomPurposeSource;

  private readonly uiSubscription: Subscription;

  private disposed = false;

  constructor(options: SocketGatewayOptions) {
    this.facade = options.facade;
    this.roomPurposeSource = options.roomPurposeSource;

    const simulationBatchInterval =
      options.simulationBatchIntervalMs ?? DEFAULT_SIMULATION_BATCH_INTERVAL_MS;
    const simulationBatchMaxSize =
      options.simulationBatchMaxSize ?? DEFAULT_SIMULATION_BATCH_MAX_SIZE;
    const domainBatchInterval = options.domainBatchIntervalMs ?? DEFAULT_DOMAIN_BATCH_INTERVAL_MS;
    const domainBatchMaxSize = options.domainBatchMaxSize ?? DEFAULT_DOMAIN_BATCH_MAX_SIZE;

    this.io = new IOServer(options.httpServer, {
      cors: { origin: '*' },
      ...options.serverOptions,
    });

    this.io.on('connection', (socket) => this.handleConnection(socket));

    const uiStream: Observable<UiStreamPacket<SimulationSnapshot, TimeStatus>> =
      options.uiStream$ ??
      createUiStream<SimulationSnapshot, TimeStatus>({
        snapshotProvider: () =>
          this.facade.select((state) => buildSimulationSnapshot(state, this.roomPurposeSource)),
        timeStatusProvider: () => this.facade.getTimeStatus(),
        eventBus: options.eventBus,
        simulationBufferMs: simulationBatchInterval,
        simulationMaxBatchSize: simulationBatchMaxSize,
        domainBufferMs: domainBatchInterval,
        domainMaxBatchSize: domainBatchMaxSize,
      });

    this.uiSubscription = uiStream.subscribe({
      next: (packet) => this.forwardUiPacket(packet),
      error: (error) => {
        if (!this.disposed) {
          gatewayLogger.error({ err: error }, 'UI stream error.');
        }
      },
    });
  }

  close(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.uiSubscription.unsubscribe();
    this.io.removeAllListeners();
    this.io.disconnectSockets(true);
    this.io.close();
  }

  private handleConnection(socket: Socket): void {
    const snapshot = this.facade.select((state) =>
      buildSimulationSnapshot(state, this.roomPurposeSource),
    );
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

  private forwardUiPacket(packet: UiStreamPacket<SimulationSnapshot, TimeStatus>): void {
    if (this.disposed) {
      return;
    }
    if (packet.channel === 'simulationUpdate' || packet.channel === 'sim.tickCompleted') {
      this.io.emit(packet.channel, packet.payload);
      return;
    }
    if (packet.channel === 'domainEvents') {
      this.io.emit(packet.channel, packet.payload);
      return;
    }

    this.io.emit(packet.channel, packet.payload ?? null);
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
    if (!this.facade.hasIntentDomain(command.domain)) {
      const response = this.buildIntentValidationError(
        `Unsupported intent domain: ${String(command.domain)}`,
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

    const handler = this.facade.getIntentHandler(command.domain, command.action);

    if (!handler) {
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
      result = await handler(command.payload);
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
        return this.facade.setZoneSetpoint(command.zoneId, command.metric, command.value);
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
