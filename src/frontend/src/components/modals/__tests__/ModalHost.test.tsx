// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ModalHost } from '@/components/modals/ModalHost';
import { useUIStore } from '@/store/ui';
import { useSimulationStore } from '@/store/simulation';
import type { SimulationSnapshot, SimulationTimeStatus } from '@/types/simulation';
import type { SimulationBridge } from '@/facade/systemFacade';

const ensureModalRoot = () => {
  const existing = document.getElementById('modal-root');
  if (existing) {
    return existing;
  }
  const root = document.createElement('div');
  root.id = 'modal-root';
  document.body.append(root);
  return root;
};

const buildRunningSnapshot = (): SimulationSnapshot => ({
  tick: 10,
  clock: {
    tick: 10,
    isPaused: false,
    targetTickRate: 1,
    startedAt: '2024-01-01T00:00:00.000Z',
    lastUpdatedAt: '2024-01-01T00:00:00.000Z',
  },
  structures: [],
  rooms: [],
  zones: [],
  personnel: {
    employees: [],
    applicants: [],
    overallMorale: 0,
  },
  finance: {
    cashOnHand: 0,
    reservedCash: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    lastTickRevenue: 0,
    lastTickExpenses: 0,
  },
});

const runningTimeStatus: SimulationTimeStatus = {
  running: true,
  paused: false,
  speed: 1,
  tick: 10,
  targetTickRate: 1,
};

describe('ModalHost pause safety', () => {
  beforeEach(() => {
    ensureModalRoot();
    useUIStore.setState({
      activeModal: null,
      modalQueue: [],
      notificationsUnread: 0,
      theme: 'weedbreed',
    });
    useSimulationStore.getState().reset();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    useUIStore.setState({
      activeModal: null,
      modalQueue: [],
      notificationsUnread: 0,
      theme: 'weedbreed',
    });
    useSimulationStore.getState().reset();
  });

  it('does not send resume when pause command rejects', async () => {
    const sendControl = vi.fn((command: Parameters<SimulationBridge['sendControl']>[0]) => {
      if (command.action === 'pause') {
        return Promise.reject(new Error('pause failed'));
      }
      return Promise.resolve({ ok: true });
    });

    const bridge = {
      sendControl,
    } as unknown as SimulationBridge;

    useSimulationStore.setState({
      snapshot: buildRunningSnapshot(),
      timeStatus: runningTimeStatus,
    });

    render(<ModalHost bridge={bridge} />);

    act(() => {
      useUIStore.getState().openModal({
        id: 'test',
        type: 'notifications',
        title: 'Test Modal',
      });
    });

    const closeButton = await screen.findByLabelText('Close modal');

    await waitFor(() => {
      expect(sendControl).toHaveBeenCalledWith({ action: 'pause' });
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          'Connection error while pausing simulation. Simulation will keep running.',
        ),
      ).toBeInTheDocument();
    });

    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(useUIStore.getState().activeModal).toBeNull();
    });

    const resumeCalls = sendControl.mock.calls.filter(([command]) => command.action === 'play');
    expect(resumeCalls).toHaveLength(0);
    expect(sendControl).toHaveBeenCalledTimes(1);
  });
});
