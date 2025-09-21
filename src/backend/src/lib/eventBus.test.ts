import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus, SimulationEvent } from './eventBus.js';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  afterEach(() => {
    bus.complete();
    vi.useRealTimers();
  });

  it('broadcasts events to multiple subscribers', () => {
    const receivedA: SimulationEvent[] = [];
    const receivedB: SimulationEvent[] = [];

    const subscriptionA = bus.events().subscribe((event) => receivedA.push(event));
    const subscriptionB = bus.events().subscribe((event) => receivedB.push(event));

    bus.emit('sim.tickCompleted', undefined, 1);

    expect(receivedA).toHaveLength(1);
    expect(receivedB).toHaveLength(1);
    expect(receivedA[0].tick).toBe(1);
    expect(typeof receivedA[0].ts).toBe('number');

    subscriptionA.unsubscribe();
    subscriptionB.unsubscribe();
  });

  it('filters events by wildcard type', () => {
    const received: SimulationEvent[] = [];
    const subscription = bus.events({ type: 'plant.*' }).subscribe((event) => received.push(event));

    bus.emit('plant.stageChanged', undefined, 2);
    bus.emit('sim.tickCompleted', undefined, 2);

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('plant.stageChanged');

    subscription.unsubscribe();
  });

  it('buffers events over a time window', async () => {
    vi.useFakeTimers();
    const batches: SimulationEvent[][] = [];
    const subscription = bus.buffered({ timeMs: 100 }).subscribe((batch) => batches.push(batch));

    bus.emit('plant.stageChanged', undefined, 3);
    bus.emit('plant.harvested', undefined, 3);

    await vi.advanceTimersByTimeAsync(100);

    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(2);
    expect(batches[0][0].type).toBe('plant.stageChanged');
    expect(batches[0][1].type).toBe('plant.harvested');

    subscription.unsubscribe();
  });

  it('supports combined type and level filters', () => {
    const received: SimulationEvent[] = [];
    const subscription = bus
      .events({ type: ['device.*', /^plant\./], level: ['warning', 'error'] })
      .subscribe((event) => received.push(event));

    bus.emit('device.degraded', { deviceId: 'dev-1' }, 4, 'warning');
    bus.emit('plant.stageChanged', { plantId: 'plant-1' }, 4, 'info');
    bus.emit('device.degraded', { deviceId: 'dev-2' }, 4, 'info');
    bus.emit('plant.alert', { plantId: 'plant-2' }, 4, 'error');

    expect(received).toHaveLength(2);
    expect(received[0]).toMatchObject({ type: 'device.degraded', level: 'warning' });
    expect(received[1]).toMatchObject({ type: 'plant.alert', level: 'error' });

    subscription.unsubscribe();
  });

  it('flushes buffered batches when the maxBufferSize is reached', async () => {
    vi.useFakeTimers();
    const batches: SimulationEvent[][] = [];
    const subscription = bus
      .buffered({ timeMs: 100, maxBufferSize: 2 })
      .subscribe((batch) => batches.push(batch));

    bus.emit('plant.stageChanged', undefined, 5);
    bus.emit('plant.harvested', undefined, 5);

    await Promise.resolve();

    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(2);

    bus.emit('plant.pruned', undefined, 5);
    await vi.advanceTimersByTimeAsync(100);

    expect(batches).toHaveLength(2);
    expect(batches[1]).toHaveLength(1);

    subscription.unsubscribe();
  });

  it('queues additional buffered batches without dropping events under backpressure', async () => {
    vi.useFakeTimers();
    const batches: SimulationEvent[][] = [];
    const subscription = bus
      .buffered({ timeMs: 200, maxBufferSize: 3 })
      .subscribe((batch) => batches.push(batch));

    bus.emit('device.degraded', undefined, 6);
    bus.emit('device.repaired', undefined, 6);
    bus.emit('device.statusChanged', undefined, 6);
    bus.emit('device.scheduledMaintenance', undefined, 6);
    bus.emit('device.calibrated', undefined, 6);

    await Promise.resolve();
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(3);

    await vi.advanceTimersByTimeAsync(250);

    expect(batches).toHaveLength(2);
    expect(batches[1]).toHaveLength(2);

    subscription.unsubscribe();
  });

  it('delivers events even when logged at error level', () => {
    const received: SimulationEvent[] = [];
    const subscription = bus.events().subscribe((event) => received.push(event));

    bus.emit('system.failure', { component: 'pump-1' }, 7, 'error');

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      type: 'system.failure',
      level: 'error',
      payload: { component: 'pump-1' },
    });

    subscription.unsubscribe();
  });
});
