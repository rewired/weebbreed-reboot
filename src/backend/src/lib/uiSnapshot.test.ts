import { describe, expect, it } from 'vitest';
import { buildSimulationSnapshot, type FinanceLedgerEntrySnapshot } from './uiSnapshot.js';
import type { RoomPurposeSource } from '@/engine/roomPurposes/index.js';
import type {
  GameState,
  LedgerEntry,
  ZoneEnvironmentState,
  ZoneMetricState,
  ZoneResourceState,
} from '@/state/models.js';

const createRoomPurposeSource = (): RoomPurposeSource => ({
  listRoomPurposes: () => [
    {
      id: 'purpose-1',
      kind: 'grow-room',
      name: 'Grow Room',
      description: 'Test purpose',
    },
  ],
  getRoomPurpose: (id: string) =>
    id === 'purpose-1'
      ? { id: 'purpose-1', kind: 'grow-room', name: 'Grow Room', description: 'Test purpose' }
      : undefined,
});

const createEnvironment = (): ZoneEnvironmentState => ({
  temperature: 24,
  relativeHumidity: 0.6,
  co2: 800,
  ppfd: 420,
  vpd: 1.2,
});

const createResources = (): ZoneResourceState => ({
  waterLiters: 10,
  nutrientSolutionLiters: 5,
  nutrientStrength: 0.75,
  substrateHealth: 0.9,
  reservoirLevel: 0.5,
  lastTranspirationLiters: 1,
});

const createMetrics = (): ZoneMetricState => ({
  averageTemperature: 24,
  averageHumidity: 0.6,
  averageCo2: 800,
  averagePpfd: 420,
  stressLevel: 0.1,
  lastUpdatedTick: 10,
});

const createState = (ledgerEntries: LedgerEntry[]): GameState => ({
  metadata: {
    gameId: 'game-1',
    createdAt: new Date(0).toISOString(),
    seed: 'seed',
    difficulty: 'normal',
    simulationVersion: '1.0.0',
    tickLengthMinutes: 10,
    economics: {
      initialCapital: 100_000,
      maintenanceReserve: 5_000,
      payrollReserve: 5_000,
      startingEmployees: 0,
      rentBufferDays: 30,
    },
  },
  clock: {
    tick: 60,
    isPaused: false,
    startedAt: new Date(0).toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    targetTickRate: 1,
  },
  structures: [
    {
      id: 'structure-1',
      blueprintId: 'structure-blueprint',
      name: 'Structure',
      status: 'active',
      footprint: { length: 10, width: 5, height: 3, area: 50, volume: 150 },
      rooms: [
        {
          id: 'room-1',
          structureId: 'structure-1',
          name: 'Room',
          purposeId: 'purpose-1',
          area: 50,
          height: 3,
          volume: 150,
          zones: [
            {
              id: 'zone-1',
              roomId: 'room-1',
              name: 'Zone',
              cultivationMethodId: 'method-1',
              area: 50,
              ceilingHeight: 3,
              volume: 150,
              environment: createEnvironment(),
              resources: createResources(),
              plants: [],
              devices: [],
              metrics: createMetrics(),
              control: { setpoints: {} },
              health: {
                plantHealth: {},
                pendingTreatments: [],
                appliedTreatments: [],
              },
              activeTaskIds: [],
              plantingPlan: null,
            },
          ],
          cleanliness: 1,
          maintenanceLevel: 1,
        },
      ],
      rentPerTick: 0,
      upfrontCostPaid: 0,
    },
  ],
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
    cashOnHand: 10_000,
    reservedCash: 500,
    outstandingLoans: [],
    ledger: ledgerEntries,
    summary: {
      totalRevenue: ledgerEntries
        .filter((entry) => entry.type === 'income')
        .reduce((total, entry) => total + entry.amount, 0),
      totalExpenses: ledgerEntries
        .filter((entry) => entry.type === 'expense')
        .reduce((total, entry) => total + entry.amount, 0),
      totalPayroll: 0,
      totalMaintenance: 0,
      netIncome:
        ledgerEntries
          .filter((entry) => entry.type === 'income')
          .reduce((total, entry) => total + entry.amount, 0) -
        ledgerEntries
          .filter((entry) => entry.type === 'expense')
          .reduce((total, entry) => total + entry.amount, 0),
      lastTickRevenue: 0,
      lastTickExpenses: 0,
    },
    utilityPrices: {
      electricityCostPerKWh: 0.12,
      waterCostPerM3: 2,
      nutrientsCostPerKg: 10,
    },
  },
  personnel: {
    employees: [],
    applicants: [],
    trainingPrograms: [],
    overallMorale: 1,
  },
  tasks: { backlog: [], active: [], completed: [], cancelled: [] },
});

const createLedgerEntries = (count: number): LedgerEntry[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `ledger_${index + 1}`,
    tick: index + 1,
    timestamp: new Date(index + 1).toISOString(),
    amount: index + 1,
    type: index % 2 === 0 ? 'income' : 'expense',
    category: index % 2 === 0 ? 'sales' : 'rent',
    description: index === 10 ? '   ' : `Entry ${index + 1}`,
  }));

describe('buildSimulationSnapshot finance ledger', () => {
  const roomPurposeSource = createRoomPurposeSource();

  it('includes the last 50 ledger entries with compact fields', () => {
    const ledgerEntries = createLedgerEntries(55);
    const snapshot = buildSimulationSnapshot(createState(ledgerEntries), roomPurposeSource);

    const ledger = snapshot.finance.ledger;
    expect(ledger).toBeDefined();
    expect(ledger).toHaveLength(50);

    const first = ledger?.[0] as FinanceLedgerEntrySnapshot;
    expect(first.tick).toBe(6);
    expect(first.description).toBe('Entry 6');

    const blankDescriptionEntry = ledger?.find((entry) => entry.tick === 11);
    expect(blankDescriptionEntry?.description).toBe('sales');

    const last = ledger?.[ledger.length - 1] as FinanceLedgerEntrySnapshot;
    expect(last.tick).toBe(55);
    expect(last.description).toBe('Entry 55');
  });

  it('omits the ledger field when no entries are recorded', () => {
    const snapshot = buildSimulationSnapshot(createState([]), roomPurposeSource);

    expect(snapshot.finance.ledger).toBeUndefined();
  });
});
