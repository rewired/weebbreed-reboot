import { access } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { BlueprintRepository } from '../data/index.js';

export * from './state/models.js';
export * from './lib/rng.js';
export * from './state/serialization.js';
export * from './stateFactory.js';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

const resolveDataDirectory = async (): Promise<string> => {
  const candidates = [
    process.env.WEEBBREED_DATA_DIR,
    path.resolve(moduleDirectory, '../../../..', 'data'),
    path.resolve(process.cwd(), 'data'),
    path.resolve(process.cwd(), '..', 'data'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch (error) {
      // continue searching
    }
  }

  throw new Error('Unable to locate data directory. Set WEEBBREED_DATA_DIR to override.');
};

export const bootstrap = async () => {
  const dataDirectory = await resolveDataDirectory();
  const repository = await BlueprintRepository.loadFrom(dataDirectory);
  const summary = repository.getSummary();

  console.log(
    `Loaded blueprint data from ${dataDirectory} (${summary.loadedFiles} files, versions: ${Object.keys(summary.versions).length})`,
  );

  if (process.env.NODE_ENV !== 'production') {
    repository.onHotReload(
      (result) => {
        console.log(`Blueprint data hot-reloaded (${result.summary.loadedFiles} files validated).`);
      },
      {
        onHotReloadError: (error) => {
          console.error('Blueprint data reload failed', error);
        },
      },
    );
  }

  return repository;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  bootstrap().catch((error) => {
    console.error('Backend simulation bootstrap failed', error);
    process.exitCode = 1;
  });
}
