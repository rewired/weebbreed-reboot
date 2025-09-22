import { describe, expect, it } from 'vitest';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import type { PriceCatalog } from './pricing.js';
import { DevicePriceRegistry, MissingDevicePriceError } from './devicePriceRegistry.js';

const ENTRY = {
  capitalExpenditure: 750,
  baseMaintenanceCostPerTick: 0.002,
  costIncreasePer1000Ticks: 0.0004,
};

describe('DevicePriceRegistry', () => {
  it('returns device prices when present in the catalog', () => {
    const catalog: PriceCatalog = {
      devicePrices: new Map([['known-device', ENTRY]]),
      strainPrices: new Map(),
      utilityPrices: {
        pricePerKwh: 0.15,
        pricePerLiterWater: 0.02,
        pricePerGramNutrients: 0.1,
      },
    };

    const registry = DevicePriceRegistry.fromCatalog(catalog);
    expect(registry.get('known-device')).toEqual(ENTRY);
    expect(registry.require('known-device')).toEqual(ENTRY);
  });

  it('throws a MissingDevicePriceError with metadata when the price is absent', () => {
    const catalog: PriceCatalog = {
      devicePrices: new Map(),
      strainPrices: new Map(),
      utilityPrices: {
        pricePerKwh: 0.15,
        pricePerLiterWater: 0.02,
        pricePerGramNutrients: 0.1,
      },
    };
    const registry = DevicePriceRegistry.fromCatalog(catalog);

    try {
      registry.require('unknown-device', {
        context: 'unit-test',
        blueprintName: 'Ghost Device',
        quantity: 3,
      });
      expect.fail('Expected require to throw for unknown device.');
    } catch (error) {
      expect(error).toBeInstanceOf(MissingDevicePriceError);
      expect((error as MissingDevicePriceError).deviceId).toBe('unknown-device');
      expect((error as MissingDevicePriceError).metadata).toMatchObject({
        context: 'unit-test',
        blueprintName: 'Ghost Device',
        quantity: 3,
      });
      expect((error as Error).message).toContain('context: unit-test');
      expect((error as Error).message).toContain('blueprint: Ghost Device');
      expect((error as Error).message).toContain('quantity: 3');
    }
  });

  it('wraps a blueprint repository lookup', () => {
    const repository = {
      getDevicePrice: (id: string) => (id === 'repo-device' ? ENTRY : undefined),
    } as unknown as BlueprintRepository;

    const registry = DevicePriceRegistry.fromRepository(repository);
    expect(registry.require('repo-device')).toEqual(ENTRY);
    expect(() => registry.require('other-device')).toThrowError(MissingDevicePriceError);
  });
});
