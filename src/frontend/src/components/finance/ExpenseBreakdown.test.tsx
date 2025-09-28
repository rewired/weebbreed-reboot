import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, act } from '@testing-library/react';
import { ExpenseBreakdown } from './ExpenseBreakdown';
import { useSimulationStore } from '@/store/simulation';
import type { SimulationBridge } from '@/facade/systemFacade';
import type { SimulationSnapshot } from '@/types/simulation';

const bridge: SimulationBridge = {
  connect: () => undefined,
  loadQuickStart: async () => ({ ok: true }),
  getStructureBlueprints: async () => ({ ok: true, data: [] }),
  getStrainBlueprints: async () => ({ ok: true, data: [] }),
  getDeviceBlueprints: async () => ({ ok: true, data: [] }),
  getDifficultyConfig: async () => ({ ok: true }),
  sendControl: async () => ({ ok: true }),
  sendConfigUpdate: async () => ({ ok: true }),
  sendIntent: async () => ({ ok: true }),
  subscribeToUpdates: (_handler: Parameters<SimulationBridge['subscribeToUpdates']>[0]) => {
    void _handler;
    return () => undefined;
  },
  plants: {
    addPlanting: async () => ({ ok: true }),
  },
  devices: {
    installDevice: async () => ({ ok: true }),
  },
};

const baseSnapshot: SimulationSnapshot = {
  tick: 12,
  clock: {
    tick: 12,
    isPaused: false,
    targetTickRate: 1,
    startedAt: new Date(0).toISOString(),
    lastUpdatedAt: new Date(0).toISOString(),
  },
  structures: [],
  rooms: [],
  zones: [],
  personnel: { employees: [], applicants: [], overallMorale: 1 },
  finance: {
    cashOnHand: 4200,
    reservedCash: 0,
    totalRevenue: 2000,
    totalExpenses: 950,
    netIncome: 1050,
    lastTickRevenue: 2000,
    lastTickExpenses: 450,
    ledger: [
      { type: 'expense', category: 'utilities', amount: 150, tick: 12, description: 'Electricity' },
      {
        type: 'expense',
        category: 'payroll',
        amount: 300,
        tick: 11,
        description: 'Cultivation team',
      },
      {
        type: 'expense',
        category: 'device',
        amount: 500,
        tick: 8,
        description: 'LED array upgrade',
      },
      { type: 'income', category: 'sales', amount: 2000, tick: 12, description: 'Wholesale order' },
    ],
  },
};

describe('ExpenseBreakdown', () => {
  beforeEach(() => {
    act(() => {
      useSimulationStore.setState({
        snapshot: structuredClone(baseSnapshot),
        events: [],
        timeStatus: null,
        connectionStatus: 'connected',
        zoneHistory: {},
        lastTick: baseSnapshot.clock.tick,
      });
    });
  });

  afterEach(() => {
    act(() => {
      useSimulationStore.getState().reset();
    });
  });

  it('renders expense categories derived from ledger entries', () => {
    render(<ExpenseBreakdown bridge={bridge} timeRange="1M" />);

    expect(screen.getByText('Utilities')).toBeInTheDocument();
    expect(screen.getByText('Payroll')).toBeInTheDocument();
    expect(screen.getByText('Equipment Purchases')).toBeInTheDocument();
    expect(screen.getAllByText('€500')).not.toHaveLength(0);
    expect(screen.getAllByText('€150')).not.toHaveLength(0);
    expect(screen.getAllByText('€300')).not.toHaveLength(0);
    expect(screen.getAllByText('€450')).not.toHaveLength(0);
  });

  it('provides a fallback summary when ledger data is missing', () => {
    act(() => {
      useSimulationStore.setState({
        snapshot: {
          ...structuredClone(baseSnapshot),
          finance: {
            ...structuredClone(baseSnapshot.finance),
            ledger: undefined,
          },
        },
      });
    });

    render(<ExpenseBreakdown bridge={bridge} timeRange="1M" />);

    expect(screen.getAllByText('Total Expenses')).not.toHaveLength(0);
    expect(
      screen.getAllByText(/Aggregated expenses \(ledger data unavailable\)/i),
    ).not.toHaveLength(0);
  });
});
