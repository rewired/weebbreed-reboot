import type { StateCreator } from 'zustand';
import type { SimulationSnapshot } from '../../types/simulation';
import type { AppStoreState, SimulationSlice, SimulationTimelineEntry } from '../types';

const MAX_EVENTS = 250;
const MAX_TIMELINE_ENTRIES = 180;

const toArray = <T>(input: T | T[] | undefined): T[] => {
  if (!input) {
    return [];
  }

  return Array.isArray(input) ? input : [input];
};

const truncate = <T>(items: T[], limit: number): T[] => {
  if (items.length <= limit) {
    return items;
  }

  return items.slice(items.length - limit);
};

const mapTimelineEntries = (snapshot: SimulationSnapshot): SimulationTimelineEntry[] => {
  return toArray(snapshot.env).map((env) => ({
    tick: snapshot.tick,
    ts: snapshot.ts,
    zoneId: env.zoneId,
    temperature: env.temperature,
    humidity: env.humidity,
    vpd: env.vpd,
  }));
};

export const createSimulationSlice: StateCreator<AppStoreState, [], [], SimulationSlice> = (
  set,
) => ({
  connectionStatus: 'idle',
  zones: {},
  plants: {},
  events: [],
  timeline: [],
  setConnectionStatus: (status, errorMessage) =>
    set((state) => ({
      connectionStatus: status,
      lastError: status === 'error' ? (errorMessage ?? state.lastError) : undefined,
    })),
  ingestSnapshot: (snapshot) =>
    set((state) => {
      const zones = { ...state.zones };
      for (const env of toArray(snapshot.env)) {
        zones[env.zoneId] = env;
      }

      const plants = { ...state.plants };
      for (const plant of snapshot.plants ?? []) {
        plants[plant.id] = plant;
      }

      const appendedTimeline = [...state.timeline, ...mapTimelineEntries(snapshot)];
      const nextEvents = snapshot.events?.length
        ? truncate([...state.events, ...snapshot.events], MAX_EVENTS)
        : state.events;

      return {
        lastSnapshot: snapshot,
        zones,
        plants,
        timeline: truncate(appendedTimeline, MAX_TIMELINE_ENTRIES),
        events: nextEvents,
      };
    }),
  appendEvents: (events) =>
    set((state) => {
      if (!events.length) {
        return {};
      }

      return {
        events: truncate([...state.events, ...events], MAX_EVENTS),
      };
    }),
  registerTickCompleted: (event) =>
    set(() => ({
      lastTickCompleted: event,
    })),
  resetSimulation: () =>
    set(() => ({
      lastSnapshot: undefined,
      zones: {},
      plants: {},
      events: [],
      timeline: [],
      lastTickCompleted: undefined,
    })),
  setCommandHandlers: (control, config) =>
    set(() => ({
      sendControlCommand: control,
      sendConfigUpdate: config,
    })),
});
