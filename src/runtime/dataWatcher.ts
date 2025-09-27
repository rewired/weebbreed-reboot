import { createRequire } from 'node:module';
import type { FSWatcher, WatchOptions } from 'chokidar';

export type DataWatcherTarget = string | string[];

export type DataWatcherHandler = (changedPaths: string[]) => void | Promise<void>;

export interface DataWatcherOptions {
  /**
   * Debounce interval in milliseconds before invoking the handler. Defaults to 75ms.
   */
  debounceMs?: number;
  /**
   * Optional chokidar specific watch options.
   */
  watchOptions?: WatchOptions;
  /**
   * Called when the watcher or handler encounters an error.
   */
  onError?: (error: unknown) => void;
}

const DEFAULT_DEBOUNCE_MS = 75;

const runtimeRequire = createRequire(import.meta.url);

let cachedChokidar: typeof import('chokidar') | null = null;

const loadChokidar = (): typeof import('chokidar') => {
  if (cachedChokidar) {
    return cachedChokidar;
  }

  try {
    const chokidarModule = runtimeRequire('chokidar');
    cachedChokidar = chokidarModule;
    return chokidarModule;
  } catch (runtimeError) {
    try {
      const backendRequire = createRequire(new URL('../backend/package.json', import.meta.url));
      const chokidarModule = backendRequire('chokidar');
      cachedChokidar = chokidarModule;
      return chokidarModule;
    } catch (backendError) {
      const cause = backendError instanceof Error ? backendError : runtimeError;
      throw new Error('Failed to load chokidar module.', { cause });
    }
  }
};

const DEFAULT_WATCH_OPTIONS: WatchOptions = {
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 75,
    pollInterval: 20,
  },
};

const asArray = (target: DataWatcherTarget): string[] =>
  Array.isArray(target) ? target : [target];

export class DataWatcher {
  private readonly watcher: FSWatcher;

  private readonly pending = new Set<string>();

  private timer: NodeJS.Timeout | null = null;

  private running = false;

  private disposed = false;

  private ready = false;

  private readonly readyPromise: Promise<void>;

  private resolveReady: (() => void) | null = null;

  constructor(
    targets: DataWatcherTarget,
    private readonly handler: DataWatcherHandler,
    private readonly options: DataWatcherOptions = {},
  ) {
    const watchTargets = asArray(targets);
    const mergedOptions: WatchOptions = {
      ...DEFAULT_WATCH_OPTIONS,
      ...options.watchOptions,
    };

    const chokidar = loadChokidar();
    this.watcher = chokidar.watch(watchTargets, mergedOptions);

    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });

    const handleChange = (filePath: string) => {
      if (this.disposed) {
        return;
      }
      this.pending.add(filePath);
      this.schedule();
    };

    this.watcher.on('add', handleChange);
    this.watcher.on('change', handleChange);
    this.watcher.on('unlink', handleChange);
    this.watcher.on('error', (error) => {
      if (this.disposed) {
        return;
      }
      this.options.onError?.(error);
    });
    this.watcher.on('ready', () => {
      if (this.disposed || this.ready) {
        return;
      }
      this.ready = true;
      this.resolveReady?.();
      this.resolveReady = null;
    });
  }

  private schedule(): void {
    if (this.timer || this.running) {
      return;
    }
    const debounceMs = this.options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, debounceMs);
  }

  private async flush(): Promise<void> {
    if (this.disposed || this.running) {
      return;
    }

    const changes = Array.from(this.pending);
    this.pending.clear();

    if (changes.length === 0) {
      return;
    }

    this.running = true;
    try {
      await Promise.resolve(this.handler(changes));
    } catch (error) {
      this.options.onError?.(error);
    } finally {
      this.running = false;
      if (!this.disposed && this.pending.size > 0) {
        this.schedule();
      }
    }
  }

  async close(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (!this.ready) {
      this.ready = true;
      this.resolveReady?.();
      this.resolveReady = null;
    }
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pending.clear();
    await this.watcher.close();
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }
}

export const watchData = (
  targets: DataWatcherTarget,
  handler: DataWatcherHandler,
  options?: DataWatcherOptions,
): DataWatcher => {
  return new DataWatcher(targets, handler, options);
};

export default DataWatcher;
