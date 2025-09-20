import type { DeviceBlueprint, StrainBlueprint } from '../../shared/types/blueprints';
import type { SimulationEventPayload, SimulationState } from '../../shared/types/simulation';
import type { CommitResult } from './phases/commit';

export interface BlueprintIndex {
  strains: Map<string, StrainBlueprint>;
  devices: Map<string, DeviceBlueprint>;
}

export interface TickContext {
  simulation: SimulationState;
  blueprints: BlueprintIndex;
  tickHours: number;
  events: SimulationEventPayload[];
  ambient: {
    temperature: number;
    humidity: number;
    co2: number;
  };
  setpoints: {
    temperature?: number;
    humidity?: number;
    co2?: number;
    ppfd?: number;
  };
  commitResult?: CommitResult;
}
