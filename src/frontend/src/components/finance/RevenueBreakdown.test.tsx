import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, act } from '@testing-library/react';
import { RevenueBreakdown } from './RevenueBreakdown';
import { useSimulationStore } from '@/store/simulation';
import type { SimulationBridge } from '@/facade/systemFacade';
import type { SimulationSnapshot } from '@/types/simulation';

const bridge = { sendIntent: () => Promise.resolve() } as unknown as SimulationBridge;

const baseSnapshot: SimulationSnapshot = {
  tick: 10,
  clock: {
    tick: 10,
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
    cashOnHand: 5000,
    reservedCash: 0,
    totalRevenue: 2000,
    totalExpenses: 900,
    netIncome: 1100,
    lastTickRevenue: 1200,
    lastTickExpenses: 450,
    ledger: [
      { type: 'income', category: 'sales', amount: 1200, tick: 10, description: 'Harvest A' },
      { type: 'income', category: 'sales', amount: 800, tick: 9, description: 'Harvest B' },
    ],
  },
};

describe('RevenueBreakdown', () => {
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

  it('renders revenue sources based on ledger data', () => {
    render(<RevenueBreakdown bridge={bridge} timeRange="1M" />);

    expect(screen.getAllByText('Harvest A')).not.toHaveLength(0);
    expect(screen.getAllByText('Harvest B')).not.toHaveLength(0);
    expect(screen.getAllByText('€1,200')).not.toHaveLength(0);
    expect(screen.getAllByText('€800')).not.toHaveLength(0);
    expect(
      screen.queryByText(/Detailed ledger data is not yet available/i),
    ).not.toBeInTheDocument();
  });

  it('falls back to summary messaging when the ledger is missing', () => {
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

    render(<RevenueBreakdown bridge={bridge} timeRange="1M" />);

    expect(screen.getAllByText(/Detailed ledger data is not yet available/i)).not.toHaveLength(0);
    expect(screen.getAllByText(/Last tick revenue/i)).not.toHaveLength(0);
  });
});
