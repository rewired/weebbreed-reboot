import { Observable, bufferTime, filter as rxFilter, map, merge, share, tap } from 'rxjs';

import {
  EventBus,
  type EventBufferOptions,
  type EventCollector,
  type EventFilter,
  type EventLevel,
  type SimulationEvent,
} from './eventBusCore.js';
import { logger } from './logger.js';
import type { TickCompletedPayload } from '../backend/src/sim/loop.js';

const telemetryEventBus = new EventBus();

const DEFAULT_SIMULATION_BUFFER_MS = 120;
const DEFAULT_SIMULATION_MAX_BATCH_SIZE = 5;
const DEFAULT_DOMAIN_BUFFER_MS = 250;
const DEFAULT_DOMAIN_MAX_BATCH_SIZE = 25;
const DEFAULT_DOMAIN_EVENT_PATTERN =
  /^(plant|device|zone|market|finance|env|pest|disease|task|hr|world|health)\./;

type DomainEventNamespace =
  | 'plant'
  | 'device'
  | 'zone'
  | 'market'
  | 'finance'
  | 'env'
  | 'pest'
  | 'disease'
  | 'task'
  | 'hr'
  | 'world'
  | 'health';

export type DomainEventChannel = `${DomainEventNamespace}.${string}`;

export type UiDomainEvent = Pick<
  SimulationEvent,
  'id' | 'type' | 'payload' | 'tick' | 'ts' | 'level' | 'tags'
>;

export interface UiSimulationUpdateEntry<
  Snapshot extends { tick: number },
  TimeStatus,
  Event extends UiDomainEvent = UiDomainEvent,
> {
  tick: number;
  ts: number;
  durationMs?: number;
  phaseTimings?: TickCompletedPayload['phaseTimings'];
  events: Event[];
  snapshot: Snapshot;
  time: TimeStatus;
}

export interface UiSimulationUpdateMessage<
  Snapshot extends { tick: number },
  TimeStatus,
  Event extends UiDomainEvent = UiDomainEvent,
> {
  updates: UiSimulationUpdateEntry<Snapshot, TimeStatus, Event>[];
}

export interface UiSimulationTickEvent<Event extends UiDomainEvent = UiDomainEvent> {
  tick: number;
  ts: number;
  durationMs?: number;
  eventCount?: number;
  phaseTimings?: TickCompletedPayload['phaseTimings'];
  events: Event[];
}

export interface UiDomainEventsMessage<Event extends UiDomainEvent = UiDomainEvent> {
  events: Event[];
}

export type UiSimulationUpdatePacket<Snapshot extends { tick: number }, TimeStatus> = {
  channel: 'simulationUpdate';
  payload: UiSimulationUpdateMessage<Snapshot, TimeStatus>;
};

export type UiSimulationTickPacket<Event extends UiDomainEvent = UiDomainEvent> = {
  channel: 'sim.tickCompleted';
  payload: UiSimulationTickEvent<Event>;
};

export type UiDomainEventsPacket<Event extends UiDomainEvent = UiDomainEvent> = {
  channel: 'domainEvents';
  payload: UiDomainEventsMessage<Event>;
};

export type UiDomainFanoutPacket<Event extends UiDomainEvent = UiDomainEvent> = {
  channel: DomainEventChannel;
  payload: Event['payload'] | null;
};

export type UiStreamPacket<
  Snapshot extends { tick: number },
  TimeStatus,
  Event extends UiDomainEvent = UiDomainEvent,
> =
  | UiSimulationUpdatePacket<Snapshot, TimeStatus>
  | UiSimulationTickPacket<Event>
  | UiDomainEventsPacket<Event>
  | UiDomainFanoutPacket<Event>;

type UiStreamKnownChannel = 'simulationUpdate' | 'sim.tickCompleted' | 'domainEvents';

const isUiStreamPacketOfChannel = <
  Snapshot extends { tick: number },
  TimeStatus,
  Event extends UiDomainEvent,
  Channel extends UiStreamKnownChannel,
>(
  packet: UiStreamPacket<Snapshot, TimeStatus, Event>,
  channel: Channel,
): packet is Extract<UiStreamPacket<Snapshot, TimeStatus, Event>, { channel: Channel }> =>
  packet.channel === channel;

export interface UiStreamOptions<Snapshot extends { tick: number }, TimeStatus> {
  snapshotProvider: () => Snapshot;
  timeStatusProvider: () => TimeStatus;
  eventBus?: EventBus;
  domainFilter?: EventFilter;
  simulationBufferMs?: number;
  simulationMaxBatchSize?: number;
  domainBufferMs?: number;
  domainMaxBatchSize?: number;
}

const sanitizeEventForUi = (event: SimulationEvent): UiDomainEvent => ({
  id: event.id,
  type: event.type,
  payload: event.payload,
  tick: event.tick,
  ts: event.ts ?? Date.now(),
  level: event.level,
  tags: event.tags ? [...event.tags] : undefined,
});

const telemetryLogger = logger.child({ component: 'runtime.telemetry' });

const logUiStreamPacket = <
  Snapshot extends { tick: number },
  TimeStatus,
  Event extends UiDomainEvent = UiDomainEvent,
>(
  packet: UiStreamPacket<Snapshot, TimeStatus, Event>,
): void => {
  if (!telemetryLogger.isLevelEnabled('debug')) {
    return;
  }

  const context: Record<string, unknown> = { channel: packet.channel };

  if (isUiStreamPacketOfChannel(packet, 'simulationUpdate')) {
    context.batchSize = packet.payload.updates.length;
    context.latestTick = packet.payload.updates.at(-1)?.tick;
  } else if (isUiStreamPacketOfChannel(packet, 'sim.tickCompleted')) {
    context.tick = packet.payload.tick;
    context.eventCount = packet.payload.events.length;
  } else if (isUiStreamPacketOfChannel(packet, 'domainEvents')) {
    context.batchSize = packet.payload.events.length;
  } else {
    const { payload } = packet;
    if (payload === null) {
      context.payload = null;
    } else if (payload === undefined) {
      context.payload = undefined;
    } else if (typeof payload === 'object') {
      context.payloadKeys = Object.keys(payload as Record<string, unknown>);
    } else {
      context.payload = payload;
    }
  }

  telemetryLogger.debug(context, 'UI stream packet dispatched');
};

interface ProcessedTick<Snapshot extends { tick: number }, TimeStatus> {
  update: UiSimulationUpdateEntry<Snapshot, TimeStatus>;
  tickEvent: UiSimulationTickEvent;
}

const toProcessedTick = <Snapshot extends { tick: number }, TimeStatus>(
  event: SimulationEvent<TickCompletedPayload>,
  snapshotProvider: () => Snapshot,
  timeStatusProvider: () => TimeStatus,
): ProcessedTick<Snapshot, TimeStatus> => {
  const snapshot = snapshotProvider();
  const timeStatus = timeStatusProvider();
  const sanitizedEvents = Array.isArray(event.payload?.events)
    ? event.payload.events.map(sanitizeEventForUi)
    : [];

  const tick = event.tick ?? event.payload?.tick ?? snapshot.tick;
  const ts = event.ts ?? Date.now();
  const durationMs = event.payload?.durationMs;
  const phaseTimings = event.payload?.phaseTimings;
  const eventCount = event.payload?.eventCount ?? sanitizedEvents.length;

  return {
    update: {
      tick,
      ts,
      durationMs,
      phaseTimings,
      events: sanitizedEvents,
      snapshot,
      time: timeStatus,
    },
    tickEvent: {
      tick,
      ts,
      durationMs,
      eventCount,
      phaseTimings,
      events: sanitizedEvents,
    },
  };
};

export const createUiStream = <Snapshot extends { tick: number }, TimeStatus>(
  options: UiStreamOptions<Snapshot, TimeStatus>,
): Observable<UiStreamPacket<Snapshot, TimeStatus>> => {
  const eventSource = options.eventBus ?? telemetryEventBus;
  const domainFilter = options.domainFilter ?? {
    predicate: (event: SimulationEvent) => DEFAULT_DOMAIN_EVENT_PATTERN.test(event.type),
  };

  const simulationBufferMs = options.simulationBufferMs ?? DEFAULT_SIMULATION_BUFFER_MS;
  const simulationMaxBatchSize =
    options.simulationMaxBatchSize ?? DEFAULT_SIMULATION_MAX_BATCH_SIZE;
  const domainBufferMs = options.domainBufferMs ?? DEFAULT_DOMAIN_BUFFER_MS;
  const domainMaxBatchSize = options.domainMaxBatchSize ?? DEFAULT_DOMAIN_MAX_BATCH_SIZE;

  const ticks$ = eventSource.events('sim.tickCompleted').pipe(
    map((event) =>
      toProcessedTick(
        event as SimulationEvent<TickCompletedPayload>,
        options.snapshotProvider,
        options.timeStatusProvider,
      ),
    ),
    share({ resetOnError: false, resetOnComplete: false, resetOnRefCountZero: false }),
  );

  const simulationUpdates$ = ticks$.pipe(
    map((processed) => processed.update),
    bufferTime(simulationBufferMs, undefined, simulationMaxBatchSize),
    rxFilter((batch) => batch.length > 0),
    map(
      (updates) =>
        ({
          channel: 'simulationUpdate',
          payload: { updates } satisfies UiSimulationUpdateMessage<Snapshot, TimeStatus>,
        }) satisfies UiSimulationUpdatePacket<Snapshot, TimeStatus>,
    ),
  );

  const tickEvents$ = ticks$.pipe(
    map(
      (processed) =>
        ({
          channel: 'sim.tickCompleted',
          payload: processed.tickEvent satisfies UiSimulationTickEvent,
        }) satisfies UiSimulationTickPacket,
    ),
  );

  const domainEventsSource$ = eventSource
    .events(domainFilter)
    .pipe(
      map(sanitizeEventForUi),
      share({ resetOnError: false, resetOnComplete: false, resetOnRefCountZero: false }),
    );

  const domainBatches$ = domainEventsSource$.pipe(
    bufferTime(domainBufferMs, undefined, domainMaxBatchSize),
    rxFilter((batch) => batch.length > 0),
    map(
      (events) =>
        ({
          channel: 'domainEvents',
          payload: { events } satisfies UiDomainEventsMessage,
        }) satisfies UiDomainEventsPacket,
    ),
  );

  const domainFanout$ = domainEventsSource$.pipe(
    map(
      (event) =>
        ({
          channel: event.type as DomainEventChannel,
          payload: event.payload ?? null,
        }) satisfies UiDomainFanoutPacket,
    ),
  );

  return merge(simulationUpdates$, tickEvents$, domainBatches$, domainFanout$).pipe(
    tap((packet) => logUiStreamPacket(packet)),
    share({ resetOnError: false, resetOnComplete: false, resetOnRefCountZero: false }),
  );
};

const emitInternal = <T>(event: SimulationEvent<T>): void => {
  telemetryEventBus.emit(event);
};

export const emit = <T>(
  type: SimulationEvent<T>['type'],
  payload?: T,
  tick?: number,
  level?: EventLevel,
): void => {
  const event: SimulationEvent<T> = {
    type,
    payload,
  };

  if (tick !== undefined) {
    event.tick = tick;
  }

  if (level !== undefined) {
    event.level = level;
  }

  emitInternal(event);
};

export const emitEvent = <T>(event: SimulationEvent<T>): void => {
  emitInternal(event);
};

export const emitMany = (events: Iterable<SimulationEvent>): void => {
  telemetryEventBus.emitMany(events);
};

export const events = (filter?: EventFilter) => telemetryEventBus.events(filter);

export const bufferedEvents = (options?: EventBufferOptions) => telemetryEventBus.buffered(options);

export const events$ = telemetryEventBus.asObservable();

export { telemetryEventBus as eventBus };

export type { EventBufferOptions, EventCollector, EventFilter, EventLevel, SimulationEvent };

export { EventBus, createEventCollector } from './eventBusCore.js';
