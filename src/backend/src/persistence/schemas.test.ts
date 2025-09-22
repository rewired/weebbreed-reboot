import { describe, expect, it } from 'vitest';
import { SAVEGAME_KIND, saveGameEnvelopeSchema } from './schemas.js';
import { createInitialState } from '../stateFactory.js';
import { createStateFactoryContext } from '../testing/fixtures.js';

describe('saveGameEnvelopeSchema', () => {
  it('accepts a well-formed save game envelope', async () => {
    const context = createStateFactoryContext('schema-seed');
    const state = await createInitialState(context);

    const createdAt = '2025-01-01T00:00:00.000Z';
    const envelope = {
      header: { kind: SAVEGAME_KIND, version: '1.0.0', createdAt },
      metadata: {
        tickLengthMinutes: state.metadata.tickLengthMinutes,
        rngSeed: context.rng.getSeed(),
      },
      rng: context.rng.serialize(),
      state,
    } as const;

    const parsed = saveGameEnvelopeSchema.parse(envelope);
    expect(parsed.header.kind).toBe(SAVEGAME_KIND);
    expect(parsed.state.metadata.gameId).toBe(state.metadata.gameId);
    expect(parsed.state.structures).toHaveLength(state.structures.length);
  });

  it('rejects envelopes with invalid metadata', async () => {
    const context = createStateFactoryContext('schema-seed');
    const state = await createInitialState(context);
    const base = {
      header: { kind: SAVEGAME_KIND, version: '1.0.0', createdAt: '2025-01-01T00:00:00.000Z' },
      metadata: {
        tickLengthMinutes: state.metadata.tickLengthMinutes,
        rngSeed: context.rng.getSeed(),
      },
      rng: context.rng.serialize(),
      state,
    } as const;

    const invalid = JSON.parse(JSON.stringify(base)) as typeof base;
    invalid.metadata.tickLengthMinutes = -5;
    invalid.metadata.rngSeed = '';

    const result = saveGameEnvelopeSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
