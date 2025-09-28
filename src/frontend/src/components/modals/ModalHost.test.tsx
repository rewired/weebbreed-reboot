import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, act, screen } from '@testing-library/react';
import { ModalHost } from './ModalHost';
import { useSimulationStore } from '@/store/simulation';
import { useUIStore } from '@/store/ui';
import type { SimulationBridge } from '@/facade/systemFacade';
import type { SimulationSnapshot, SimulationTimeStatus } from '@/types/simulation';

const baseSnapshot: SimulationSnapshot = {
  tick: 42,
  clock: {
    tick: 42,
    isPaused: false,
    targetTickRate: 2,
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
  },
};

const pausedStatus: SimulationTimeStatus = {
  running: false,
  paused: true,
  speed: 4,
  tick: baseSnapshot.clock.tick,
  targetTickRate: baseSnapshot.clock.targetTickRate,
};

describe('ModalHost', () => {
  let sendControlMock: ReturnType<typeof vi.fn>;
  let bridge: SimulationBridge;

  beforeEach(() => {
    sendControlMock = vi.fn(async () => ({ ok: true }));
    bridge = {
      connect: vi.fn(),
      loadQuickStart: vi.fn(async () => ({ ok: true })),
      getStructureBlueprints: vi.fn(async () => ({ ok: true, data: [] })),
      getStrainBlueprints: vi.fn(async () => ({ ok: true, data: [] })),
      getDeviceBlueprints: vi.fn(async () => ({ ok: true, data: [] })),
      getDifficultyConfig: vi.fn(async () => ({ ok: true })),
      sendControl: sendControlMock as unknown as SimulationBridge['sendControl'],
      sendConfigUpdate: vi.fn(async () => ({ ok: true })),
      sendIntent: vi.fn(async () => ({ ok: true })),
      subscribeToUpdates: (_handler: Parameters<SimulationBridge['subscribeToUpdates']>[0]) => {
        void _handler;
        return () => undefined;
      },
      plants: {
        addPlanting: vi.fn(async () => ({ ok: true })),
      },
      devices: {
        installDevice: vi.fn(async () => ({ ok: true })),
        adjustLightingCycle: vi.fn(async () => ({ ok: true })),
      },
    };

    act(() => {
      useSimulationStore.setState({
        snapshot: structuredClone(baseSnapshot),
        timeStatus: { ...pausedStatus },
        events: [],
        connectionStatus: 'connected',
        zoneHistory: {},
        lastTick: baseSnapshot.clock.tick,
      });
      useUIStore.setState({ activeModal: null, modalQueue: [] });
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    act(() => {
      useSimulationStore.getState().reset();
      useUIStore.setState({ activeModal: null, modalQueue: [] });
    });
  });

  it('does not send a play command when time status is paused', async () => {
    render(<ModalHost bridge={bridge} />);

    act(() => {
      useUIStore
        .getState()
        .openModal({ id: 'test', type: 'notifications', title: 'Notifications' });
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      useUIStore.getState().closeModal();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(sendControlMock).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'play' }));
  });

  it('treats conflicting pause states as paused and avoids pause/resume commands', async () => {
    act(() => {
      useSimulationStore.setState({
        snapshot: {
          ...structuredClone(baseSnapshot),
          clock: {
            ...structuredClone(baseSnapshot.clock),
            isPaused: true,
          },
        },
        timeStatus: {
          ...pausedStatus,
          paused: false,
          running: true,
        },
      });
    });

    render(<ModalHost bridge={bridge} />);

    act(() => {
      useUIStore
        .getState()
        .openModal({ id: 'test', type: 'notifications', title: 'Notifications' });
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      useUIStore.getState().closeModal();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(sendControlMock).not.toHaveBeenCalled();
  });

  it('renders the tune device modal when requested', async () => {
    render(<ModalHost bridge={bridge} />);

    act(() => {
      useUIStore.getState().openModal({ id: 'tune', type: 'tuneDevice', title: 'Tune device' });
    });

    expect(
      await screen.findByText(
        /Device data unavailable\. Select a zone and device to adjust settings\./i,
      ),
    ).toBeInTheDocument();
  });
});
