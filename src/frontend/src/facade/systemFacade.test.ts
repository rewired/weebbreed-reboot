import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SimulationBridge } from './systemFacade';

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    connect: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}));

describe('SocketSystemFacade convenience wrappers', () => {
  let bridge: SimulationBridge;
  let sendIntentMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    sendIntentMock = vi.fn(async () => ({ ok: true }));
    const module = await import('./systemFacade');
    bridge = module.getSimulationBridge();
    (bridge as unknown as { socket: { connected: boolean } | null }).socket = {
      connected: true,
    } as { connected: boolean };
    (bridge as unknown as { sendIntent: typeof sendIntentMock }).sendIntent = sendIntentMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
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
});
