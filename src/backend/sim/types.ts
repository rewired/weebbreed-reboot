import type { SimulationEvent, SimulationState } from '../../shared/domain.js';

export interface TickContext {
  state: SimulationState;
  tickHours: number;
  events: SimulationEvent[];
}

export type PhaseHandler = (context: TickContext) => Promise<void> | void;
