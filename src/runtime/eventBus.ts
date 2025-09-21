import {
  EventBus,
  type EventBufferOptions,
  type EventCollector,
  type EventFilter,
  type EventLevel,
  type SimulationEvent,
} from '../backend/src/lib/eventBus.js';

const telemetryEventBus = new EventBus();

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
