import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { act, render, screen, within } from '@testing-library/react';
import { ZoneView } from '../ZoneView';
import { quickstartSnapshot } from '@/data/mockTelemetry';
import { useSimulationStore } from '@/store/simulation';
import { useNavigationStore } from '@/store/navigation';
import { useUIStore } from '@/store/ui';
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
    moveDevice: async () => ({ ok: true }),
    removeDevice: async () => ({ ok: true }),
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

    const headerElement = header as HTMLElement;
    const toggle = within(panels[0]!).getByTestId('environment-panel-toggle');
    expect(within(toggle).queryByText('Temp')).not.toBeInTheDocument();
    expect(within(headerElement).getByText('Temp')).toBeInTheDocument();
  });

  it('positions the resources summary next to environment controls in the header', async () => {
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

    const headers = await screen.findAllByTestId('zone-view-header');
    const header = headers.at(-1)!;

    const gridRow = within(header).getByTestId('zone-header-grid-row');
    expect(gridRow).toHaveClass('md:grid-cols-2');
    const resourcesSummary = within(gridRow).getByTestId('zone-resources-summary');
    const environmentControls = within(gridRow).getByTestId('environment-panel-root');

    const rowChildren = Array.from(gridRow.children);
    expect(rowChildren[0]).toBe(resourcesSummary);
    expect(rowChildren[1]).toBe(environmentControls);
    expect(resourcesSummary).toHaveClass('md:h-full');
    expect(environmentControls).toHaveClass('md:h-full');

    const resourceSubtitles = within(header).getAllByText('Reservoirs & supplies');
    expect(resourceSubtitles.length).toBeGreaterThan(0);
  });

  it('renders plants and devices cards within a shared responsive row', async () => {
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

    await screen.findAllByTestId('zone-device-group');

    const layoutRows = screen.getAllByTestId('zone-plants-devices-row');
    expect(layoutRows.length).toBeGreaterThan(0);

    const [layoutRow] = layoutRows;
    expect(layoutRow).toHaveClass('grid');
    expect(layoutRow.className).toContain('lg:grid-cols-2');

    const children = Array.from(layoutRow.children);
    expect(children).toHaveLength(2);

    const [plantsCard, devicesCard] = children;
    expect(within(plantsCard).getByRole('heading', { name: 'Plants' })).toBeInTheDocument();
    expect(within(devicesCard).getByRole('heading', { name: 'Devices' })).toBeInTheDocument();
  });

  it('renders health summary within the plants card and removes the standalone health card', async () => {
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

    const summaryHeading = await screen.findByText('Disease & treatment overview');
    const healthSummary = summaryHeading.closest('div[data-testid="zone-health-summary"]');
    expect(healthSummary).not.toBeNull();

    const plantsCard = summaryHeading.closest('[data-testid="zone-plants-card"]');
    expect(plantsCard).not.toBeNull();
    expect(
      within(plantsCard as HTMLElement).getByRole('heading', { name: 'Plants' }),
    ).toBeInTheDocument();

    const labels = ['Diseases', 'Pests', 'Pending treatments', 'Applied treatments'];
    for (const label of labels) {
      expect(within(healthSummary as HTMLElement).getByText(label)).toBeInTheDocument();
    }

    expect(
      within(healthSummary as HTMLElement).getByText(String(zone.health.diseases)),
    ).toBeInTheDocument();
    expect(
      within(healthSummary as HTMLElement).getByText(String(zone.health.pests)),
    ).toBeInTheDocument();
    expect(
      within(healthSummary as HTMLElement).getByText(String(zone.health.pendingTreatments)),
    ).toBeInTheDocument();
    expect(
      within(healthSummary as HTMLElement).getByText(String(zone.health.appliedTreatments)),
    ).toBeInTheDocument();

    expect(screen.queryByRole('heading', { name: 'Health' })).not.toBeInTheDocument();
  });

  it('opens the move device modal with zone context', async () => {
    const originalOpenModal = useUIStore.getState().openModal;
    const openModal = vi.fn();

    act(() => {
      useUIStore.setState({ openModal } as Partial<ReturnType<typeof useUIStore.getState>>);
    });

    try {
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

      const [moveButton] = await screen.findAllByRole('button', { name: /Move$/ });
      await act(async () => {
        moveButton.click();
      });

      expect(openModal).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'moveDevice',
          context: { zoneId: zone.id, deviceId: zone.devices[0]!.id },
        }),
      );
    } finally {
      act(() => {
        useUIStore.setState({
          openModal: originalOpenModal,
        } as Partial<ReturnType<typeof useUIStore.getState>>);
      });
    }
  });

  it('opens the delete device modal with zone context', async () => {
    const originalOpenModal = useUIStore.getState().openModal;
    const openModal = vi.fn();

    act(() => {
      useUIStore.setState({ openModal } as Partial<ReturnType<typeof useUIStore.getState>>);
    });

    try {
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

      const [deleteButton] = await screen.findAllByRole('button', { name: /Delete$/ });
      await act(async () => {
        deleteButton.click();
      });

      expect(openModal).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'removeDevice',
          context: { zoneId: zone.id, deviceId: zone.devices[0]!.id },
        }),
      );
    } finally {
      act(() => {
        useUIStore.setState({
          openModal: originalOpenModal,
        } as Partial<ReturnType<typeof useUIStore.getState>>);
      });
    }
  });

  it('renders grouped devices with aggregated metrics and no group-level actions', async () => {
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

    const groups = await screen.findAllByTestId('zone-device-group');
    expect(groups.length).toBeGreaterThan(0);

    const lightingGroup = groups.find((group) => within(group).queryByText(/Grow Lights/i));
    expect(lightingGroup).toBeDefined();

    const header = within(lightingGroup!).getByTestId('device-group-header');
    expect(within(header).queryByRole('button', { name: /Move/i })).toBeNull();
    expect(within(header).queryByRole('button', { name: /Delete/i })).toBeNull();

    expect(header).toHaveTextContent(/2\s+devices/i);
    expect(header).toHaveTextContent(/Avg condition\s+98%/i);
  });
});
