import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import type { DifficultyConfig } from '@/types/difficulty';

describe('useDifficultyConfig', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const setup = async (getDifficultyConfigMock: ReturnType<typeof vi.fn>) => {
    vi.doMock('@/facade/systemFacade', () => ({
      getSimulationBridge: () => ({
        getDifficultyConfig: getDifficultyConfigMock,
      }),
    }));

    const { useSimulationStore } = await import('@/store/simulation');
    useSimulationStore.getState().reset();

    const hookModule = await import('./useDifficultyConfig');

    return {
      useDifficultyConfig: hookModule.useDifficultyConfig,
      useSimulationStore,
    };
  };

  it('loads the difficulty presets once the connection is established', async () => {
    const mockConfig: DifficultyConfig = {
      easy: {
        name: 'easy',
        description: 'Chill run',
        modifiers: {
          plantStress: {
            optimalRangeMultiplier: 1,
            stressAccumulationMultiplier: 0.5,
          },
          deviceFailure: {
            mtbfMultiplier: 2,
          },
          economics: {
            initialCapital: 100000,
            itemPriceMultiplier: 0.9,
            harvestPriceMultiplier: 1.1,
            rentPerSqmStructurePerTick: 0.2,
            rentPerSqmRoomPerTick: 0.15,
          },
        },
      },
    };

    const getDifficultyConfigMock = vi.fn().mockResolvedValue({
      ok: true,
      data: mockConfig,
    });

    const { useDifficultyConfig, useSimulationStore } = await setup(getDifficultyConfigMock);

    useSimulationStore.getState().setConnectionStatus('connected');

    const { result } = renderHook(() => useDifficultyConfig());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.config).toEqual(mockConfig);
    expect(result.current.error).toBeNull();
    expect(getDifficultyConfigMock).toHaveBeenCalledTimes(1);
  });

  it('does not trigger React state updates after the hook unmounts', async () => {
    const mockConfig: DifficultyConfig = {
      normal: {
        name: 'normal',
        description: 'Standard run',
        modifiers: {
          plantStress: {
            optimalRangeMultiplier: 1,
            stressAccumulationMultiplier: 1,
          },
          deviceFailure: {
            mtbfMultiplier: 1,
          },
          economics: {
            initialCapital: 50000,
            itemPriceMultiplier: 1,
            harvestPriceMultiplier: 1,
            rentPerSqmStructurePerTick: 0.3,
            rentPerSqmRoomPerTick: 0.25,
          },
        },
      },
    };

    let resolveRequest: ((value: { ok: boolean; data: DifficultyConfig }) => void) | undefined;
    const getDifficultyConfigMock = vi.fn().mockImplementation(
      () =>
        new Promise<{ ok: boolean; data: DifficultyConfig }>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const { useDifficultyConfig, useSimulationStore } = await setup(getDifficultyConfigMock);

    useSimulationStore.getState().setConnectionStatus('connected');

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = renderHook(() => useDifficultyConfig());

    expect(getDifficultyConfigMock).toHaveBeenCalledTimes(1);

    unmount();

    resolveRequest?.({ ok: true, data: mockConfig });

    await Promise.resolve();
    await Promise.resolve();

    const hasUnmountWarning = consoleErrorSpy.mock.calls.some(
      ([message]) => typeof message === 'string' && message.includes('unmounted component'),
    );

    expect(hasUnmountWarning).toBe(false);

    consoleErrorSpy.mockRestore();
  });
});
