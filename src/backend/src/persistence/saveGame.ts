import {
  SAVEGAME_KIND,
  legacySaveGameEnvelopeSchema,
  saveGameEnvelopeSchema,
  type LegacySaveGameEnvelopePayload,
  type SaveGameEnvelopePayload,
} from './schemas.js';

export { SAVEGAME_KIND } from './schemas.js';
import type { GameMetadata, GameState } from '@/state/models.js';
import { RngService, type SerializedRngState } from '@/lib/rng.js';

export interface SaveGameHeader {
  kind: typeof SAVEGAME_KIND;
  version: string;
  createdAt: string;
}

export interface SaveGameMetadata {
  tickLengthMinutes: number;
  rngSeed: string;
  plantStress?: NonNullable<GameMetadata['plantStress']>;
  deviceFailure?: NonNullable<GameMetadata['deviceFailure']>;
}

export interface SaveGameEnvelope {
  header: SaveGameHeader;
  metadata: SaveGameMetadata;
  rng: SerializedRngState;
  state: GameState;
}

export interface SerializeOptions {
  version?: string;
  createdAt?: string;
}

export interface SaveGameMigration {
  from: string;
  to: string;
  migrate(payload: unknown): unknown;
}

export interface DeserializeOptions {
  migrations?: SaveGameMigration[];
  targetVersion?: string;
}

export const DEFAULT_SAVEGAME_VERSION = '0.2.0';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

interface VersionInfo {
  version?: string;
  hasHeader: boolean;
  kind?: string;
}

const getVersionInfo = (payload: unknown): VersionInfo => {
  if (!isRecord(payload)) {
    return { hasHeader: false };
  }

  const header = payload.header;
  if (isRecord(header)) {
    const version = typeof header.version === 'string' ? header.version : undefined;
    const kind = typeof header.kind === 'string' ? header.kind : undefined;
    return { version, hasHeader: version !== undefined, kind };
  }

  const version = typeof payload.version === 'string' ? payload.version : undefined;
  const kind = typeof payload.kind === 'string' ? payload.kind : undefined;
  return { version, hasHeader: false, kind };
};

class SaveGameMigrator {
  private readonly migrations = new Map<string, SaveGameMigration>();

  constructor(
    private readonly targetVersion: string,
    migrations: SaveGameMigration[],
  ) {
    for (const migration of migrations) {
      this.migrations.set(migration.from, migration);
    }
  }

  migrate(payload: unknown): unknown {
    let current = payload;
    const visited = new Set<string>();

    for (;;) {
      const info = getVersionInfo(current);
      const detectedVersion = info.version;

      if (!detectedVersion && !info.hasHeader) {
        throw new Error('Unable to determine savegame version.');
      }

      if (info.hasHeader) {
        if (detectedVersion === this.targetVersion) {
          return current;
        }
        if (!detectedVersion) {
          throw new Error('Savegame header is missing version information.');
        }
        if (visited.has(detectedVersion)) {
          throw new Error(`Cyclic savegame migrations detected for version ${detectedVersion}.`);
        }
        visited.add(detectedVersion);
        const migration = this.migrations.get(detectedVersion);
        if (!migration) {
          throw new Error(
            `No migration available to upgrade savegame version ${detectedVersion} to ${this.targetVersion}.`,
          );
        }
        current = migration.migrate(current);
        continue;
      }

      const versionKey = detectedVersion ? `legacy:${detectedVersion}` : 'legacy';
      const migration = this.migrations.get(versionKey) ?? this.migrations.get('legacy');
      if (!migration) {
        throw new Error(
          `Savegame without header could not be migrated (detected version: ${detectedVersion ?? 'unknown'}).`,
        );
      }
      current = migration.migrate(current);
    }
  }
}

const migrateLegacyEnvelope = (
  payload: unknown,
  targetVersion: string,
): SaveGameEnvelopePayload => {
  const legacy = legacySaveGameEnvelopeSchema.parse(payload) as LegacySaveGameEnvelopePayload;
  const rngStreams = legacy.rng.streams ?? {};

  const envelope: SaveGameEnvelope = {
    header: {
      kind: legacy.kind,
      version: targetVersion,
      createdAt: legacy.createdAt,
    },
    metadata: {
      tickLengthMinutes: legacy.tickLengthMinutes,
      rngSeed: legacy.rng.seed ?? legacy.rngSeed,
    },
    rng: {
      seed: legacy.rng.seed ?? legacy.rngSeed,
      streams: { ...rngStreams },
    },
    state: legacy.state,
  };

  return envelope;
};

const createDefaultMigrations = (targetVersion: string): SaveGameMigration[] => [
  {
    from: 'legacy:0.1.0',
    to: targetVersion,
    migrate: (payload) => migrateLegacyEnvelope(payload, targetVersion),
  },
  {
    from: 'legacy',
    to: targetVersion,
    migrate: (payload) => migrateLegacyEnvelope(payload, targetVersion),
  },
];

export const serializeGameState = (
  state: GameState,
  rng: RngService,
  options: SerializeOptions = {},
): SaveGameEnvelope => {
  const snapshot = rng.serialize();
  const version = options.version ?? DEFAULT_SAVEGAME_VERSION;
  const createdAt = options.createdAt ?? new Date().toISOString();

  const metadata: SaveGameMetadata = {
    tickLengthMinutes: state.metadata.tickLengthMinutes,
    rngSeed: snapshot.seed,
  };

  if (state.metadata.plantStress) {
    metadata.plantStress = {
      optimalRangeMultiplier: state.metadata.plantStress.optimalRangeMultiplier,
      stressAccumulationMultiplier: state.metadata.plantStress.stressAccumulationMultiplier,
    };
  }

  if (state.metadata.deviceFailure) {
    metadata.deviceFailure = {
      mtbfMultiplier: state.metadata.deviceFailure.mtbfMultiplier,
    };
  }

  return {
    header: {
      kind: SAVEGAME_KIND,
      version,
      createdAt,
    },
    metadata,
    rng: snapshot,
    state,
  };
};

export const deserializeGameState = (
  payload: unknown,
  options: DeserializeOptions = {},
): { state: GameState; rng: RngService } => {
  const targetVersion = options.targetVersion ?? DEFAULT_SAVEGAME_VERSION;
  const migrations = [...createDefaultMigrations(targetVersion), ...(options.migrations ?? [])];
  const migrator = new SaveGameMigrator(targetVersion, migrations);

  const migrated = migrator.migrate(payload);
  const parsed = saveGameEnvelopeSchema.parse(migrated) as SaveGameEnvelopePayload;

  if (parsed.header.kind !== SAVEGAME_KIND) {
    throw new Error(`Unsupported savegame kind: ${parsed.header.kind}`);
  }

  if (parsed.metadata.rngSeed !== parsed.rng.seed) {
    throw new Error('Savegame RNG seed mismatch.');
  }

  if (parsed.state.metadata.seed !== parsed.metadata.rngSeed) {
    throw new Error('Savegame seed does not match game state metadata.');
  }

  if (parsed.state.metadata.tickLengthMinutes !== parsed.metadata.tickLengthMinutes) {
    parsed.state.metadata.tickLengthMinutes = parsed.metadata.tickLengthMinutes;
  }

  if (parsed.metadata.plantStress) {
    parsed.state.metadata.plantStress = {
      optimalRangeMultiplier: parsed.metadata.plantStress.optimalRangeMultiplier,
      stressAccumulationMultiplier: parsed.metadata.plantStress.stressAccumulationMultiplier,
    };
  } else if (parsed.state.metadata.plantStress) {
    parsed.state.metadata.plantStress = undefined;
  }

  if (parsed.metadata.deviceFailure) {
    parsed.state.metadata.deviceFailure = {
      mtbfMultiplier: parsed.metadata.deviceFailure.mtbfMultiplier,
    };
  } else if (parsed.state.metadata.deviceFailure) {
    parsed.state.metadata.deviceFailure = undefined;
  }

  const rng = new RngService(parsed.metadata.rngSeed, parsed.rng);

  return {
    state: parsed.state,
    rng,
  };
};

export const cloneSerializedState = (payload: SaveGameEnvelope): SaveGameEnvelope => ({
  header: { ...payload.header },
  metadata: { ...payload.metadata },
  rng: {
    seed: payload.rng.seed,
    streams: { ...payload.rng.streams },
  },
  state: payload.state,
});
