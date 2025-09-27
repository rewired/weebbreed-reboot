import { createServer, type Server as HttpServer } from 'node:http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client';
import { createUiStream } from '@runtime/eventBus.js';
import { EventBus } from '@/lib/eventBus.js';
import { SimulationFacade, type CommandResult } from '@/facade/index.js';
import type { DifficultyConfig } from '@/data/configs/difficulty.js';
import type { GameState } from '@/state/models.js';
import type { SimulationEvent } from '@/lib/eventBus.js';
import type { TimeStatus } from '@/facade/commands/time.js';
import type { SimulationLoop } from '@/sim/loop.js';
import { WorldService } from '@/engine/world/worldService.js';
import { DeviceGroupService } from '@/engine/devices/deviceGroupService.js';
import { PlantingPlanService } from '@/engine/plants/plantingPlanService.js';
import { CostAccountingService } from '@/engine/economy/costAccounting.js';
import type { PriceCatalog } from '@/engine/economy/pricing.js';
import { RngService } from '@/lib/rng.js';
import type { RoomPurpose, RoomPurposeSource } from '@/engine/roomPurposes/index.js';
import { SocketGateway } from '@/server/socketGateway.js';
import { DEFAULT_MAINTENANCE_INTERVAL_TICKS } from '@/constants/world.js';
import {
  buildDeviceBlueprintCatalog,
  buildStrainBlueprintCatalog,
} from '@/facade/blueprintCatalog.js';
import {
  createBlueprintRepositoryStub,
  createDeviceBlueprint,
  createDevicePriceMap,
  createStrainBlueprint,
  createStrainPriceMap,
  createStructureBlueprint,
} from '@/testing/fixtures.js';

const STRUCTURE_ID = '11111111-1111-1111-1111-111111111111';
const ROOM_ID = '22222222-2222-2222-2222-222222222222';
const ZONE_ID = 'zone_3333333333';
const DEVICE_ID = '44444444-4444-4444-4444-444444444444';
const DEVICE_BLUEPRINT_ID = '55555555-5555-5555-5555-555555555555';
const METHOD_ID = '66666666-6666-6666-6666-666666666666';
const STRAIN_ID = '77777777-7777-7777-7777-777777777777';
const PLANTING_PLAN_ID = '88888888-8888-8888-8888-888888888888';
const ROOM_PURPOSE_ID = '99999999-9999-9999-9999-999999999999';
const STRAIN_BLUEPRINT_ALPHA_ID = '00000000-0000-0000-0000-000000000401';
const STRAIN_BLUEPRINT_BETA_ID = '00000000-0000-0000-0000-000000000402';
const DEVICE_BLUEPRINT_LAMP_ID = '00000000-0000-0000-0000-000000000501';
const DEVICE_BLUEPRINT_CLIMATE_ID = '00000000-0000-0000-0000-000000000502';
const STRUCTURE_BLUEPRINT_ID = '00000000-0000-0000-0000-000000000503';

const TEST_DIFFICULTY_CONFIG: DifficultyConfig = {
  easy: {
    name: 'Easy',
    description: 'Relaxed conditions for testing.',
    modifiers: {
      plantStress: {
        optimalRangeMultiplier: 1.1,
        stressAccumulationMultiplier: 0.9,
      },
      deviceFailure: {
        mtbfMultiplier: 1.3,
      },
      economics: {
        initialCapital: 2_000_000,
        itemPriceMultiplier: 0.95,
        harvestPriceMultiplier: 1.05,
        rentPerSqmStructurePerTick: 0.12,
        rentPerSqmRoomPerTick: 0.22,
      },
    },
  },
  normal: {
    name: 'Normal',
    description: 'Balanced baseline for scenarios.',
    modifiers: {
      plantStress: {
        optimalRangeMultiplier: 1,
        stressAccumulationMultiplier: 1,
      },
      deviceFailure: {
        mtbfMultiplier: 1,
      },
      economics: {
        initialCapital: 1_500_000,
        itemPriceMultiplier: 1,
        harvestPriceMultiplier: 1,
        rentPerSqmStructurePerTick: 0.15,
        rentPerSqmRoomPerTick: 0.3,
      },
    },
  },
  hard: {
    name: 'Hard',
    description: 'Challenging test conditions.',
    modifiers: {
      plantStress: {
        optimalRangeMultiplier: 0.9,
        stressAccumulationMultiplier: 1.2,
      },
      deviceFailure: {
        mtbfMultiplier: 0.8,
      },
      economics: {
        initialCapital: 1_000_000,
        itemPriceMultiplier: 1.05,
        harvestPriceMultiplier: 0.95,
        rentPerSqmStructurePerTick: 0.18,
        rentPerSqmRoomPerTick: 0.34,
      },
    },
  },
};

const createPriceCatalog = (): PriceCatalog => ({
  devicePrices: new Map([
    [
      DEVICE_BLUEPRINT_ID,
      {
        id: DEVICE_BLUEPRINT_ID,
        capitalExpenditure: 500,
        baseMaintenanceCostPerTick: 0,
        costIncreasePer1000Ticks: 0,
      },
    ],
    [
      'hvac-blueprint',
      {
        id: 'hvac-blueprint',
        capitalExpenditure: 900,
        baseMaintenanceCostPerTick: 0.002,
        costIncreasePer1000Ticks: 0.0005,
      },
    ],
    [
      'humidity-blueprint',
      {
        id: 'humidity-blueprint',
        capitalExpenditure: 600,
        baseMaintenanceCostPerTick: 0.0015,
        costIncreasePer1000Ticks: 0.0004,
      },
    ],
    [
      'co2-blueprint',
      {
        id: 'co2-blueprint',
        capitalExpenditure: 400,
        baseMaintenanceCostPerTick: 0.001,
        costIncreasePer1000Ticks: 0.0003,
      },
    ],
  ]),
  strainPrices: new Map(),
  utilityPrices: { pricePerKwh: 0.1, pricePerLiterWater: 0.01, pricePerGramNutrients: 0.05 },
});

const createTestState = (): GameState => ({
  metadata: {
    gameId: 'game-1',
    createdAt: new Date(0).toISOString(),
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
    startedAt: new Date(0).toISOString(),
    lastUpdatedAt: new Date(0).toISOString(),
    targetTickRate: 1,
  },
  structures: [
    {
      id: STRUCTURE_ID,
      blueprintId: 'structure-blueprint',
      name: 'Alpha Complex',
      status: 'active',
      footprint: { length: 20, width: 10, height: 4, area: 200, volume: 800 },
      rooms: [
        {
          id: ROOM_ID,
          structureId: STRUCTURE_ID,
          name: 'Grow Room',
          purposeId: ROOM_PURPOSE_ID,
          area: 80,
          height: 4,
          volume: 320,
          cleanliness: 0.9,
          maintenanceLevel: 0.9,
          zones: [
            {
              id: ZONE_ID,
              roomId: ROOM_ID,
              name: 'Zone A',
              cultivationMethodId: METHOD_ID,
              strainId: STRAIN_ID,
              area: 30,
              ceilingHeight: 4,
              volume: 120,
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
                reservoirLevel: 0.7,
                lastTranspirationLiters: 0,
              },
              plants: [],
              devices: [
                {
                  id: DEVICE_ID,
                  blueprintId: DEVICE_BLUEPRINT_ID,
                  kind: 'Lamp',
                  name: 'Primary Lamp',
                  zoneId: ZONE_ID,
                  status: 'operational',
                  efficiency: 0.95,
                  runtimeHours: 0,
                  maintenance: {
                    lastServiceTick: 0,
                    nextDueTick: DEFAULT_MAINTENANCE_INTERVAL_TICKS,
                    condition: 1,
                    runtimeHoursAtLastService: 0,
                    degradation: 0,
                  },
                  settings: { power: 0.8, ppfd: 500, coverageArea: 10 },
                },
                {
                  id: 'device-hvac',
                  blueprintId: 'hvac-blueprint',
                  kind: 'ClimateUnit',
                  name: 'Climate Control',
                  zoneId: ZONE_ID,
                  status: 'operational',
                  efficiency: 0.9,
                  runtimeHours: 0,
                  maintenance: {
                    lastServiceTick: 0,
                    nextDueTick: DEFAULT_MAINTENANCE_INTERVAL_TICKS,
                    condition: 1,
                    runtimeHoursAtLastService: 0,
                    degradation: 0,
                  },
                  settings: {
                    airflow: 320,
                    coolingCapacity: 1.2,
                    targetTemperature: 22,
                    targetTemperatureRange: [20, 25],
                    fullPowerAtDeltaK: 2,
                  },
                },
                {
                  id: 'device-humidity',
                  blueprintId: 'humidity-blueprint',
                  kind: 'HumidityControlUnit',
                  name: 'Humidity Control',
                  zoneId: ZONE_ID,
                  status: 'operational',
                  efficiency: 0.9,
                  runtimeHours: 0,
                  maintenance: {
                    lastServiceTick: 0,
                    nextDueTick: DEFAULT_MAINTENANCE_INTERVAL_TICKS,
                    condition: 1,
                    runtimeHoursAtLastService: 0,
                    degradation: 0,
                  },
                  settings: {
                    targetHumidity: 0.55,
                    humidifyRateKgPerTick: 0.1,
                    dehumidifyRateKgPerTick: 0.1,
                  },
                },
                {
                  id: 'device-co2',
                  blueprintId: 'co2-blueprint',
                  kind: 'CO2Injector',
                  name: 'CO2 Injector',
                  zoneId: ZONE_ID,
                  status: 'operational',
                  efficiency: 0.9,
                  runtimeHours: 0,
                  maintenance: {
                    lastServiceTick: 0,
                    nextDueTick: DEFAULT_MAINTENANCE_INTERVAL_TICKS,
                    condition: 1,
                    runtimeHoursAtLastService: 0,
                    degradation: 0,
                  },
                  settings: {
                    targetCO2: 900,
                    targetCO2Range: [400, 1500],
                    hysteresis: 50,
                  },
                },
              ],
              metrics: {
                averageTemperature: 22,
                averageHumidity: 0.55,
                averageCo2: 900,
                averagePpfd: 500,
                stressLevel: 0.1,
                lastUpdatedTick: 0,
              },
              control: { setpoints: {} },
              health: { plantHealth: {}, pendingTreatments: [], appliedTreatments: [] },
              activeTaskIds: [],
              plantingPlan: {
                id: PLANTING_PLAN_ID,
                strainId: STRAIN_ID,
                count: 12,
                autoReplant: false,
                enabled: true,
              },
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
      nutrientsGrams: 200,
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
    utilityPrices: {
      pricePerKwh: 0.1,
      pricePerLiterWater: 0.01,
      pricePerGramNutrients: 0.05,
    },
  },
  personnel: { employees: [], applicants: [], trainingPrograms: [], overallMorale: 1 },
  tasks: { backlog: [], active: [], completed: [], cancelled: [] },
  notes: [],
});

const roomPurposeSource: RoomPurposeSource = {
  listRoomPurposes: () => [
    { id: ROOM_PURPOSE_ID, kind: 'growroom', name: 'Grow Room' } satisfies RoomPurpose,
  ],
  getRoomPurpose: (id: string) =>
    id === ROOM_PURPOSE_ID
      ? { id: ROOM_PURPOSE_ID, kind: 'growroom', name: 'Grow Room' }
      : undefined,
};

const waitFor = async (predicate: () => boolean, timeoutMs = 1000): Promise<void> => {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timeout exceeded while waiting for condition.');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

describe('SocketGateway facade intents integration', () => {
  let server: HttpServer;
  let port: number;
  let facade: SimulationFacade;
  let gateway: SocketGateway;
  let client: ClientSocket;
  let state: GameState;
  let domainEvents: SimulationEvent[][];
  let repository: ReturnType<typeof createBlueprintRepositoryStub>;
  let expectedStrainCatalog: ReturnType<typeof buildStrainBlueprintCatalog>;
  let expectedDeviceCatalog: ReturnType<typeof buildDeviceBlueprintCatalog>;
  let structureBlueprints: ReturnType<typeof createStructureBlueprint>[];

  beforeEach(async () => {
    server = createServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    port = (server.address() as { port: number }).port;

    state = createTestState();
    domainEvents = [];
    const eventBus = new EventBus();
    const rng = new RngService('socket-intents');
    const costAccounting = new CostAccountingService(createPriceCatalog());
    const strainBlueprints = [
      createStrainBlueprint({
        id: STRAIN_BLUEPRINT_ALPHA_ID,
        name: 'Helios',
        slug: 'helios',
        methodAffinity: { [METHOD_ID]: 0.8 },
      }),
      createStrainBlueprint({
        id: STRAIN_BLUEPRINT_BETA_ID,
        name: 'Lunaris',
        slug: 'lunaris',
        methodAffinity: { [METHOD_ID]: 0.55 },
      }),
    ];
    const deviceBlueprints = [
      createDeviceBlueprint({
        kind: 'Lamp',
        id: DEVICE_BLUEPRINT_LAMP_ID,
        name: 'Orion Lamp',
        roomPurposes: ['growroom'],
        settings: { power: 0.68, ppfd: 810, coverageArea: 8 },
      }),
      createDeviceBlueprint({
        kind: 'ClimateUnit',
        id: DEVICE_BLUEPRINT_CLIMATE_ID,
        name: 'Zephyr Climate',
        roomPurposes: '*',
        settings: { airflow: 340, targetTemperature: 24, coolingCapacity: 3 },
      }),
    ];
    const strainPrices = createStrainPriceMap([
      [STRAIN_BLUEPRINT_ALPHA_ID, { seedPrice: 1.1, harvestPricePerGram: 4.4 }],
      [STRAIN_BLUEPRINT_BETA_ID, { seedPrice: 0.9, harvestPricePerGram: 3.7 }],
    ]);
    const devicePrices = createDevicePriceMap([
      [
        DEVICE_BLUEPRINT_LAMP_ID,
        {
          capitalExpenditure: 1350,
          baseMaintenanceCostPerTick: 0.0023,
          costIncreasePer1000Ticks: 0.0005,
        },
      ],
      [
        DEVICE_BLUEPRINT_CLIMATE_ID,
        {
          capitalExpenditure: 4100,
          baseMaintenanceCostPerTick: 0.0033,
          costIncreasePer1000Ticks: 0.0006,
        },
      ],
    ]);
    repository = createBlueprintRepositoryStub({
      strains: strainBlueprints,
      devices: deviceBlueprints,
      strainPrices,
      devicePrices,
    });
    expectedStrainCatalog = buildStrainBlueprintCatalog(repository);
    expectedDeviceCatalog = buildDeviceBlueprintCatalog(repository);
    structureBlueprints = [
      createStructureBlueprint({ id: STRUCTURE_BLUEPRINT_ID, name: 'Gateway Test Campus' }),
    ];
    const loopStub = { processTick: () => Promise.resolve() } as unknown as SimulationLoop;

    facade = new SimulationFacade({ state, eventBus, loop: loopStub });

    const worldService = new WorldService({
      state,
      rng,
      costAccounting,
      structureBlueprints,
    });
    const deviceService = new DeviceGroupService({ state, rng });
    const plantingService = new PlantingPlanService({ state, rng });

    facade.updateServices({
      world: {
        getStructureBlueprints: () => ({ ok: true, data: structureBlueprints }),
        getStrainBlueprints: () => ({ ok: true, data: buildStrainBlueprintCatalog(repository) }),
        getDeviceBlueprints: () => ({ ok: true, data: buildDeviceBlueprintCatalog(repository) }),
        renameStructure: (intent, context) =>
          worldService.renameStructure(intent.structureId, intent.name, context),
        deleteStructure: (intent, context) =>
          worldService.deleteStructure(intent.structureId, context),
        duplicateStructure: (intent, context) =>
          worldService.duplicateStructure(intent.structureId, intent.name, context),
        duplicateRoom: (intent, context) =>
          worldService.duplicateRoom(intent.roomId, intent.name, context),
        duplicateZone: (intent, context) =>
          worldService.duplicateZone(intent.zoneId, intent.name, context),
      },
      devices: {
        toggleDeviceGroup: (intent, context) =>
          deviceService.toggleDeviceGroup(intent.zoneId, intent.kind, intent.enabled, context),
      },
      plants: {
        togglePlantingPlan: (intent, context) =>
          plantingService.togglePlantingPlan(intent.zoneId, intent.enabled, context),
      },
      config: {
        getDifficultyConfig: () => ({ ok: true, data: TEST_DIFFICULTY_CONFIG }),
      },
    });

    const uiStream$ = createUiStream<{ structures: unknown } & unknown, TimeStatus>({
      snapshotProvider: () => ({
        tick: state.clock.tick,
        structures: state.structures.map((structure) => ({
          id: structure.id,
          name: structure.name,
          status: structure.status,
          footprint: structure.footprint,
          rentPerTick: structure.rentPerTick,
          roomIds: structure.rooms.map((room) => room.id),
        })),
        rooms: state.structures.flatMap((structure) =>
          structure.rooms.map((room) => ({
            id: room.id,
            name: room.name,
            structureId: structure.id,
            structureName: structure.name,
            purposeId: room.purposeId,
            purposeKind: 'growroom',
            purposeName: 'Grow Room',
            area: room.area,
            height: room.height,
            volume: room.volume,
            cleanliness: room.cleanliness,
            maintenanceLevel: room.maintenanceLevel,
            zoneIds: room.zones.map((zone) => zone.id),
          })),
        ),
        zones: state.structures.flatMap((structure) =>
          structure.rooms.flatMap((room) =>
            room.zones.map((zone) => ({
              id: zone.id,
              name: zone.name,
              structureId: structure.id,
              structureName: structure.name,
              roomId: room.id,
              roomName: room.name,
              area: zone.area,
              ceilingHeight: zone.ceilingHeight,
              volume: zone.volume,
              cultivationMethodId: zone.cultivationMethodId,
              environment: zone.environment,
              resources: zone.resources,
              metrics: zone.metrics,
              control: zone.control,
              devices: zone.devices,
              plants: zone.plants,
              health: zone.health,
            })),
          ),
        ),
        personnel: { employees: [], applicants: [], overallMorale: 1 },
        finance: state.finances.summary,
      }),
      timeStatusProvider: () => facade.getTimeStatus(),
      eventBus,
      simulationBufferMs: 20,
      domainBufferMs: 20,
    });

    gateway = new SocketGateway({
      httpServer: server,
      facade,
      roomPurposeSource,
      uiStream$,
      eventBus,
    });

    client = createClient(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      forceNew: true,
    });
    client.on('domainEvents', (payload) => {
      domainEvents.push(payload.events);
    });
    await new Promise<void>((resolve) => client.on('connect', () => resolve()));
    domainEvents.length = 0;
  });

  afterEach(async () => {
    client.removeAllListeners();
    client.disconnect();
    gateway.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const emitIntent = async (
    domain: string,
    action: string,
    payload: Record<string, unknown>,
  ): Promise<CommandResult<unknown>> => {
    return new Promise((resolve) => {
      client.emit(
        'facade.intent',
        { requestId: `${domain}.${action}`, domain, action, payload },
        (response: CommandResult<unknown>) => resolve(response),
      );
    });
  };

  const expectDomainEvent = async (type: string) => {
    await waitFor(
      () => domainEvents.some((batch) => batch.some((event) => event.type === type)),
      500,
    );
  };

  it('handles renameStructure intent', async () => {
    const response = await emitIntent('world', 'renameStructure', {
      structureId: STRUCTURE_ID,
      name: 'Gamma',
    });
    expect(response.ok).toBe(true);
    expect(state.structures[0]!.name).toBe('Gamma');
    await expectDomainEvent('world.structureRenamed');
  });

  it('handles getStrainBlueprints intent', async () => {
    const response = await emitIntent('world', 'getStrainBlueprints', {});
    expect(response.ok).toBe(true);
    expect(response.data).toEqual(expectedStrainCatalog);
  });

  it('handles getDeviceBlueprints intent', async () => {
    const response = await emitIntent('world', 'getDeviceBlueprints', {});
    expect(response.ok).toBe(true);
    expect(response.data).toEqual(expectedDeviceCatalog);
  });

  it('handles duplicateStructure intent', async () => {
    const response = await emitIntent('world', 'duplicateStructure', {
      structureId: STRUCTURE_ID,
      name: 'Alpha Copy',
    });
    expect(response.ok).toBe(true);
    expect(state.structures.length).toBe(2);
    await expectDomainEvent('world.structureDuplicated');
  });

  it('handles duplicateRoom intent', async () => {
    const response = await emitIntent('world', 'duplicateRoom', {
      roomId: ROOM_ID,
      name: 'Room Copy',
    });
    expect(response.ok).toBe(true);
    expect(state.structures[0]!.rooms.length).toBe(2);
    await expectDomainEvent('world.roomDuplicated');
  });

  it('handles duplicateZone intent', async () => {
    const response = await emitIntent('world', 'duplicateZone', {
      zoneId: ZONE_ID,
      name: 'Zone Copy',
    });
    expect(response.ok).toBe(true);
    expect(state.structures[0]!.rooms[0]!.zones.length).toBe(2);
    await expectDomainEvent('world.zoneDuplicated');
  });

  it('handles deleteStructure intent', async () => {
    const duplicate = await emitIntent('world', 'duplicateStructure', {
      structureId: STRUCTURE_ID,
      name: 'To Delete',
    });
    expect(duplicate.ok).toBe(true);
    const newId = state.structures.find((structure) => structure.name === 'To Delete')?.id;
    expect(newId).toBeDefined();
    const response = await emitIntent('world', 'deleteStructure', { structureId: newId });
    expect(response.ok).toBe(true);
    expect(state.structures.some((structure) => structure.id === newId)).toBe(false);
    await expectDomainEvent('world.structureDeleted');
  });

  it('handles toggleDeviceGroup intent', async () => {
    const response = await emitIntent('devices', 'toggleDeviceGroup', {
      zoneId: ZONE_ID,
      kind: 'Lamp',
      enabled: false,
    });
    expect(response.ok).toBe(true);
    expect(state.structures[0]!.rooms[0]!.zones[0]!.devices[0]!.status).toBe('offline');
    await expectDomainEvent('device.groupToggled');
  });

  it('handles togglePlantingPlan intent', async () => {
    const response = await emitIntent('plants', 'togglePlantingPlan', {
      zoneId: ZONE_ID,
      enabled: false,
    });
    expect(response.ok).toBe(true);
    expect(state.structures[0]!.rooms[0]!.zones[0]!.plantingPlan?.enabled).toBe(false);
    await expectDomainEvent('plant.plantingPlanToggled');
  });

  it('returns difficulty configuration via config intent', async () => {
    const response = await emitIntent('config', 'getDifficultyConfig', {});
    expect(response.ok).toBe(true);
    expect(response.data).toEqual(TEST_DIFFICULTY_CONFIG);
  });

  it('applies zone setpoint updates via config.update', async () => {
    const setpointEvents: SimulationEvent[] = [];
    const unsubscribe = facade.subscribe('env.setpointUpdated', (event) => {
      setpointEvents.push(event);
    });

    const response = await new Promise<CommandResult<TimeStatus>>((resolve) => {
      client.emit(
        'config.update',
        {
          requestId: 'cfg-setpoint',
          type: 'setpoint',
          zoneId: ZONE_ID,
          metric: 'temperature',
          value: 21,
        },
        (payload: CommandResult<TimeStatus>) => resolve(payload),
      );
    });

    expect(response.ok).toBe(true);
    await expectDomainEvent('env.setpointUpdated');
    await waitFor(() => setpointEvents.length > 0);

    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.control.setpoints.temperature).toBe(21);
    const climateUnit = zone.devices.find((device) => device.kind === 'ClimateUnit');
    expect(climateUnit?.settings.targetTemperature).toBe(21);

    unsubscribe();
  });
});
