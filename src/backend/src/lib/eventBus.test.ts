import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from './eventBus.js';
import type { SimulationEvent } from './eventBus.js';

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
    const [firstA] = receivedA;
    if (!firstA) throw new Error('Expected at least one event for subscriber A');
    expect(firstA.tick).toBe(1);
    expect(typeof firstA.ts).toBe('number');

    subscriptionA.unsubscribe();
    subscriptionB.unsubscribe();
  });

  it('filters events by wildcard type', () => {
    const received: SimulationEvent[] = [];
    const subscription = bus.events({ type: 'plant.*' }).subscribe((event) => received.push(event));

    bus.emit('plant.stageChanged', undefined, 2);
    bus.emit('sim.tickCompleted', undefined, 2);

    expect(received).toHaveLength(1);
    const [first] = received;
    if (!first) throw new Error('Expected at least one filtered event');
    expect(first.type).toBe('plant.stageChanged');

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
    const [firstBatch] = batches;
    if (!firstBatch) throw new Error('Expected at least one buffered batch');
    expect(firstBatch).toHaveLength(2);
    const [firstBufferedEvent, secondBufferedEvent] = firstBatch;
    if (!firstBufferedEvent || !secondBufferedEvent) {
      throw new Error('Expected two buffered events in the batch');
    }
    expect(firstBufferedEvent.type).toBe('plant.stageChanged');
    expect(secondBufferedEvent.type).toBe('plant.harvested');

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
    const [firstMatch, secondMatch] = received;
    if (!firstMatch || !secondMatch) {
      throw new Error('Expected two filtered events');
    }
    expect(firstMatch).toMatchObject({ type: 'device.degraded', level: 'warning' });
    expect(secondMatch).toMatchObject({ type: 'plant.alert', level: 'error' });

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
    const [initialBatch] = batches;
    if (!initialBatch) throw new Error('Expected buffered batch when max size reached');
    expect(initialBatch).toHaveLength(2);

    bus.emit('plant.pruned', undefined, 5);
    await vi.advanceTimersByTimeAsync(100);

    expect(batches).toHaveLength(2);
    const secondBatch = batches[1];
    if (!secondBatch) throw new Error('Expected buffered batch after timer flush');
    expect(secondBatch).toHaveLength(1);

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
    const [firstBufferedBatch] = batches;
    if (!firstBufferedBatch) throw new Error('Expected buffered batch under backpressure');
    expect(firstBufferedBatch).toHaveLength(3);

    await vi.advanceTimersByTimeAsync(250);

    expect(batches).toHaveLength(2);
    const queuedBatch = batches[1];
    if (!queuedBatch) throw new Error('Expected queued buffered batch');
    expect(queuedBatch).toHaveLength(2);

    subscription.unsubscribe();
  });

  it('delivers events even when logged at error level', () => {
    const received: SimulationEvent[] = [];
    const subscription = bus.events().subscribe((event) => received.push(event));

    bus.emit('system.failure', { component: 'pump-1' }, 7, 'error');

    expect(received).toHaveLength(1);
    const [errorEvent] = received;
    if (!errorEvent) throw new Error('Expected at least one delivered error event');
    expect(errorEvent).toMatchObject({
      type: 'system.failure',
      level: 'error',
      payload: { component: 'pump-1' },
    });

    subscription.unsubscribe();
  });
});
