import { describe, expect, it } from 'vitest';
import { validateSave } from '../../shared/schemas/index';
import { loadBlueprints } from '../loaders/blueprintLoader';

describe('schema validation', () => {
  it('rejects malformed save payloads', () => {
    expect(() => validateSave({} as never)).toThrow();
  });

  it('loads and validates blueprint bundle', async () => {
    await expect(loadBlueprints()).resolves.toBeTruthy();
  });
});
