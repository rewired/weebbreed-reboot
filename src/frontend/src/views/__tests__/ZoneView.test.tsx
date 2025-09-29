import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ZoneView } from '../ZoneView';
import { ModalHost } from '@/components/modals/ModalHost';
import { ToastViewport } from '@/components/feedback/ToastViewport';
import { quickstartSnapshot } from '@/data/mockTelemetry';
import { useSimulationStore } from '@/store/simulation';
import { useNavigationStore } from '@/store/navigation';
import { useUIStore } from '@/store/ui';
import type { SimulationBridge } from '@/facade/systemFacade';

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
  plants: {
    addPlanting: vi.fn(async () => ({ ok: true })),
    harvestPlant: vi.fn(async () => ({ ok: true })),
    cullPlant: vi.fn(async () => ({ ok: true })),
  },
  devices: {
    installDevice: async () => ({ ok: true }),
    adjustLightingCycle: async () => ({ ok: true }),
    moveDevice: async () => ({ ok: true }),
    removeDevice: async () => ({ ok: true }),
  },
  ...overrides,
});

const renderZoneViewWithUI = (bridge: SimulationBridge) =>
  render(
    <>
      <ZoneView bridge={bridge} />
      <ModalHost bridge={bridge} />
      <ToastViewport />
    </>,
  );

describe('ZoneView', () => {
  const zone = quickstartSnapshot.zones[0];
  const structure = quickstartSnapshot.structures[0];
  const room = quickstartSnapshot.rooms[0];

  const expandAllDeviceGroups = async () => {
    const groups = await screen.findAllByTestId('zone-device-group');
    for (const group of groups) {
      const toggle = within(group).getByTestId('device-group-header');
      if (toggle.getAttribute('aria-expanded') !== 'true') {
        await act(async () => {
          toggle.click();
        });
      }
    }
    return groups;
  };

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

    const { window } = globalThis as unknown as { window?: Window & typeof globalThis };
    if (window && typeof window.HTMLIFrameElement !== 'function') {
      window.HTMLIFrameElement =
        class HTMLIFrameElementStub extends window.HTMLElement {} as unknown as typeof window.HTMLIFrameElement;
    }
  });

  beforeEach(() => {
    useSimulationStore.getState().reset();
    useNavigationStore.getState().reset();
    useUIStore.setState({ activeModal: null, modalQueue: [], toasts: [] });
  });

  afterEach(() => {
    cleanup();
    act(() => {
      useSimulationStore.getState().reset();
      useNavigationStore.getState().reset();
      useUIStore.setState({ activeModal: null, modalQueue: [], toasts: [] });
    });
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

    const [plantsCard, devicesCard] = children as HTMLElement[];
    expect(within(plantsCard).getByRole('heading', { name: 'Plants' })).toBeInTheDocument();
    expect(within(devicesCard).getByRole('heading', { name: 'Devices' })).toBeInTheDocument();
  });

  it('displays strain names in the plant table without the plant ID column', async () => {
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
    // Debug output (truncated)
    const [plantsCard] = screen.getAllByTestId('zone-plants-card') as HTMLElement[];
    const headers = within(plantsCard).getAllByRole('columnheader');
    expect(headers.map((header) => header.textContent?.trim())).not.toContain('Plant ID');

    const strainCells = within(plantsCard).getAllByRole('cell', { name: 'AK-47' });
    expect(strainCells.length).toBeGreaterThan(0);
    expect(within(plantsCard).queryByText('plant-01')).not.toBeInTheDocument();
  });

  it('sorts plant rows by health when toggling the column header', async () => {
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
    const [plantsCard] = screen.getAllByTestId('zone-plants-card') as HTMLElement[];
    const getFirstPlantId = () =>
      plantsCard.querySelector('tbody tr')?.getAttribute('data-plant-id');

    expect(getFirstPlantId()).toBe('plant-01');

    const sortButton = within(plantsCard).getByTestId('plant-table-sort-health');

    act(() => {
      fireEvent.click(sortButton);
    });

    expect(getFirstPlantId()).toBe('plant-01');

    act(() => {
      fireEvent.click(sortButton);
    });

    expect(getFirstPlantId()).toBe('plant-03');
  });

  it('displays plant health status icons only for affected plants', async () => {
    const bridge = buildBridge();

    const snapshot = JSON.parse(JSON.stringify(quickstartSnapshot)) as typeof quickstartSnapshot;
    const zoneSnapshot = snapshot.zones[0]!;
    zoneSnapshot.plants = [
      {
        ...zoneSnapshot.plants[0]!,
        id: 'plant-affected',
        strainName: 'Affected Plant',
        hasDiseases: true,
        hasPests: true,
        hasPendingTreatments: true,
      },
      {
        ...zoneSnapshot.plants[1]!,
        id: 'plant-healthy',
        strainName: 'Healthy Plant',
        hasDiseases: false,
        hasPests: false,
        hasPendingTreatments: false,
      },
    ];

    act(() => {
      useSimulationStore.getState().hydrate({ snapshot });
      useNavigationStore.setState({
        currentView: 'zone',
        selectedStructureId: snapshot.structures[0]!.id,
        selectedRoomId: snapshot.rooms[0]!.id,
        selectedZoneId: zoneSnapshot.id,
        isSidebarOpen: false,
      });
    });

    render(<ZoneView bridge={bridge} />);

    await screen.findAllByTestId('zone-device-group');

    const [plantsCard] = screen.getAllByTestId('zone-plants-card');
    const rows = within(plantsCard).getAllByRole('row');
    const flaggedRow = rows.find((row) => within(row).queryByText('Affected Plant'))!;
    const healthyRow = rows.find((row) => within(row).queryByText('Healthy Plant'))!;

    expect(within(flaggedRow).getByLabelText('Diseases detected')).toBeInTheDocument();
    expect(within(flaggedRow).getByLabelText('Pests detected')).toBeInTheDocument();
    expect(within(flaggedRow).getByLabelText('Treatment scheduled')).toBeInTheDocument();

    expect(within(healthyRow).queryByLabelText('Diseases detected')).not.toBeInTheDocument();
    expect(within(healthyRow).queryByLabelText('Pests detected')).not.toBeInTheDocument();
    expect(within(healthyRow).queryByLabelText('Treatment scheduled')).not.toBeInTheDocument();
  });

  it('filters plants by stage', async () => {
    const bridge = buildBridge();

    const snapshot = JSON.parse(JSON.stringify(quickstartSnapshot)) as typeof quickstartSnapshot;
    const zoneSnapshot = snapshot.zones[0]!;
    zoneSnapshot.plants = [
      {
        ...zoneSnapshot.plants[0]!,
        id: 'plant-seedling',
        strainName: 'Seedling Plant',
        stage: 'seedling',
      },
      {
        ...zoneSnapshot.plants[0]!,
        id: 'plant-veg',
        strainName: 'Vegetation Plant',
        stage: 'vegetation',
      },
      {
        ...zoneSnapshot.plants[0]!,
        id: 'plant-flower',
        strainName: 'Flowering Plant',
        stage: 'flowering',
      },
    ];

    act(() => {
      useSimulationStore.getState().hydrate({ snapshot });
      useNavigationStore.setState({
        currentView: 'zone',
        selectedStructureId: snapshot.structures[0]!.id,
        selectedRoomId: snapshot.rooms[0]!.id,
        selectedZoneId: zoneSnapshot.id,
        isSidebarOpen: false,
      });
    });

    render(<ZoneView bridge={bridge} />);

    await screen.findAllByTestId('zone-device-group');

    const plantsCard = screen.getAllByTestId('zone-plants-card')[0]!;
    const stageSelect = within(plantsCard).getByTestId('plant-filter-stage');

    await act(async () => {
      fireEvent.change(stageSelect, { target: { value: 'flowering' } });
    });

    expect(within(plantsCard).getByText('Flowering Plant')).toBeInTheDocument();
    expect(within(plantsCard).queryByText('Seedling Plant')).not.toBeInTheDocument();
    expect(within(plantsCard).queryByText('Vegetation Plant')).not.toBeInTheDocument();
  });

  it('filters plants by stress level', async () => {
    const bridge = buildBridge();

    const snapshot = JSON.parse(JSON.stringify(quickstartSnapshot)) as typeof quickstartSnapshot;
    const zoneSnapshot = snapshot.zones[0]!;
    zoneSnapshot.plants = [
      {
        ...zoneSnapshot.plants[0]!,
        id: 'plant-low-stress',
        strainName: 'Low Stress Plant',
        stress: 0.1,
      },
      {
        ...zoneSnapshot.plants[0]!,
        id: 'plant-medium-stress',
        strainName: 'Medium Stress Plant',
        stress: 0.45,
      },
      {
        ...zoneSnapshot.plants[0]!,
        id: 'plant-high-stress',
        strainName: 'High Stress Plant',
        stress: 0.78,
      },
    ];

    act(() => {
      useSimulationStore.getState().hydrate({ snapshot });
      useNavigationStore.setState({
        currentView: 'zone',
        selectedStructureId: snapshot.structures[0]!.id,
        selectedRoomId: snapshot.rooms[0]!.id,
        selectedZoneId: zoneSnapshot.id,
        isSidebarOpen: false,
      });
    });

    render(<ZoneView bridge={bridge} />);

    await screen.findAllByTestId('zone-device-group');

    const plantsCard = screen.getAllByTestId('zone-plants-card')[0]!;
    const stressSelect = within(plantsCard).getByTestId('plant-filter-stress');

    await act(async () => {
      fireEvent.change(stressSelect, { target: { value: 'high' } });
    });

    expect(within(plantsCard).getByText('High Stress Plant')).toBeInTheDocument();
    expect(within(plantsCard).queryByText('Low Stress Plant')).not.toBeInTheDocument();
    expect(within(plantsCard).queryByText('Medium Stress Plant')).not.toBeInTheDocument();
  });

  it('filters plants by disease flag', async () => {
    const bridge = buildBridge();

    const snapshot = JSON.parse(JSON.stringify(quickstartSnapshot)) as typeof quickstartSnapshot;
    const zoneSnapshot = snapshot.zones[0]!;
    zoneSnapshot.plants = [
      {
        ...zoneSnapshot.plants[0]!,
        id: 'plant-diseased',
        strainName: 'Diseased Plant',
        hasDiseases: true,
      },
      {
        ...zoneSnapshot.plants[0]!,
        id: 'plant-healthy',
        strainName: 'Healthy Plant',
        hasDiseases: false,
      },
    ];

    act(() => {
      useSimulationStore.getState().hydrate({ snapshot });
      useNavigationStore.setState({
        currentView: 'zone',
        selectedStructureId: snapshot.structures[0]!.id,
        selectedRoomId: snapshot.rooms[0]!.id,
        selectedZoneId: zoneSnapshot.id,
        isSidebarOpen: false,
      });
    });

    render(<ZoneView bridge={bridge} />);

    await screen.findAllByTestId('zone-device-group');

    const plantsCard = screen.getAllByTestId('zone-plants-card')[0]!;
    const diseaseButton = within(plantsCard).getByTestId('plant-filter-diseases');

    await act(async () => {
      fireEvent.click(diseaseButton);
    });

    expect(diseaseButton).toHaveAttribute('aria-pressed', 'true');
    expect(within(plantsCard).getByText('Diseased Plant')).toBeInTheDocument();
    expect(within(plantsCard).queryByText('Healthy Plant')).not.toBeInTheDocument();
  });

  it('filters plants by pest flag', async () => {
    const bridge = buildBridge();

    const snapshot = JSON.parse(JSON.stringify(quickstartSnapshot)) as typeof quickstartSnapshot;
    const zoneSnapshot = snapshot.zones[0]!;
    zoneSnapshot.plants = [
      {
        ...zoneSnapshot.plants[0]!,
        id: 'plant-pests',
        strainName: 'Pest Plant',
        hasPests: true,
      },
      {
        ...zoneSnapshot.plants[0]!,
        id: 'plant-clear',
        strainName: 'Pest Free Plant',
        hasPests: false,
      },
    ];

    act(() => {
      useSimulationStore.getState().hydrate({ snapshot });
      useNavigationStore.setState({
        currentView: 'zone',
        selectedStructureId: snapshot.structures[0]!.id,
        selectedRoomId: snapshot.rooms[0]!.id,
        selectedZoneId: zoneSnapshot.id,
        isSidebarOpen: false,
      });
    });

    render(<ZoneView bridge={bridge} />);

    await screen.findAllByTestId('zone-device-group');

    const plantsCard = screen.getAllByTestId('zone-plants-card')[0]!;
    const pestButton = within(plantsCard).getByTestId('plant-filter-pests');

    await act(async () => {
      fireEvent.click(pestButton);
    });

    expect(pestButton).toHaveAttribute('aria-pressed', 'true');
    expect(within(plantsCard).getByText('Pest Plant')).toBeInTheDocument();
    expect(within(plantsCard).queryByText('Pest Free Plant')).not.toBeInTheDocument();
  });

  it('filters plants by harvestable flag', async () => {
    const bridge = buildBridge();

    const snapshot = JSON.parse(JSON.stringify(quickstartSnapshot)) as typeof quickstartSnapshot;
    const zoneSnapshot = snapshot.zones[0]!;
    zoneSnapshot.plants = [
      {
        ...zoneSnapshot.plants[0]!,
        id: 'plant-ready',
        strainName: 'Ready Plant',
        isHarvestable: true,
      },
      {
        ...zoneSnapshot.plants[0]!,
        id: 'plant-growing',
        strainName: 'Growing Plant',
        isHarvestable: false,
      },
    ];

    act(() => {
      useSimulationStore.getState().hydrate({ snapshot });
      useNavigationStore.setState({
        currentView: 'zone',
        selectedStructureId: snapshot.structures[0]!.id,
        selectedRoomId: snapshot.rooms[0]!.id,
        selectedZoneId: zoneSnapshot.id,
        isSidebarOpen: false,
      });
    });

    render(<ZoneView bridge={bridge} />);

    await screen.findAllByTestId('zone-device-group');

    const plantsCard = screen.getAllByTestId('zone-plants-card')[0]!;
    const harvestableButton = within(plantsCard).getByTestId('plant-filter-harvestable');

    await act(async () => {
      fireEvent.click(harvestableButton);
    });

    expect(harvestableButton).toHaveAttribute('aria-pressed', 'true');
    expect(within(plantsCard).getByText('Ready Plant')).toBeInTheDocument();
    expect(within(plantsCard).queryByText('Growing Plant')).not.toBeInTheDocument();
  });

  it('requires confirmation before harvesting a plant', async () => {
    const harvestPlant = vi.fn(async () => ({ ok: true }));
    const bridge = buildBridge({
      plants: {
        addPlanting: vi.fn(async () => ({ ok: true })),
        harvestPlant,
        cullPlant: vi.fn(async () => ({ ok: true })),
      },
    });

    const snapshot = JSON.parse(JSON.stringify(quickstartSnapshot)) as typeof quickstartSnapshot;
    const zoneSnapshot = snapshot.zones[0]!;
    zoneSnapshot.plants = [
      {
        ...zoneSnapshot.plants[0]!,
        id: 'plant-ready',
        strainName: 'Ready Plant',
        isHarvestable: true,
      },
    ];

    act(() => {
      useSimulationStore.getState().hydrate({ snapshot });
      useNavigationStore.setState({
        currentView: 'zone',
        selectedStructureId: snapshot.structures[0]!.id,
        selectedRoomId: snapshot.rooms[0]!.id,
        selectedZoneId: zoneSnapshot.id,
        isSidebarOpen: false,
      });
    });

    renderZoneViewWithUI(bridge);

    const plantsCard = await screen.findByTestId('zone-plants-card');
    const harvestButton = within(plantsCard).getByTestId('plant-action-harvest-plant-ready');

    await act(async () => {
      fireEvent.click(harvestButton);
    });

    expect(await screen.findByTestId('confirm-plant-action-list')).toHaveTextContent('Ready Plant');

    const confirmButton = await screen.findByTestId('confirm-plant-action-confirm');

    await act(async () => {
      confirmButton.click();
    });

    await waitFor(() => {
      expect(harvestPlant).toHaveBeenCalledWith({ plantId: 'plant-ready' });
    });

    expect(await screen.findByText('Harvest command accepted')).toBeInTheDocument();
    expect(await screen.findByTestId('zone-plants-action-status')).toHaveTextContent(
      'Harvest command accepted — Queued harvest for Ready Plant.',
    );
  });

  it('requires confirmation before culling a plant', async () => {
    const cullPlant = vi.fn(async () => ({ ok: true }));
    const bridge = buildBridge({
      plants: {
        addPlanting: vi.fn(async () => ({ ok: true })),
        harvestPlant: vi.fn(async () => ({ ok: true })),
        cullPlant,
      },
    });

    const snapshot = JSON.parse(JSON.stringify(quickstartSnapshot)) as typeof quickstartSnapshot;
    const zoneSnapshot = snapshot.zones[0]!;
    zoneSnapshot.plants = [
      {
        ...zoneSnapshot.plants[0]!,
        id: 'plant-cull',
        strainName: 'Cull Plant',
        isHarvestable: false,
      },
    ];

    act(() => {
      useSimulationStore.getState().hydrate({ snapshot });
      useNavigationStore.setState({
        currentView: 'zone',
        selectedStructureId: snapshot.structures[0]!.id,
        selectedRoomId: snapshot.rooms[0]!.id,
        selectedZoneId: zoneSnapshot.id,
        isSidebarOpen: false,
      });
    });

    renderZoneViewWithUI(bridge);

    const plantsCard = await screen.findByTestId('zone-plants-card');
    const cullButton = within(plantsCard).getByTestId('plant-action-cull-plant-cull');

    await act(async () => {
      fireEvent.click(cullButton);
    });

    expect(await screen.findByTestId('confirm-plant-action-list')).toHaveTextContent('Cull Plant');

    const confirmButton = await screen.findByTestId('confirm-plant-action-confirm');

    await act(async () => {
      confirmButton.click();
    });

    await waitFor(() => {
      expect(cullPlant).toHaveBeenCalledWith({ plantId: 'plant-cull' });
    });

    expect(await screen.findByText('Plant trashed')).toBeInTheDocument();
    expect(await screen.findByTestId('zone-plants-action-status')).toHaveTextContent(
      'Plant trashed — Removed Cull Plant from the zone.',
    );
  });

  it('disables the Harvest all button when no plants are harvestable or the zone is restricted', async () => {
    const bridge = buildBridge();

    const snapshot = JSON.parse(JSON.stringify(quickstartSnapshot)) as typeof quickstartSnapshot;
    const zoneSnapshot = snapshot.zones[0]!;
    zoneSnapshot.plants = zoneSnapshot.plants.map((plant, index) => ({
      ...plant,
      id: `plant-${index}`,
      strainName: `Plant ${index}`,
      isHarvestable: false,
    }));

    act(() => {
      useSimulationStore.getState().hydrate({ snapshot });
      useNavigationStore.setState({
        currentView: 'zone',
        selectedStructureId: snapshot.structures[0]!.id,
        selectedRoomId: snapshot.rooms[0]!.id,
        selectedZoneId: zoneSnapshot.id,
        isSidebarOpen: false,
      });
    });

    render(<ZoneView bridge={bridge} />);

    const plantsCard = await screen.findByTestId('zone-plants-card');
    const harvestAllButton = within(plantsCard).getByTestId('plant-harvest-all');
    expect(harvestAllButton).toBeDisabled();

    act(() => {
      useSimulationStore.setState((state) => ({
        snapshot: {
          ...state.snapshot!,
          zones: state.snapshot!.zones.map((zone) =>
            zone.id === zoneSnapshot.id
              ? {
                  ...zone,
                  plants: zone.plants.map((plant, index) => ({
                    ...plant,
                    isHarvestable: index === 0,
                  })),
                  health: {
                    ...zone.health,
                    preHarvestRestrictedUntilTick: (state.snapshot?.tick ?? 0) + 10,
                  },
                }
              : zone,
          ),
        },
      }));
    });

    expect(harvestAllButton).toBeDisabled();
  });

  it('confirms harvest all before dispatching commands', async () => {
    const harvestPlant = vi.fn(async () => ({ ok: true }));
    const bridge = buildBridge({
      plants: {
        addPlanting: vi.fn(async () => ({ ok: true })),
        harvestPlant,
        cullPlant: vi.fn(async () => ({ ok: true })),
      },
    });

    const snapshot = JSON.parse(JSON.stringify(quickstartSnapshot)) as typeof quickstartSnapshot;
    const zoneSnapshot = snapshot.zones[0]!;
    zoneSnapshot.plants = [
      {
        ...zoneSnapshot.plants[0]!,
        id: 'plant-harvest-1',
        strainName: 'Harvest One',
        isHarvestable: true,
      },
      {
        ...zoneSnapshot.plants[0]!,
        id: 'plant-harvest-2',
        strainName: 'Harvest Two',
        isHarvestable: true,
      },
    ];

    act(() => {
      useSimulationStore.getState().hydrate({ snapshot });
      useNavigationStore.setState({
        currentView: 'zone',
        selectedStructureId: snapshot.structures[0]!.id,
        selectedRoomId: snapshot.rooms[0]!.id,
        selectedZoneId: zoneSnapshot.id,
        isSidebarOpen: false,
      });
    });

    renderZoneViewWithUI(bridge);

    const plantsCard = await screen.findByTestId('zone-plants-card');
    const harvestAllButton = within(plantsCard).getByTestId('plant-harvest-all');
    expect(harvestAllButton).toBeEnabled();

    await act(async () => {
      fireEvent.click(harvestAllButton);
    });

    const confirmButton = await screen.findByTestId('confirm-plant-action-confirm');
    const selectionList = screen.getByTestId('confirm-plant-action-list');
    expect(selectionList).toHaveTextContent('Harvest One');
    expect(selectionList).toHaveTextContent('Harvest Two');

    await act(async () => {
      confirmButton.click();
    });

    await waitFor(() => {
      expect(harvestPlant).toHaveBeenCalledTimes(2);
      expect(harvestPlant).toHaveBeenNthCalledWith(1, { plantId: 'plant-harvest-1' });
      expect(harvestPlant).toHaveBeenNthCalledWith(2, { plantId: 'plant-harvest-2' });
    });

    await screen.findByText('Harvest command accepted');
    expect(await screen.findByTestId('zone-plants-action-status')).toHaveTextContent(
      'Harvest command accepted — Queued harvest for 2 plants.',
    );

    expect(screen.queryByTestId('confirm-plant-action-confirm')).not.toBeInTheDocument();
  });

  it('disables harvest and trash actions when zone restrictions apply', async () => {
    const bridge = buildBridge();

    const snapshot = JSON.parse(JSON.stringify(quickstartSnapshot)) as typeof quickstartSnapshot;
    const zoneSnapshot = snapshot.zones[0]!;
    zoneSnapshot.health = {
      ...zoneSnapshot.health,
      preHarvestRestrictedUntilTick: snapshot.tick + 5,
    };
    zoneSnapshot.plants = [
      {
        ...zoneSnapshot.plants[0]!,
        id: 'restricted-plant',
        strainName: 'Restricted Plant',
        isHarvestable: true,
      },
    ];

    act(() => {
      useSimulationStore.getState().hydrate({ snapshot });
      useNavigationStore.setState({
        currentView: 'zone',
        selectedStructureId: snapshot.structures[0]!.id,
        selectedRoomId: snapshot.rooms[0]!.id,
        selectedZoneId: zoneSnapshot.id,
        isSidebarOpen: false,
      });
    });

    render(<ZoneView bridge={bridge} />);

    const plantsCard = await screen.findByTestId('zone-plants-card');
    const harvestButton = within(plantsCard).getByTestId('plant-action-harvest-restricted-plant');
    const trashButton = within(plantsCard).getByTestId('plant-action-cull-restricted-plant');

    expect(harvestButton).toBeDisabled();
    expect(trashButton).toBeDisabled();
  });

  it('does not render the health summary card', async () => {
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

    await screen.findByTestId('zone-plants-card');

    expect(screen.queryByTestId('zone-health-summary')).not.toBeInTheDocument();
    expect(screen.queryByText('Disease & treatment overview')).not.toBeInTheDocument();
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

      await expandAllDeviceGroups();

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

      await expandAllDeviceGroups();

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

  it('collapses device groups by default and expands on toggle', async () => {
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
    const lightingGroup = groups.find((group) => within(group).queryByText(/Grow Lights/i));
    expect(lightingGroup).toBeDefined();

    const toggle = within(lightingGroup!).getByTestId('device-group-header');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(lightingGroup!).queryByTestId('device-group-devices')).not.toBeInTheDocument();

    await act(async () => {
      toggle.click();
    });

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => {
      expect(within(lightingGroup!).queryByTestId('device-group-devices')).toBeInTheDocument();
    });
  });
});
