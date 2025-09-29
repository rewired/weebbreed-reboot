import { performance } from 'node:perf_hooks';
import type { SimulationClockState } from '@/state/types.js';

export type TickExecutor = () => void | Promise<void>;

export interface SimulationSchedulerOptions {
  tickIntervalMs: number;
  maxTicksPerFrame?: number;
  speed?: number;
  clock?: SimulationClockState;
  timeProvider?: () => number;
  frameScheduler?: (callback: () => void) => unknown;
  frameCanceler?: (handle: unknown) => void;
  onError?: (error: unknown) => void;
}

type SchedulerHandle = unknown;

const clampPositive = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Speed multiplier must be a finite number greater than zero.');
  }
  return value;
};

export class SimulationScheduler {
  private readonly tickExecutor: TickExecutor;

  private readonly tickIntervalMs: number;

  private readonly maxTicksPerFrame: number;

  private readonly timeProvider: () => number;

  private readonly frameScheduler: (callback: () => void) => SchedulerHandle;

  private readonly frameCanceler: (handle: SchedulerHandle) => void;

  private readonly onError?: (error: unknown) => void;

  private readonly clock?: SimulationClockState;

  private running = false;

  private paused = true;

  private speed: number;

  private accumulator = 0;

  private pendingSteps = 0;

  private lastTimestamp = 0;

  private frameHandle: SchedulerHandle | null = null;

  constructor(tickExecutor: TickExecutor, options: SimulationSchedulerOptions) {
    this.tickExecutor = tickExecutor;
    this.tickIntervalMs = options.tickIntervalMs;
    this.maxTicksPerFrame = options.maxTicksPerFrame ?? 5;
    this.timeProvider = options.timeProvider ?? (() => performance.now());
    this.frameScheduler = options.frameScheduler ?? ((callback) => setImmediate(callback));
    this.frameCanceler =
      options.frameCanceler ?? ((handle) => clearImmediate(handle as NodeJS.Immediate));
    this.onError = options.onError;
    this.clock = options.clock;
    this.speed = clampPositive(options.speed ?? 1);
    this.updateClockTargetRate();
  }

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.paused = false;
    this.accumulator = 0;
    this.pendingSteps = 0;
    this.lastTimestamp = this.timeProvider();
    this.updateClockPausedState(false);
    this.scheduleNextFrame();
  }

  stop(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    this.paused = true;
    this.accumulator = 0;
    this.pendingSteps = 0;
    if (this.frameHandle !== null) {
      this.frameCanceler(this.frameHandle);
      this.frameHandle = null;
    }
    this.updateClockPausedState(true);
  }

  pause(): void {
    if (!this.running || this.paused) {
      return;
    }
    this.paused = true;
    this.updateClockPausedState(true);
  }

  resume(): void {
    if (!this.running) {
      this.start();
      return;
    }
    if (!this.paused) {
      return;
    }
    this.paused = false;
    this.lastTimestamp = this.timeProvider();
    this.updateClockPausedState(false);
    this.scheduleNextFrame();
  }

  setSpeed(multiplier: number): void {
    this.speed = clampPositive(multiplier);
    this.updateClockTargetRate();
  }

  async step(count = 1): Promise<void> {
    const steps = Math.max(0, Math.floor(count));
    if (steps === 0) {
      return;
    }
    if (!this.running) {
      for (let index = 0; index < steps; index += 1) {
        await this.executeTick();
      }
      return;
    }
    this.pendingSteps += steps;
  }

  isRunning(): boolean {
    return this.running;
  }

  isPaused(): boolean {
    return this.paused;
  }

  getSpeed(): number {
    return this.speed;
  }

  private scheduleNextFrame(): void {
    if (!this.running || this.frameHandle !== null) {
      return;
    }
    this.frameHandle = this.frameScheduler(() => {
      this.frameHandle = null;
      this.processFrame().catch((error) => {
        this.handleError(error);
      });
    });
  }

  private async processFrame(): Promise<void> {
    if (!this.running) {
      return;
    }

    const now = this.timeProvider();
    const delta = Math.max(0, now - this.lastTimestamp);
    this.lastTimestamp = now;

    if (!this.paused) {
      this.accumulator += delta * this.speed;
    }

    let ticksExecuted = 0;
    while (
      this.running &&
      (this.pendingSteps > 0 || (!this.paused && this.accumulator >= this.tickIntervalMs)) &&
      ticksExecuted < this.maxTicksPerFrame
    ) {
      if (this.pendingSteps > 0) {
        this.pendingSteps -= 1;
      } else {
        this.accumulator -= this.tickIntervalMs;
      }
      ticksExecuted += 1;
      const tickResult = this.executeTick();
      if (tickResult instanceof Promise) {
        try {
          await tickResult;
        } catch (error) {
          this.handleError(error);
          return;
        }
      }
    }

    if (this.running) {
      this.scheduleNextFrame();
    }
  }

  private executeTick(): void | Promise<void> {
    try {
      return this.tickExecutor();
    } catch (error) {
      this.handleError(error);
      return undefined;
    }
  }

  private updateClockPausedState(paused: boolean): void {
    if (this.clock) {
      this.clock.isPaused = paused;
    }
  }

  private updateClockTargetRate(): void {
    if (this.clock) {
      this.clock.targetTickRate = this.speed;
    }
  }

  private handleError(error: unknown): void {
    this.stop();
    if (this.onError) {
      this.onError(error);
      return;
    }
    queueMicrotask(() => {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    });
  }
}
