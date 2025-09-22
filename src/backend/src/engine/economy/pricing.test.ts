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

const createEconomics = (harvestPriceMultiplier = 1.05): EconomicsSettings => ({
  initialCapital: 0,
  itemPriceMultiplier: 1,
  harvestPriceMultiplier,
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

    const sale1 = service.calculateHarvestSale('strain-a', 1200, 0.82, economics);
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

    const sale2 = service.calculateHarvestSale('strain-a', 600, 0.95, economics);
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

    const sale = service.calculateHarvestSale('strain-a', 500, 0.75, economics);

    expect(sale.marketIndex).toBe(1);
    expect(sale.appliedMultiplier).toBeCloseTo(economics.harvestPriceMultiplier ?? 1, 6);
    expect(sale.totalRevenue).toBeCloseTo(
      sale.grams * sale.adjustedPricePerGram * sale.appliedMultiplier,
      6,
    );
  });
  it('maps normalized quality onto the expected multiplier window', () => {
    const catalog = createCatalog();
    const service = new PricingService(catalog);
    const basePrice = catalog.strainPrices.get('strain-a')?.harvestPricePerGram ?? 0;

    const qualities = [0, 0.3, 0.6, 0.85, 1];
    const multipliers = qualities.map((quality) => {
      const sale = service.calculateHarvestSale('strain-a', 1000, quality, createEconomics(1));
      const qualityMultiplier = sale.adjustedPricePerGram / basePrice;
      expect(qualityMultiplier).toBeGreaterThanOrEqual(0.7);
      expect(qualityMultiplier).toBeLessThanOrEqual(1.2);
      return qualityMultiplier;
    });

    expect(multipliers[0]).toBeCloseTo(0.7, 6);
    expect(multipliers[2]).toBeCloseTo(1, 6);
    expect(multipliers[4]).toBeCloseTo(1.2, 6);

    for (let i = 1; i < multipliers.length; i += 1) {
      expect(multipliers[i]).toBeGreaterThanOrEqual(multipliers[i - 1]);
    }
  });

  it('reflects revenue sensitivity to quality changes at neutral economics', () => {
    const catalog = createCatalog();
    const service = new PricingService(catalog);
    const economics = createEconomics(1);
    const grams = 800;

    const poorQualitySale = service.calculateHarvestSale('strain-a', grams, 0.2, economics);
    const baselineQualitySale = service.calculateHarvestSale('strain-a', grams, 0.6, economics);
    const greatQualitySale = service.calculateHarvestSale('strain-a', grams, 0.9, economics);

    const basePrice = catalog.strainPrices.get('strain-a')?.harvestPricePerGram ?? 0;
    const poorMultiplier = poorQualitySale.adjustedPricePerGram / basePrice;
    const baselineMultiplier = baselineQualitySale.adjustedPricePerGram / basePrice;
    const greatMultiplier = greatQualitySale.adjustedPricePerGram / basePrice;

    expect(poorMultiplier).toBeLessThan(baselineMultiplier);
    expect(baselineMultiplier).toBeLessThan(greatMultiplier);
    expect(poorMultiplier).toBeGreaterThanOrEqual(0.7);
    expect(greatMultiplier).toBeLessThanOrEqual(1.2);

    expect(poorQualitySale.totalRevenue).toBeLessThan(baselineQualitySale.totalRevenue);
    expect(baselineQualitySale.totalRevenue).toBeLessThan(greatQualitySale.totalRevenue);
  });
});
