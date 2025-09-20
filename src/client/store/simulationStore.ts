import { create } from 'zustand';
import type { PlantStage } from '../../shared/types/simulation';

export interface EnvironmentSample {
  ts: number;
  zoneId: string;
  temperature: number;
  humidity: number;
  co2: number;
  ppfd: number;
  vpd: number;
}

export interface PlantRow {
  id: string;
  stage: PlantStage;
  biomass: number;
  health: number;
  stress: number;
}

export interface EventRow {
  id: string;
  type: string;
  details: string;
  ts: number;
}

interface SimulationState {
  tick: number;
  envHistory: EnvironmentSample[];
  plants: PlantRow[];
  events: EventRow[];
  isConnected: boolean;
  setConnected: (value: boolean) => void;
  applyUpdate: (payload: SimulationUpdatePayload) => void;
  reset: () => void;
}

const MAX_POINTS = 180;

const normaliseEvent = (event: Record<string, unknown> & { type: string; level?: string }): EventRow => ({
  id: `${event.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type: event.type,
  ts: Date.now(),
  details: JSON.stringify(event)
});

export const useSimulationStore = create<SimulationState>((set) => ({
  tick: 0,
  envHistory: [],
  plants: [],
  events: [],
  isConnected: false,
  setConnected: (value) => set({ isConnected: value }),
  applyUpdate: (payload) =>
    set((state) => {
      const samples: EnvironmentSample[] = payload.env.map((env) => ({
        ts: payload.ts,
        zoneId: env.zoneId,
        temperature: env.temperature,
        humidity: env.humidity,
        co2: env.co2,
        ppfd: env.ppfd,
        vpd: env.vpd
      }));
      const updatedHistory = [...state.envHistory, ...samples].slice(-MAX_POINTS);
      const nextEvents = [...state.events, ...payload.events.map(normaliseEvent)].slice(-MAX_POINTS);

      return {
        tick: payload.tick,
        envHistory: updatedHistory,
        plants: payload.plants,
        events: nextEvents
      };
    }),
  reset: () =>
    set({
      tick: 0,
      envHistory: [],
      plants: [],
      events: []
    })
}));

export type SimulationUpdatePayload = {
  tick: number;
  ts: number;
  env: Array<Omit<EnvironmentSample, 'ts'>>;
  plants: PlantRow[];
  events: Array<Record<string, unknown> & { type: string; level?: string }>;
};
