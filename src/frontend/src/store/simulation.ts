import { create } from 'zustand';
import { ensureSimulationEventId } from '../../../runtime/eventIdentity';
import type {
  SimulationEvent,
  SimulationSnapshot,
  SimulationTimeStatus,
  SimulationUpdateEntry,
} from '@/types/simulation';

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
  lastTick: 0,
  hydrate: ({ snapshot, updates = [], events = [], time }) => {
    const history = updates.reduce<Record<string, ZoneHistoryPoint[]>>((acc, entry) => {
      return appendZoneHistory(acc, entry);
    }, {});
    const finalHistory = appendZoneHistory(history, {
      tick: snapshot.clock.tick,
      ts: Date.now(),
      events: [],
      snapshot,
      time: time ?? {
        running: !snapshot.clock.isPaused,
        paused: snapshot.clock.isPaused,
        speed: snapshot.clock.targetTickRate,
        tick: snapshot.clock.tick,
        targetTickRate: snapshot.clock.targetTickRate,
      },
    });
    set({
      snapshot,
      events: mergeEvents([], events),
      timeStatus: time ?? null,
      zoneHistory: finalHistory,
      lastTick: snapshot.clock.tick,
    });
  },
  applyUpdate: (update) => {
    console.log(
      '💾 Store applying update - tick:',
      update.tick,
      'structures:',
      update.snapshot?.structures?.length,
    );

    // Debug logging for zones
    const rooms = update.snapshot?.rooms ?? [];
    const totalZones = rooms.reduce((sum, room) => sum + (room.zones?.length ?? 0), 0);
    console.log('💾 Store update - rooms:', rooms.length, 'total zones:', totalZones);
    rooms.forEach((room) => {
      console.log(
        `💾 Room ${room.name} (${room.id}): ${room.zones?.length ?? 0} zones, ${room.area}m²`,
      );
      room.zones?.forEach((zone) => {
        console.log(`  💾 Zone ${zone.name} (${zone.id}): ${zone.area}m²`);
      });
    });

    const nextHistory = appendZoneHistory(get().zoneHistory, update);
    set((state) => ({
      snapshot: update.snapshot,
      timeStatus: update.time,
      events: mergeEvents(state.events, update.events),
      zoneHistory: nextHistory,
      lastTick: update.tick,
    }));
  },
  recordEvents: (events) =>
    set((state) => ({
      events: mergeEvents(state.events, events),
    })),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setTimeStatus: (status) => set({ timeStatus: status }),
  reset: () =>
    set({
      snapshot: null,
      events: [],
      timeStatus: null,
      connectionStatus: 'idle',
      zoneHistory: {},
      lastTick: 0,
    }),
}));
