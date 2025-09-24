import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseSimulationBridgeOptions } from './useSimulationBridge';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const createMockSocket = () => ({
  id: 'mock-socket',
  connected: false,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  onAny: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  removeAllListeners: vi.fn(),
});

const renderBridge = async (options?: UseSimulationBridgeOptions) => {
  const socketMock = createMockSocket();
  const ioMock = vi.fn(() => socketMock);

  vi.doMock('socket.io-client', () => ({
    io: ioMock,
  }));

  const module = await import('./useSimulationBridge');
  const { useSimulationBridge } = module;

  const TestComponent: React.FC<{ options?: UseSimulationBridgeOptions }> = ({ options }) => {
    useSimulationBridge(options);
    return null;
  };

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<TestComponent options={options} />);
  });

  return {
    ioMock,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const expectSocketUrl = (ioMock: ReturnType<typeof vi.fn>, url: string) => {
  expect(ioMock).toHaveBeenCalledTimes(1);
  expect(ioMock).toHaveBeenCalledWith(
    url,
    expect.objectContaining({ autoConnect: false, transports: ['websocket'] }),
  );
};

describe('useSimulationBridge socket configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.doUnmock('socket.io-client');
    vi.unstubAllEnvs();
  });

  it('uses VITE_SOCKET_URL when provided', async () => {
    vi.stubEnv('VITE_SOCKET_URL', 'https://example.test/socket');

    const { ioMock, cleanup } = await renderBridge({ autoConnect: false });

    try {
      expectSocketUrl(ioMock, 'https://example.test/socket');
    } finally {
      cleanup();
    }
  });

  it('falls back to the helper default when no env override exists', async () => {
    const { ioMock, cleanup } = await renderBridge({ autoConnect: false });

    try {
      expectSocketUrl(ioMock, 'http://localhost:7331/socket.io');
    } finally {
      cleanup();
    }
  });

  it('allows callers to override the socket url via options', async () => {
    vi.stubEnv('VITE_SOCKET_URL', 'https://example.test/socket');
    const overrideUrl = 'https://override.test/socket';

    const { ioMock, cleanup } = await renderBridge({ autoConnect: false, url: overrideUrl });

    try {
      expectSocketUrl(ioMock, overrideUrl);
    } finally {
      cleanup();
    }
  });
});
