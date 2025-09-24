import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadStore = async () => {
  const module = await import('./gameStore');
  return module.useGameStore;
};

describe('gameStore command handling', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('updates timing metadata locally when issuing play/pause commands without a live transport', async () => {
    const useGameStore = await loadStore();

    useGameStore.setState(() => ({
      hasLiveTransport: false,
      timeStatus: {
        running: false,
        paused: true,
        speed: 0,
        tick: 12,
        targetTickRate: 1,
      },
      lastClockSnapshot: {
        tick: 12,
        isPaused: true,
        targetTickRate: 1,
        startedAt: '2025-01-01T00:00:00Z',
        lastUpdatedAt: '2025-01-01T00:00:00Z',
      },
    }));

    useGameStore.getState().issueControlCommand({ action: 'play', gameSpeed: 3 });

    let state = useGameStore.getState();
    expect(state.timeStatus).toMatchObject({
      running: true,
      paused: false,
      speed: 3,
      targetTickRate: 3,
    });
    expect(state.lastClockSnapshot).toMatchObject({ isPaused: false, targetTickRate: 3 });

    useGameStore.getState().issueControlCommand({ action: 'pause' });

    state = useGameStore.getState();
    expect(state.timeStatus).toMatchObject({ running: false, paused: true, speed: 0 });
    expect(state.lastClockSnapshot).toMatchObject({ isPaused: true });
  });

  it('increments the tick locally when stepping without a live transport', async () => {
    const useGameStore = await loadStore();

    useGameStore.setState(() => ({
      hasLiveTransport: false,
      timeStatus: {
        running: false,
        paused: true,
        speed: 0,
        tick: 5,
        targetTickRate: 1,
      },
      lastClockSnapshot: {
        tick: 5,
        isPaused: true,
        targetTickRate: 1,
        startedAt: '2025-01-01T00:00:00Z',
        lastUpdatedAt: '2025-01-01T00:00:00Z',
      },
    }));

    useGameStore.getState().issueControlCommand({ action: 'step', ticks: 2 });

    const state = useGameStore.getState();
    expect(state.timeStatus).toMatchObject({ tick: 7, paused: true, running: false, speed: 0 });
    expect(state.lastClockSnapshot).toMatchObject({ tick: 7 });
  });

  it('forwards control commands when a live transport is available', async () => {
    const useGameStore = await loadStore();
    const sendControlCommand = vi.fn();

    useGameStore.setState(() => ({
      hasLiveTransport: true,
      sendControlCommand,
    }));

    const command = { action: 'resume' as const };
    useGameStore.getState().issueControlCommand(command);

    expect(sendControlCommand).toHaveBeenCalledTimes(1);
    expect(sendControlCommand).toHaveBeenCalledWith(command);
  });

  it('does not forward config updates when offline but still tracks the last requested tick length', async () => {
    const useGameStore = await loadStore();
    const sendConfigUpdate = vi.fn();

    useGameStore.setState(() => ({
      hasLiveTransport: false,
      sendConfigUpdate,
    }));

    useGameStore.getState().requestTickLength(42);

    const state = useGameStore.getState();
    expect(state.lastRequestedTickLength).toBe(42);
    expect(sendConfigUpdate).not.toHaveBeenCalled();
  });
});
