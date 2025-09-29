import type { DevicePriceEntry, StrainPriceEntry } from '@/data/schemas/index.js';
import type { EconomicsSettings, UtilityPrices } from '@/state/types.js';
import { RNG_STREAM_IDS } from '@/lib/rng.js';
import type { RngService } from '@/lib/rng.js';

export interface PriceCatalog {
  devicePrices: ReadonlyMap<string, DevicePriceEntry>;
  strainPrices: ReadonlyMap<string, StrainPriceEntry>;
  utilityPrices: UtilityPrices;
}

export interface HarvestSaleResult {
  strainId: string;
  grams: number;
  quality: number;
  basePricePerGram: number;
  adjustedPricePerGram: number;
  appliedMultiplier: number;
  marketIndex: number;
  totalRevenue: number;
}

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

const DEFAULT_ECONOMICS: EconomicsSettings = {
  initialCapital: 0,
  itemPriceMultiplier: 1,
  harvestPriceMultiplier: 1,
  rentPerSqmStructurePerTick: 0,
  rentPerSqmRoomPerTick: 0,
};

const MIN_QUALITY_MULTIPLIER = 0.7;
const MAX_QUALITY_MULTIPLIER = 1.2;
const QUALITY_BASELINE = 0.6;
const QUALITY_HEALTH_EXPONENT = 0.75;
const QUALITY_STRESS_EXPONENT = 1.35;

const MARKET_INDEX_MIN = 0.85;
const MARKET_INDEX_MAX = 1.15;
const DEFAULT_MARKET_STREAM_ID = RNG_STREAM_IDS.market;

/**
 * Maps the simulation's normalized quality signal (0–1) onto the economic
 * quality multiplier window (0.7–1.2).
 *
 * Quality ≈0.6 is treated as neutral (multiplier 1.0). Values below that point
 * decay faster towards 0.7 to model stressed harvests, while values above curve
 * gently towards 1.2 to reward healthy plants without runaway pricing.
 */
const computeQualityFactor = (quality: number): number => {
  const q = clamp(quality, 0, 1);

  if (q >= QUALITY_BASELINE) {
    const span = 1 - QUALITY_BASELINE;
    if (span <= 0) {
      return MAX_QUALITY_MULTIPLIER;
    }
    const ratio = (q - QUALITY_BASELINE) / span;
    const eased = Math.pow(ratio, QUALITY_HEALTH_EXPONENT);
    return 1 + eased * (MAX_QUALITY_MULTIPLIER - 1);
  }

  if (QUALITY_BASELINE <= 0) {
    return MIN_QUALITY_MULTIPLIER;
  }

  const ratio = (QUALITY_BASELINE - q) / QUALITY_BASELINE;
  const eased = Math.pow(ratio, QUALITY_STRESS_EXPONENT);
  return 1 - eased * (1 - MIN_QUALITY_MULTIPLIER);
};

export class PricingService {
  private readonly marketStreamId: string;

  constructor(
    private readonly catalog: PriceCatalog,
    private readonly rng?: RngService,
    marketStreamId = DEFAULT_MARKET_STREAM_ID,
  ) {
    this.marketStreamId = marketStreamId;
  }

  getDevicePrice(deviceId: string): DevicePriceEntry | undefined {
    return this.catalog.devicePrices.get(deviceId);
  }

  getStrainPrice(strainId: string): StrainPriceEntry | undefined {
    return this.catalog.strainPrices.get(strainId);
  }

  getUtilityPrices(): UtilityPrices {
    return this.catalog.utilityPrices;
  }

  calculateHarvestSale(
    strainId: string,
    grams: number,
    quality: number,
    economics: EconomicsSettings = DEFAULT_ECONOMICS,
  ): HarvestSaleResult {
    const strainPrice = this.getStrainPrice(strainId);
    const sanitizedGrams = Math.max(Number.isFinite(grams) ? grams : 0, 0);
    const basePricePerGram = strainPrice?.harvestPricePerGram ?? 0;
    const economicsMultiplier = economics.harvestPriceMultiplier ?? 1;

    if (sanitizedGrams <= 0 || basePricePerGram <= 0) {
      return {
        strainId,
        grams: sanitizedGrams,
        quality,
        basePricePerGram,
        adjustedPricePerGram: 0,
        appliedMultiplier: economicsMultiplier,
        marketIndex: 1,
        totalRevenue: 0,
      };
    }

    const qualityFactor = computeQualityFactor(quality);
    const adjustedPricePerGram = basePricePerGram * qualityFactor;
    const marketIndex = this.computeMarketIndex();
    const multiplier = economicsMultiplier * marketIndex;
    const totalRevenue = sanitizedGrams * adjustedPricePerGram * multiplier;

    return {
      strainId,
      grams: sanitizedGrams,
      quality,
      basePricePerGram,
      adjustedPricePerGram,
      appliedMultiplier: multiplier,
      marketIndex,
      totalRevenue,
    };
  }

  private computeMarketIndex(): number {
    if (!this.rng) {
      return 1;
    }

    const stream = this.rng.getStream(this.marketStreamId);
    const value = stream.nextFloat();
    const marketIndex = MARKET_INDEX_MIN + (MARKET_INDEX_MAX - MARKET_INDEX_MIN) * value;
    return clamp(marketIndex, MARKET_INDEX_MIN, MARKET_INDEX_MAX);
  }
}
