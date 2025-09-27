import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UtilityPricing } from './UtilityPricing';
import { useSimulationStore } from '@/store/simulation';
import type { SimulationBridge } from '@/facade/systemFacade';
import type { SimulationSnapshot } from '@/types/simulation';

const createSnapshot = (): SimulationSnapshot => ({
  tick: 1,
  clock: {
    tick: 1,
    isPaused: true,
    targetTickRate: 1,
    startedAt: new Date(0).toISOString(),
    lastUpdatedAt: new Date(0).toISOString(),
  },
  structures: [],
  rooms: [],
  zones: [],
  personnel: { employees: [], applicants: [], overallMorale: 1 },
  finance: {
    cashOnHand: 1000,
    reservedCash: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    lastTickRevenue: 0,
    lastTickExpenses: 0,
    utilityPrices: {
      pricePerKwh: 0.15,
      pricePerLiterWater: 0.02,
      pricePerGramNutrients: 0.1,
    },
  },
});

describe('UtilityPricing component', () => {
  const bridge = {
    sendIntent: vi.fn(),
  } as unknown as SimulationBridge;

  beforeEach(() => {
    vi.resetAllMocks();
    act(() => {
      useSimulationStore.setState({
        snapshot: createSnapshot(),
        events: [],
        timeStatus: null,
        connectionStatus: 'connected',
        zoneHistory: {},
        lastTick: 1,
      });
    });
  });

  afterEach(() => {
    act(() => {
      useSimulationStore.getState().reset();
    });
  });

  it('renders current utility prices from the snapshot', () => {
    render(<UtilityPricing bridge={bridge} />);

    expect(screen.getByText('€0.15')).toBeInTheDocument();
    expect(screen.getByText('€0.02')).toBeInTheDocument();
    expect(screen.getByText('€0.10')).toBeInTheDocument();
  });

  it('sends converted payload on save and shows success message', async () => {
    bridge.sendIntent = vi.fn().mockResolvedValue({ ok: true });
    render(<UtilityPricing bridge={bridge} />);

    const [electricityInput, waterInput, nutrientInput] = screen.getAllByLabelText('New Price');

    fireEvent.change(electricityInput, { target: { value: '0.2' } });
    fireEvent.change(waterInput, { target: { value: '0.03' } });
    fireEvent.change(nutrientInput, { target: { value: '0.12' } });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(bridge.sendIntent).toHaveBeenCalled());
    expect(bridge.sendIntent).toHaveBeenCalledWith({
      domain: 'finance',
      action: 'setUtilityPrices',
      payload: {
        electricityCostPerKWh: 0.2,
        waterCostPerM3: 30,
        nutrientsCostPerKg: 120,
      },
    });

    await waitFor(() => expect(screen.getByText(/utility prices updated/i)).toBeInTheDocument());
  });

  it('shows an error message when the update fails', async () => {
    bridge.sendIntent = vi.fn().mockResolvedValue({
      ok: false,
      errors: [{ message: 'Invalid payload' }],
    });
    render(<UtilityPricing bridge={bridge} />);

    const [electricityInput] = screen.getAllByLabelText('New Price');
    fireEvent.change(electricityInput, { target: { value: '0.18' } });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(bridge.sendIntent).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen.getByText(/Failed to update utility prices: Invalid payload/i),
      ).toBeInTheDocument(),
    );
  });
});
