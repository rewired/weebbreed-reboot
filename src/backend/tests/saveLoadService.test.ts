import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SaveLoadService } from '../services/saveLoadService.js';
import type { SimulationState } from '../../shared/domain.js';

describe('SaveLoadService', () => {
  it('round-trips simulation state', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wb-save-test-'));
    const service = new SaveLoadService(dir);
    const state: SimulationState = {
      tick: 10,
      tickLengthMinutes: 5,
      rngSeed: 'seed',
      zones: [],
      isPaused: false,
      accumulatedTimeMs: 0
    };
    const filePath = await service.save(state, 'test.json');
    const loaded = await service.load(filePath);
    expect(loaded.tick).toBe(state.tick);
    expect(loaded.tickLengthMinutes).toBe(state.tickLengthMinutes);
  });
});
