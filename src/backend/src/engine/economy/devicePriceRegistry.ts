import type { BlueprintRepository } from '../../../data/blueprintRepository.js';
import type { DevicePriceEntry } from '../../../data/schemas/index.js';
import type { PriceCatalog } from './pricing.js';

export interface DevicePriceRequestMetadata {
  readonly context?: string;
  readonly blueprintName?: string;
  readonly quantity?: number;
}

export class MissingDevicePriceError extends Error {
  readonly deviceId: string;
  readonly metadata: DevicePriceRequestMetadata;

  constructor(deviceId: string, metadata: DevicePriceRequestMetadata = {}) {
    const detail = formatMetadata(metadata);
    super(`Missing device price entry for blueprint "${deviceId}"${detail}`);
    this.name = 'MissingDevicePriceError';
    this.deviceId = deviceId;
    this.metadata = metadata;
  }
}

type DevicePriceLookup = (deviceId: string) => DevicePriceEntry | undefined;

export class DevicePriceRegistry {
  constructor(private readonly lookup: DevicePriceLookup) {}

  static fromCatalog(catalog: PriceCatalog): DevicePriceRegistry {
    return new DevicePriceRegistry((deviceId) => catalog.devicePrices.get(deviceId));
  }

  static fromRepository(repository: BlueprintRepository): DevicePriceRegistry {
    return new DevicePriceRegistry((deviceId) => repository.getDevicePrice(deviceId));
  }

  get(deviceId: string): DevicePriceEntry | undefined {
    return this.lookup(deviceId);
  }

  require(deviceId: string, metadata: DevicePriceRequestMetadata = {}): DevicePriceEntry {
    const entry = this.get(deviceId);
    if (!entry) {
      throw new MissingDevicePriceError(deviceId, metadata);
    }
    return entry;
  }
}

const formatMetadata = (metadata: DevicePriceRequestMetadata): string => {
  const parts: string[] = [];

  if (metadata.context) {
    parts.push(`context: ${metadata.context}`);
  }

  if (metadata.blueprintName) {
    parts.push(`blueprint: ${metadata.blueprintName}`);
  }

  if (typeof metadata.quantity === 'number') {
    parts.push(`quantity: ${metadata.quantity}`);
  }

  if (parts.length === 0) {
    return '';
  }

  return ` (${parts.join(', ')})`;
};

export const formatDevicePriceMetadata = formatMetadata;
