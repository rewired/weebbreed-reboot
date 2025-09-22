import type { SimulationEvent } from '@/types/simulation';

const eventKey = (event: SimulationEvent): string => {
  return [
    event.type,
    event.tick ?? 'na',
    event.ts ?? 'na',
    event.message ?? '',
    event.deviceId ?? '',
    event.plantId ?? '',
    event.zoneId ?? '',
  ].join('|');
};

export const mergeEvents = (
  existing: SimulationEvent[],
  incoming: SimulationEvent[],
  limit: number,
): SimulationEvent[] => {
  if (!incoming.length) {
    return existing;
  }

  const seen = new Set(existing.map(eventKey));
  const merged = [...existing];

  for (const event of incoming) {
    const key = eventKey(event);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(event);
  }

  if (merged.length <= limit) {
    return merged;
  }

  return merged.slice(merged.length - limit);
};
