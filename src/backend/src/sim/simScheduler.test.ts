import { describe, expect, it, vi } from 'vitest';
import type { SimulationClockState } from '@/state/types.js';
import { SimulationScheduler } from './simScheduler.js';

type FrameCallback = () => void;

const createFrameController = () => {
  const callbacks: FrameCallback[] = [];
  return {
    schedule(callback: FrameCallback) {
      callbacks.push(callback);
      return callbacks.length - 1;
    },
    cancel(handle: unknown) {
      if (typeof handle === 'number' && callbacks[handle]) {
        callbacks[handle] = () => {};
      }
    },
    async flush() {
      const callback = callbacks.shift();
      if (callback) {
        callback();
        await Promise.resolve();
      }
    },
    clear() {
      callbacks.length = 0;
    },
    get pending() {
      return callbacks.length;
    },
  };
};

describe('SimulationScheduler', () => {
  it('processes accumulated time with catch-up', async () => {
    const times = [0, 0, 350, 350, 350];
    const controller = createFrameController();
    const executor = vi.fn();
    const scheduler = new SimulationScheduler(executor, {
      tickIntervalMs: 100,
      maxTicksPerFrame: 5,
      timeProvider: () => times.shift() ?? 350,
      frameScheduler: controller.schedule,
      frameCanceler: controller.cancel,
    });

    scheduler.start();
    await controller.flush(); // initial frame
    expect(executor).toHaveBeenCalledTimes(0);

    await controller.flush(); // catch-up frame
    expect(executor).toHaveBeenCalledTimes(3);

    await controller.flush();
    expect(executor).toHaveBeenCalledTimes(3);

    scheduler.stop();
    controller.clear();
  });

  it('supports stepping while paused', async () => {
    const times = [0, 0, 0, 0, 0];
    const controller = createFrameController();
    const executor = vi.fn();
    const scheduler = new SimulationScheduler(executor, {
      tickIntervalMs: 100,
      timeProvider: () => times.shift() ?? 0,
      frameScheduler: controller.schedule,
      frameCanceler: controller.cancel,
    });

    scheduler.start();
    await controller.flush();

    scheduler.pause();
    await controller.flush();

    await scheduler.step(2);
    await controller.flush();
    expect(executor).toHaveBeenCalledTimes(2);

    scheduler.stop();
    controller.clear();
  });

  it('mirrors scheduler state to the simulation clock', async () => {
    const times = [0, 0, 0, 0];
    const controller = createFrameController();
    const clock: SimulationClockState = {
      tick: 0,
      isPaused: true,
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      targetTickRate: 1,
    };
    const scheduler = new SimulationScheduler(() => undefined, {
      tickIntervalMs: 100,
      clock,
      frameScheduler: controller.schedule,
      frameCanceler: controller.cancel,
      timeProvider: () => times.shift() ?? 0,
    });

    scheduler.start();
    expect(clock.isPaused).toBe(false);
    expect(clock.targetTickRate).toBe(1);

    scheduler.pause();
    expect(clock.isPaused).toBe(true);

    scheduler.setSpeed(2);
    expect(clock.targetTickRate).toBe(2);

    scheduler.resume();
    expect(clock.isPaused).toBe(false);

    scheduler.stop();
    expect(clock.isPaused).toBe(true);

    controller.clear();
  });
});
