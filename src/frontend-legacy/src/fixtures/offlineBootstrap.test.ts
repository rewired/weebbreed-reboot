import { describe, expect, it } from 'vitest';
import { CLICKDUMMY_SEED } from './deterministic';
import { createOfflineBootstrapPayload, type OfflineBootstrapOptions } from './offlineBootstrap';

const BASE_OPTIONS: OfflineBootstrapOptions = {
  seed: CLICKDUMMY_SEED,
  tickLengthMinutes: 60,
  startDate: '2025-01-01T00:00:00.000Z',
  isPaused: true,
  targetTickRate: 1,
};

describe('createOfflineBootstrapPayload', () => {
  it('produces identical payloads for repeated hydrations with the same seed', () => {
    const first = createOfflineBootstrapPayload(BASE_OPTIONS);
    const second = createOfflineBootstrapPayload(BASE_OPTIONS);

    expect(second).toEqual(first);
  });
});
