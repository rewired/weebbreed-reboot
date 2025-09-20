import type { SimulationState } from './simulation';

export interface SaveGame {
  kind: 'WeedBreedSave';
  version: string;
  createdAt: string;
  tickLengthMinutes: number;
  rngSeed: string;
  state: SimulationState;
}
