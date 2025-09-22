import { beforeAll, describe, expect, it } from 'vitest';
import {
  getRoomPurpose,
  listRoomPurposes,
  requireRoomPurpose,
  resolveRoomPurposeId,
} from './roomPurposes/index.js';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import { loadTestRoomPurposes } from '../testing/loadTestRoomPurposes.js';

let repository: BlueprintRepository;

beforeAll(async () => {
  repository = await loadTestRoomPurposes();
});

describe('roomPurposes module', () => {
  it('lists shipped room purposes', () => {
    const purposes = listRoomPurposes(repository);
    expect(purposes.length).toBeGreaterThan(0);
    const names = purposes.map((purpose) => purpose.name);
    expect(names).toContain('Grow Room');
  });

  it('resolves purposes by name and id case-insensitively', () => {
    const growRoom = requireRoomPurpose(repository, 'grow room', { by: 'name' });
    expect(growRoom.name).toBe('Grow Room');

    const upperId = growRoom.id.toUpperCase();
    expect(getRoomPurpose(repository, upperId, { by: 'id' })).toMatchObject({ name: 'Grow Room' });
  });

  it('resolves purposes by slug case-insensitively', () => {
    const growRoom = requireRoomPurpose(repository, 'GROWROOM', { by: 'kind' });
    expect(growRoom.kind).toBe('growroom');
    expect(growRoom.name).toBe('Grow Room');
  });

  it('exposes laboratory metadata by slug', () => {
    const laboratory = requireRoomPurpose(repository, 'lab', { by: 'kind' });
    expect(laboratory.kind).toBe('lab');
    expect(laboratory.name).toBe('Laboratory');
  });

  it('throws when requiring an unknown purpose', () => {
    expect(() => requireRoomPurpose(repository, 'Unknown Purpose', { by: 'name' })).toThrow(
      /Unknown room purpose name/i,
    );
  });

  it('resolves identifiers by name', () => {
    const id = resolveRoomPurposeId(repository, 'Break Room');
    expect(typeof id).toBe('string');
    expect(id).not.toHaveLength(0);
    expect(requireRoomPurpose(repository, id, { by: 'id' }).name).toBe('Break Room');
  });
});
