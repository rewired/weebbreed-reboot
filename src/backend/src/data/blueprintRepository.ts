import path from 'path';
import { watchData } from '@runtime/dataWatcher.js';
import { DataLoaderError, loadBlueprintData } from './dataLoader.js';
import type {
  BlueprintData,
  DataLoadResult,
  DataLoadSummary,
  LoadBlueprintDataOptions,
} from './dataLoader.js';
import type {
  DevicePriceEntry,
  StrainPriceEntry,
  SubstrateBlueprint,
  ContainerBlueprint,
  CultivationMethodPriceEntry,
  SubstratePriceEntry,
  ContainerPriceEntry,
} from './schemas/index.js';

export type HotReloadDisposition = 'commit' | 'defer';
export type HotReloadHandler = (
  payload: DataLoadResult,
) => HotReloadDisposition | void | Promise<HotReloadDisposition | void>;
export type HotReloadErrorHandler = (error: unknown) => void;

export interface BlueprintRepositoryOptions {
  onHotReloadError?: HotReloadErrorHandler;
  onReloadPending?: (promise: Promise<void>) => void;
}

export class BlueprintRepository {
  private data: BlueprintData;
  private summary: DataLoadSummary;

  private stagedResult: DataLoadResult | null = null;
  private substrateSlugIndex = new Map<string, SubstrateBlueprint>();
  private containerSlugIndex = new Map<string, ContainerBlueprint>();

  private constructor(
    private readonly dataDirectory: string,
    result: DataLoadResult,
  ) {
    this.data = result.data;
    this.summary = result.summary;
    this.rebuildSlugIndexes();
  }

  static async loadFrom(
    dataDirectory: string,
    options: LoadBlueprintDataOptions = {},
  ): Promise<BlueprintRepository> {
    const absoluteDir = path.resolve(dataDirectory);
    const result = await loadBlueprintData(absoluteDir, options);
    return new BlueprintRepository(absoluteDir, result);
  }

  private rebuildSlugIndexes() {
    this.substrateSlugIndex = new Map(
      Array.from(this.data.substrates.values()).map((item) => [item.slug, item]),
    );
    this.containerSlugIndex = new Map(
      Array.from(this.data.containers.values()).map((item) => [item.slug, item]),
    );
  }

  getStrain(id: string) {
    return this.data.strains.get(id);
  }

  getDevice(id: string) {
    return this.data.devices.get(id);
  }

  getCultivationMethod(id: string) {
    return this.data.cultivationMethods.get(id);
  }

  getSubstrate(id: string) {
    return this.data.substrates.get(id);
  }

  getSubstrateBySlug(slug: string) {
    return this.substrateSlugIndex.get(slug);
  }

  getContainer(id: string) {
    return this.data.containers.get(id);
  }

  getContainerBySlug(slug: string) {
    return this.containerSlugIndex.get(slug);
  }

  getRoomPurpose(id: string) {
    return this.data.roomPurposes.get(id);
  }

  listStrains() {
    return Array.from(this.data.strains.values());
  }

  listDevices() {
    return Array.from(this.data.devices.values());
  }

  listCultivationMethods() {
    return Array.from(this.data.cultivationMethods.values());
  }

  listSubstrates() {
    return Array.from(this.data.substrates.values());
  }

  listContainers() {
    return Array.from(this.data.containers.values());
  }

  listRoomPurposes() {
    return Array.from(this.data.roomPurposes.values());
  }

  getDevicePrice(id: string) {
    return this.data.prices.devices.get(id);
  }

  getStrainPrice(id: string) {
    return this.data.prices.strains.get(id);
  }

  getCultivationMethodPrice(id: string) {
    return this.data.prices.cultivationMethods.get(id);
  }

  getSubstratePrice(slug: string) {
    return this.data.prices.consumables.substrates.get(slug);
  }

  getContainerPrice(slug: string) {
    return this.data.prices.consumables.containers.get(slug);
  }

  getUtilityPrices() {
    return this.data.prices.utility;
  }

  listDevicePrices(): Array<[string, DevicePriceEntry]> {
    return Array.from(this.data.prices.devices.entries());
  }

  listStrainPrices(): Array<[string, StrainPriceEntry]> {
    return Array.from(this.data.prices.strains.entries());
  }

  listCultivationMethodPrices(): Array<[string, CultivationMethodPriceEntry]> {
    return Array.from(this.data.prices.cultivationMethods.entries());
  }

  listSubstratePrices(): Array<[string, SubstratePriceEntry]> {
    return Array.from(this.data.prices.consumables.substrates.entries());
  }

  listContainerPrices(): Array<[string, ContainerPriceEntry]> {
    return Array.from(this.data.prices.consumables.containers.entries());
  }

  getSummary(): DataLoadSummary {
    return {
      loadedFiles: this.summary.loadedFiles,
      versions: { ...this.summary.versions },
      issues: [...this.summary.issues],
    };
  }

  async reload(): Promise<DataLoadResult> {
    const result = await loadBlueprintData(this.dataDirectory);
    this.stagedResult = result;
    return result;
  }

  commitReload(): DataLoadResult | null {
    if (!this.stagedResult) {
      return null;
    }
    this.data = this.stagedResult.data;
    this.summary = this.stagedResult.summary;
    this.rebuildSlugIndexes();
    const committed = this.stagedResult;
    this.stagedResult = null;
    return committed;
  }

  discardStagedReload(): void {
    this.stagedResult = null;
  }

  async onHotReload(
    handler: HotReloadHandler,
    options: BlueprintRepositoryOptions = {},
  ): Promise<() => Promise<void>> {
    let reloading = false;
    let queued = false;

    const triggerReload = async () => {
      if (reloading) {
        queued = true;
        return;
      }
      reloading = true;
      try {
        const reloadPromise = this.reload();
        options.onReloadPending?.(reloadPromise.then(() => undefined));
        const result = await reloadPromise;
        const disposition = await handler(result);
        if (disposition !== 'defer' && this.stagedResult) {
          this.commitReload();
        }
      } catch (error) {
        if (error instanceof DataLoaderError) {
          options.onHotReloadError?.({
            name: error.name,
            message: error.message,
            issues: error.issues,
          });
        } else {
          options.onHotReloadError?.(error);
        }
      }
      reloading = false;
      if (queued) {
        queued = false;
        void triggerReload();
      }
    };

    const watcher = watchData(this.dataDirectory, () => triggerReload(), {
      onError: (error) => {
        options.onHotReloadError?.(error);
      },
    });

    await watcher.whenReady();

    return async () => {
      await watcher.close();
    };
  }
}

export default BlueprintRepository;
