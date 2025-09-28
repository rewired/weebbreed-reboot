import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import { ZoneView } from '../ZoneView';
import { quickstartSnapshot } from '@/data/mockTelemetry';
import { useSimulationStore } from '@/store/simulation';
import { useNavigationStore } from '@/store/navigation';
import type { SimulationBridge } from '@/facade/systemFacade';
import type { ReactNode } from 'react';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  Legend: () => null,
}));

const buildBridge = (overrides: Partial<SimulationBridge> = {}): SimulationBridge => ({
  connect: () => undefined,
  loadQuickStart: async () => ({ ok: true }),
  getStructureBlueprints: async () => ({ ok: true, data: [] }),
  getStrainBlueprints: async () => ({ ok: true, data: [] }),
  getDeviceBlueprints: async () => ({ ok: true, data: [] }),
  getDifficultyConfig: async () => ({ ok: true }),
  sendControl: async () => ({ ok: true }),
  sendConfigUpdate: async () => ({ ok: true }),
  sendIntent: async () => ({ ok: true }),
  subscribeToUpdates: () => () => undefined,
  plants: { addPlanting: async () => ({ ok: true }) },
  devices: {
    installDevice: async () => ({ ok: true }),
    adjustLightingCycle: async () => ({ ok: true }),
  },
  ...overrides,
});

describe('ZoneView', () => {
  const zone = quickstartSnapshot.zones[0];
  const structure = quickstartSnapshot.structures[0];
  const room = quickstartSnapshot.rooms[0];

  beforeAll(() => {
    class MockResizeObserver {
      constructor(_callback: ResizeObserverCallback) {
        void _callback;
      }
      observe(_target: Element, _options?: ResizeObserverOptions) {
        void _target;
        void _options;
      }
      unobserve(_target: Element) {
        void _target;
      }
      disconnect() {}
    }

    (globalThis as unknown as { ResizeObserver: typeof MockResizeObserver }).ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;
  });

  beforeEach(() => {
    useSimulationStore.getState().reset();
    useNavigationStore.getState().reset();
  });

  afterEach(() => {
    useSimulationStore.getState().reset();
    useNavigationStore.getState().reset();
  });

  it('renders environment controls inside the header card', () => {
    const bridge = buildBridge();

    act(() => {
      useSimulationStore.getState().hydrate({ snapshot: quickstartSnapshot });
      useNavigationStore.setState({
        currentView: 'zone',
        selectedStructureId: structure.id,
        selectedRoomId: room.id,
        selectedZoneId: zone.id,
        isSidebarOpen: false,
      });
    });

    render(<ZoneView bridge={bridge} />);

    const panels = screen.getAllByTestId('environment-panel-root');
    expect(panels).toHaveLength(1);

    const header = panels[0]?.closest('header');
    expect(header).not.toBeNull();
    expect(header).toContainElement(panels[0]!);
  });
});
