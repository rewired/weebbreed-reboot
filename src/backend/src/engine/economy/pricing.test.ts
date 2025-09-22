import { describe, expect, it } from 'vitest';

import { PricingService, type PriceCatalog } from './pricing.js';
import { RngService, RNG_STREAM_IDS } from '@/lib/rng.js';
import type { EconomicsSettings } from '@/state/models.js';

const MARKET_INDEX_MIN = 0.85;
const MARKET_INDEX_MAX = 1.15;

const createCatalog = (): PriceCatalog => ({
  devicePrices: new Map(),
  strainPrices: new Map([
    [
      'strain-a',
      {
        seedPrice: 0.5,
        harvestPricePerGram: 4.2,
      },
    ],
  ]),
  utilityPrices: {
    pricePerKwh: 0.15,
    pricePerLiterWater: 0.02,
    pricePerGramNutrients: 0.1,
  },
});

const createEconomics = (): EconomicsSettings => ({
  initialCapital: 0,
  itemPriceMultiplier: 1,
  harvestPriceMultiplier: 1.05,
  rentPerSqmStructurePerTick: 0,
  rentPerSqmRoomPerTick: 0,
});

describe('PricingService', () => {
  it('applies seeded market index multiplier deterministically', () => {
    const catalog = createCatalog();
    const seed = 'market-seed';
    const rng = new RngService(seed);
    const service = new PricingService(catalog, rng);
    const expectedRng = new RngService(seed);
    const marketStream = expectedRng.getStream(RNG_STREAM_IDS.market);
    const economics = createEconomics();

    const sale1 = service.calculateHarvestSale('strain-a', 1200, 82, economics);
    const expectedIndex1 =
      MARKET_INDEX_MIN + (MARKET_INDEX_MAX - MARKET_INDEX_MIN) * marketStream.nextFloat();
    const economicsMultiplier = economics.harvestPriceMultiplier ?? 1;

    expect(sale1.marketIndex).toBeGreaterThanOrEqual(MARKET_INDEX_MIN);
    expect(sale1.marketIndex).toBeLessThanOrEqual(MARKET_INDEX_MAX);
    expect(sale1.marketIndex).toBeCloseTo(expectedIndex1, 6);
    expect(sale1.appliedMultiplier).toBeCloseTo(economicsMultiplier * expectedIndex1, 6);
    expect(sale1.totalRevenue).toBeCloseTo(
      sale1.grams * sale1.adjustedPricePerGram * sale1.appliedMultiplier,
      6,
    );

    const sale2 = service.calculateHarvestSale('strain-a', 600, 95, economics);
    const expectedIndex2 =
      MARKET_INDEX_MIN + (MARKET_INDEX_MAX - MARKET_INDEX_MIN) * marketStream.nextFloat();

    expect(sale2.marketIndex).toBeGreaterThanOrEqual(MARKET_INDEX_MIN);
    expect(sale2.marketIndex).toBeLessThanOrEqual(MARKET_INDEX_MAX);
    expect(sale2.marketIndex).toBeCloseTo(expectedIndex2, 6);
    expect(sale2.appliedMultiplier).toBeCloseTo(economicsMultiplier * expectedIndex2, 6);
    expect(sale2.totalRevenue).toBeCloseTo(
      sale2.grams * sale2.adjustedPricePerGram * sale2.appliedMultiplier,
      6,
    );
  });

  it('returns neutral market index when RNG is not provided', () => {
    const catalog = createCatalog();
    const service = new PricingService(catalog);
    const economics = createEconomics();

    const sale = service.calculateHarvestSale('strain-a', 500, 75, economics);

    expect(sale.marketIndex).toBe(1);
    expect(sale.appliedMultiplier).toBeCloseTo(economics.harvestPriceMultiplier ?? 1, 6);
    expect(sale.totalRevenue).toBeCloseTo(
      sale.grams * sale.adjustedPricePerGram * sale.appliedMultiplier,
      6,
    );
  });
});
