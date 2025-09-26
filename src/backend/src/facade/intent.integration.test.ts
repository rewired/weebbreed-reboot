import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '@/lib/eventBus.js';
import { SimulationFacade } from '@/facade/index.js';
import type { GameState, SimulationEvent } from '@/state/models.js';
import type { SimulationLoop } from '@/sim/loop.js';
import { WorldService } from '@/engine/world/worldService.js';
import { DeviceGroupService } from '@/engine/devices/deviceGroupService.js';
import { PlantingPlanService } from '@/engine/plants/plantingPlanService.js';
import { CostAccountingService } from '@/engine/economy/costAccounting.js';
import type { PriceCatalog } from '@/engine/economy/pricing.js';
import { RngService } from '@/lib/rng.js';

const STRUCTURE_ID = '11111111-1111-1111-1111-111111111111';
const ROOM_ID = '22222222-2222-2222-2222-222222222222';
const ZONE_ID = 'zone_333333';
const DEVICE_ID = '44444444-4444-4444-4444-444444444444';
const DEVICE_BLUEPRINT_ID = '55555555-5555-5555-5555-555555555555';
const METHOD_ID = '66666666-6666-6666-6666-666666666666';
const STRAIN_ID = '77777777-7777-7777-7777-777777777777';
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
                    nextDueTick: 720,
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
  },
  personnel: { employees: [], applicants: [], trainingPrograms: [], overallMorale: 1 },
  tasks: { backlog: [], active: [], completed: [], cancelled: [] },
  notes: [],
});

describe('SimulationFacade new intents', () => {
  let state: GameState;
  let facade: SimulationFacade;
  let events: SimulationEvent[];

  beforeEach(() => {
    state = createTestState();
    events = [];
    const eventBus = new EventBus();
    const rng = new RngService('intent-tests');
    const costAccounting = new CostAccountingService(createPriceCatalog());
    const loopStub = { processTick: () => Promise.resolve() } as unknown as SimulationLoop;
    facade = new SimulationFacade({
      state,
      eventBus,
      loop: loopStub,
    });

    const worldService = new WorldService({ state, rng, costAccounting });
    const deviceService = new DeviceGroupService({ state, rng });
    const plantingPlanService = new PlantingPlanService({ state, rng });

    facade.updateServices({
      world: {
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
});
