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

type SendIntentFn = SimulationBridge['sendIntent'];
type SendIntentArgs = Parameters<SendIntentFn>;
type SendIntentResult = Awaited<ReturnType<SendIntentFn>>;

describe('UtilityPricing component', () => {
  let bridge: SimulationBridge;
  let sendIntentCallCount: number;
  let lastIntent: SendIntentArgs[0] | null;
  let sendIntentResponse: SendIntentResult;

  beforeEach(() => {
    vi.resetAllMocks();
    sendIntentCallCount = 0;
    lastIntent = null;
    sendIntentResponse = { ok: true } as SendIntentResult;
    const sendIntent = (async (intent: SendIntentArgs[0]) => {
      sendIntentCallCount += 1;
      lastIntent = intent;
      return sendIntentResponse;
    }) as SendIntentFn;
    bridge = {
      connect: vi.fn(),
      loadQuickStart: async () => ({ ok: true }),
      getStructureBlueprints: async () => ({ ok: true, data: [] }),
      getStrainBlueprints: async () => ({ ok: true, data: [] }),
      getDeviceBlueprints: async () => ({ ok: true, data: [] }),
      getDifficultyConfig: async () => ({ ok: true }),
      sendControl: async () => ({ ok: true }),
      sendConfigUpdate: async () => ({ ok: true }),
      sendIntent,
      subscribeToUpdates: (_handler: Parameters<SimulationBridge['subscribeToUpdates']>[0]) => {
        void _handler;
        return () => undefined;
      },
      plants: {
        addPlanting: async () => ({ ok: true }),
      },
      devices: {
        installDevice: async () => ({ ok: true }),
        adjustLightingCycle: async () => ({ ok: true }),
      },
    } satisfies SimulationBridge;
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
    sendIntentResponse = { ok: true } as SendIntentResult;
    render(<UtilityPricing bridge={bridge} />);

    const [electricityInput, waterInput, nutrientInput] = screen.getAllByLabelText('New Price');

    fireEvent.change(electricityInput, { target: { value: '0.2' } });
    fireEvent.change(waterInput, { target: { value: '0.03' } });
    fireEvent.change(nutrientInput, { target: { value: '0.12' } });

    await waitFor(() => expect(screen.getByText(/price change\(s\) pending/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(sendIntentCallCount).toBe(1));
    expect(lastIntent).toEqual({
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
    sendIntentResponse = {
      ok: false,
      errors: [{ message: 'Invalid payload' }],
    } as SendIntentResult;
    render(<UtilityPricing bridge={bridge} />);

    const [electricityInput] = screen.getAllByLabelText('New Price');
    fireEvent.change(electricityInput, { target: { value: '0.18' } });

    await waitFor(() => expect(screen.getByText(/price change\(s\) pending/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(sendIntentCallCount).toBe(1));
    await waitFor(() =>
      expect(
        screen.getByText(/Failed to update utility prices: Invalid payload/i),
      ).toBeInTheDocument(),
    );
  });
});
