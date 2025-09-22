import { createServer, request, type ClientRequest, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SimulationFacade, TimeStatus } from '@/facade/index.js';
import type { RoomPurposeSource } from '@/engine/roomPurposes/index.js';
import { SseGateway } from './sseGateway.js';
import type { UiStreamPacket } from '@runtime/eventBus.js';
import type { SimulationSnapshot } from '@/lib/uiSnapshot.js';
import type { GameState } from '@/state/models.js';

interface ReceivedEvent {
  event: string;
  data: unknown;
}

const createMinimalState = (): GameState => {
  const now = new Date(0).toISOString();
  return {
    metadata: {
      gameId: 'game-1',
      createdAt: now,
      seed: 'seed',
      difficulty: 'normal',
      simulationVersion: '1.0.0',
      tickLengthMinutes: 60,
      economics: {
        initialCapital: 0,
        itemPriceMultiplier: 1,
        harvestPriceMultiplier: 1,
        rentPerSqmStructurePerTick: 0,
        rentPerSqmRoomPerTick: 0,
      },
    },
    clock: {
      tick: 0,
      isPaused: true,
      startedAt: now,
      lastUpdatedAt: now,
      targetTickRate: 1,
    },
    structures: [],
    inventory: {
      resources: {
        waterLiters: 0,
        nutrientsGrams: 0,
        co2Kg: 0,
        substrateKg: 0,
        packagingUnits: 0,
        sparePartsValue: 0,
      },
      seeds: [],
      devices: [],
      harvest: [],
      consumables: {},
    },
    finances: {
      cashOnHand: 0,
      reservedCash: 0,
      outstandingLoans: [],
      ledger: [],
      summary: {
        totalRevenue: 0,
        totalExpenses: 0,
        totalPayroll: 0,
        totalMaintenance: 0,
        netIncome: 0,
        lastTickRevenue: 0,
        lastTickExpenses: 0,
      },
    },
    personnel: {
      employees: [],
      applicants: [],
      trainingPrograms: [],
      overallMorale: 1,
    },
    tasks: {
      backlog: [],
      active: [],
      completed: [],
      cancelled: [],
    },
    notes: [],
  };
};

const waitFor = async (predicate: () => boolean, timeoutMs = 1_000): Promise<void> => {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('Timed out waiting for condition.'));
        return;
      }
      setTimeout(check, 10);
    };
    check();
  });
};

describe('SseGateway', () => {
  let server: ReturnType<typeof createServer>;
  let port: number;
  let gateway: SseGateway;
  let uiStream$: Subject<UiStreamPacket<SimulationSnapshot, TimeStatus>>;
  let subscribeSpy: ReturnType<typeof vi.spyOn>;
  let activeRequest: ClientRequest | undefined;
  let activeResponse: IncomingMessage | undefined;
  let receivedEvents: ReceivedEvent[];

  beforeEach(async () => {
    receivedEvents = [];
    server = createServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    port = (server.address() as AddressInfo).port;

    const state = createMinimalState();
    const timeStatus: TimeStatus = {
      running: false,
      paused: true,
      speed: 1,
      tick: state.clock.tick,
      targetTickRate: state.clock.targetTickRate,
    };

    const facade = {
      select: <T>(selector: (value: GameState) => T): T => selector(state),
      getTimeStatus: () => timeStatus,
    } as unknown as SimulationFacade;

    const roomPurposeSource: RoomPurposeSource = {
      listRoomPurposes: () => [],
    };

    uiStream$ = new Subject<UiStreamPacket<SimulationSnapshot, TimeStatus>>();
    subscribeSpy = vi.spyOn(uiStream$, 'subscribe');

    gateway = new SseGateway({
      httpServer: server,
      facade,
      roomPurposeSource,
      uiStream$,
      keepAliveMs: 0,
    });
  });

  afterEach(async () => {
    activeResponse?.destroy();
    activeRequest?.destroy();
    uiStream$.complete();
    gateway.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const attachEventStream = async () => {
    const req = request({
      hostname: '127.0.0.1',
      port,
      path: '/events',
      method: 'GET',
      headers: { Accept: 'text/event-stream' },
    });
    activeRequest = req;
    req.end();

    const res = await new Promise<IncomingMessage>((resolve) => req.on('response', resolve));
    res.setEncoding('utf8');
    activeResponse = res;

    let buffer = '';
    let currentEvent: string | undefined;
    let dataLines: string[] = [];

    const flush = () => {
      if (!currentEvent) {
        return;
      }
      const payload = dataLines.join('\n');
      let data: unknown = null;
      if (payload.trim().length > 0) {
        try {
          data = JSON.parse(payload);
        } catch {
          data = payload;
        }
      }
      receivedEvents.push({ event: currentEvent, data });
      currentEvent = undefined;
      dataLines = [];
    };

    res.on('data', (chunk: string) => {
      buffer += chunk;
      while (buffer.includes('\n')) {
        const newlineIndex = buffer.indexOf('\n');
        const rawLine = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        const line = rawLine.replace(/\r$/, '');

        if (line.startsWith('event:')) {
          currentEvent = line.slice('event:'.length).trim();
          dataLines = [];
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice('data:'.length).trimStart());
        } else if (line.startsWith(':')) {
          continue;
        } else if (line.length === 0) {
          flush();
        }
      }
    });

    return res;
  };

  it('subscribes to the provided uiStream$ and forwards batched packets', async () => {
    await attachEventStream();

    await waitFor(() => receivedEvents.some((entry) => entry.event === 'simulationUpdate'));
    expect(subscribeSpy).toHaveBeenCalledTimes(1);

    receivedEvents = [];

    const snapshot: SimulationSnapshot = {
      tick: 5,
      structures: [],
      rooms: [],
      zones: [],
      personnel: { employees: [], applicants: [], overallMorale: 1 },
      finance: {
        cashOnHand: 0,
        reservedCash: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        lastTickRevenue: 0,
        lastTickExpenses: 0,
      },
    };
    const time: TimeStatus = {
      running: false,
      paused: true,
      speed: 1,
      tick: 5,
      targetTickRate: 1,
    };

    uiStream$.next({
      channel: 'simulationUpdate',
      payload: {
        updates: [
          { tick: 5, ts: 1_000, durationMs: 12, events: [], snapshot, time },
          {
            tick: 6,
            ts: 1_050,
            durationMs: 11,
            events: [],
            snapshot: { ...snapshot, tick: 6 },
            time,
          },
        ],
      },
    });

    await waitFor(() => receivedEvents.some((entry) => entry.event === 'simulationUpdate'));

    const latestUpdate = receivedEvents
      .filter((entry) => entry.event === 'simulationUpdate')
      .at(-1);
    expect(latestUpdate?.data).toEqual({
      updates: [
        { tick: 5, ts: 1_000, durationMs: 12, events: [], snapshot, time },
        {
          tick: 6,
          ts: 1_050,
          durationMs: 11,
          events: [],
          snapshot: { ...snapshot, tick: 6 },
          time,
        },
      ],
    });

    const domainEvents = [
      { type: 'device.degraded', payload: { deviceId: 'device-1' }, tick: 6, ts: 2_000 },
      { type: 'plant.stageChanged', payload: { plantId: 'plant-1' }, tick: 6, ts: 2_010 },
    ];

    uiStream$.next({ channel: 'domainEvents', payload: { events: domainEvents } });

    await waitFor(() => receivedEvents.some((entry) => entry.event === 'domainEvents'));
    const domainBatch = receivedEvents.filter((entry) => entry.event === 'domainEvents').at(-1);
    expect(domainBatch?.data).toEqual({ events: domainEvents });

    uiStream$.next({
      channel: 'sim.tickCompleted',
      payload: { tick: 6, ts: 2_020, durationMs: 11, eventCount: 2, events: domainEvents },
    });

    await waitFor(() => receivedEvents.some((entry) => entry.event === 'sim.tickCompleted'));
    const tickPacket = receivedEvents.filter((entry) => entry.event === 'sim.tickCompleted').at(-1);
    expect(tickPacket?.data).toEqual({
      tick: 6,
      ts: 2_020,
      durationMs: 11,
      eventCount: 2,
      events: domainEvents,
    });
  });
});
