import { describe, expect, it } from 'vitest';
import {
  createBlueprintRepositoryStub,
  createDeviceBlueprint,
  createStructureBlueprint,
} from '../../testing/fixtures.js';
import type { EconomicsSettings } from '../models.js';
import { RngService } from '../../lib/rng.js';
import { createFinanceState } from './finance.js';
import { MissingDevicePriceError } from '../../engine/economy/devicePriceRegistry.js';

describe('state/initialization/finance', () => {
  it('records initial capital, upfront fees, and device purchases in the ledger', () => {
    const structure = createStructureBlueprint({
      upfrontFee: 7500,
      footprint: { length: 10, width: 8, height: 4 },
    });
    const lamp = createDeviceBlueprint({ kind: 'Lamp', id: 'lamp-finance' });
    const climate = createDeviceBlueprint({ kind: 'ClimateUnit', id: 'climate-finance' });
    const repository = createBlueprintRepositoryStub({
      devices: [lamp, climate],
    });
    const economics: EconomicsSettings = {
      initialCapital: 1_000_000,
      itemPriceMultiplier: 1,
      harvestPriceMultiplier: 1,
      rentPerSqmStructurePerTick: 0.15,
      rentPerSqmRoomPerTick: 0.3,
    };
    const rng = new RngService('finance-state');
    const idStream = rng.getStream('ids');

    const state = createFinanceState(
      '2024-01-01T00:00:00Z',
      economics,
      structure,
      [lamp, climate],
      repository,
      idStream,
    );

    const ledgerDescriptions = state.ledger.map((entry) => entry.description);
    expect(ledgerDescriptions).toContain('Initial capital injection');
    expect(ledgerDescriptions).toContain(`Lease upfront payment for ${structure.name}`);
    expect(ledgerDescriptions).toContain('Initial device purchases');

    expect(state.cashOnHand).toBeLessThan(economics.initialCapital);
    expect(state.summary.totalExpenses).toBeGreaterThan(0);
  });

  it('throws a missing price error when installed devices lack price entries', () => {
    const structure = createStructureBlueprint({ upfrontFee: 5000 });
    const lamp = createDeviceBlueprint({ kind: 'Lamp', id: 'lamp-missing-price' });
    const repository = createBlueprintRepositoryStub({
      devices: [lamp],
      devicePrices: new Map(),
    });
    const economics: EconomicsSettings = {
      initialCapital: 50_000,
      itemPriceMultiplier: 1,
      harvestPriceMultiplier: 1,
      rentPerSqmStructurePerTick: 0.1,
      rentPerSqmRoomPerTick: 0.2,
    };
    const rng = new RngService('finance-state-missing-price');
    const idStream = rng.getStream('ids');

    try {
      createFinanceState(
        '2024-01-01T00:00:00Z',
        economics,
        structure,
        [lamp],
        repository,
        idStream,
      );
      expect.fail('Expected createFinanceState to throw when a device price is missing.');
    } catch (error) {
      expect(error).toBeInstanceOf(MissingDevicePriceError);
      expect((error as Error).message).toContain(
        'Missing device price entry for blueprint "lamp-missing-price"',
      );
    }
  });
});
