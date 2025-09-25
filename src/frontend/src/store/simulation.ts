import { create } from 'zustand';
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
      events: events.slice(-MAX_EVENT_ENTRIES),
      timeStatus: time ?? null,
      zoneHistory: finalHistory,
      lastTick: snapshot.clock.tick,
    });
  },
  applyUpdate: (update) => {
    const nextHistory = appendZoneHistory(get().zoneHistory, update);
    set((state) => ({
      snapshot: update.snapshot,
      timeStatus: update.time,
      events: [...state.events, ...update.events].slice(-MAX_EVENT_ENTRIES),
      zoneHistory: nextHistory,
      lastTick: update.tick,
    }));
  },
  recordEvents: (events) =>
    set((state) => ({
      events: [...state.events, ...events].slice(-MAX_EVENT_ENTRIES),
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
