import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockLoadFrom = vi.fn();

vi.mock('../facade/index.js', () => ({}));
vi.mock('../data/index.js', () => ({
  BlueprintRepository: {
    loadFrom: mockLoadFrom,
  },
}));

const createRepositoryStub = () => ({
  getSummary: () => ({ loadedFiles: 0, versions: {}, issues: [] }),
  onHotReload: vi.fn(() => vi.fn(async () => {})),
});

describe('resolveDataDirectory', () => {
  let originalEnvOverride: string | undefined;

  beforeEach(() => {
    originalEnvOverride = process.env.WEEBBREED_DATA_DIR;
    delete process.env.WEEBBREED_DATA_DIR;
    mockLoadFrom.mockReset();
    mockLoadFrom.mockImplementation(async () => createRepositoryStub());
  });

  afterEach(() => {
    if (originalEnvOverride === undefined) {
      delete process.env.WEEBBREED_DATA_DIR;
    } else {
      process.env.WEEBBREED_DATA_DIR = originalEnvOverride;
    }
  });

  it('selects the repository data directory when running from source', async () => {
    const { resolveDataDirectory, bootstrap } = await import('./index.js');
    const moduleDir = path.dirname(fileURLToPath(new URL('./index.ts', import.meta.url)));
    const expected = path.resolve(moduleDir, '../../..', 'data');

    const resolved = await resolveDataDirectory({ envOverride: undefined });
    expect(resolved).toBe(expected);

    mockLoadFrom.mockClear();
    await bootstrap({ envOverride: undefined });
    expect(mockLoadFrom).toHaveBeenCalledWith(expected);
  });

  it('prefers a packaged data directory colocated with the dist build', async () => {
    const { resolveDataDirectory, bootstrap } = await import('./index.js');

    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'weebbreed-backend-'));
    const packageRoot = path.join(tempRoot, 'node_modules', '@weebbreed', 'backend');
    const distDirectory = path.join(packageRoot, 'dist');
    const packagedDataDirectory = path.join(packageRoot, 'data');

    const blueprintSubdirectories = [
      ['blueprints', 'strains'],
      ['blueprints', 'devices'],
      ['blueprints', 'cultivationMethods'],
      ['prices'],
    ] as const;

    try {
      await mkdir(distDirectory, { recursive: true });
      for (const segments of blueprintSubdirectories) {
        await mkdir(path.join(packagedDataDirectory, ...segments), { recursive: true });
      }
      const cwd = path.join(tempRoot, 'app');
      await mkdir(cwd, { recursive: true });

      const options = {
        moduleDirectory: distDirectory,
        cwd,
        envOverride: undefined,
      } as const;

      const resolved = await resolveDataDirectory(options);
      expect(resolved).toBe(packagedDataDirectory);

      mockLoadFrom.mockClear();
      await bootstrap(options);
      expect(mockLoadFrom).toHaveBeenCalledWith(packagedDataDirectory);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
