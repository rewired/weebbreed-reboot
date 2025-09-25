import { Observable, Subject, bufferTime, filter as rxFilter, share } from 'rxjs';
import type { OperatorFunction } from 'rxjs';
import type { Level } from 'pino';

import { ensureSimulationEventId } from './eventIdentity.js';
import { logger } from './logger.js';

type MaybeArray<T> = T | T[];

export type EventLevel = 'debug' | 'info' | 'warning' | 'error';

export interface SimulationEvent<T = unknown> {
  id?: string;
  type: string;
  payload?: T;
  tick?: number;
  ts?: number;
  level?: EventLevel;
  tags?: string[];
}

export type EventFilterPredicate = (event: SimulationEvent) => boolean;

export interface EventFilterObject {
  type?: MaybeArray<string | RegExp>;
  level?: MaybeArray<EventLevel>;
  predicate?: EventFilterPredicate;
}

export type EventFilter = string | RegExp | EventFilterPredicate | EventFilterObject;

export interface EventBufferOptions {
  timeMs?: number;
  maxBufferSize?: number;
  filter?: EventFilter;
}

export type EventQueueFunction = {
  <T>(event: SimulationEvent<T>): void;
  <T>(type: SimulationEvent<T>['type'], payload?: T, tick?: number, level?: EventLevel): void;
};

export interface EventCollector {
  readonly size: number;
  queue: EventQueueFunction;
  queueMany(events: Iterable<SimulationEvent>): void;
}

const eventBusLogger = logger.child({ component: 'eventBus' });

const levelMapping: Record<EventLevel | 'info', Level> = {
  debug: 'debug',
  info: 'info',
  warning: 'warn',
  error: 'error',
};

const logSimulationEvent = (event: SimulationEvent): void => {
  const severity = event.level ?? 'info';
  const level = levelMapping[severity] ?? 'info';

  if (!eventBusLogger.isLevelEnabled(level)) {
    return;
  }

  const payloadShouldBeLogged =
    event.payload !== undefined && (level === 'debug' || level === 'warn' || level === 'error');
  const logContext: Record<string, unknown> = {
    eventType: event.type,
    tick: event.tick ?? null,
    severity,
    ts: event.ts,
  };

  if (event.tags?.length) {
    logContext.tags = event.tags;
  }

  if (payloadShouldBeLogged) {
    logContext.payload = event.payload;
  }

  eventBusLogger[level](logContext, 'Telemetry event emitted');
};

const STAR_PLACEHOLDER = '__WB_STAR__';

const wildcardToRegExp = (pattern: string): RegExp => {
  const withPlaceholder = pattern.replace(/\*/g, STAR_PLACEHOLDER);
  const escaped = withPlaceholder.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const source = escaped.replace(new RegExp(STAR_PLACEHOLDER, 'g'), '.*');
  return new RegExp(`^${source}$`);
};

const asRegExp = (pattern: string | RegExp): RegExp => {
  if (pattern instanceof RegExp) {
    return pattern;
  }
  if (pattern.includes('*')) {
    return wildcardToRegExp(pattern);
  }
  return new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
};

const normaliseArray = <T>(value: MaybeArray<T> | undefined): T[] => {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const createFilterPredicate = (filter?: EventFilter): EventFilterPredicate => {
  if (!filter) {
    return () => true;
  }

  if (typeof filter === 'function') {
    return filter;
  }

  if (typeof filter === 'string' || filter instanceof RegExp) {
    const matcher = asRegExp(filter);
    return (event) => matcher.test(event.type);
  }

  const types = normaliseArray(filter.type).map(asRegExp);
  const levels = normaliseArray(filter.level);
  const predicate = filter.predicate ?? (() => true);

  return (event) => {
    const matchesType = types.length === 0 || types.some((matcher) => matcher.test(event.type));
    if (!matchesType) {
      return false;
    }
    const matchesLevel =
      levels.length === 0 || (event.level ? levels.includes(event.level) : false);
    if (!matchesLevel) {
      return false;
    }
    return predicate(event);
  };
};

export class EventBus {
  private readonly subject = new Subject<SimulationEvent>();

  private readonly broadcast$ = this.subject
    .asObservable()
    .pipe(share({ resetOnError: false, resetOnComplete: false, resetOnRefCountZero: false }));

  private nextSequence = 0;

  emit<T>(event: SimulationEvent<T>): void;
  emit<T>(type: SimulationEvent<T>['type'], payload?: T, tick?: number, level?: EventLevel): void;
  emit<T>(
    eventOrType: SimulationEvent<T> | SimulationEvent<T>['type'],
    payload?: T,
    tick?: number,
    level?: EventLevel,
  ): void {
    if (typeof eventOrType === 'string') {
      const event: SimulationEvent<T> = { type: eventOrType, payload };
      if (tick !== undefined) {
        event.tick = tick;
      }
      if (level !== undefined) {
        event.level = level;
      }
      this.emit(event);
      return;
    }

    const enriched: SimulationEvent = ensureSimulationEventId(eventOrType, {
      sequence: this.nextSequence++,
      tick: eventOrType.tick,
    });
    if (!enriched.ts) {
      enriched.ts = Date.now();
    }
    logSimulationEvent(enriched);
    this.subject.next(enriched);
  }

  emitMany(events: Iterable<SimulationEvent>): void {
    for (const event of events) {
      this.emit(event);
    }
  }

  events(filter?: EventFilter): Observable<SimulationEvent> {
    const predicate = createFilterPredicate(filter);
    return this.broadcast$.pipe(rxFilter(predicate));
  }

  buffered(options?: EventBufferOptions): Observable<SimulationEvent[]> {
    const { timeMs = 250, maxBufferSize, filter } = options ?? {};
    const stream = this.events(filter);
    const bufferOperator: OperatorFunction<SimulationEvent, SimulationEvent[]> =
      typeof maxBufferSize === 'number'
        ? bufferTime<SimulationEvent>(timeMs, undefined, maxBufferSize)
        : bufferTime<SimulationEvent>(timeMs);

    return stream.pipe(
      bufferOperator,
      rxFilter((batch) => batch.length > 0),
    );
  }

  asObservable(): Observable<SimulationEvent> {
    return this.broadcast$;
  }

  complete(): void {
    this.subject.complete();
  }
}

export const createEventCollector = (buffer: SimulationEvent[], tick: number): EventCollector => {
  let sequence = 0;
  const queue: EventQueueFunction = ((
    eventOrType: SimulationEvent | SimulationEvent['type'],
    payload?: unknown,
    overrideTick?: number,
    level?: EventLevel,
  ) => {
    const currentSequence = sequence++;
    if (typeof eventOrType === 'string') {
      const resolvedTick = overrideTick ?? tick;
      const baseEvent: SimulationEvent = {
        type: eventOrType,
        payload,
        tick: resolvedTick,
      };
      if (level !== undefined) {
        baseEvent.level = level;
      }
      const event = ensureSimulationEventId(baseEvent, {
        tick: resolvedTick,
        sequence: currentSequence,
      });
      buffer.push(event);
      return;
    }

    const resolvedTick = eventOrType.tick ?? tick;
    const enriched = ensureSimulationEventId(
      { ...eventOrType, tick: resolvedTick },
      { tick: resolvedTick, sequence: currentSequence },
    );
    buffer.push(enriched);
  }) as EventQueueFunction;

  return {
    get size() {
      return buffer.length;
    },
    queue,
    queueMany: (events: Iterable<SimulationEvent>) => {
      for (const event of events) {
        queue(event);
      }
    },
  };
};
