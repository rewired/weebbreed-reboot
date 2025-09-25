import type { SimulationEvent } from './eventBusCore.js';
import { hashStable } from './hashStable.js';

const VOLATILE_KEYS = new Set(['ts', 'timestamp', 'createdAt', 'updatedAt']);

type SanitisedValue =
  | string
  | number
  | boolean
  | null
  | SanitisedValue[]
  | { [key: string]: SanitisedValue };

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const sanitiseValue = (value: unknown): SanitisedValue => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitiseValue(item));
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value)
      .filter(([key, nested]) => !VOLATILE_KEYS.has(key) && nested !== undefined)
      .map(([key, nested]) => [key, sanitiseValue(nested)] as const)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const result: Record<string, SanitisedValue> = {};
    for (const [key, nested] of entries) {
      result[key] = nested;
    }
    return result;
  }
  return String(value);
};

export interface EventIdentityOptions {
  tick?: number;
  sequence?: number;
}

export const makeSimulationEventId = (
  event: SimulationEvent,
  options: EventIdentityOptions = {},
): string => {
  const baseTick = options.tick ?? event.tick ?? null;
  const identity = {
    type: event.type,
    tick: baseTick,
    level: event.level ?? null,
    tags: event.tags ? [...event.tags].sort() : null,
    payload: sanitiseValue(event.payload),
    sequence: options.sequence ?? null,
  } as const;
  const namespace = event.type.split('.')[0] ?? 'event';
  const hash = hashStable(identity);
  return `${namespace}:${event.type}:${baseTick ?? 'na'}:${hash}`;
};

export const ensureSimulationEventId = <T>(
  event: SimulationEvent<T>,
  options: EventIdentityOptions = {},
): SimulationEvent<T> => {
  if (event.id) {
    return event;
  }
  const id = makeSimulationEventId(event, options);
  return { ...event, id };
};
