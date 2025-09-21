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
});
