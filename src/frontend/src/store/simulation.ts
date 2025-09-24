import { create } from 'zustand';
import type {
  SimulationEvent,
  SimulationSnapshot,
  SimulationTimeStatus,
  SimulationUpdateEntry,
} from '@/types/simulation';

interface SimulationState {
  snapshot: SimulationSnapshot | null;
  updates: SimulationUpdateEntry[];
  events: SimulationEvent[];
  timeStatus: SimulationTimeStatus | null;
  connectionStatus: 'idle' | 'connecting' | 'connected';
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
  setConnectionStatus: (status: SimulationState['connectionStatus']) => void;
  markPaused: () => void;
  markRunning: (speed: number) => void;
}

const MAX_ENTRIES = 64;

export const useSimulationStore = create<SimulationState & SimulationActions>((set, get) => ({
  snapshot: null,
  updates: [],
  events: [],
  timeStatus: null,
  connectionStatus: 'idle',
  hydrate: ({ snapshot, updates = [], events = [], time }) =>
    set({
      snapshot,
      updates: updates.slice(-MAX_ENTRIES),
      events: events.slice(-MAX_ENTRIES),
      timeStatus: time ?? null,
    }),
  applyUpdate: (update) => {
    const entries = [...get().updates, update].slice(-MAX_ENTRIES);
    set({
      snapshot: update.snapshot,
      updates: entries,
      timeStatus: update.time,
      events: [...get().events, ...update.events].slice(-MAX_ENTRIES),
    });
  },
  recordEvents: (events) =>
    set((state) => ({
      events: [...state.events, ...events].slice(-MAX_ENTRIES),
    })),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  markPaused: () =>
    set((state) => {
      if (!state.snapshot) {
        return state;
      }
      const snapshot: SimulationSnapshot = {
        ...state.snapshot,
        clock: {
          ...state.snapshot.clock,
          isPaused: true,
        },
      };
      const timeStatus = state.timeStatus
        ? { ...state.timeStatus, paused: true, running: false }
        : null;
      return { snapshot, timeStatus };
    }),
  markRunning: (speed) =>
    set((state) => {
      if (!state.snapshot) {
        return state;
      }
      const snapshot: SimulationSnapshot = {
        ...state.snapshot,
        clock: {
          ...state.snapshot.clock,
          isPaused: false,
          targetTickRate: speed,
        },
      };
      const timeStatus: SimulationTimeStatus | null = state.timeStatus
        ? { ...state.timeStatus, paused: false, running: true, speed }
        : { running: true, paused: false, speed, tick: snapshot.clock.tick, targetTickRate: speed };
      return { snapshot, timeStatus };
    }),
}));
