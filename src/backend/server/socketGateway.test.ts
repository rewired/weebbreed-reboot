import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type {
  CommandResult,
  EventFilter,
  TimeStartIntent,
  TimeStatus,
  TimeStepIntent,
  SetSpeedIntent,
  Unsubscribe,
} from '../facade/index.js';
import { EventBus, type SimulationEvent } from '../src/lib/eventBus.js';
import { TICK_PHASES, type PhaseTiming, type TickCompletedPayload } from '../src/sim/loop.js';
import type { GameState } from '../src/state/models.js';
import { SocketGateway, type SimulationSnapshot } from './socketGateway.js';
import { resolvePurposeIdByName } from '../src/engine/roomPurposeRegistry.js';
import { loadTestRoomPurposes } from '../src/testing/loadTestRoomPurposes.js';

const waitFor = async (predicate: () => boolean, timeoutMs = 1000): Promise<void> => {
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

const createPhaseTimings = (durationMs = 5): Record<(typeof TICK_PHASES)[number], PhaseTiming> => {
  return TICK_PHASES.reduce(
    (accumulator, phase, index) => {
      const startedAt = index * durationMs;
      accumulator[phase] = {
        startedAt,
        completedAt: startedAt + durationMs,
        durationMs,
      };
      return accumulator;
    },
    {} as Record<(typeof TICK_PHASES)[number], PhaseTiming>,
  );
};

let growRoomPurposeId: string;

beforeAll(async () => {
  await loadTestRoomPurposes();
  growRoomPurposeId = resolvePurposeIdByName('Grow Room');
});

const createTestState = (): GameState => {
  const timestamp = new Date(0).toISOString();
  return {
    metadata: {
      gameId: 'game-1',
      createdAt: timestamp,
      seed: 'seed-1',
      difficulty: 'normal',
      simulationVersion: '1.0.0',
      tickLengthMinutes: 60,
      economics: {
        initialCapital: 1_000_000,
        itemPriceMultiplier: 1,
        harvestPriceMultiplier: 1,
        rentPerSqmStructurePerTick: 0.1,
        rentPerSqmRoomPerTick: 0.2,
      },
    },
    clock: {
      tick: 0,
      isPaused: true,
      startedAt: timestamp,
      lastUpdatedAt: timestamp,
      targetTickRate: 1,
    },
    structures: [
      {
        id: 'structure-1',
        blueprintId: 'structure-blueprint',
        name: 'Structure',
        status: 'active',
        footprint: { length: 10, width: 10, height: 4, area: 100, volume: 400 },
        rooms: [
          {
            id: 'room-1',
            structureId: 'structure-1',
            name: 'Room',
            purposeId: growRoomPurposeId,
            area: 100,
            height: 4,
            volume: 400,
            cleanliness: 0.95,
            maintenanceLevel: 0.9,
            zones: [
              {
                id: 'zone-1',
                roomId: 'room-1',
                name: 'Zone',
                cultivationMethodId: 'method-1',
                strainId: 'strain-1',
                environment: {
                  temperature: 22,
                  relativeHumidity: 0.55,
                  co2: 900,
                  ppfd: 500,
                  vpd: 1.2,
                },
                resources: {
                  waterLiters: 100,
                  nutrientSolutionLiters: 50,
                  nutrientStrength: 1,
                  substrateHealth: 0.9,
                  reservoirLevel: 0.8,
                },
                plants: [
                  {
                    id: 'plant-1',
                    strainId: 'strain-1',
                    zoneId: 'zone-1',
                    stage: 'vegetative',
                    plantedAtTick: 0,
                    ageInHours: 24,
                    health: 0.9,
                    stress: 0.1,
                    biomassDryGrams: 12,
                    heightMeters: 0.5,
                    canopyCover: 0.7,
                    yieldDryGrams: 0,
                    quality: 0.85,
                    lastMeasurementTick: 0,
                  },
                ],
                devices: [],
                metrics: {
                  averageTemperature: 22,
                  averageHumidity: 0.55,
                  averageCo2: 900,
                  averagePpfd: 500,
                  stressLevel: 0.1,
                  lastUpdatedTick: 0,
                },
                health: {
                  plantHealth: {},
                  pendingTreatments: [],
                  appliedTreatments: [],
                },
                activeTaskIds: [],
              },
            ],
          },
        ],
        rentPerTick: 0,
        upfrontCostPaid: 0,
      },
    ],
    inventory: {
      resources: {
        waterLiters: 1_000,
        nutrientsGrams: 100,
        co2Kg: 10,
        substrateKg: 500,
        packagingUnits: 0,
        sparePartsValue: 0,
      },
      seeds: [],
      devices: [],
      harvest: [],
      consumables: {},
    },
    finances: {
      cashOnHand: 100_000,
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

interface SimulationUpdatePayload {
  updates: Array<{ tick: number; snapshot: SimulationSnapshot }>;
}

const simulationUpdates: SimulationUpdatePayload[] = [];
const domainEvents: SimulationEvent[][] = [];

type IntentResponse = CommandResult<unknown> & { requestId?: string };

class StubFacade {
  public readonly eventBus = new EventBus();

  public state: GameState;

  public status: TimeStatus = {
    running: false,
    paused: true,
    speed: 1,
    tick: 0,
    targetTickRate: 1,
  };

  public startInvocations = 0;

  public pauseInvocations = 0;

  public resumeInvocations = 0;

  public stepInvocations = 0;

  public setSpeedInvocations = 0;

  public setTickLengthInvocations = 0;

  public intentInvocations: Array<{ domain: string; action: string; payload: unknown }> = [];

  public readonly world = {
    rentStructure: (payload: unknown) => this.resolveIntent('world', 'rentStructure', payload),
    createRoom: (payload: unknown) => this.resolveIntent('world', 'createRoom', payload),
    updateRoom: (payload: unknown) => this.resolveIntent('world', 'updateRoom', payload),
    deleteRoom: (payload: unknown) => this.resolveIntent('world', 'deleteRoom', payload),
    createZone: (payload: unknown) => this.resolveIntent('world', 'createZone', payload),
    updateZone: (payload: unknown) => this.resolveIntent('world', 'updateZone', payload),
    deleteZone: (payload: unknown) => this.resolveIntent('world', 'deleteZone', payload),
  };

  public readonly devices = {
    installDevice: (payload: unknown) => this.resolveIntent('devices', 'installDevice', payload),
    updateDevice: (payload: unknown) => this.resolveIntent('devices', 'updateDevice', payload),
    moveDevice: (payload: unknown) => this.resolveIntent('devices', 'moveDevice', payload),
    removeDevice: (payload: unknown) => this.resolveIntent('devices', 'removeDevice', payload),
  };

  public readonly plants = {
    addPlanting: (payload: unknown) => this.resolveIntent('plants', 'addPlanting', payload),
    cullPlanting: (payload: unknown) => this.resolveIntent('plants', 'cullPlanting', payload),
    harvestPlanting: (payload: unknown) => this.resolveIntent('plants', 'harvestPlanting', payload),
    applyIrrigation: (payload: unknown) => this.resolveIntent('plants', 'applyIrrigation', payload),
    applyFertilizer: (payload: unknown) => this.resolveIntent('plants', 'applyFertilizer', payload),
  };

  public readonly health = {
    scheduleScouting: (payload: unknown) =>
      this.resolveIntent('health', 'scheduleScouting', payload),
    applyTreatment: (payload: unknown) => this.resolveIntent('health', 'applyTreatment', payload),
    quarantineZone: (payload: unknown) => this.resolveIntent('health', 'quarantineZone', payload),
  };

  public readonly workforce = {
    refreshCandidates: (payload: unknown) =>
      this.resolveIntent('workforce', 'refreshCandidates', payload),
    hire: (payload: unknown) => this.resolveIntent('workforce', 'hire', payload),
    fire: (payload: unknown) => this.resolveIntent('workforce', 'fire', payload),
    setOvertimePolicy: (payload: unknown) =>
      this.resolveIntent('workforce', 'setOvertimePolicy', payload),
    assignStructure: (payload: unknown) =>
      this.resolveIntent('workforce', 'assignStructure', payload),
    enqueueTask: (payload: unknown) => this.resolveIntent('workforce', 'enqueueTask', payload),
  };

  public readonly finance = {
    sellInventory: (payload: unknown) => this.resolveIntent('finance', 'sellInventory', payload),
    setUtilityPrices: (payload: unknown) =>
      this.resolveIntent('finance', 'setUtilityPrices', payload),
    setMaintenancePolicy: (payload: unknown) =>
      this.resolveIntent('finance', 'setMaintenancePolicy', payload),
  };

  private readonly listeners: Unsubscribe[] = [];

  constructor(state: GameState) {
    this.state = state;
  }

  select<T>(selector: (state: GameState) => T): T {
    return selector(this.state);
  }

  subscribe(filter: EventFilter, handler: (event: SimulationEvent) => void): Unsubscribe;
  subscribe(handler: (event: SimulationEvent) => void): Unsubscribe;
  subscribe(
    filterOrHandler: EventFilter | ((event: SimulationEvent) => void),
    handler?: (event: SimulationEvent) => void,
  ): Unsubscribe {
    if (typeof filterOrHandler === 'function') {
      const subscription = this.eventBus
        .asObservable()
        .subscribe((event) => filterOrHandler(event));
      const unsubscribe = () => subscription.unsubscribe();
      this.listeners.push(unsubscribe);
      return unsubscribe;
    }
    if (!handler) {
      throw new Error('Handler is required when subscribing with a filter.');
    }
    const subscription = this.eventBus.events(filterOrHandler).subscribe((event) => handler(event));
    const unsubscribe = () => subscription.unsubscribe();
    this.listeners.push(unsubscribe);
    return unsubscribe;
  }

  start(intent: TimeStartIntent = {}): Promise<CommandResult<TimeStatus>> {
    this.startInvocations += 1;
    this.status = {
      ...this.status,
      running: true,
      paused: false,
      speed: intent.gameSpeed ?? this.status.speed,
    };
    return Promise.resolve({ ok: true, data: this.status });
  }

  pause(): Promise<CommandResult<TimeStatus>> {
    this.pauseInvocations += 1;
    this.status = { ...this.status, running: true, paused: true };
    return Promise.resolve({ ok: true, data: this.status });
  }

  resume(): Promise<CommandResult<TimeStatus>> {
    this.resumeInvocations += 1;
    this.status = { ...this.status, running: true, paused: false };
    return Promise.resolve({ ok: true, data: this.status });
  }

  step(intent?: TimeStepIntent): Promise<CommandResult<TimeStatus>> {
    this.stepInvocations += 1;
    const increment = intent?.ticks ?? 1;
    this.status = { ...this.status, tick: this.status.tick + increment };
    this.state.clock.tick = this.status.tick;
    this.state.clock.lastUpdatedAt = new Date().toISOString();
    return Promise.resolve({ ok: true, data: this.status });
  }

  setSpeed(intent: SetSpeedIntent): Promise<CommandResult<TimeStatus>> {
    this.setSpeedInvocations += 1;
    this.status = { ...this.status, speed: intent.multiplier };
    return Promise.resolve({ ok: true, data: this.status });
  }

  setTickLength(minutes: number): CommandResult<TimeStatus> {
    this.setTickLengthInvocations += 1;
    this.state.metadata.tickLengthMinutes = minutes;
    return { ok: true, data: this.status };
  }

  getTimeStatus(): TimeStatus {
    return { ...this.status };
  }

  emit(event: SimulationEvent): void {
    this.eventBus.emit(event);
  }

  emitTickCompleted(tick: number, events: SimulationEvent[] = []): void {
    this.status = { ...this.status, tick };
    this.state.clock.tick = tick;
    this.state.clock.lastUpdatedAt = new Date().toISOString();
    const payload: TickCompletedPayload = {
      tick,
      durationMs: 10,
      eventCount: events.length,
      phaseTimings: createPhaseTimings(),
      events,
    };
    this.eventBus.emit({
      type: 'sim.tickCompleted',
      tick,
      ts: Date.now(),
      level: 'info',
      payload,
    });
  }

  dispose(): void {
    for (const unsubscribe of this.listeners.splice(0)) {
      unsubscribe();
    }
  }

  private resolveIntent(
    domain: string,
    action: string,
    payload: unknown,
  ): Promise<CommandResult<unknown>> {
    this.intentInvocations.push({ domain, action, payload });
    return Promise.resolve({ ok: true, data: payload });
  }
}

describe('SocketGateway', () => {
  let server: HttpServer;
  let port: number;
  let facade: StubFacade;
  let gateway: SocketGateway;
  let client: ClientSocket;

  beforeEach(async () => {
    simulationUpdates.length = 0;
    domainEvents.length = 0;
    server = createServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    port = (server.address() as AddressInfo).port;
    facade = new StubFacade(createTestState());
    gateway = new SocketGateway({
      httpServer: server,
      facade,
      simulationBatchIntervalMs: 30,
      domainBatchIntervalMs: 30,
    });
    client = createClient(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      forceNew: true,
    });
    client.on('simulationUpdate', (payload) => {
      simulationUpdates.push(payload);
    });
    client.on('domainEvents', (payload) => {
      domainEvents.push(payload.events);
    });
    await new Promise<void>((resolve) => client.on('connect', () => resolve()));
    // Drain initial handshake update
    await waitFor(() => simulationUpdates.length > 0, 200).catch(() => undefined);
    const handshake = simulationUpdates.shift();
    if (handshake && handshake.updates[0]) {
      expect(handshake.updates[0].snapshot.rooms[0]?.purposeName).toBe('Grow Room');
    }
    simulationUpdates.length = 0;
    domainEvents.length = 0;
  });

  afterEach(async () => {
    client.removeAllListeners();
    client.disconnect();
    gateway.close();
    facade.dispose();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('batches simulation updates before emitting', async () => {
    facade.state.structures[0].rooms[0].zones[0].environment.temperature = 23;
    facade.emitTickCompleted(1, [
      { type: 'plant.stageChanged', tick: 1, ts: Date.now(), payload: { plantId: 'plant-1' } },
    ]);
    facade.state.structures[0].rooms[0].zones[0].environment.temperature = 24;
    facade.emitTickCompleted(2, []);

    await waitFor(() => simulationUpdates.length >= 1);

    expect(simulationUpdates).toHaveLength(1);
    const batch = simulationUpdates[0];
    expect(batch.updates).toHaveLength(2);
    expect(batch.updates[0].tick).toBe(1);
    expect(batch.updates[1].tick).toBe(2);
  });

  it('aggregates domain events using throttling', async () => {
    facade.emit({
      type: 'plant.stageChanged',
      tick: 1,
      ts: Date.now(),
      payload: { plantId: 'plant-1', from: 'vegetative', to: 'flowering' },
    });
    facade.emit({
      type: 'device.degraded',
      tick: 1,
      ts: Date.now(),
      payload: { deviceId: 'device-1', severity: 'warning' },
    });

    await waitFor(() => domainEvents.length >= 1);

    expect(domainEvents).toHaveLength(1);
    expect(domainEvents[0]).toHaveLength(2);
    expect(domainEvents[0][0].type).toBe('plant.stageChanged');
    expect(domainEvents[0][1].type).toBe('device.degraded');
  });

  it('validates and executes simulation control commands', async () => {
    const response = await new Promise<CommandResult<TimeStatus>>((resolve) => {
      client.emit(
        'simulationControl',
        { requestId: 'cmd-1', action: 'play' },
        (payload: CommandResult<TimeStatus>) => {
          resolve(payload);
        },
      );
    });

    expect(response.ok).toBe(true);
    expect(facade.startInvocations).toBe(1);

    const invalid = await new Promise<CommandResult<TimeStatus>>((resolve) => {
      client.emit(
        'simulationControl',
        { requestId: 'cmd-2', action: 'step', ticks: 0 },
        (payload: CommandResult<TimeStatus>) => {
          resolve(payload);
        },
      );
    });

    expect(invalid.ok).toBe(false);
    expect(invalid.errors?.[0].code).toBe('ERR_VALIDATION');
  });

  it('updates configuration via config.update', async () => {
    const response = await new Promise<CommandResult<TimeStatus>>((resolve) => {
      client.emit(
        'config.update',
        { requestId: 'cfg-1', type: 'tickLength', minutes: 15 },
        (payload: CommandResult<TimeStatus>) => {
          resolve(payload);
        },
      );
    });

    expect(response.ok).toBe(true);
    expect(facade.state.metadata.tickLengthMinutes).toBe(15);
    expect(facade.setTickLengthInvocations).toBe(1);

    const unsupported = await new Promise<CommandResult<TimeStatus>>((resolve) => {
      client.emit(
        'config.update',
        {
          requestId: 'cfg-2',
          type: 'setpoint',
          zoneId: '11111111-1111-1111-1111-111111111111',
          metric: 'temperature',
          value: 25,
        },
        (payload: CommandResult<TimeStatus>) => resolve(payload),
      );
    });

    expect(unsupported.ok).toBe(false);
    expect(unsupported.errors?.[0].code).toBe('ERR_INVALID_STATE');
  });

  it('routes facade intents to the correct service handler', async () => {
    const intentPayload = {
      structureId: 'structure-1',
      room: { name: 'Aux', purpose: 'grow', area: 10 },
    };

    const response = await new Promise<IntentResponse>((resolve) => {
      client.emit(
        'facade.intent',
        { requestId: 'intent-1', domain: 'world', action: 'createRoom', payload: intentPayload },
        (payload: IntentResponse) => resolve(payload),
      );
    });

    expect(response.ok).toBe(true);
    await waitFor(() => facade.intentInvocations.length === 1);
    expect(facade.intentInvocations[0]).toEqual({
      domain: 'world',
      action: 'createRoom',
      payload: intentPayload,
    });
  });

  it('validates unknown facade intent domains', async () => {
    const response = await new Promise<IntentResponse>((resolve) => {
      client.emit(
        'facade.intent',
        { requestId: 'intent-2', domain: 'unknown', action: 'noop' },
        (payload: IntentResponse) => resolve(payload),
      );
    });

    expect(response.ok).toBe(false);
    expect(response.errors?.[0].code).toBe('ERR_VALIDATION');
  });
});
