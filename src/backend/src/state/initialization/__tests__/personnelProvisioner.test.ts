import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { provisionPersonnelDirectory } from '../personnelProvisioner.js';

const readJson = async (filePath: string) => {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw) as unknown;
};

describe('state/initialization/personnelProvisioner', () => {
  it('provisions missing files using RandomUser profiles', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wb-provision-'));
    try {
      const personnelDir = path.join(tempDir, 'personnel');
      const responses = new Map([
        [
          'seed-base-0',
          {
            results: [
              {
                gender: 'male',
                name: { first: 'Liam', last: 'Smith' },
                login: { salt: 'seed-liam' },
              },
              {
                gender: 'female',
                name: { first: 'Ava', last: 'Johnson' },
                login: { salt: 'seed-ava' },
              },
            ],
          },
        ],
        [
          'seed-base-1',
          {
            results: [
              {
                gender: 'female',
                name: { first: 'Emma', last: 'Brown' },
                login: { salt: 'seed-emma' },
              },
              {
                gender: 'male',
                name: { first: 'Noah', last: 'Davis' },
                login: { salt: 'seed-noah' },
              },
            ],
          },
        ],
      ] satisfies Array<[string, unknown]>);

      const fetchMock: typeof fetch = vi.fn(async (url) => {
        const parsed = new URL(typeof url === 'string' ? url : url.toString());
        const seed = parsed.searchParams.get('seed');
        const payload = responses.get(seed ?? '');
        if (!payload) {
          return {
            ok: false,
            status: 500,
            json: async () => ({}),
          } as unknown as Response;
        }
        return {
          ok: true,
          json: async () => payload,
        } as unknown as Response;
      });

      const result = await provisionPersonnelDirectory({
        dataDirectory: tempDir,
        rngSeed: 'seed-base',
        fetchImpl: fetchMock,
        targetProfileCount: 4,
        batchSize: 2,
      });

      expect(result.changed).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      const maleNames = (await readJson(
        path.join(personnelDir, 'names', 'firstNamesMale.json'),
      )) as string[];
      const femaleNames = (await readJson(
        path.join(personnelDir, 'names', 'firstNamesFemale.json'),
      )) as string[];
      const lastNames = (await readJson(
        path.join(personnelDir, 'names', 'lastNames.json'),
      )) as string[];
      const seeds = (await readJson(path.join(personnelDir, 'randomSeeds.json'))) as string[];

      expect(maleNames).toEqual(['Liam', 'Noah']);
      expect(femaleNames).toEqual(['Ava', 'Emma']);
      expect(lastNames).toEqual(['Brown', 'Davis', 'Johnson', 'Smith']);
      expect(seeds).toEqual(['seed-ava', 'seed-emma', 'seed-liam', 'seed-noah']);
      expect(result.directory?.firstNamesMale).toEqual(['Liam', 'Noah']);
      expect(result.directory?.firstNamesFemale).toEqual(['Ava', 'Emma']);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('skips provisioning when files already exist', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wb-provision-existing-'));
    try {
      const personnelDir = path.join(tempDir, 'personnel');
      const namesDir = path.join(personnelDir, 'names');
      await fs.mkdir(namesDir, { recursive: true });
      await fs.writeFile(
        path.join(namesDir, 'firstNamesMale.json'),
        JSON.stringify(['ExistingMale']),
      );
      await fs.writeFile(
        path.join(namesDir, 'firstNamesFemale.json'),
        JSON.stringify(['ExistingFemale']),
      );
      await fs.writeFile(path.join(namesDir, 'lastNames.json'), JSON.stringify(['ExistingLast']));
      await fs.writeFile(path.join(personnelDir, 'randomSeeds.json'), JSON.stringify(['seed-old']));

      const fetchMock = vi.fn<typeof fetch>();

      const result = await provisionPersonnelDirectory({
        dataDirectory: tempDir,
        rngSeed: 'seed-base',
        fetchImpl: fetchMock,
      });

      expect(result.changed).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
