import { Observable, bufferTime, filter as rxFilter, map, merge, share } from 'rxjs';

import {
  EventBus,
  type EventBufferOptions,
  type EventCollector,
  type EventFilter,
  type EventLevel,
  type SimulationEvent,
} from '../backend/src/lib/eventBus.js';
import type { TickCompletedPayload } from '../backend/src/sim/loop.js';

const telemetryEventBus = new EventBus();

const DEFAULT_SIMULATION_BUFFER_MS = 120;
const DEFAULT_SIMULATION_MAX_BATCH_SIZE = 5;
const DEFAULT_DOMAIN_BUFFER_MS = 250;
const DEFAULT_DOMAIN_MAX_BATCH_SIZE = 25;
const DEFAULT_DOMAIN_EVENT_PATTERN =
  /^(plant|device|zone|market|finance|env|pest|disease|task|hr|world|health)\./;

export type UiDomainEvent = Pick<
  SimulationEvent,
  'type' | 'payload' | 'tick' | 'ts' | 'level' | 'tags'
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

export type UiStreamPacket<
  Snapshot extends { tick: number },
  TimeStatus,
  Event extends UiDomainEvent = UiDomainEvent,
> =
  | { channel: 'simulationUpdate'; payload: UiSimulationUpdateMessage<Snapshot, TimeStatus, Event> }
  | { channel: 'sim.tickCompleted'; payload: UiSimulationTickEvent<Event> }
  | { channel: 'domainEvents'; payload: UiDomainEventsMessage<Event> }
  | { channel: string; payload: unknown };

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
  type: event.type,
  payload: event.payload,
  tick: event.tick,
  ts: event.ts ?? Date.now(),
  level: event.level,
  tags: event.tags ? [...event.tags] : undefined,
});

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
        }) as const,
    ),
  );

  const tickEvents$ = ticks$.pipe(
    map(
      (processed) =>
        ({
          channel: 'sim.tickCompleted',
          payload: processed.tickEvent satisfies UiSimulationTickEvent,
        }) as const,
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
        }) as const,
    ),
  );

  const domainFanout$ = domainEventsSource$.pipe(
    map((event) => ({ channel: event.type, payload: event.payload ?? null }) as const),
  );

  return merge(simulationUpdates$, tickEvents$, domainBatches$, domainFanout$).pipe(
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

export { EventBus, createEventCollector } from '../backend/src/lib/eventBus.js';
