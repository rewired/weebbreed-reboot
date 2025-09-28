import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '@/lib/eventBus.js';
import { SimulationFacade } from '@/facade/index.js';
import type { DeviceInstanceState, GameState } from '@/state/models.js';
import type { SimulationEvent } from '@/lib/eventBus.js';
import type { SimulationLoop } from '@/sim/loop.js';
import { WorldService } from '@/engine/world/worldService.js';
import { DEFAULT_MAINTENANCE_INTERVAL_TICKS } from '@/constants/world.js';
import { DeviceGroupService } from '@/engine/devices/deviceGroupService.js';
import { DeviceInstallationService } from '@/engine/devices/deviceInstallationService.js';
import { DeviceRemovalService } from '@/engine/devices/deviceRemovalService.js';
import { LightingCycleService } from '@/engine/devices/lightingCycleService.js';
import { PlantingPlanService } from '@/engine/plants/plantingPlanService.js';
import { PlantingService } from '@/engine/plants/plantingService.js';
import { CostAccountingService } from '@/engine/economy/costAccounting.js';
import type { PriceCatalog } from '@/engine/economy/pricing.js';
import { RngService } from '@/lib/rng.js';
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
  createCultivationMethodBlueprint,
  createRoomPurpose,
} from '@/testing/fixtures.js';

const STRUCTURE_ID = '11111111-1111-1111-1111-111111111111';
const ROOM_ID = '22222222-2222-2222-2222-222222222222';
const ZONE_ID = 'zone_333333';
const STRAIN_BLUEPRINT_ALPHA_ID = '00000000-0000-0000-0000-000000000101';
const STRAIN_BLUEPRINT_BETA_ID = '00000000-0000-0000-0000-000000000102';
const DEVICE_BLUEPRINT_LAMP_ID = '00000000-0000-0000-0000-000000000201';
const DEVICE_BLUEPRINT_CLIMATE_ID = '00000000-0000-0000-0000-000000000202';
const STRUCTURE_BLUEPRINT_ID = '00000000-0000-0000-0000-000000000301';
const STRAIN_BLUEPRINT_INCOMPATIBLE_ID = '00000000-0000-0000-0000-000000000103';
const DEVICE_BLUEPRINT_INCOMPATIBLE_ID = '00000000-0000-0000-0000-000000000203';
const DEVICE_ID = '44444444-4444-4444-4444-444444444444';
const DEVICE_BLUEPRINT_ID = '55555555-5555-5555-5555-555555555555';
const METHOD_ID = '66666666-6666-6666-6666-666666666666';
const STRAIN_ID = STRAIN_BLUEPRINT_ALPHA_ID;
const PLANTING_PLAN_ID = '88888888-8888-8888-8888-888888888888';
const ROOM_PURPOSE_ID = '99999999-9999-9999-9999-999999999999';

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
                  settings: { power: 0.8 },
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

describe('SimulationFacade new intents', () => {
  let state: GameState;
  let facade: SimulationFacade;
  let events: SimulationEvent[];
  let repository: ReturnType<typeof createBlueprintRepositoryStub>;
  let expectedStrainCatalog: ReturnType<typeof buildStrainBlueprintCatalog>;
  let expectedDeviceCatalog: ReturnType<typeof buildDeviceBlueprintCatalog>;
  let structureBlueprints: ReturnType<typeof createStructureBlueprint>[];

  beforeEach(() => {
    state = createTestState();
    events = [];
    const eventBus = new EventBus();
    const rng = new RngService('intent-tests');
    const costAccounting = new CostAccountingService(createPriceCatalog());
    const strainBlueprints = [
      createStrainBlueprint({
        id: STRAIN_BLUEPRINT_ALPHA_ID,
        name: 'Aurora Prime',
        slug: 'aurora-prime',
        methodAffinity: { [METHOD_ID]: 0.85 },
      }),
      createStrainBlueprint({
        id: STRAIN_BLUEPRINT_BETA_ID,
        name: 'Borealis',
        slug: 'borealis',
        methodAffinity: { [METHOD_ID]: 0.55 },
      }),
      createStrainBlueprint({
        id: STRAIN_BLUEPRINT_INCOMPATIBLE_ID,
        name: 'Frostbite',
        slug: 'frostbite',
        methodAffinity: { [METHOD_ID]: 0.1 },
      }),
    ];
    const deviceBlueprints = [
      createDeviceBlueprint({
        kind: 'Lamp',
        id: DEVICE_BLUEPRINT_LAMP_ID,
        name: 'Astra Lamp',
        roomPurposes: ['growroom'],
        settings: { power: 0.7, ppfd: 820, coverageArea: 9 },
      }),
      createDeviceBlueprint({
        kind: 'ClimateUnit',
        id: DEVICE_BLUEPRINT_CLIMATE_ID,
        name: 'Boreal Climate',
        roomPurposes: '*',
        settings: { airflow: 360, targetTemperature: 24, coolingCapacity: 3.2 },
      }),
      createDeviceBlueprint({
        kind: 'Lamp',
        id: DEVICE_BLUEPRINT_INCOMPATIBLE_ID,
        name: 'Dry Zone Lamp',
        roomPurposes: ['dryroom'],
        settings: { power: 0.6, ppfd: 700, coverageArea: 8 },
      }),
    ];
    const strainPrices = createStrainPriceMap([
      [STRAIN_BLUEPRINT_ALPHA_ID, { seedPrice: 1.2, harvestPricePerGram: 4.5 }],
      [STRAIN_BLUEPRINT_BETA_ID, { seedPrice: 0.95, harvestPricePerGram: 3.8 }],
      [STRAIN_BLUEPRINT_INCOMPATIBLE_ID, { seedPrice: 0.8, harvestPricePerGram: 3.2 }],
    ]);
    const devicePrices = createDevicePriceMap([
      [
        DEVICE_BLUEPRINT_LAMP_ID,
        {
          capitalExpenditure: 1400,
          baseMaintenanceCostPerTick: 0.0025,
          costIncreasePer1000Ticks: 0.0005,
        },
      ],
      [
        DEVICE_BLUEPRINT_CLIMATE_ID,
        {
          capitalExpenditure: 4200,
          baseMaintenanceCostPerTick: 0.0035,
          costIncreasePer1000Ticks: 0.0007,
        },
      ],
    ]);
    repository = createBlueprintRepositoryStub({
      strains: strainBlueprints,
      devices: deviceBlueprints,
      cultivationMethods: [createCultivationMethodBlueprint({ id: METHOD_ID, areaPerPlant: 1.5 })],
      roomPurposes: [
        createRoomPurpose({
          id: ROOM_PURPOSE_ID,
          kind: 'growroom',
          name: 'Grow Room',
        }),
        createRoomPurpose({
          id: 'dry-room-purpose',
          kind: 'dryroom',
          name: 'Dry Room',
        }),
      ],
      strainPrices,
      devicePrices,
    });
    expectedStrainCatalog = buildStrainBlueprintCatalog(repository);
    expectedDeviceCatalog = buildDeviceBlueprintCatalog(repository);
    structureBlueprints = [
      createStructureBlueprint({ id: STRUCTURE_BLUEPRINT_ID, name: 'Catalog Test Campus' }),
    ];
    const loopStub = { processTick: () => Promise.resolve() } as unknown as SimulationLoop;
    facade = new SimulationFacade({
      state,
      eventBus,
      loop: loopStub,
    });

    const worldService = new WorldService({
      state,
      rng,
      costAccounting,
      structureBlueprints,
    });
    const deviceService = new DeviceGroupService({ state, rng });
    const deviceInstallationService = new DeviceInstallationService({
      state,
      rng,
      repository,
    });
    const deviceRemovalService = new DeviceRemovalService({ state });
    const lightingCycleService = new LightingCycleService({ state });
    const plantingPlanService = new PlantingPlanService({ state, rng });
    const plantingService = new PlantingService({ state, rng, repository });

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
        installDevice: (intent, context) =>
          deviceInstallationService.installDevice(
            intent.targetId,
            intent.deviceId,
            intent.settings,
            context,
          ),
        removeDevice: (intent, context) =>
          deviceRemovalService.removeDevice(intent.instanceId, context),
        toggleDeviceGroup: (intent, context) =>
          deviceService.toggleDeviceGroup(intent.zoneId, intent.kind, intent.enabled, context),
        adjustLightingCycle: (intent, context) =>
          lightingCycleService.adjustLightingCycle(intent.zoneId, intent.photoperiodHours, context),
      },
      plants: {
        addPlanting: (intent, context) =>
          plantingService.addPlanting(
            intent.zoneId,
            intent.strainId,
            intent.count,
            intent.startTick,
            context,
          ),
        togglePlantingPlan: (intent, context) =>
          plantingPlanService.togglePlantingPlan(intent.zoneId, intent.enabled, context),
      },
    });

    facade.subscribe((event) => {
      events.push(event);
    });
  });

  it('registers all intent domains with accessible handlers', async () => {
    const domains = facade.listIntentDomains();
    expect(domains).toEqual(
      expect.arrayContaining([
        'time',
        'world',
        'devices',
        'plants',
        'health',
        'workforce',
        'finance',
        'config',
      ]),
    );
    expect(facade.hasIntentDomain('time')).toBe(true);
    for (const domain of [
      'time',
      'world',
      'devices',
      'plants',
      'health',
      'workforce',
      'finance',
      'config',
    ]) {
      const handler = facade.getIntentHandler(domain, 'listIntentDomains');
      expect(handler).toBeUndefined();
    }
    const renameHandler = facade.getIntentHandler('world', 'renameStructure');
    const deviceHandler = facade.getIntentHandler('devices', 'toggleDeviceGroup');
    const startHandler = facade.getIntentHandler('time', 'start');
    expect(typeof renameHandler).toBe('function');
    expect(typeof deviceHandler).toBe('function');
    expect(typeof startHandler).toBe('function');
    const renameResult = await renameHandler?.({ structureId: STRUCTURE_ID, name: 'Omega' });
    expect(renameResult?.ok).toBe(true);
    const toggleResult = await deviceHandler?.({ zoneId: ZONE_ID, kind: 'Lamp', enabled: true });
    expect(toggleResult?.ok).toBe(true);
    const startResult = await startHandler?.({ gameSpeed: 1 });
    expect(startResult?.ok).toBe(true);
  });

  it('returns deterministic strain blueprint catalogs', async () => {
    const response = await facade.world.getStrainBlueprints({});
    expect(response.ok).toBe(true);
    expect(response.data).toEqual(expectedStrainCatalog);
    if (response.data && response.data.length > 0) {
      const entry = response.data[0];
      if (entry?.defaults.phaseDurations) {
        entry.defaults.phaseDurations.vegDays = 999;
      }
    }
    const second = await facade.world.getStrainBlueprints({});
    expect(second.ok).toBe(true);
    expect(second.data).toEqual(expectedStrainCatalog);
  });

  it('returns deterministic device blueprint catalogs', async () => {
    const response = await facade.world.getDeviceBlueprints({});
    expect(response.ok).toBe(true);
    expect(response.data).toEqual(expectedDeviceCatalog);
    if (response.data && response.data.length > 0) {
      response.data[0]!.defaults.settings.power = 0;
    }
    const second = await facade.world.getDeviceBlueprints({});
    expect(second.ok).toBe(true);
    expect(second.data).toEqual(expectedDeviceCatalog);
  });

  it('adjusts lighting cycles and emits telemetry', async () => {
    const result = await facade.devices.adjustLightingCycle({
      zoneId: ZONE_ID,
      photoperiodHours: { on: 19, off: 5 },
    });

    expect(result.ok).toBe(true);
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.lighting?.photoperiodHours).toEqual({ on: 19, off: 5 });
    expect(
      events.some(
        (event) =>
          event.type === 'device.lightingCycleAdjusted' &&
          (event.payload as { zoneId?: string } | undefined)?.zoneId === ZONE_ID,
      ),
    ).toBe(true);
  });

  it('renames a structure and emits an event', async () => {
    const result = await facade.world.renameStructure({
      structureId: STRUCTURE_ID,
      name: 'Gamma Hub',
    });
    expect(result.ok).toBe(true);
    expect(state.structures[0]!.name).toBe('Gamma Hub');
    expect(events.some((event) => event.type === 'world.structureRenamed')).toBe(true);
  });

  it('duplicates a structure with devices and records expenses', async () => {
    const result = await facade.world.duplicateStructure({
      structureId: STRUCTURE_ID,
      name: 'Alpha Copy',
    });
    expect(result.ok).toBe(true);
    expect(result.data?.structureId).toBeDefined();
    expect(state.structures).toHaveLength(2);
    const duplicate = state.structures[1]!;
    expect(duplicate.rooms[0]!.zones[0]!.devices).toHaveLength(1);
    expect(duplicate.rooms[0]!.zones[0]!.plants).toHaveLength(0);
    expect(state.finances.ledger.length).toBeGreaterThan(0);
    expect(state.finances.cashOnHand).toBeLessThan(100_000);
    expect(events.some((event) => event.type === 'world.structureDuplicated')).toBe(true);
  });

  it('duplicates a room within footprint limits', async () => {
    const result = await facade.world.duplicateRoom({ roomId: ROOM_ID, name: 'Grow Room Copy' });
    expect(result.ok).toBe(true);
    expect(state.structures[0]!.rooms).toHaveLength(2);
    expect(events.some((event) => event.type === 'world.roomDuplicated')).toBe(true);
  });

  it('duplicates a zone and resets mutable state', async () => {
    const result = await facade.world.duplicateZone({ zoneId: ZONE_ID, name: 'Zone Clone' });
    expect(result.ok).toBe(true);
    const room = state.structures[0]!.rooms[0]!;
    expect(room.zones).toHaveLength(2);
    const duplicated = room.zones[1]!;
    expect(duplicated.devices).toHaveLength(1);
    expect(duplicated.plants).toHaveLength(0);
    expect(duplicated.resources.waterLiters).toBeGreaterThan(0);
    expect(events.some((event) => event.type === 'world.zoneDuplicated')).toBe(true);
  });

  it('deletes a duplicated structure and clears references', async () => {
    const duplicate = await facade.world.duplicateStructure({
      structureId: STRUCTURE_ID,
      name: 'Delta',
    });
    expect(duplicate.ok).toBe(true);
    const id = duplicate.data?.structureId;
    expect(id).toBeDefined();
    const result = await facade.world.deleteStructure({ structureId: id! });
    expect(result.ok).toBe(true);
    expect(state.structures.some((structure) => structure.id === id)).toBe(false);
    expect(events.some((event) => event.type === 'world.structureDeleted')).toBe(true);
  });

  it('toggles a device group and schedules a task', async () => {
    const result = await facade.devices.toggleDeviceGroup({
      zoneId: ZONE_ID,
      kind: 'Lamp',
      enabled: false,
    });
    expect(result.ok).toBe(true);
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.devices[0]!.status).toBe('offline');
    expect(state.tasks.backlog).toHaveLength(1);
    expect(zone.activeTaskIds).toHaveLength(1);
    expect(events.some((event) => event.type === 'device.groupToggled')).toBe(true);
  });

  it('toggles a planting plan and records intent', async () => {
    const result = await facade.plants.togglePlantingPlan({ zoneId: ZONE_ID, enabled: false });
    expect(result.ok).toBe(true);
    const plan = state.structures[0]!.rooms[0]!.zones[0]!.plantingPlan;
    expect(plan?.enabled).toBe(false);
    expect(state.tasks.backlog.length).toBeGreaterThan(0);
    expect(events.some((event) => event.type === 'plant.plantingPlanToggled')).toBe(true);
  });

  it('installs a compatible device and emits telemetry', async () => {
    const result = await facade.devices.installDevice({
      targetId: ZONE_ID,
      deviceId: DEVICE_BLUEPRINT_LAMP_ID,
    });
    expect(result.ok).toBe(true);
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.devices).toHaveLength(2);
    const telemetry = events.find((event) => event.type === 'device.installed');
    expect(telemetry).toBeDefined();
    expect(telemetry?.payload).toMatchObject({
      zoneId: ZONE_ID,
      blueprintId: DEVICE_BLUEPRINT_LAMP_ID,
    });
    expect(result.data?.deviceId).toBeDefined();
    if (telemetry?.payload && typeof telemetry.payload === 'object') {
      expect(telemetry.payload.deviceId).toEqual(result.data?.deviceId);
    }
  });

  it('removes a device with a generated instance identifier', async () => {
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    const existing = zone.devices[0]!;
    const generatedDevice: DeviceInstanceState = {
      ...existing,
      id: 'device-instance-42',
      name: 'Temporary Fixture',
    };
    zone.devices.push(generatedDevice);

    expect(zone.devices.some((device) => device.id === generatedDevice.id)).toBe(true);

    const result = await facade.devices.removeDevice({ instanceId: generatedDevice.id });

    expect(result.ok).toBe(true);
    expect(result.warnings).toBeUndefined();
    expect(zone.devices.some((device) => device.id === generatedDevice.id)).toBe(false);
    const removalEvent = events.find(
      (event) =>
        event.type === 'device.removed' &&
        event.payload &&
        typeof event.payload === 'object' &&
        (event.payload as { deviceId?: string }).deviceId === generatedDevice.id,
    );
    expect(removalEvent).toBeDefined();
  });

  it('clears unsupported setpoints when removing the last control device', async () => {
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    zone.control ??= { setpoints: {} };
    zone.control.setpoints.ppfd = 420;

    const result = await facade.devices.removeDevice({ instanceId: DEVICE_ID });

    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([
      'Cleared PPFD setpoint because the zone no longer has lighting devices.',
    ]);
    expect(zone.control.setpoints.ppfd).toBeUndefined();

    const removalEvent = events.find(
      (event) =>
        event.type === 'device.removed' &&
        event.payload &&
        typeof event.payload === 'object' &&
        (event.payload as { deviceId?: string }).deviceId === DEVICE_ID,
    );
    expect(removalEvent).toBeDefined();
    if (removalEvent && typeof removalEvent.payload === 'object') {
      expect((removalEvent.payload as { warnings?: string[] }).warnings).toEqual(result.warnings);
    }
  });

  it('rejects incompatible device installations with structured errors', async () => {
    const response = await facade.devices.installDevice({
      targetId: ZONE_ID,
      deviceId: DEVICE_BLUEPRINT_INCOMPATIBLE_ID,
    });
    expect(response.ok).toBe(false);
    expect(response.errors?.[0]?.code).toBe('ERR_INVALID_STATE');
    expect(events.some((event) => event.type === 'device.installed')).toBe(false);
  });

  it('adds plants within capacity and emits telemetry', async () => {
    const result = await facade.plants.addPlanting({
      zoneId: ZONE_ID,
      strainId: STRAIN_BLUEPRINT_ALPHA_ID,
      count: 4,
    });
    expect(result.ok).toBe(true);
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.plants).toHaveLength(4);
    const telemetry = events.find((event) => event.type === 'plant.planted');
    expect(telemetry).toBeDefined();
    expect(telemetry?.payload).toMatchObject({
      zoneId: ZONE_ID,
      strainId: STRAIN_BLUEPRINT_ALPHA_ID,
      count: 4,
    });
    expect(Array.isArray(result.data?.plantIds)).toBe(true);
    expect(result.data?.plantIds).toHaveLength(4);
  });

  it('warns when planting a strain with low method affinity', async () => {
    const result = await facade.plants.addPlanting({
      zoneId: ZONE_ID,
      strainId: STRAIN_BLUEPRINT_BETA_ID,
      count: 2,
    });
    expect(result.ok).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings?.[0]).toContain('low affinity');
  });

  it('rejects planting when capacity would be exceeded', async () => {
    const response = await facade.plants.addPlanting({
      zoneId: ZONE_ID,
      strainId: STRAIN_BLUEPRINT_ALPHA_ID,
      count: 200,
    });
    expect(response.ok).toBe(false);
    expect(response.errors?.[0]?.code).toBe('ERR_INVALID_STATE');
  });

  it('rejects planting for incompatible strain affinity', async () => {
    const response = await facade.plants.addPlanting({
      zoneId: ZONE_ID,
      strainId: STRAIN_BLUEPRINT_INCOMPATIBLE_ID,
      count: 1,
    });
    expect(response.ok).toBe(false);
    expect(response.errors?.[0]?.code).toBe('ERR_INVALID_STATE');
    expect(events.some((event) => event.type === 'plant.planted')).toBe(false);
  });

  it('routes humidity setpoints through dehumidifier devices and emits telemetry', () => {
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    const dehumidifier: DeviceInstanceState = {
      id: 'device-dehu-1',
      blueprintId: 'blueprint-dehu-1',
      kind: 'Dehumidifier',
      name: 'DryBox 200',
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
      settings: { targetHumidity: 0.5, moistureRemoval: 3.5 },
    };

    zone.devices = [dehumidifier];
    zone.control = { setpoints: {} };

    const result = facade.setZoneSetpoint(ZONE_ID, 'relativeHumidity', 0.58);

    expect(result.ok).toBe(true);
    expect(result.warnings).toBeUndefined();
    expect(zone.control.setpoints.humidity).toBeCloseTo(0.58, 6);
    expect(dehumidifier.settings.targetHumidity).toBeCloseTo(0.58, 6);

    const humidityEvent = events.find((event) => event.type === 'env.setpointUpdated');
    expect(humidityEvent).toBeDefined();
    expect(humidityEvent?.payload).toMatchObject({
      zoneId: ZONE_ID,
      metric: 'relativeHumidity',
      value: 0.58,
    });

    const control =
      humidityEvent?.payload && typeof humidityEvent.payload === 'object'
        ? (humidityEvent.payload as { control?: { humidity?: number } }).control
        : undefined;
    expect(control?.humidity).toBeCloseTo(0.58, 6);
  });
});
