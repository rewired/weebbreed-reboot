import { describe, expect, it } from 'vitest';
import { EventBus, createEventCollector, type SimulationEvent } from '../lib/eventBus.js';
import type { SimulationPhaseContext } from '../sim/loop.js';
import type { GameState } from '../state/models.js';
import { BlueprintHotReloadManager } from './hotReload.js';
import type { DataLoadResult, DataIssue } from '../../data/dataLoader.js';
import { DataLoaderError as LoaderError } from '../../data/dataLoader.js';
import type { HotReloadDisposition } from '../../data/blueprintRepository.js';

class FakeRepository {
  public handler:
    | ((
        payload: DataLoadResult,
      ) => HotReloadDisposition | void | Promise<HotReloadDisposition | void>)
    | null = null;
  public errorHandler: ((error: unknown) => void) | null = null;
  public staged: DataLoadResult | null = null;

  onHotReload(
    handler: (payload: DataLoadResult) => void | Promise<void>,
    options?: { onHotReloadError?: (error: unknown) => void },
  ): () => Promise<void> {
    this.handler = handler;
    this.errorHandler = options?.onHotReloadError ?? null;
    return async () => {
      this.handler = null;
      this.errorHandler = null;
    };
  }

  commitReload(): DataLoadResult | null {
    if (!this.staged) {
      return null;
    }
    const result = this.staged;
    this.staged = null;
    return result;
  }

  discardStagedReload(): void {
    this.staged = null;
  }

  async triggerReload(result: DataLoadResult): Promise<void> {
    this.staged = result;
    const disposition = (await this.handler?.(result)) ?? ('commit' as HotReloadDisposition);
    if (disposition !== 'defer' && this.staged) {
      this.commitReload();
    }
  }

  triggerError(error: unknown): void {
    this.errorHandler?.(error);
  }
}

const createResult = (loadedFiles = 1): DataLoadResult => ({
  data: {
    strains: new Map(),
    devices: new Map(),
    cultivationMethods: new Map(),
    prices: {
      devices: new Map(),
      strains: new Map(),
      utility: {
        pricePerKwh: 0,
        pricePerLiterWater: 0,
        pricePerGramNutrients: 0,
      },
    },
  } as unknown as DataLoadResult['data'],
  summary: {
    loadedFiles,
    versions: { 'blueprints/strains/example.json': '1.0.0' },
    issues: [],
  },
});

describe('BlueprintHotReloadManager', () => {
  it('queues sim.hotReloaded event when staged data commits on tick boundary', async () => {
    const repository = new FakeRepository();
    const bus = new EventBus();
    const manager = new BlueprintHotReloadManager(repository, bus);
    await manager.start();

    const result = createResult(3);
    await repository.triggerReload(result);

    const commitHook = manager.createCommitHook();
    const buffered: SimulationEvent[] = [];
    const collector = createEventCollector(buffered, 12);
    const context: SimulationPhaseContext = {
      state: {} as GameState,
      tick: 12,
      tickLengthMinutes: 60,
      phase: 'commit',
      events: collector,
    };

    commitHook(context);

    expect(buffered).toHaveLength(1);
    expect(buffered[0].type).toBe('sim.hotReloaded');
    expect(buffered[0].payload).toMatchObject({
      appliedTick: 12,
      summary: { loadedFiles: 3 },
    });
  });

  it('emits sim.reloadFailed event when reload validation fails', async () => {
    const repository = new FakeRepository();
    const bus = new EventBus();
    const manager = new BlueprintHotReloadManager(repository, bus, () => 7);
    const received: SimulationEvent[] = [];
    const subscription = bus.events().subscribe((event) => received.push(event));

    await manager.start();

    const issues: DataIssue[] = [
      { level: 'error', message: 'Invalid blueprint', file: 'blueprints/strains/example.json' },
    ];
    const error = new LoaderError(issues);
    repository.triggerError(error);

    expect(received.some((event) => event.type === 'sim.reloadFailed')).toBe(true);
    const failure = received.find((event) => event.type === 'sim.reloadFailed');
    expect(failure?.tick).toBe(7);
    expect(failure?.payload).toMatchObject({ message: 'Data loader encountered blocking issues.' });

    subscription.unsubscribe();
  });
});
