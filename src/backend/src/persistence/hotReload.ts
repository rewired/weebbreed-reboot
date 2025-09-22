import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import type { DataLoadResult, DataLoaderError } from '@/data/dataLoader.js';
import type { EventBus, SimulationEvent } from '@/lib/eventBus.js';
import type { SimulationPhaseHandler } from '@/sim/loop.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normaliseSummary = (result: DataLoadResult) => ({
  loadedFiles: result.summary.loadedFiles,
  versions: { ...result.summary.versions },
  issues: [...result.summary.issues],
});

const formatErrorPayload = (error: unknown) => {
  const base: Record<string, unknown> = {
    message: error instanceof Error ? error.message : String(error),
  };
  if (isRecord(error) && 'issues' in error) {
    base.issues = (error as DataLoaderError).issues;
  }
  return base;
};

export interface HotReloadManagerOptions {
  getCurrentTick?: () => number;
}

type HotReloadableRepository = Pick<
  BlueprintRepository,
  'onHotReload' | 'commitReload' | 'discardStagedReload'
>;

type ReloadListener = (result: DataLoadResult) => void | Promise<void>;

export class BlueprintHotReloadManager {
  private disposeWatcher: (() => Promise<void>) | null = null;

  private readonly listeners = new Set<ReloadListener>();

  constructor(
    private readonly repository: HotReloadableRepository,
    private readonly eventBus: EventBus,
    private readonly getCurrentTick: () => number = () => 0,
  ) {}

  async start(options: HotReloadManagerOptions = {}): Promise<void> {
    if (this.disposeWatcher) {
      return;
    }
    const currentTickProvider = options.getCurrentTick ?? this.getCurrentTick;
    const disposer = await this.repository.onHotReload(
      async () => {
        // Stage reload; commit happens at the next tick boundary.
        return 'defer';
      },
      {
        onHotReloadError: (error) => {
          this.emitReloadFailed(error, currentTickProvider());
        },
      },
    );
    this.disposeWatcher = disposer;
  }

  async stop(): Promise<void> {
    if (!this.disposeWatcher) {
      return;
    }
    const disposer = this.disposeWatcher;
    this.disposeWatcher = null;
    await disposer();
    this.repository.discardStagedReload();
  }

  createCommitHook(): SimulationPhaseHandler {
    return async (context) => {
      const result = this.repository.commitReload();
      if (!result) {
        return;
      }
      const summary = normaliseSummary(result);
      context.events.queue(
        'sim.hotReloaded',
        {
          appliedTick: context.tick,
          summary,
        },
        context.tick,
        'info',
      );
      context.events.queue(
        'reload:data',
        {
          status: 'success',
          appliedTick: context.tick,
          summary,
        },
        context.tick,
        'info',
      );
      await this.notifyListeners(result);
    };
  }

  onReloadCommitted(listener: ReloadListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitReloadFailed(error: unknown, tick: number): void {
    this.eventBus.emit({
      type: 'reload:data',
      level: 'error',
      tick,
      payload: { status: 'error', error: formatErrorPayload(error) },
    });
    const event: SimulationEvent = {
      type: 'sim.reloadFailed',
      level: 'error',
      tick,
      payload: formatErrorPayload(error),
    };
    this.eventBus.emit(event);
  }

  private async notifyListeners(result: DataLoadResult): Promise<void> {
    for (const listener of this.listeners) {
      try {
        await Promise.resolve(listener(result));
      } catch (error) {
        this.eventBus.emit({
          type: 'reload:data',
          level: 'error',
          payload: {
            status: 'error',
            stage: 'listener',
            error: formatErrorPayload(error),
          },
        });
      }
    }
  }
}

export default BlueprintHotReloadManager;
