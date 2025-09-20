import type { SimulationEventPayload } from './simulation';

export type SimulationControlEvent =
  | { type: 'simulationControl'; action: 'play' }
  | { type: 'simulationControl'; action: 'pause' }
  | { type: 'simulationControl'; action: 'step' }
  | { type: 'simulationControl'; action: 'fastForward'; multiplier: number }
  | { type: 'simulationControl'; action: 'setTickLength'; minutes: number }
  | {
      type: 'simulationControl';
      action: 'setSetpoint';
      target: 'temperature' | 'humidity' | 'co2' | 'ppfd';
      value: number;
    };

export type DomainEvent =
  | SimulationEventPayload<{ zoneId: string }>
  | SimulationEventPayload<{ plantId: string; stage?: string }>
  | SimulationEventPayload<Record<string, unknown>>;
