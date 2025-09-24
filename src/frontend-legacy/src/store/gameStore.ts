import { create } from 'zustand';
import type {
  SimulationControlCommand,
  SimulationTickEvent,
  SimulationTimeStatus,
  SimulationUpdateEntry,
} from '@/types/simulation';
import { mergeEvents } from './utils/events';
import type { GameStoreState } from './types';

const MAX_EVENTS = 250;

const createLocalTimeStatus = (state: GameStoreState): SimulationTimeStatus | undefined => {
  if (state.timeStatus) {
    return { ...state.timeStatus };
  }

  const clock = state.lastClockSnapshot;
  if (!clock) {
    return undefined;
  }

  return {
    running: !clock.isPaused,
    paused: clock.isPaused,
    speed: clock.isPaused ? 0 : clock.targetTickRate,
    tick: clock.tick,
    targetTickRate: clock.targetTickRate,
  } satisfies SimulationTimeStatus;
};

const applyLocalControlCommand = (
  state: GameStoreState,
  command: SimulationControlCommand,
): Partial<GameStoreState> => {
  const currentStatus = createLocalTimeStatus(state);
  if (!currentStatus) {
    return {};
  }

  let nextStatus: SimulationTimeStatus = { ...currentStatus };
  const nextClock = state.lastClockSnapshot ? { ...state.lastClockSnapshot } : undefined;

  switch (command.action) {
    case 'play': {
      const target = command.gameSpeed ?? currentStatus.targetTickRate ?? 1;
      nextStatus = {
        ...nextStatus,
        running: true,
        paused: false,
        speed: target,
        targetTickRate: target,
      };
      break;
    }
    case 'resume': {
      nextStatus = {
        ...nextStatus,
        running: true,
        paused: false,
        speed: nextStatus.targetTickRate,
      };
      break;
    }
    case 'pause': {
      nextStatus = {
        ...nextStatus,
        running: false,
        paused: true,
        speed: 0,
      };
      break;
    }
    case 'fastForward': {
      const multiplier = Math.max(0, command.multiplier);
      nextStatus = {
        ...nextStatus,
        running: true,
        paused: false,
        speed: multiplier,
        targetTickRate: multiplier,
      };
      break;
    }
    case 'step': {
      const increment = Number.isFinite(command.ticks) ? Math.max(1, command.ticks ?? 1) : 1;
      nextStatus = {
        ...nextStatus,
        running: false,
        paused: true,
        speed: 0,
        tick: Math.max(0, nextStatus.tick + increment),
      };
      break;
    }
    default:
      return {};
  }

  if (nextClock) {
    nextClock.isPaused = nextStatus.paused;
    nextClock.targetTickRate = nextStatus.targetTickRate;
    nextClock.tick = nextStatus.tick;
  }

  return {
    timeStatus: nextStatus,
    lastClockSnapshot: nextClock ?? state.lastClockSnapshot,
  } satisfies Partial<GameStoreState>;
};

export const useGameStore = create<GameStoreState>()((set) => ({
  connectionStatus: 'idle',
  events: [],
  hasLiveTransport: false,
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
  setTransportAvailability: (available: boolean) =>
    set(() => ({
      hasLiveTransport: available,
    })),
  issueControlCommand: (command: SimulationControlCommand) =>
    set((state) => {
      if (state.hasLiveTransport) {
        state.sendControlCommand?.(command);
        return {};
      }

      return applyLocalControlCommand(state, command);
    }),
  requestTickLength: (minutes: number) =>
    set((state) => {
      if (state.hasLiveTransport) {
        state.sendConfigUpdate?.({ type: 'tickLength', minutes });
      }
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
      hasLiveTransport: false,
    })),
  sendControlCommand: undefined,
  sendConfigUpdate: undefined,
}));
