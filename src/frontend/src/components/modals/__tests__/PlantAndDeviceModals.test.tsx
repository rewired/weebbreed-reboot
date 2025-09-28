import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ModalHost } from '../ModalHost';
import { useSimulationStore } from '@/store/simulation';
import { useUIStore } from '@/store/ui';
import { useNavigationStore } from '@/store/navigation';
import { ZoneView } from '@/views/ZoneView';
import type { SimulationBridge } from '@/facade/systemFacade';
import type { SimulationSnapshot } from '@/types/simulation';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
    measureElement: () => undefined,
  }),
}));

vi.mock('@/components/zone/EnvironmentPanel', () => ({
  EnvironmentPanel: ({ zone }: { zone: { name: string } }) => (
    <div data-testid="environment-panel">Environment controls for {zone.name}</div>
  ),
}));

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

const baseSnapshot: SimulationSnapshot = {
  tick: 0,
  clock: {
    tick: 0,
    isPaused: true,
    targetTickRate: 1,
    startedAt: new Date(0).toISOString(),
    lastUpdatedAt: new Date(0).toISOString(),
  },
  structures: [
    {
      id: 'structure-1',
      name: 'Structure One',
      status: 'active',
      footprint: {
        length: 10,
        width: 5,
        height: 4,
        area: 50,
        volume: 200,
      },
      rentPerTick: 0,
      roomIds: ['room-1'],
    },
  ],
  rooms: [
    {
      id: 'room-1',
      name: 'Cultivation Room',
      structureId: 'structure-1',
      structureName: 'Structure One',
      purposeId: 'growroom',
      purposeKind: 'growroom',
      purposeName: 'Grow Room',
      area: 50,
      height: 3,
      volume: 150,
      cleanliness: 1,
      maintenanceLevel: 1,
      zoneIds: ['zone-1', 'zone-2'],
    },
  ],
  zones: [
    {
      id: 'zone-1',
      name: 'Zone One',
      structureId: 'structure-1',
      structureName: 'Structure One',
      roomId: 'room-1',
      roomName: 'Cultivation Room',
      area: 20,
      ceilingHeight: 2.8,
      volume: 56,
      cultivationMethodId: '659ba4d7-a5fc-482e-98d4-b614341883ac',
      environment: {
        temperature: 24,
        relativeHumidity: 0.6,
        co2: 950,
        ppfd: 520,
        vpd: 1.2,
      },
      resources: {
        waterLiters: 0,
        nutrientSolutionLiters: 0,
        nutrientStrength: 1,
        substrateHealth: 1,
        reservoirLevel: 1,
        lastTranspirationLiters: 0,
      },
      metrics: {
        averageTemperature: 24,
        averageHumidity: 0.6,
        averageCo2: 950,
        averagePpfd: 520,
        stressLevel: 0.2,
        lastUpdatedTick: 0,
      },
      devices: [
        {
          id: 'device-instance-1',
          blueprintId: 'device-1',
          kind: 'lighting',
          name: 'LED VegLight 600',
          zoneId: 'zone-1',
          status: 'operational',
          efficiency: 0.95,
          runtimeHours: 1200,
          maintenance: {
            lastServiceTick: 0,
            nextDueTick: 1000,
            condition: 0.9,
            degradation: 0.05,
          },
          settings: {
            targetTemperature: 24,
            power: 0.7,
          },
        },
      ],
      plants: [],
      health: { diseases: 0, pests: 0, pendingTreatments: 0, appliedTreatments: 0 },
    },
    {
      id: 'zone-2',
      name: 'Zone Two',
      structureId: 'structure-1',
      structureName: 'Structure One',
      roomId: 'room-1',
      roomName: 'Cultivation Room',
      area: 18,
      ceilingHeight: 2.8,
      volume: 50.4,
      cultivationMethodId: '659ba4d7-a5fc-482e-98d4-b614341883ac',
      environment: {
        temperature: 23,
        relativeHumidity: 0.58,
        co2: 940,
        ppfd: 500,
        vpd: 1.1,
      },
      resources: {
        waterLiters: 0,
        nutrientSolutionLiters: 0,
        nutrientStrength: 1,
        substrateHealth: 1,
        reservoirLevel: 1,
        lastTranspirationLiters: 0,
      },
      metrics: {
        averageTemperature: 23,
        averageHumidity: 0.58,
        averageCo2: 940,
        averagePpfd: 500,
        stressLevel: 0.15,
        lastUpdatedTick: 0,
      },
      devices: [],
      plants: [],
      health: { diseases: 0, pests: 0, pendingTreatments: 0, appliedTreatments: 0 },
    },
  ],
  personnel: { employees: [], applicants: [], overallMorale: 1 },
  finance: {
    cashOnHand: 0,
    reservedCash: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    lastTickRevenue: 0,
    lastTickExpenses: 0,
  },
};

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
};

describe('Plant and Device modals', () => {
  let bridge: SimulationBridge;
  let modalRoot: HTMLDivElement;
  let sendConfigUpdateMock: ReturnType<typeof vi.fn>;
  let sendIntentMock: ReturnType<typeof vi.fn>;
  let moveDeviceMock: ReturnType<typeof vi.fn>;
  let removeDeviceMock: ReturnType<typeof vi.fn>;
  let installDeviceMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    modalRoot = document.createElement('div');
    modalRoot.id = 'modal-root';
    document.body.appendChild(modalRoot);

    sendConfigUpdateMock = vi.fn(async () => ({ ok: true }));
    sendIntentMock = vi.fn(async () => ({ ok: true }));
    moveDeviceMock = vi.fn(async () => ({ ok: true }));
    removeDeviceMock = vi.fn(async () => ({ ok: true }));
    installDeviceMock = vi.fn(async () => ({ ok: true, warnings: ['Device load near limit.'] }));

    bridge = {
      connect: vi.fn(),
      loadQuickStart: vi.fn(async () => ({ ok: true })),
      getStructureBlueprints: vi.fn(async () => ({ ok: true, data: [] })),
      getStrainBlueprints: vi.fn(async () => ({
        ok: true,
        data: [
          {
            id: 'strain-1',
            slug: 'strain-1',
            name: 'Aurora',
            lineage: {},
            genotype: {},
            chemotype: {},
            generalResilience: 0.8,
            germinationRate: 0.95,
            compatibility: { methodAffinity: { '659ba4d7-a5fc-482e-98d4-b614341883ac': 0.9 } },
            defaults: {},
            traits: {},
            methodAffinity: { '659ba4d7-a5fc-482e-98d4-b614341883ac': 0.9 },
          },
          {
            id: 'strain-2',
            slug: 'strain-2',
            name: 'Nova',
            lineage: {},
            genotype: {},
            chemotype: {},
            generalResilience: 0.85,
            germinationRate: 0.96,
            compatibility: { methodAffinity: { '659ba4d7-a5fc-482e-98d4-b614341883ac': 0.96 } },
            defaults: {},
            traits: {},
            methodAffinity: { '659ba4d7-a5fc-482e-98d4-b614341883ac': 0.96 },
          },
        ],
      })),
      getDeviceBlueprints: vi.fn(async () => ({
        ok: true,
        data: [
          {
            id: 'device-1',
            kind: 'lighting',
            name: 'LED VegLight 600',
            quality: 0.95,
            complexity: 0.2,
            lifetimeHours: 5000,
            compatibility: { roomPurposes: ['growroom'] },
            defaults: { settings: { coverageArea: 1.5, power: 0.7, ppfd: 650 } },
            maintenance: {},
            metadata: {},
            price: {
              capitalExpenditure: 0,
              baseMaintenanceCostPerTick: 0,
              costIncreasePer1000Ticks: 0,
            },
            roomPurposes: ['growroom'],
            coverage: { maxArea_m2: 1.5 },
            limits: {},
            settings: { coverageArea: 1.5, power: 0.7, ppfd: 650 },
          },
          {
            id: 'device-2',
            kind: 'ventilation',
            name: 'Cyclone Fan 150',
            quality: 0.8,
            complexity: 0.1,
            lifetimeHours: 4000,
            compatibility: { roomPurposes: ['growroom'] },
            defaults: { settings: { airflow: 170 } },
            maintenance: {},
            metadata: {},
            price: {
              capitalExpenditure: 0,
              baseMaintenanceCostPerTick: 0,
              costIncreasePer1000Ticks: 0,
            },
            roomPurposes: ['growroom'],
            coverage: { maxVolume_m3: 15 },
            limits: {},
            settings: { airflow: 170 },
          },
        ],
      })),
      getDifficultyConfig: vi.fn(async () => ({ ok: true })),
      sendControl: vi.fn(async () => ({ ok: true })),
      sendConfigUpdate: sendConfigUpdateMock as unknown as SimulationBridge['sendConfigUpdate'],
      sendIntent: sendIntentMock as unknown as SimulationBridge['sendIntent'],
      subscribeToUpdates: () => () => undefined,
      plants: {
        addPlanting: vi.fn(async () => ({
          ok: true,
          warnings: ['Capacity tight, monitor stress.'],
        })),
      },
      devices: {
        installDevice: installDeviceMock as unknown as SimulationBridge['devices']['installDevice'],
        adjustLightingCycle: vi.fn(async () => ({ ok: true })),
        moveDevice: moveDeviceMock as unknown as SimulationBridge['devices']['moveDevice'],
        removeDevice: removeDeviceMock as unknown as SimulationBridge['devices']['removeDevice'],
      },
    } satisfies SimulationBridge;

    act(() => {
      useSimulationStore.setState({
        snapshot: structuredClone(baseSnapshot),
        events: [],
        timeStatus: null,
        connectionStatus: 'connected',
        zoneHistory: {},
        zoneSetpoints: {},
        lastTick: 0,
      });
      useUIStore.setState({ activeModal: null, modalQueue: [] });
      useNavigationStore.setState({
        currentView: 'zone',
        selectedStructureId: 'structure-1',
        selectedRoomId: 'room-1',
        selectedZoneId: 'zone-1',
        isSidebarOpen: false,
      });
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    act(() => {
      useSimulationStore.getState().reset();
      useUIStore.setState({ activeModal: null, modalQueue: [] });
      useNavigationStore.getState().reset();
    });
    modalRoot.remove();
  });

  it('surfaces planting capacity hints and warnings', async () => {
    render(<ModalHost bridge={bridge} />);

    act(() => {
      useUIStore.getState().openModal({
        id: 'plant-zone',
        type: 'plantZone',
        title: 'Plant zone',
        context: { zoneId: 'zone-1' },
      });
    });

    expect(await screen.findByText(/Capacity 80 plants/i)).toBeInTheDocument();
    const strainSelect = await screen.findByLabelText('Strain');
    expect(screen.getByText(/Good fit \(90% affinity\)/i)).toBeInTheDocument();

    fireEvent.change(strainSelect, { target: { value: 'strain-2' } });
    expect(await screen.findByText(/Excellent fit \(96% affinity\)/i)).toBeInTheDocument();

    fireEvent.change(strainSelect, { target: { value: 'strain-1' } });
    expect(await screen.findByText(/Good fit \(90% affinity\)/i)).toBeInTheDocument();

    const countInput = await screen.findByLabelText(/Plant count/i);
    fireEvent.change(countInput, { target: { value: '120' } });
    expect(screen.getByText(/would exceed the estimated capacity/i)).toBeInTheDocument();

    fireEvent.change(countInput, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plant zone' }));

    await screen.findByText('Capacity tight, monitor stress.');
    expect(bridge.plants.addPlanting).toHaveBeenCalledWith({
      zoneId: 'zone-1',
      strainId: 'strain-1',
      count: 10,
    });
  });

  it('validates device target inputs and reports facade warnings', async () => {
    render(<ModalHost bridge={bridge} />);

    act(() => {
      useUIStore.getState().openModal({
        id: 'install-device',
        type: 'installDevice',
        title: 'Install device',
        context: { zoneId: 'zone-1' },
      });
    });

    const areaCoverage = await screen.findByText('Covers up to 1.5 m² · Zone area 20 m²');
    expect(areaCoverage).toBeInTheDocument();
    expect(areaCoverage).toHaveClass('text-warning');

    const ppfdInput = await screen.findByLabelText('Target PPFD (µmol·m⁻²·s⁻¹)');
    fireEvent.change(ppfdInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Install device' }));
    expect(await screen.findByText('Value is required.')).toBeInTheDocument();
    expect(installDeviceMock).not.toHaveBeenCalled();

    fireEvent.change(ppfdInput, { target: { value: '680' } });
    fireEvent.click(screen.getByRole('button', { name: 'Install device' }));

    await screen.findByText('Installed 1 device with warnings.');
    await screen.findByText('Device load near limit.');
    expect(installDeviceMock).toHaveBeenCalledWith({
      targetId: 'zone-1',
      deviceId: 'device-1',
      settings: { ppfd: 680 },
    });

    fireEvent.change(ppfdInput, { target: { value: '650' } });
    fireEvent.click(screen.getByRole('button', { name: 'Install device' }));

    await screen.findByText('Installed 1 device with warnings.');
    await screen.findByText('Device load near limit.');
    expect(installDeviceMock).toHaveBeenLastCalledWith({
      targetId: 'zone-1',
      deviceId: 'device-1',
    });
  });

  it('installs multiple devices when quantity exceeds one', async () => {
    installDeviceMock.mockReset();
    installDeviceMock
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, warnings: ['Device load near limit.'] })
      .mockResolvedValue({ ok: true });

    render(<ModalHost bridge={bridge} />);

    act(() => {
      useUIStore.getState().openModal({
        id: 'install-device',
        type: 'installDevice',
        title: 'Install device',
        context: { zoneId: 'zone-1' },
      });
    });

    const quantityInput = await screen.findByLabelText(/Device quantity/i);
    fireEvent.change(quantityInput, { target: { value: '3' } });

    fireEvent.click(screen.getByRole('button', { name: 'Install device' }));

    await screen.findByText('Installed 3 devices with warnings.');
    expect(installDeviceMock).toHaveBeenCalledTimes(3);
    for (let callIndex = 1; callIndex <= 3; callIndex += 1) {
      expect(installDeviceMock).toHaveBeenNthCalledWith(callIndex, {
        targetId: 'zone-1',
        deviceId: 'device-1',
      });
    }
    expect(screen.getAllByText('Device load near limit.')).toHaveLength(1);
  });

  it('displays volume-based coverage and derived area when available', async () => {
    render(<ModalHost bridge={bridge} />);

    act(() => {
      useUIStore.getState().openModal({
        id: 'install-device',
        type: 'installDevice',
        title: 'Install device',
        context: { zoneId: 'zone-1' },
      });
    });

    const deviceSelect = await screen.findByLabelText('Device blueprint');
    fireEvent.change(deviceSelect, { target: { value: 'device-2' } });

    const volumeCoverage = await screen.findByText(
      'Covers up to 5.36 m² (≈ derived from 2.8 m height) · 15 m³ · Zone area 20 m² · Zone volume 56 m³',
    );
    expect(volumeCoverage).toBeInTheDocument();
    expect(volumeCoverage).toHaveClass('text-warning');
  });

  it('opens the tune device modal from the zone view and dispatches a setpoint update', async () => {
    render(
      <>
        <ModalHost bridge={bridge} />
        <ZoneView bridge={bridge} />
      </>,
    );

    await expandAllDeviceGroups();
    await screen.findByText('LED VegLight 600');

    act(() => {
      useUIStore.getState().openModal({
        id: 'tune-device',
        type: 'tuneDevice',
        title: 'Tune device',
        context: { zoneId: 'zone-1', deviceId: 'device-instance-1' },
      });
    });

    const temperatureInput = await screen.findByLabelText('Target Temperature');
    fireEvent.change(temperatureInput, { target: { value: '26' } });

    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));

    await waitFor(() => {
      expect(sendConfigUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'setpoint',
          zoneId: 'zone-1',
          metric: 'temperature',
          value: 26,
        }),
      );
    });

    expect(sendIntentMock).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('dispatches an adjustSettings intent when non-setpoint fields change', async () => {
    render(
      <>
        <ModalHost bridge={bridge} />
        <ZoneView bridge={bridge} />
      </>,
    );

    await expandAllDeviceGroups();
    await screen.findByText('LED VegLight 600');

    act(() => {
      useUIStore.getState().openModal({
        id: 'tune-device',
        type: 'tuneDevice',
        title: 'Tune device',
        context: { zoneId: 'zone-1', deviceId: 'device-instance-1' },
      });
    });

    const powerInput = await screen.findByLabelText('Power');
    fireEvent.change(powerInput, { target: { value: '0.8' } });

    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));

    await waitFor(() => {
      expect(sendIntentMock).toHaveBeenCalledWith({
        domain: 'devices',
        action: 'adjustSettings',
        payload: {
          zoneId: 'zone-1',
          deviceId: 'device-instance-1',
          settings: { power: 0.8 },
        },
      });
    });

    expect(sendConfigUpdateMock).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('moves a device to another zone from the zone view', async () => {
    render(
      <>
        <ModalHost bridge={bridge} />
        <ZoneView bridge={bridge} />
      </>,
    );

    await expandAllDeviceGroups();
    const [moveButton] = await screen.findAllByRole('button', { name: /Move$/ });
    fireEvent.click(moveButton);

    const destinationSelect = await screen.findByLabelText('Destination zone');
    fireEvent.change(destinationSelect, { target: { value: 'zone-2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Move device' }));

    await waitFor(() => {
      expect(moveDeviceMock).toHaveBeenCalledWith({
        instanceId: 'device-instance-1',
        targetZoneId: 'zone-2',
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('deletes a device after confirmation', async () => {
    render(
      <>
        <ModalHost bridge={bridge} />
        <ZoneView bridge={bridge} />
      </>,
    );

    await expandAllDeviceGroups();
    const [deleteButton] = await screen.findAllByRole('button', { name: /Delete$/ });
    fireEvent.click(deleteButton);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete device' }));

    await waitFor(() => {
      expect(removeDeviceMock).toHaveBeenCalledWith({ instanceId: 'device-instance-1' });
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
