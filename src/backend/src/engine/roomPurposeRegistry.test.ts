import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  getPurposeById,
  getPurposeByName,
  loadRoomPurposes,
  type RoomPurpose,
} from './roomPurposeRegistry.js';

const repoRoot = path.resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const shippedDataDirectory = path.join(repoRoot, 'data');

const createRoomPurpose = (overrides: Partial<RoomPurpose> = {}): RoomPurpose => ({
  id: overrides.id ?? '550e8400-e29b-41d4-a716-446655440000',
  kind: 'RoomPurpose',
  name: overrides.name ?? 'Test Room',
  ...overrides,
});

describe('roomPurposeRegistry', () => {
  it('loads the shipped room purpose blueprints', async () => {
    const loaded = await loadRoomPurposes({ dataDirectory: shippedDataDirectory });
    expect(loaded.length).toBeGreaterThan(0);

    const growRoom = getPurposeByName('Grow Room');
    expect(growRoom).toBeDefined();
    expect(growRoom?.name).toBe('Grow Room');

    if (!growRoom) {
      throw new Error('Expected Grow Room blueprint to be present');
    }

    expect(getPurposeById(growRoom.id)).toBe(growRoom);
  });

  it('throws when a blueprint fails validation', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'room-purpose-invalid-'));
    try {
      const blueprintDirectory = path.join(tempDir, 'blueprints', 'roomPurposes');
      await mkdir(blueprintDirectory, { recursive: true });
      const filePath = path.join(blueprintDirectory, 'broken.json');

      const invalidBlueprint: Partial<RoomPurpose> = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        kind: 'RoomPurpose',
      };
      await writeFile(filePath, `${JSON.stringify(invalidBlueprint, null, 2)}\n`);

      await expect(loadRoomPurposes({ dataDirectory: tempDir })).rejects.toThrowError(
        /broken\.json/,
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('performs case-insensitive lookups for both helpers', async () => {
    const loaded = await loadRoomPurposes({ dataDirectory: shippedDataDirectory });
    expect(loaded).not.toHaveLength(0);

    const growRoom = getPurposeByName('gRoW rOoM');
    expect(growRoom).toBeDefined();
    expect(getPurposeByName('GROW ROOM')).toBe(growRoom);

    if (!growRoom) {
      throw new Error('Expected Grow Room blueprint to be present');
    }

    const idUpper = growRoom.id.toUpperCase();
    expect(getPurposeById(idUpper)).toBe(growRoom);

    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'room-purpose-reload-'));
    try {
      const blueprintDirectory = path.join(tempDir, 'blueprints', 'roomPurposes');
      await mkdir(blueprintDirectory, { recursive: true });
      const filePath = path.join(blueprintDirectory, 'custom.json');
      const customPurpose = createRoomPurpose({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Custom Lab',
      });
      await writeFile(filePath, `${JSON.stringify(customPurpose, null, 2)}\n`);

      await loadRoomPurposes({ dataDirectory: tempDir });
      expect(getPurposeByName('Custom Lab')).toMatchObject({ name: 'Custom Lab' });
      expect(getPurposeById('123E4567-E89B-12D3-A456-426614174000')).toMatchObject({
        name: 'Custom Lab',
      });
      expect(getPurposeByName('Grow Room')).toBeUndefined();
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
