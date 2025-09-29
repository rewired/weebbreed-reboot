import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import type { SimulationBridge } from './systemFacade';

type UseSimulationStoreHook = typeof import('@/store/simulation').useSimulationStore;
let useSimulationStore: UseSimulationStoreHook;

const socketHandlers: Record<string, (...args: unknown[]) => void> = {};
let socketInstance: {
  on: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  connected: boolean;
} | null = null;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    socketInstance = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        socketHandlers[event] = handler;
      }),
      emit: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      connected: false,
    };
    return socketInstance;
  }),
}));

describe('SocketSystemFacade convenience wrappers', () => {
  let bridge: SimulationBridge;
  let sendIntentMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    ({ useSimulationStore } = await import('@/store/simulation'));
    for (const key of Object.keys(socketHandlers)) {
      delete socketHandlers[key];
    }
    socketInstance = null;
    sendIntentMock = vi.fn(async () => ({ ok: true }));
    const module = await import('./systemFacade');
    bridge = module.getSimulationBridge();
    (bridge as unknown as { socket: { connected: boolean } | null }).socket = {
      connected: true,
    } as { connected: boolean };
    (bridge as unknown as { sendIntent: typeof sendIntentMock }).sendIntent = sendIntentMock;
    useSimulationStore.getState().reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    useSimulationStore.getState().reset();
  });

  it('fetches strain blueprints via the world command', async () => {
    const response = { ok: true, data: [] };
    sendIntentMock.mockResolvedValueOnce(response);

    const result = await bridge.getStrainBlueprints();

    expect(result).toBe(response);
    expect(sendIntentMock).toHaveBeenCalledWith({
      domain: 'world',
      action: 'getStrainBlueprints',
      payload: {},
    });
  });

  it('fetches device blueprints via the world command', async () => {
    const response = { ok: true, data: [] };
    sendIntentMock.mockResolvedValueOnce(response);

    const result = await bridge.getDeviceBlueprints();

    expect(result).toBe(response);
    expect(sendIntentMock).toHaveBeenCalledWith({
      domain: 'world',
      action: 'getDeviceBlueprints',
      payload: {},
    });
  });

  it('fetches cultivation method blueprints via the world command', async () => {
    const response = { ok: true, data: [] };
    sendIntentMock.mockResolvedValueOnce(response);

    const result = await bridge.getCultivationMethodBlueprints();

    expect(result).toBe(response);
    expect(sendIntentMock).toHaveBeenCalledWith({
      domain: 'world',
      action: 'getCultivationMethodBlueprints',
      payload: {},
    });
  });

  it('fetches container blueprints via the world command', async () => {
    const response = { ok: true, data: [] };
    sendIntentMock.mockResolvedValueOnce(response);

    const result = await bridge.getContainerBlueprints();

    expect(result).toBe(response);
    expect(sendIntentMock).toHaveBeenCalledWith({
      domain: 'world',
      action: 'getContainerBlueprints',
      payload: {},
    });
  });

  it('fetches substrate blueprints via the world command', async () => {
    const response = { ok: true, data: [] };
    sendIntentMock.mockResolvedValueOnce(response);

    const result = await bridge.getSubstrateBlueprints();

    expect(result).toBe(response);
    expect(sendIntentMock).toHaveBeenCalledWith({
      domain: 'world',
      action: 'getSubstrateBlueprints',
      payload: {},
    });
  });

  it('dispatches plants.addPlanting intents with optional startTick', async () => {
    const response = { ok: true };
    sendIntentMock.mockResolvedValueOnce(response);

    const result = await bridge.plants.addPlanting({
      zoneId: 'zone-1',
      strainId: 'strain-1',
      count: 4,
      startTick: 12,
    });

    expect(result).toBe(response);
    expect(sendIntentMock).toHaveBeenCalledWith({
      domain: 'plants',
      action: 'addPlanting',
      payload: {
        zoneId: 'zone-1',
        strainId: 'strain-1',
        count: 4,
        startTick: 12,
      },
    });
  });

  it('omits the optional planting startTick when not provided', async () => {
    await bridge.plants.addPlanting({
      zoneId: 'zone-2',
      strainId: 'strain-2',
      count: 1,
    });

    const payload = sendIntentMock.mock.calls.at(-1)?.[0]?.payload as Record<string, unknown>;
    expect(payload).toMatchObject({
      zoneId: 'zone-2',
      strainId: 'strain-2',
      count: 1,
    });
    expect('startTick' in payload).toBe(false);
  });

  it('dispatches devices.installDevice intents and respects optional settings', async () => {
    const response = { ok: true };
    sendIntentMock.mockResolvedValueOnce(response);

    const result = await bridge.devices.installDevice({
      targetId: 'zone-3',
      deviceId: 'device-1',
      settings: { power: 0.75 },
    });

    expect(result).toBe(response);
    expect(sendIntentMock).toHaveBeenCalledWith({
      domain: 'devices',
      action: 'installDevice',
      payload: {
        targetId: 'zone-3',
        deviceId: 'device-1',
        settings: { power: 0.75 },
      },
    });
  });

  it('omits installDevice settings when undefined', async () => {
    await bridge.devices.installDevice({
      targetId: 'zone-4',
      deviceId: 'device-2',
    });

    const payload = sendIntentMock.mock.calls.at(-1)?.[0]?.payload as Record<string, unknown>;
    expect(payload).toEqual({
      targetId: 'zone-4',
      deviceId: 'device-2',
    });
  });

  it('dispatches devices.adjustLightingCycle intents', async () => {
    const response = { ok: true };
    sendIntentMock.mockResolvedValueOnce(response);

    const result = await bridge.devices.adjustLightingCycle({
      zoneId: 'zone-5',
      photoperiodHours: { on: 19, off: 5 },
    });

    expect(result).toBe(response);
    expect(sendIntentMock).toHaveBeenCalledWith({
      domain: 'devices',
      action: 'adjustLightingCycle',
      payload: {
        zoneId: 'zone-5',
        photoperiodHours: { on: 19, off: 5 },
      },
    });
  });

  it('hydrates blueprint catalogs when the socket connects', async () => {
    const methodEntry = {
      id: 'method-1',
      name: 'Method One',
      laborIntensity: 1,
      areaPerPlant: 1,
      minimumSpacing: 1,
      compatibility: {},
    };
    const containerEntry = {
      id: 'container-1',
      slug: 'container-1',
      name: 'Container One',
      type: 'pot',
    };
    const substrateEntry = {
      id: 'substrate-1',
      slug: 'substrate-1',
      name: 'Substrate One',
      type: 'soil',
    };

    const originalSetCatalogStatus = useSimulationStore.getState().setCatalogStatus;
    const setCatalogStatusSpy = vi.fn<
      Parameters<typeof originalSetCatalogStatus>,
      ReturnType<typeof originalSetCatalogStatus>
    >((catalog, status, payload) => originalSetCatalogStatus(catalog, status, payload));
    useSimulationStore.setState({ setCatalogStatus: setCatalogStatusSpy });
    expect(useSimulationStore.getState().setCatalogStatus).toBe(setCatalogStatusSpy);

    try {
      sendIntentMock
        .mockResolvedValueOnce({ ok: true, data: [methodEntry] })
        .mockResolvedValueOnce({ ok: true, data: [containerEntry] })
        .mockResolvedValueOnce({ ok: true, data: [substrateEntry] });

      (bridge as unknown as { socket: null }).socket = null;
      (bridge as unknown as { isConnecting: boolean }).isConnecting = false;

      bridge.connect();
      expect(socketInstance).not.toBeNull();
      if (socketInstance) {
        socketInstance.connected = true;
      }

      await act(async () => {
        socketHandlers.connect?.();
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(sendIntentMock).toHaveBeenCalledTimes(3);
      });

      await waitFor(() => {
        expect(setCatalogStatusSpy).toHaveBeenCalledWith(
          'cultivationMethods',
          'ready',
          expect.objectContaining({ data: [methodEntry], error: null }),
        );
        expect(setCatalogStatusSpy).toHaveBeenCalledWith(
          'containers',
          'ready',
          expect.objectContaining({ data: [containerEntry], error: null }),
        );
        expect(setCatalogStatusSpy).toHaveBeenCalledWith(
          'substrates',
          'ready',
          expect.objectContaining({ data: [substrateEntry], error: null }),
        );
      });

      await waitFor(() => {
        const state = useSimulationStore.getState();
        expect(state.catalogs.cultivationMethods.status).toBe('ready');
        expect(state.catalogs.cultivationMethods.data).toEqual([methodEntry]);
        expect(state.catalogs.containers.status).toBe('ready');
        expect(state.catalogs.containers.data).toEqual([containerEntry]);
        expect(state.catalogs.substrates.status).toBe('ready');
        expect(state.catalogs.substrates.data).toEqual([substrateEntry]);
      });
    } finally {
      useSimulationStore.setState({ setCatalogStatus: originalSetCatalogStatus });
    }
  });
});
