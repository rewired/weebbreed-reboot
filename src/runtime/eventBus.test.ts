import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventBus, createUiStream, type SimulationEvent, type UiStreamPacket } from './eventBus.js';
import { TICK_PHASES, type TickCompletedPayload } from '../backend/src/sim/loop.js';

interface TestSnapshot {
  tick: number;
  label: string;
}

interface TestTimeStatus {
  tick: number;
  mode: string;
}

const createPhaseTimings = (): TickCompletedPayload['phaseTimings'] => {
  const timings = {} as TickCompletedPayload['phaseTimings'];
  let startedAt = 0;
  for (const phase of TICK_PHASES) {
    timings[phase] = { startedAt, completedAt: startedAt + 5, durationMs: 5 };
    startedAt += 5;
  }
  return timings;
};

describe('createUiStream', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('produces simulation and tick packets with sanitized metadata', async () => {
    vi.useFakeTimers();
    const eventBus = new EventBus();
    const snapshotProvider = vi.fn(() => ({ tick: 42, label: 'snapshot' }) satisfies TestSnapshot);
    const timeStatusProvider = vi.fn(() => ({ tick: 42, mode: 'paused' }) satisfies TestTimeStatus);
    const stream = createUiStream<TestSnapshot, TestTimeStatus>({
      eventBus,
      snapshotProvider,
      timeStatusProvider,
      simulationBufferMs: 100,
      simulationMaxBatchSize: 1,
      domainBufferMs: 1_000,
      domainMaxBatchSize: 10,
    });

    const packets: UiStreamPacket<TestSnapshot, TestTimeStatus>[] = [];
    const subscription = stream.subscribe((packet) => packets.push(packet));

    const eventTs = Date.now() + 250;
    const phaseTimings = createPhaseTimings();
    const domainEvent: SimulationEvent = {
      type: 'device.degraded',
      payload: { deviceId: 'dev-1' },
      tick: 12,
      ts: eventTs,
      level: 'warning',
      tags: ['maintenance'],
    };

    eventBus.emit({
      type: 'sim.tickCompleted',
      payload: {
        tick: 12,
        durationMs: 20,
        eventCount: 1,
        phaseTimings,
        events: [domainEvent],
      } satisfies TickCompletedPayload,
      tick: 12,
      ts: eventTs,
    });

    await Promise.resolve();

    const tickPacket = packets.find((packet) => packet.channel === 'sim.tickCompleted');
    expect(tickPacket?.payload).toMatchObject({
      tick: 12,
      ts: eventTs,
      durationMs: 20,
      eventCount: 1,
    });
    expect(tickPacket?.payload.events).toEqual([
      {
        type: 'device.degraded',
        payload: { deviceId: 'dev-1' },
        tick: 12,
        ts: eventTs,
        level: 'warning',
        tags: ['maintenance'],
      },
    ]);

    const updatePacket = packets.find((packet) => packet.channel === 'simulationUpdate');
    expect(updatePacket).toBeDefined();
    const updates = updatePacket!.payload.updates;
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      tick: 12,
      ts: eventTs,
      durationMs: 20,
      phaseTimings,
      time: { tick: 42, mode: 'paused' },
      snapshot: { tick: 42, label: 'snapshot' },
    });
    expect(updates[0].events).toEqual([
      {
        type: 'device.degraded',
        payload: { deviceId: 'dev-1' },
        tick: 12,
        ts: eventTs,
        level: 'warning',
        tags: ['maintenance'],
      },
    ]);

    expect(snapshotProvider).toHaveBeenCalledTimes(1);
    expect(timeStatusProvider).toHaveBeenCalledTimes(1);

    subscription.unsubscribe();
  });

  it('filters domain events and fans out their payloads', async () => {
    const eventBus = new EventBus();
    const stream = createUiStream<TestSnapshot, TestTimeStatus>({
      eventBus,
      snapshotProvider: () => ({ tick: 5, label: 'snapshot' }),
      timeStatusProvider: () => ({ tick: 5, mode: 'running' }),
      simulationBufferMs: 1_000,
      simulationMaxBatchSize: 10,
      domainBufferMs: 50,
      domainMaxBatchSize: 2,
    });

    const packets: UiStreamPacket<TestSnapshot, TestTimeStatus>[] = [];
    const subscription = stream.subscribe((packet) => packets.push(packet));

    const firstDomain: SimulationEvent = {
      type: 'device.degraded',
      payload: { deviceId: 'dev-1' },
      tick: 5,
      ts: Date.now(),
      level: 'warning',
    };
    const secondDomain: SimulationEvent = {
      type: 'plant.stageChanged',
      payload: { plantId: 'plant-1' },
      tick: 5,
      ts: Date.now() + 1,
    };
    const ignored: SimulationEvent = {
      type: 'sim.control',
      payload: { action: 'pause' },
      tick: 5,
      ts: Date.now() + 2,
    };

    eventBus.emit(firstDomain);
    eventBus.emit(secondDomain);
    eventBus.emit(ignored);

    await Promise.resolve();

    const domainBatch = packets.find((packet) => packet.channel === 'domainEvents');
    expect(domainBatch?.payload.events).toEqual([
      {
        type: 'device.degraded',
        payload: { deviceId: 'dev-1' },
        tick: 5,
        ts: firstDomain.ts,
        level: 'warning',
      },
      {
        type: 'plant.stageChanged',
        payload: { plantId: 'plant-1' },
        tick: 5,
        ts: secondDomain.ts,
      },
    ]);

    const fanoutDevice = packets.find((packet) => packet.channel === 'device.degraded');
    expect(fanoutDevice?.payload).toEqual({ deviceId: 'dev-1' });

    const fanoutPlant = packets.find((packet) => packet.channel === 'plant.stageChanged');
    expect(fanoutPlant?.payload).toEqual({ plantId: 'plant-1' });

    expect(packets.every((packet) => packet.channel !== 'sim.control')).toBe(true);

    subscription.unsubscribe();
  });

  it('respects the simulationMaxBatchSize when ticks arrive rapidly', async () => {
    vi.useFakeTimers();
    const eventBus = new EventBus();
    let snapshotCounter = 0;
    const stream = createUiStream<TestSnapshot, TestTimeStatus>({
      eventBus,
      snapshotProvider: () => ({ tick: ++snapshotCounter, label: `snapshot-${snapshotCounter}` }),
      timeStatusProvider: () => ({ tick: snapshotCounter, mode: 'running' }),
      simulationBufferMs: 100,
      simulationMaxBatchSize: 2,
      domainBufferMs: 1_000,
      domainMaxBatchSize: 10,
    });

    const updatePackets: UiStreamPacket<TestSnapshot, TestTimeStatus>[] = [];
    const subscription = stream.subscribe((packet) => {
      if (packet.channel === 'simulationUpdate') {
        updatePackets.push(packet);
      }
    });

    const emitTick = (tick: number) => {
      eventBus.emit({
        type: 'sim.tickCompleted',
        payload: {
          tick,
          durationMs: tick,
          eventCount: 0,
          phaseTimings: createPhaseTimings(),
          events: [],
        } satisfies TickCompletedPayload,
        tick,
        ts: Date.now() + tick,
      });
    };

    emitTick(1);
    emitTick(2);
    emitTick(3);

    await Promise.resolve();

    expect(updatePackets).toHaveLength(1);
    expect(updatePackets[0].payload.updates).toHaveLength(2);
    expect(updatePackets[0].payload.updates.map((update) => update.tick)).toEqual([1, 2]);

    await vi.advanceTimersByTimeAsync(100);

    expect(updatePackets).toHaveLength(2);
    expect(updatePackets[1].payload.updates).toHaveLength(1);
    expect(updatePackets[1].payload.updates[0].tick).toBe(3);

    subscription.unsubscribe();
  });
});
