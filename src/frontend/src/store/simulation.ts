import { create } from 'zustand';
import { ensureSimulationEventId } from '../../../runtime/eventIdentity';
import type {
  SimulationEvent,
  SimulationSnapshot,
  SimulationTimeStatus,
  SimulationUpdateEntry,
  ZoneControlSetpoints,
} from '@/types/simulation';
import { ZONE_CONTROL_SETPOINT_KEYS, canonicalizeZoneControlSetpoints } from '@/types/simulation';

export interface ZoneHistoryPoint {
  tick: number;
  temperature: number;
  relativeHumidity: number;
  co2: number;
  ppfd: number;
  vpd: number;
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting';

interface SimulationState {
  snapshot: SimulationSnapshot | null;
  events: SimulationEvent[];
  timeStatus: SimulationTimeStatus | null;
  connectionStatus: ConnectionStatus;
  zoneHistory: Record<string, ZoneHistoryPoint[]>;
  zoneSetpoints: Record<string, ZoneControlSetpoints>;
  lastTick: number;
}

interface SimulationActions {
  hydrate: (payload: {
    snapshot: SimulationSnapshot;
    updates?: SimulationUpdateEntry[];
    events?: SimulationEvent[];
    time?: SimulationTimeStatus;
  }) => void;
  applyUpdate: (update: SimulationUpdateEntry) => void;
  recordEvents: (events: SimulationEvent[]) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setTimeStatus: (status: SimulationTimeStatus | null) => void;
  reset: () => void;
}

const MAX_EVENT_ENTRIES = 200;
const MAX_ZONE_HISTORY_POINTS = 5000;

const SETPOINT_KEYS = ZONE_CONTROL_SETPOINT_KEYS;

const shallowEqualSetpoints = (
  a: ZoneControlSetpoints | undefined,
  b: ZoneControlSetpoints | undefined,
) => {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return SETPOINT_KEYS.every((key) => a[key] === b[key]);
};

const deriveZoneSetpointsFromSnapshot = (
  snapshot: SimulationSnapshot,
  previous: Record<string, ZoneControlSetpoints>,
): Record<string, ZoneControlSetpoints> => {
  let mutated = false;
  const next: Record<string, ZoneControlSetpoints> = {};
  const seen = new Set<string>();

  for (const zone of snapshot.zones) {
    seen.add(zone.id);
    if (zone.control?.setpoints) {
      const canonical = canonicalizeZoneControlSetpoints(zone.control.setpoints);
      const cloned: ZoneControlSetpoints = { ...canonical };
      next[zone.id] = cloned;
      if (!shallowEqualSetpoints(previous[zone.id], cloned)) {
        mutated = true;
      }
    } else if (previous[zone.id]) {
      next[zone.id] = previous[zone.id]!;
    } else {
      next[zone.id] = {};
      mutated = true;
    }
  }

  if (!mutated && Object.keys(previous).length !== seen.size) {
    mutated = true;
  }

  return mutated ? next : previous;
};

const applySetpointEvents = (
  state: Record<string, ZoneControlSetpoints>,
  events: SimulationEvent[],
): Record<string, ZoneControlSetpoints> => {
  if (!events.length) {
    return state;
  }

  let mutated = false;
  const nextState: Record<string, ZoneControlSetpoints> = { ...state };

  for (const event of events) {
    if (event.type !== 'env.setpointUpdated') {
      continue;
    }

    const payload = event.payload;
    const zoneId =
      (payload &&
      typeof payload === 'object' &&
      typeof (payload as { zoneId?: unknown }).zoneId === 'string'
        ? ((payload as { zoneId: string }).zoneId as string)
        : undefined) ?? event.zoneId;

    if (!zoneId) {
      continue;
    }

    const current: ZoneControlSetpoints = { ...nextState[zoneId] };
    let zoneMutated = false;

    if (payload && typeof payload === 'object') {
      const control = (payload as { control?: unknown }).control;
      if (control && typeof control === 'object') {
        const canonicalControl = canonicalizeZoneControlSetpoints(
          control as ZoneControlSetpoints & { relativeHumidity?: number },
        );
        for (const key of SETPOINT_KEYS) {
          const value = (canonicalControl as Record<string, unknown>)[key];
          if (typeof value === 'number' && current[key] !== value) {
            current[key] = value;
            zoneMutated = true;
          }
        }
      }

      const metric = (payload as { metric?: unknown }).metric;
      const value = (payload as { value?: unknown }).value;
      if (typeof metric === 'string' && typeof value === 'number') {
        switch (metric) {
          case 'temperature':
            if (current.temperature !== value) {
              current.temperature = value;
              zoneMutated = true;
            }
            break;
          case 'relativeHumidity':
          case 'humidity':
            if (current.humidity !== value) {
              current.humidity = value;
              zoneMutated = true;
            }
            break;
          case 'co2':
            if (current.co2 !== value) {
              current.co2 = value;
              zoneMutated = true;
            }
            break;
          case 'ppfd':
            if (current.ppfd !== value) {
              current.ppfd = value;
              zoneMutated = true;
            }
            break;
          case 'vpd':
            if (current.vpd !== value) {
              current.vpd = value;
              zoneMutated = true;
            }
            break;
          default:
            break;
        }
      }

      const effectiveHumidity = (payload as { effectiveHumidity?: unknown }).effectiveHumidity;
      if (typeof effectiveHumidity === 'number' && current.humidity !== effectiveHumidity) {
        current.humidity = effectiveHumidity;
        zoneMutated = true;
      }
    }

    if (zoneMutated) {
      nextState[zoneId] = current;
      mutated = true;
    }
  }

  return mutated ? nextState : state;
};

const preserveFinanceLedger = (
  nextSnapshot: SimulationSnapshot,
  previousSnapshot: SimulationSnapshot | null,
): SimulationSnapshot => {
  if (!previousSnapshot?.finance?.ledger || nextSnapshot.finance.ledger !== undefined) {
    return nextSnapshot;
  }
  return {
    ...nextSnapshot,
    finance: {
      ...nextSnapshot.finance,
      ledger: [...previousSnapshot.finance.ledger],
    },
  };
};

const normaliseEventBatch = (
  events: SimulationEvent[],
  { includeSequence }: { includeSequence?: boolean } = {},
): SimulationEvent[] => {
  if (!events.length) {
    return events;
  }
  return events.map((event, index) =>
    ensureSimulationEventId(event, includeSequence ? { sequence: index, tick: event.tick } : {}),
  );
};

const mergeEvents = (
  existing: SimulationEvent[],
  incoming: SimulationEvent[],
): SimulationEvent[] => {
  const existingWithIds = normaliseEventBatch(existing);
  const incomingWithIds = normaliseEventBatch(incoming, { includeSequence: true });
  const order: string[] = [];
  const byId = new Map<string, SimulationEvent>();

  const append = (event: SimulationEvent) => {
    const ensured = event.id ? event : ensureSimulationEventId(event);
    const id = ensured.id!;
    if (byId.has(id)) {
      const index = order.indexOf(id);
      if (index !== -1) {
        order.splice(index, 1);
      }
    }
    order.push(id);
    byId.set(id, ensured);
  };

  for (const event of existingWithIds) {
    append(event);
  }
  for (const event of incomingWithIds) {
    append(event);
  }

  const merged = order.map((id) => byId.get(id)!).slice(-MAX_EVENT_ENTRIES);

  if (import.meta.env?.DEV) {
    const unique = new Set(merged.map((event) => event.id ?? ''));
    if (unique.size !== merged.length) {
      console.warn('Duplicate simulation event identifiers detected', {
        total: merged.length,
        distinct: unique.size,
      });
    }
  }

  return merged;
};

const appendZoneHistory = (
  history: Record<string, ZoneHistoryPoint[]>,
  update: SimulationUpdateEntry,
) => {
  const nextHistory: Record<string, ZoneHistoryPoint[]> = { ...history };
  for (const zone of update.snapshot.zones) {
    const existing = nextHistory[zone.id] ? [...nextHistory[zone.id]!] : [];
    existing.push({
      tick: update.tick,
      temperature: zone.environment.temperature,
      relativeHumidity: zone.environment.relativeHumidity,
      co2: zone.environment.co2,
      ppfd: zone.environment.ppfd,
      vpd: zone.environment.vpd,
    });
    if (existing.length > MAX_ZONE_HISTORY_POINTS) {
      existing.splice(0, existing.length - MAX_ZONE_HISTORY_POINTS);
    }
    nextHistory[zone.id] = existing;
  }
  return nextHistory;
};

export const useSimulationStore = create<SimulationState & SimulationActions>((set, get) => ({
  snapshot: null,
  events: [],
  timeStatus: null,
  connectionStatus: 'idle',
  zoneHistory: {},
  zoneSetpoints: {},
  lastTick: 0,
  hydrate: ({ snapshot, updates = [], events = [], time }) => {
    const previousSnapshot = get().snapshot;
    const snapshotWithLedger = preserveFinanceLedger(snapshot, previousSnapshot);
    const history = updates.reduce<Record<string, ZoneHistoryPoint[]>>((acc, entry) => {
      return appendZoneHistory(acc, entry);
    }, {});
    const finalHistory = appendZoneHistory(history, {
      tick: snapshotWithLedger.clock.tick,
      ts: Date.now(),
      events: [],
      snapshot: snapshotWithLedger,
      time: time ?? {
        running: !snapshotWithLedger.clock.isPaused,
        paused: snapshotWithLedger.clock.isPaused,
        speed: snapshotWithLedger.clock.targetTickRate,
        tick: snapshotWithLedger.clock.tick,
        targetTickRate: snapshotWithLedger.clock.targetTickRate,
      },
    });
    const setpointsFromSnapshot = deriveZoneSetpointsFromSnapshot(snapshotWithLedger, {});
    const setpointsWithEvents = applySetpointEvents(setpointsFromSnapshot, events);
    set({
      snapshot: snapshotWithLedger,
      events: mergeEvents([], events),
      timeStatus: time ?? null,
      zoneHistory: finalHistory,
      zoneSetpoints: setpointsWithEvents,
      lastTick: snapshotWithLedger.clock.tick,
    });
  },
  applyUpdate: (update) => {
    console.log(
      '💾 Store applying update - tick:',
      update.tick,
      'structures:',
      update.snapshot?.structures?.length,
    );
    const previousSnapshot = get().snapshot;
    const snapshotWithLedger = preserveFinanceLedger(update.snapshot, previousSnapshot);
    const nextHistory = appendZoneHistory(get().zoneHistory, {
      ...update,
      snapshot: snapshotWithLedger,
    });
    const setpointsFromSnapshot = deriveZoneSetpointsFromSnapshot(
      snapshotWithLedger,
      get().zoneSetpoints,
    );
    const setpointsWithEvents = applySetpointEvents(setpointsFromSnapshot, update.events);
    set((state) => ({
      snapshot: snapshotWithLedger,
      timeStatus: update.time,
      events: mergeEvents(state.events, update.events),
      zoneHistory: nextHistory,
      zoneSetpoints: setpointsWithEvents,
      lastTick: update.tick,
    }));
  },
  recordEvents: (events) =>
    set((state) => {
      const mergedEvents = mergeEvents(state.events, events);
      const setpoints = applySetpointEvents(state.zoneSetpoints, events);
      if (mergedEvents === state.events && setpoints === state.zoneSetpoints) {
        return {};
      }
      const patch: Partial<SimulationState> = {};
      if (mergedEvents !== state.events) {
        patch.events = mergedEvents;
      }
      if (setpoints !== state.zoneSetpoints) {
        patch.zoneSetpoints = setpoints;
      }
      return patch;
    }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setTimeStatus: (status) => set({ timeStatus: status }),
  reset: () =>
    set({
      snapshot: null,
      events: [],
      timeStatus: null,
      connectionStatus: 'idle',
      zoneHistory: {},
      zoneSetpoints: {},
      lastTick: 0,
    }),
}));
