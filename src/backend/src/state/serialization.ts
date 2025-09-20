import { GameState } from './models.js';
import { RngService, SerializedRngState } from '../lib/rng.js';

export const SAVEGAME_KIND = 'WeedBreedSave';
export const DEFAULT_SAVEGAME_VERSION = '0.1.0';

export interface SaveGameEnvelope {
  kind: typeof SAVEGAME_KIND;
  version: string;
  createdAt: string;
  tickLengthMinutes: number;
  rngSeed: string;
  rng: SerializedRngState;
  state: GameState;
}

export interface SerializeOptions {
  version?: string;
  createdAt?: string;
}

export const serializeGameState = (
  state: GameState,
  rng: RngService,
  options: SerializeOptions = {},
): SaveGameEnvelope => {
  const snapshot = rng.serialize();
  const version = options.version ?? state.metadata.simulationVersion ?? DEFAULT_SAVEGAME_VERSION;
  const createdAt = options.createdAt ?? new Date().toISOString();

  return {
    kind: SAVEGAME_KIND,
    version,
    createdAt,
    tickLengthMinutes: state.metadata.tickLengthMinutes,
    rngSeed: snapshot.seed,
    rng: snapshot,
    state,
  };
};

export interface DeserializeResult {
  state: GameState;
  rng: RngService;
}

export const deserializeGameState = (payload: SaveGameEnvelope): DeserializeResult => {
  if (payload.kind !== SAVEGAME_KIND) {
    throw new Error(`Unsupported savegame kind: ${payload.kind}`);
  }
  if (payload.rng.seed !== payload.rngSeed) {
    throw new Error('Savegame RNG seed mismatch.');
  }
  const rng = new RngService(payload.rngSeed, payload.rng);
  return {
    state: payload.state,
    rng,
  };
};

export const cloneSerializedState = (payload: SaveGameEnvelope): SaveGameEnvelope => ({
  kind: payload.kind,
  version: payload.version,
  createdAt: payload.createdAt,
  tickLengthMinutes: payload.tickLengthMinutes,
  rngSeed: payload.rngSeed,
  rng: {
    seed: payload.rng.seed,
    streams: { ...payload.rng.streams },
  },
  state: payload.state,
});
