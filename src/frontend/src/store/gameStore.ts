import { create } from 'zustand';
import type {
  SimulationControlCommand,
  SimulationTickEvent,
  SimulationUpdateEntry,
} from '@/types/simulation';
import { mergeEvents } from './utils/events';
import type { GameStoreState } from './types';

const MAX_EVENTS = 250;

export const useGameStore = create<GameStoreState>()((set) => ({
  connectionStatus: 'idle',
  events: [],
  setConnectionStatus: (status, errorMessage) =>
    set((state) => ({
      connectionStatus: status,
      lastError: status === 'error' ? (errorMessage ?? state.lastError) : undefined,
    })),
  ingestUpdate: (update: SimulationUpdateEntry) =>
    set((state) => ({
      events: update.events.length
        ? mergeEvents(state.events, update.events, MAX_EVENTS)
        : state.events,
      timeStatus: update.time,
      lastSnapshotTick: update.snapshot.tick,
      lastSnapshotTimestamp: update.ts,
      lastClockSnapshot: update.snapshot.clock,
    })),
  appendEvents: (events) =>
    set((state) => ({
      events: events.length ? mergeEvents(state.events, events, MAX_EVENTS) : state.events,
    })),
  registerTickCompleted: (event: SimulationTickEvent) =>
    set(() => ({
      lastTickCompleted: event,
    })),
  setCommandHandlers: (control, config) =>
    set(() => ({
      sendControlCommand: control,
      sendConfigUpdate: config,
    })),
  issueControlCommand: (command: SimulationControlCommand) =>
    set((state) => {
      state.sendControlCommand?.(command);
      return {};
    }),
  requestTickLength: (minutes: number) =>
    set((state) => {
      state.sendConfigUpdate?.({ type: 'tickLength', minutes });
      return { lastRequestedTickLength: minutes };
    }),
  reset: () =>
    set(() => ({
      events: [],
      timeStatus: undefined,
      lastTickCompleted: undefined,
      lastSnapshotTick: undefined,
      lastSnapshotTimestamp: undefined,
      lastClockSnapshot: undefined,
      lastRequestedTickLength: undefined,
    })),
  sendControlCommand: undefined,
  sendConfigUpdate: undefined,
}));
