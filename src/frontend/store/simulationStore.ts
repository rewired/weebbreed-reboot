import { create } from 'zustand';
import type { SimulationEvent, SimulationSnapshot, ZoneState } from '../../shared/domain.js';

export interface EnvironmentPoint {
  ts: number;
  temperature: number;
  humidity: number;
  co2: number;
  ppfd: number;
  vpd: number;
}

interface SimulationStoreState {
  tick: number;
  zones: ZoneState[];
  events: SimulationEvent[];
  environmentHistory: Record<string, EnvironmentPoint[]>;
  updateFromSnapshot: (snapshot: SimulationSnapshot) => void;
  appendEvent: (event: SimulationEvent) => void;
}

const MAX_HISTORY = 120;
const MAX_EVENTS = 50;

export const useSimulationStore = create<SimulationStoreState>((set) => ({
  tick: 0,
  zones: [],
  events: [],
  environmentHistory: {},
  updateFromSnapshot: (snapshot) =>
    set((state) => {
      const history = { ...state.environmentHistory };
      for (const zone of snapshot.zones) {
        const points = history[zone.id] ? [...history[zone.id]] : [];
        points.push({
          ts: snapshot.ts,
          temperature: zone.environment.temperature,
          humidity: zone.environment.humidity,
          co2: zone.environment.co2,
          ppfd: zone.environment.ppfd,
          vpd: zone.environment.vpd
        });
        if (points.length > MAX_HISTORY) {
          points.shift();
        }
        history[zone.id] = points;
      }
      return {
        tick: snapshot.tick,
        zones: snapshot.zones,
        environmentHistory: history
      };
    }),
  appendEvent: (event) =>
    set((state) => {
      const events = [...state.events, event];
      if (events.length > MAX_EVENTS) {
        events.shift();
      }
      return { events };
    })
}));
