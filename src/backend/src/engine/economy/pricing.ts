import type {
  DevicePriceEntry,
  StrainPriceEntry,
  UtilityPrices,
} from '../../../data/schemas/index.js';
import type { EconomicsSettings } from '../../state/models.js';
import { RNG_STREAM_IDS } from '../../lib/rng.js';
import type { RngService } from '../../lib/rng.js';

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

const BASELINE_QUALITY = 70;
const QUALITY_ALPHA = 1.25;
const QUALITY_BETA = 1.5;
const LOW_QUALITY_KINK_THRESHOLD = 50;
const LOW_QUALITY_KINK_MULTIPLIER = 0.85;

const MARKET_INDEX_MIN = 0.85;
const MARKET_INDEX_MAX = 1.15;
const DEFAULT_MARKET_STREAM_ID = RNG_STREAM_IDS.market;

const computeQualityFactor = (quality: number): number => {
  const q = clamp(quality, 0, 100);
  if (q >= BASELINE_QUALITY) {
    const ratio = q / BASELINE_QUALITY;
    return Math.pow(ratio, QUALITY_ALPHA);
  }
  const ratio = Math.max(q, 0) / BASELINE_QUALITY;
  const base = Math.pow(ratio, QUALITY_BETA);
  const kink = q < LOW_QUALITY_KINK_THRESHOLD ? LOW_QUALITY_KINK_MULTIPLIER : 1;
  return base * kink;
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
