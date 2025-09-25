import { describe, it, expect, beforeEach } from 'vitest';
import { WorldService, type WorldServiceOptions } from './worldService.js';
import { CostAccountingService } from '@/engine/economy/costAccounting.js';
import { RngService } from '@/lib/rng.js';
import type { GameState } from '@/state/models.js';
import type { CommandExecutionContext } from '@/facade/index.js';

const createTestGameState = (): GameState => ({
  metadata: {
    gameId: 'test',
    createdAt: new Date().toISOString(),
    seed: 'test-seed',
    difficulty: 'normal',
    simulationVersion: '1.0.0',
    tickLengthMinutes: 60,
    economics: {
      initialCapital: 100_000,
      itemPriceMultiplier: 1,
      harvestPriceMultiplier: 1,
      rentPerSqmStructurePerTick: 0.1,
      rentPerSqmRoomPerTick: 0.2,
    },
  },
  clock: {
    tick: 0,
    isPaused: true,
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    targetTickRate: 1,
  },
  structures: [
    {
      id: 'structure-1',
      blueprintId: 'test-blueprint',
      name: 'Test Structure',
      status: 'active',
      footprint: { length: 10, width: 10, height: 3, area: 100, volume: 300 },
      rooms: [
        {
          id: 'room-1',
          structureId: 'structure-1',
          name: 'Test Room',
          purposeId: 'grow-room',
          area: 50,
          height: 3,
          volume: 150,
          cleanliness: 1,
          maintenanceLevel: 1,
          zones: [],
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

const createTestContext = (): CommandExecutionContext => ({
  tick: 1,
  events: {
    queue: () => undefined,
  },
});

describe('WorldService.createZone area validation', () => {
  let worldService: WorldService;
  let gameState: GameState;
  let context: CommandExecutionContext;

  beforeEach(() => {
    gameState = createTestGameState();
    const rng = new RngService('test-seed');
    const costAccounting = new CostAccountingService({
      devicePrices: new Map(),
      strainPrices: new Map(),
      utilityPrices: { pricePerKwh: 0.1, pricePerLiterWater: 0.01, pricePerGramNutrients: 0.05 },
    });
    const options: WorldServiceOptions = {
      state: gameState,
      rng,
      costAccounting,
      structureBlueprints: [],
      roomPurposeSource: {
        getAll: () => [{ id: 'grow-room', name: 'Grow Room', description: 'Test room' }],
        getById: () => ({ id: 'grow-room', name: 'Grow Room', description: 'Test room' }),
      },
    };
    worldService = new WorldService(options);
    context = createTestContext();
  });

  it('should create the first zone successfully', () => {
    const result = worldService.createZone(
      {
        roomId: 'room-1',
        zone: {
          name: 'Zone 1',
          area: 20,
          methodId: 'test-method',
        },
      },
      context,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.zoneId).toBeDefined();
    }

    // Check that the zone was added
    const room = gameState.structures[0]?.rooms[0];
    expect(room?.zones).toHaveLength(1);
    expect(room?.zones[0]?.area).toBe(20);
  });

  it('should fail to create a second zone that would exceed room area', () => {
    // Create first zone (20 m²)
    const firstResult = worldService.createZone(
      {
        roomId: 'room-1',
        zone: {
          name: 'Zone 1',
          area: 20,
          methodId: 'test-method',
        },
      },
      context,
    );
    expect(firstResult.ok).toBe(true);

    // Try to create second zone (40 m²) - should fail because 20 + 40 = 60 > 50
    const secondResult = worldService.createZone(
      {
        roomId: 'room-1',
        zone: {
          name: 'Zone 2',
          area: 40,
          methodId: 'test-method',
        },
      },
      context,
    );

    expect(secondResult.ok).toBe(false);
    expect(secondResult.errors?.[0]?.message).toContain('exceed the room area');

    // Verify only one zone was created
    const room = gameState.structures[0]?.rooms[0];
    expect(room?.zones).toHaveLength(1);
  });

  it('should successfully create a second zone that fits within remaining area', () => {
    // Create first zone (20 m²)
    const firstResult = worldService.createZone(
      {
        roomId: 'room-1',
        zone: {
          name: 'Zone 1',
          area: 20,
          methodId: 'test-method',
        },
      },
      context,
    );
    expect(firstResult.ok).toBe(true);

    // Create second zone (25 m²) - should succeed because 20 + 25 = 45 < 50
    const secondResult = worldService.createZone(
      {
        roomId: 'room-1',
        zone: {
          name: 'Zone 2',
          area: 25,
          methodId: 'test-method',
        },
      },
      context,
    );

    expect(secondResult.ok).toBe(true);
    if (secondResult.ok) {
      expect(secondResult.data?.zoneId).toBeDefined();
    }

    // Verify both zones were created
    const room = gameState.structures[0]?.rooms[0];
    expect(room?.zones).toHaveLength(2);
    expect(room?.zones[0]?.area).toBe(20);
    expect(room?.zones[1]?.area).toBe(25);
  });

  it('should calculate available area correctly after zone creation', () => {
    const room = gameState.structures[0]?.rooms[0];
    if (!room) {
      throw new Error('Room not found');
    }

    // Initially: 50 m² room, 0 zones
    expect(room.area).toBe(50);
    expect(room.zones).toHaveLength(0);

    // After first zone (20 m²): 30 m² remaining
    worldService.createZone(
      {
        roomId: 'room-1',
        zone: {
          name: 'Zone 1',
          area: 20,
          methodId: 'test-method',
        },
      },
      context,
    );

    expect(room.zones).toHaveLength(1);
    const existingArea = room.zones.reduce((sum, zone) => sum + zone.area, 0);
    const availableArea = room.area - existingArea;

    expect(existingArea).toBe(20);
    expect(availableArea).toBe(30);
  });
});
