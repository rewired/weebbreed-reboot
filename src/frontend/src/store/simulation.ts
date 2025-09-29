import { create } from 'zustand';
import { ensureSimulationEventId } from '../../../runtime/eventIdentity';
import {
  ZONE_CONTROL_SETPOINT_KEYS,
  canonicalizeZoneControlSetpoints,
  type SimulationEvent,
  type SimulationSnapshot,
  type SimulationTimeStatus,
  type SimulationUpdateEntry,
  type ZoneControlSetpoints,
  type ZoneControlSetpointKey,
} from '@/types/simulation';
import type {
  CatalogStatus,
  CultivationMethodCatalogEntry,
  ContainerCatalogEntry,
  SubstrateCatalogEntry,
} from '@/types/blueprints';

export interface ZoneHistoryPoint {
  tick: number;
  temperature: number;
  relativeHumidity: number;
  co2: number;
  ppfd: number;
  vpd: number;
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting';

type CatalogKey = 'cultivationMethods' | 'containers' | 'substrates';

interface CatalogSlice<T> {
  status: CatalogStatus;
  data: T[];
  error: string | null;
}

type CatalogStateMap = {
  cultivationMethods: CatalogSlice<CultivationMethodCatalogEntry>;
  containers: CatalogSlice<ContainerCatalogEntry>;
  substrates: CatalogSlice<SubstrateCatalogEntry>;
};

interface SimulationState {
  snapshot: SimulationSnapshot | null;
  events: SimulationEvent[];
  timeStatus: SimulationTimeStatus | null;
  connectionStatus: ConnectionStatus;
  zoneHistory: Record<string, ZoneHistoryPoint[]>;
  zoneSetpoints: Record<string, ZoneControlSetpoints>;
  lastTick: number;
  catalogs: CatalogStateMap;
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
  setCatalogStatus: <K extends CatalogKey>(
    catalog: K,
    status: CatalogStatus,
    payload?: { data?: CatalogStateMap[K]['data']; error?: string | null },
  ) => void;
  reset: () => void;
}

const MAX_EVENT_ENTRIES = 200;
const MAX_ZONE_HISTORY_POINTS = 5000;

const SETPOINT_KEYS = ZONE_CONTROL_SETPOINT_KEYS;

interface Tolerance {
  abs: number;
  rel: number;
}

const DEFAULT_TOLERANCE: Tolerance = { abs: 1e-6, rel: 1e-6 };

const SETPOINT_TOLERANCES: Record<ZoneControlSetpointKey, Tolerance> = {
  temperature: { abs: 0.05, rel: 5e-4 },
  humidity: { abs: 0.001, rel: 5e-3 },
  co2: { abs: 5, rel: 5e-3 },
  ppfd: { abs: 2, rel: 5e-3 },
  vpd: { abs: 0.005, rel: 1e-2 },
};

const PHOTOPERIOD_TOLERANCE: Tolerance = { abs: 0.05, rel: 5e-3 };

const createCatalogSlice = <T>(): CatalogSlice<T> => ({ status: 'idle', data: [], error: null });

const createInitialCatalogState = (): CatalogStateMap => ({
  cultivationMethods: createCatalogSlice<CultivationMethodCatalogEntry>(),
  containers: createCatalogSlice<ContainerCatalogEntry>(),
  substrates: createCatalogSlice<SubstrateCatalogEntry>(),
});

const isApproximatelyEqual = (
  left: number,
  right: number,
  tolerance: Tolerance = DEFAULT_TOLERANCE,
) => {
  const diff = Math.abs(left - right);
  if (!Number.isFinite(diff)) {
    return false;
  }
  if (diff <= tolerance.abs) {
    return true;
  }
  const scale = Math.max(Math.abs(left), Math.abs(right));
  if (scale === 0) {
    return diff <= tolerance.abs;
  }
  return diff <= scale * tolerance.rel;
};

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
  return SETPOINT_KEYS.every((key) => {
    const left = a[key];
    const right = b[key];

    if (left === undefined && right === undefined) {
      return true;
    }
    if (left === undefined || right === undefined) {
      return false;
    }
    if (typeof left !== 'number' || typeof right !== 'number') {
      return left === right;
    }

    const tolerance = SETPOINT_TOLERANCES[key] ?? DEFAULT_TOLERANCE;
    return isApproximatelyEqual(left, right, tolerance);
  });
};

const clampHours = (value: number): number => {
  if (!Number.isFinite(value)) {
    return value;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 24) {
    return 24;
  }
  return value;
};

const extractPhotoperiodPayload = (
  event: SimulationEvent,
): {
  zoneId?: string;
  photoperiodHours?: { on?: number; off?: number };
} => {
  if (!event.payload || typeof event.payload !== 'object') {
    return { zoneId: event.zoneId };
  }

  const payload = event.payload as Record<string, unknown> & {
    photoperiodHours?: { on?: number; off?: number };
    lighting?: { photoperiodHours?: { on?: number; off?: number } };
  };

  const zoneId =
    typeof payload.zoneId === 'string'
      ? payload.zoneId
      : typeof event.zoneId === 'string'
        ? event.zoneId
        : undefined;

  const photoperiod = payload.photoperiodHours ?? payload.lighting?.photoperiodHours ?? undefined;

  if (!photoperiod || typeof photoperiod !== 'object') {
    return { zoneId };
  }

  const on = photoperiod.on;
  const off = photoperiod.off;

  return {
    zoneId,
    photoperiodHours: {
      on: typeof on === 'number' && Number.isFinite(on) ? on : undefined,
      off: typeof off === 'number' && Number.isFinite(off) ? off : undefined,
    },
  };
};

const applyLightingEventsToSnapshot = (
  snapshot: SimulationSnapshot,
  events: SimulationEvent[],
): SimulationSnapshot => {
  if (!events.length) {
    return snapshot;
  }

  let zones = snapshot.zones;
  let mutated = false;

  for (const event of events) {
    const type = event.type ?? '';
    if (!/lightingcycle|photoperiod/i.test(type)) {
      continue;
    }

    const { zoneId, photoperiodHours } = extractPhotoperiodPayload(event);
    if (!zoneId || !photoperiodHours) {
      continue;
    }

    const zoneIndex = zones.findIndex((zone) => zone.id === zoneId);
    if (zoneIndex === -1) {
      continue;
    }

    const zone = zones[zoneIndex]!;
    const nextOn =
      photoperiodHours.on !== undefined
        ? clampHours(photoperiodHours.on)
        : photoperiodHours.off !== undefined
          ? clampHours(24 - photoperiodHours.off)
          : undefined;

    if (nextOn === undefined) {
      continue;
    }

    const nextOff =
      photoperiodHours.off !== undefined
        ? clampHours(photoperiodHours.off)
        : clampHours(24 - nextOn);

    const currentOn = zone.lighting?.photoperiodHours?.on;
    const currentOff = zone.lighting?.photoperiodHours?.off;

    if (
      typeof currentOn === 'number' &&
      typeof currentOff === 'number' &&
      isApproximatelyEqual(currentOn, nextOn, PHOTOPERIOD_TOLERANCE) &&
      isApproximatelyEqual(currentOff, nextOff, PHOTOPERIOD_TOLERANCE)
    ) {
      continue;
    }

    if (!mutated) {
      zones = [...zones];
      mutated = true;
    }

    zones[zoneIndex] = {
      ...zone,
      lighting: {
        ...(zone.lighting ?? {}),
        photoperiodHours: {
          on: nextOn,
          off: nextOff,
        },
      },
    };
  }

  if (!mutated) {
    return snapshot;
  }

  return {
    ...snapshot,
    zones,
  };
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
  catalogs: createInitialCatalogState(),
  hydrate: ({ snapshot, updates = [], events = [], time }) => {
    const previousSnapshot = get().snapshot;
    const snapshotWithLedger = preserveFinanceLedger(snapshot, previousSnapshot);
    const snapshotWithLighting = applyLightingEventsToSnapshot(snapshotWithLedger, events);
    const history = updates.reduce<Record<string, ZoneHistoryPoint[]>>((acc, entry) => {
      return appendZoneHistory(acc, entry);
    }, {});
    const finalHistory = appendZoneHistory(history, {
      tick: snapshotWithLighting.clock.tick,
      ts: Date.now(),
      events: [],
      snapshot: snapshotWithLighting,
      time: time ?? {
        running: !snapshotWithLighting.clock.isPaused,
        paused: snapshotWithLighting.clock.isPaused,
        speed: snapshotWithLighting.clock.targetTickRate,
        tick: snapshotWithLighting.clock.tick,
        targetTickRate: snapshotWithLighting.clock.targetTickRate,
      },
    });
    const setpointsFromSnapshot = deriveZoneSetpointsFromSnapshot(snapshotWithLighting, {});
    const setpointsWithEvents = applySetpointEvents(setpointsFromSnapshot, events);
    set({
      snapshot: snapshotWithLighting,
      events: mergeEvents([], events),
      timeStatus: time ?? null,
      zoneHistory: finalHistory,
      zoneSetpoints: setpointsWithEvents,
      lastTick: snapshotWithLighting.clock.tick,
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
    const snapshotWithLighting = applyLightingEventsToSnapshot(snapshotWithLedger, update.events);
    const nextHistory = appendZoneHistory(get().zoneHistory, {
      ...update,
      snapshot: snapshotWithLighting,
    });
    const setpointsFromSnapshot = deriveZoneSetpointsFromSnapshot(
      snapshotWithLighting,
      get().zoneSetpoints,
    );
    const setpointsWithEvents = applySetpointEvents(setpointsFromSnapshot, update.events);
    set((state) => ({
      snapshot: snapshotWithLighting,
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
      const snapshotWithLighting =
        state.snapshot && events.length
          ? applyLightingEventsToSnapshot(state.snapshot, events)
          : state.snapshot;

      if (
        mergedEvents === state.events &&
        setpoints === state.zoneSetpoints &&
        snapshotWithLighting === state.snapshot
      ) {
        return {};
      }
      const patch: Partial<SimulationState> = {};
      if (mergedEvents !== state.events) {
        patch.events = mergedEvents;
      }
      if (setpoints !== state.zoneSetpoints) {
        patch.zoneSetpoints = setpoints;
      }
      if (snapshotWithLighting !== state.snapshot) {
        patch.snapshot = snapshotWithLighting;
      }
      return patch;
    }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setTimeStatus: (status) => set({ timeStatus: status }),
  setCatalogStatus: (catalog, status, payload) =>
    set((state) => {
      const currentSlice = state.catalogs[catalog];
      const nextSlice: CatalogSlice<unknown> = {
        ...currentSlice,
        status,
        error: payload?.error ?? null,
      };
      if (payload?.data) {
        nextSlice.data = [...payload.data];
      } else if (status === 'idle') {
        nextSlice.data = currentSlice.data;
      } else if (status === 'loading' && currentSlice.data.length > 0) {
        nextSlice.data = currentSlice.data;
      }
      return {
        catalogs: {
          ...state.catalogs,
          [catalog]: nextSlice as CatalogSlice<(typeof currentSlice.data)[number]>,
        },
      };
    }),
  reset: () =>
    set({
      snapshot: null,
      events: [],
      timeStatus: null,
      connectionStatus: 'idle',
      zoneHistory: {},
      zoneSetpoints: {},
      lastTick: 0,
      catalogs: createInitialCatalogState(),
    }),
}));
