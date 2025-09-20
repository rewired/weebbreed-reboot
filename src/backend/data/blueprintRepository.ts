import { watch } from 'chokidar';
import path from 'path';
import {
  BlueprintData,
  DataLoadResult,
  DataLoadSummary,
  DataLoaderError,
  loadBlueprintData,
} from './dataLoader.js';

export type HotReloadDisposition = 'commit' | 'defer';
export type HotReloadHandler = (
  payload: DataLoadResult,
) => HotReloadDisposition | void | Promise<HotReloadDisposition | void>;
export type HotReloadErrorHandler = (error: unknown) => void;

export interface BlueprintRepositoryOptions {
  onHotReloadError?: HotReloadErrorHandler;
}

export class BlueprintRepository {
  private data: BlueprintData;
  private summary: DataLoadSummary;

  private stagedResult: DataLoadResult | null = null;

  private constructor(
    private readonly dataDirectory: string,
    result: DataLoadResult,
  ) {
    this.data = result.data;
    this.summary = result.summary;
  }

  static async loadFrom(dataDirectory: string): Promise<BlueprintRepository> {
    const absoluteDir = path.resolve(dataDirectory);
    const result = await loadBlueprintData(absoluteDir);
    return new BlueprintRepository(absoluteDir, result);
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

  listStrains() {
    return Array.from(this.data.strains.values());
  }

  listDevices() {
    return Array.from(this.data.devices.values());
  }

  listCultivationMethods() {
    return Array.from(this.data.cultivationMethods.values());
  }

  getDevicePrice(id: string) {
    return this.data.prices.devices.get(id);
  }

  getStrainPrice(id: string) {
    return this.data.prices.strains.get(id);
  }

  getUtilityPrices() {
    return this.data.prices.utility;
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
    const committed = this.stagedResult;
    this.stagedResult = null;
    return committed;
  }

  discardStagedReload(): void {
    this.stagedResult = null;
  }

  onHotReload(
    handler: HotReloadHandler,
    options: BlueprintRepositoryOptions = {},
  ): () => Promise<void> {
    const watcher = watch(this.dataDirectory, {
      ignoreInitial: true,
    });

    let reloading = false;
    let queued = false;

    const triggerReload = async () => {
      if (reloading) {
        queued = true;
        return;
      }
      reloading = true;
      try {
        const result = await this.reload();
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

    const onWatcherError = (error: Error) => {
      options.onHotReloadError?.(error);
    };

    watcher.on('add', triggerReload);
    watcher.on('change', triggerReload);
    watcher.on('unlink', triggerReload);
    watcher.on('error', onWatcherError);

    return async () => {
      await watcher.close();
    };
  }
}

export default BlueprintRepository;
