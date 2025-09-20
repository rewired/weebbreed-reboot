import { Observable, Subject, bufferTime, filter as rxFilter, share } from 'rxjs';

type MaybeArray<T> = T | T[];

export type EventLevel = 'debug' | 'info' | 'warning' | 'error';

export interface SimulationEvent<T = unknown> {
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

export interface EventCollector {
  readonly size: number;
  queue(event: SimulationEvent): void;
  queueMany(events: Iterable<SimulationEvent>): void;
}

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

  emit(event: SimulationEvent): void {
    const enriched: SimulationEvent = {
      ...event,
      ts: event.ts ?? Date.now(),
    };
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
    return stream.pipe(
      bufferTime(timeMs, undefined, maxBufferSize),
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
  return {
    get size() {
      return buffer.length;
    },
    queue: (event: SimulationEvent) => {
      buffer.push({
        ...event,
        tick: event.tick ?? tick,
      });
    },
    queueMany: (events: Iterable<SimulationEvent>) => {
      for (const event of events) {
        buffer.push({
          ...event,
          tick: event.tick ?? tick,
        });
      }
    },
  };
};
