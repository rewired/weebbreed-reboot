import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalHost } from './ModalHost';
import { useSimulationStore } from '@/store/simulation';
import { useUIStore } from '@/store/ui';
import type { SimulationBridge } from '@/facade/systemFacade';
import type { SimulationSnapshot, SimulationTimeStatus } from '@/types/simulation';

const baseSnapshot: SimulationSnapshot = {
  tick: 42,
  clock: {
    tick: 42,
    isPaused: false,
    targetTickRate: 2,
    startedAt: new Date(0).toISOString(),
    lastUpdatedAt: new Date(0).toISOString(),
  },
  structures: [],
  rooms: [],
  zones: [],
  personnel: { employees: [], applicants: [], overallMorale: 1 },
  finance: {
    cashOnHand: 1000,
    reservedCash: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    lastTickRevenue: 0,
    lastTickExpenses: 0,
  },
};

const baseStructure = {
  id: 'structure-1',
  name: 'Structure One',
  status: 'active' as const,
  footprint: {
    length: 10,
    width: 10,
    height: 5,
    area: 100,
    volume: 500,
  },
  rentPerTick: 0,
  roomIds: ['room-1'],
};

const baseRoom = {
  id: 'room-1',
  name: 'Room One',
  structureId: baseStructure.id,
  structureName: baseStructure.name,
  purposeId: 'veg',
  purposeKind: 'vegetative',
  purposeName: 'Vegetative Room',
  purposeFlags: {} as Record<string, boolean>,
  area: 20,
  height: 4,
  volume: 80,
  cleanliness: 1,
  maintenanceLevel: 1,
  zoneIds: [] as string[],
};

const buildSnapshotWithRoom = (): SimulationSnapshot => ({
  ...structuredClone(baseSnapshot),
  structures: [structuredClone(baseStructure)],
  rooms: [structuredClone(baseRoom)],
  zones: [],
});

const buildSnapshotWithZone = (): SimulationSnapshot => {
  const snapshot = buildSnapshotWithRoom();
  const zone: SimulationSnapshot['zones'][number] = {
    id: 'zone-1',
    name: 'Zone One',
    structureId: baseStructure.id,
    structureName: baseStructure.name,
    roomId: baseRoom.id,
    roomName: baseRoom.name,
    area: 20,
    ceilingHeight: 3,
    volume: 60,
    cultivationMethodId: 'method-1',
    cultivation: {
      container: {
        blueprintId: 'container-1',
        slug: 'container-1',
        type: 'tray',
        count: 24,
      },
      substrate: {
        blueprintId: 'substrate-1',
        slug: 'substrate-1',
        type: 'soil',
        totalVolumeLiters: 120,
      },
    },
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
      stressLevel: 0.12,
      lastUpdatedTick: 0,
    },
    devices: [],
    plants: [],
    control: { setpoints: {} },
    health: { diseases: 0, pests: 0, pendingTreatments: 0, appliedTreatments: 0 },
  };

  snapshot.rooms[0]!.zoneIds = [zone.id];
  snapshot.zones = [zone];
  return snapshot;
};

const buildMethodBlueprint = () => ({
  id: 'method-1',
  name: 'Method One',
  laborIntensity: 1,
  areaPerPlant: 1,
  minimumSpacing: 1,
  compatibility: {
    compatibleContainerTypes: ['tray'],
    compatibleSubstrateTypes: ['soil'],
  },
  metadata: { description: 'Method description' },
  price: { setupCost: 120 },
});

const buildContainerBlueprint = () => ({
  id: 'container-1',
  slug: 'container-1',
  name: 'Tray Container',
  type: 'tray',
  volumeInLiters: 5,
  footprintArea: 0.5,
  packingDensity: 2,
  metadata: { description: 'Container description' },
  price: { costPerUnit: 10 },
});

const buildSubstrateBlueprint = () => ({
  id: 'substrate-1',
  slug: 'substrate-1',
  name: 'Soil Mix',
  type: 'soil',
  metadata: { description: 'Substrate description' },
  price: { costPerLiter: 1.5 },
});

const pausedStatus: SimulationTimeStatus = {
  running: false,
  paused: true,
  speed: 4,
  tick: baseSnapshot.clock.tick,
  targetTickRate: baseSnapshot.clock.targetTickRate,
};

describe('ModalHost', () => {
  let sendControlMock: ReturnType<typeof vi.fn>;
  let sendIntentMock: ReturnType<typeof vi.fn>;
  let bridge: SimulationBridge;

  beforeEach(() => {
    sendControlMock = vi.fn(async () => ({ ok: true }));
    sendIntentMock = vi.fn(async () => ({ ok: true }));
    bridge = {
      connect: vi.fn(),
      loadQuickStart: vi.fn(async () => ({ ok: true })),
      getStructureBlueprints: vi.fn(async () => ({ ok: true, data: [] })),
      getStrainBlueprints: vi.fn(async () => ({ ok: true, data: [] })),
      getDeviceBlueprints: vi.fn(async () => ({ ok: true, data: [] })),
      getCultivationMethodBlueprints: vi.fn(async () => ({ ok: true, data: [] })),
      getContainerBlueprints: vi.fn(async () => ({ ok: true, data: [] })),
      getSubstrateBlueprints: vi.fn(async () => ({ ok: true, data: [] })),
      getDifficultyConfig: vi.fn(async () => ({ ok: true })),
      sendControl: sendControlMock as unknown as SimulationBridge['sendControl'],
      sendConfigUpdate: vi.fn(async () => ({ ok: true })),
      sendIntent: sendIntentMock as unknown as SimulationBridge['sendIntent'],
      subscribeToUpdates: (_handler: Parameters<SimulationBridge['subscribeToUpdates']>[0]) => {
        void _handler;
        return () => undefined;
      },
      plants: {
        addPlanting: vi.fn(async () => ({ ok: true })),
        harvestPlant: vi.fn(async () => ({ ok: true })),
        cullPlant: vi.fn(async () => ({ ok: true })),
      },
      devices: {
        installDevice: vi.fn(async () => ({ ok: true })),
        adjustLightingCycle: vi.fn(async () => ({ ok: true })),
        moveDevice: vi.fn(async () => ({ ok: true })),
        removeDevice: vi.fn(async () => ({ ok: true })),
      },
    };

    act(() => {
      useSimulationStore.setState({
        snapshot: structuredClone(baseSnapshot),
        timeStatus: { ...pausedStatus },
        events: [],
        connectionStatus: 'connected',
        zoneHistory: {},
        lastTick: baseSnapshot.clock.tick,
      });
      useUIStore.setState({ activeModal: null, modalQueue: [] });
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    act(() => {
      useSimulationStore.getState().reset();
      useUIStore.setState({ activeModal: null, modalQueue: [] });
    });
  });

  it('does not send a play command when time status is paused', async () => {
    render(<ModalHost bridge={bridge} />);

    act(() => {
      useUIStore
        .getState()
        .openModal({ id: 'test', type: 'notifications', title: 'Notifications' });
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      useUIStore.getState().closeModal();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(sendControlMock).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'play' }));
  });

  it('treats conflicting pause states as paused and avoids pause/resume commands', async () => {
    act(() => {
      useSimulationStore.setState({
        snapshot: {
          ...structuredClone(baseSnapshot),
          clock: {
            ...structuredClone(baseSnapshot.clock),
            isPaused: true,
          },
        },
        timeStatus: {
          ...pausedStatus,
          paused: false,
          running: true,
        },
      });
    });

    render(<ModalHost bridge={bridge} />);

    act(() => {
      useUIStore
        .getState()
        .openModal({ id: 'test', type: 'notifications', title: 'Notifications' });
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      useUIStore.getState().closeModal();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(sendControlMock).not.toHaveBeenCalled();
  });

  it('clamps container count to the computed capacity', async () => {
    const snapshot = buildSnapshotWithRoom();
    const method = buildMethodBlueprint();
    const container = buildContainerBlueprint();
    const substrate = buildSubstrateBlueprint();

    act(() => {
      useSimulationStore.setState({
        snapshot,
        catalogs: {
          cultivationMethods: { status: 'ready', data: [method], error: null },
          containers: { status: 'ready', data: [container], error: null },
          substrates: { status: 'ready', data: [substrate], error: null },
        },
      });
    });

    render(<ModalHost bridge={bridge} />);
    const user = userEvent.setup();

    act(() => {
      useUIStore.getState().openModal({
        id: 'create-zone',
        type: 'createZone',
        title: 'Create Zone',
        context: { roomId: snapshot.rooms[0]!.id },
      });
    });

    const methodSelect = await screen.findByLabelText(/Cultivation Method/i);
    await user.selectOptions(methodSelect, method.id);

    const containerSelect = screen.getByLabelText(/Container Blueprint/i);
    await user.selectOptions(containerSelect, container.id);

    const nameInput = await screen.findByLabelText(/Zone name/i);
    await user.type(nameInput, 'Propagation Bay');

    const areaInput = await screen.findByLabelText(/Area \(m²\)/i);
    await user.clear(areaInput);
    await user.type(areaInput, '2');

    const containerInput = await screen.findByLabelText(/Container count/i);
    await waitFor(() => expect(containerInput).not.toBeDisabled());
    await waitFor(() => expect(containerInput).toHaveValue(8));

    await user.clear(containerInput);
    await user.type(containerInput, '9');

    await waitFor(() => expect(containerInput).toHaveValue(8));
    expect(
      screen.queryByText(/Container count exceeds the supported capacity for this area/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create zone/i })).toBeEnabled();
    expect(sendIntentMock).not.toHaveBeenCalled();
  });

  it('submits createZone intents with blueprint selections and quantities', async () => {
    const snapshot = buildSnapshotWithRoom();
    const method = buildMethodBlueprint();
    const container = buildContainerBlueprint();
    const substrate = buildSubstrateBlueprint();

    act(() => {
      useSimulationStore.setState({
        snapshot,
        catalogs: {
          cultivationMethods: { status: 'ready', data: [method], error: null },
          containers: { status: 'ready', data: [container], error: null },
          substrates: { status: 'ready', data: [substrate], error: null },
        },
      });
    });

    render(<ModalHost bridge={bridge} />);
    const user = userEvent.setup();

    act(() => {
      useUIStore.getState().openModal({
        id: 'create-zone',
        type: 'createZone',
        title: 'Create Zone',
        context: { roomId: snapshot.rooms[0]!.id },
      });
    });

    const methodSelect = await screen.findByLabelText(/Cultivation Method/i);
    await user.selectOptions(methodSelect, method.id);

    const containerSelect = screen.getByLabelText(/Container Blueprint/i);
    await user.selectOptions(containerSelect, container.id);

    const nameInput = await screen.findByLabelText(/Zone name/i);
    await user.type(nameInput, 'Propagation Bay');

    const areaInput = screen.getByLabelText(/Area \(m²\)/i);
    const containerInput = screen.getByLabelText(/Container count/i);
    await waitFor(() => expect(containerInput).not.toBeDisabled());
    await waitFor(() => expect(containerInput).toHaveValue(40));

    await user.clear(areaInput);
    await user.type(areaInput, '4');

    await user.clear(containerInput);
    await user.type(containerInput, '4');

    await user.click(screen.getByRole('button', { name: /Create zone/i }));

    expect(sendIntentMock).toHaveBeenCalledWith({
      domain: 'world',
      action: 'createZone',
      payload: {
        roomId: snapshot.rooms[0]!.id,
        zone: {
          name: 'Propagation Bay',
          area: 4,
          methodId: method.id,
          container: {
            blueprintId: container.id,
            type: container.type,
            count: 4,
          },
          substrate: {
            blueprintId: substrate.id,
            type: substrate.type,
            volumeLiters: container.volumeInLiters! * 4,
          },
        },
      },
    });
  });

  it('applies the maximum area shortcut and recalculates container capacity', async () => {
    const snapshot = buildSnapshotWithRoom();
    const method = buildMethodBlueprint();
    const container = buildContainerBlueprint();
    const substrate = buildSubstrateBlueprint();

    act(() => {
      useSimulationStore.setState({
        snapshot,
        catalogs: {
          cultivationMethods: { status: 'ready', data: [method], error: null },
          containers: { status: 'ready', data: [container], error: null },
          substrates: { status: 'ready', data: [substrate], error: null },
        },
      });
    });

    render(<ModalHost bridge={bridge} />);
    const user = userEvent.setup();

    act(() => {
      useUIStore.getState().openModal({
        id: 'create-zone',
        type: 'createZone',
        title: 'Create Zone',
        context: { roomId: snapshot.rooms[0]!.id },
      });
    });

    const zoneNameInput = await screen.findByLabelText(/Zone name/i);
    const areaInput = screen.getByLabelText(/Area \(m²\)/i);
    const containerInput = screen.getByLabelText(/Container count/i);

    await user.type(zoneNameInput, 'Max Capacity Bay');
    await user.click(screen.getByRole('button', { name: /Max/i }));

    const expectedArea = snapshot.rooms[0]!.area;
    const expectedMaxContainers = Math.floor(
      (expectedArea / container.footprintArea!) * (container.packingDensity ?? 1),
    );

    expect(areaInput).toHaveValue(expectedArea);
    expect(containerInput).toHaveValue(expectedMaxContainers);

    await user.click(screen.getByRole('button', { name: /Create zone/i }));

    expect(sendIntentMock).toHaveBeenCalledWith({
      domain: 'world',
      action: 'createZone',
      payload: {
        roomId: snapshot.rooms[0]!.id,
        zone: {
          name: 'Max Capacity Bay',
          area: expectedArea,
          methodId: method.id,
          container: {
            blueprintId: container.id,
            type: container.type,
            count: expectedMaxContainers,
          },
          substrate: {
            blueprintId: substrate.id,
            type: substrate.type,
            volumeLiters: container.volumeInLiters! * expectedMaxContainers,
          },
        },
      },
    });
  });

  it('dispatches duplicateZone intent when confirming the duplicate zone modal', async () => {
    const snapshot = buildSnapshotWithZone();
    act(() => {
      useSimulationStore.setState({
        snapshot,
        timeStatus: { ...pausedStatus },
        events: [],
        connectionStatus: 'connected',
        zoneHistory: {},
        lastTick: snapshot.clock.tick,
      });
    });

    sendIntentMock.mockResolvedValueOnce({ ok: true, data: { zoneId: 'zone-clone' } });

    render(<ModalHost bridge={bridge} />);
    const user = userEvent.setup();

    act(() => {
      useUIStore.getState().openModal({
        id: 'duplicate-zone-1',
        type: 'duplicateZone',
        title: 'Duplicate zone',
        context: { zoneId: 'zone-1' },
      });
    });

    const nameInput = await screen.findByPlaceholderText(/Zone One Copy/i);
    await user.type(nameInput, 'Beta Wing');

    await user.click(screen.getByRole('button', { name: /Duplicate zone/i }));

    await waitFor(() => {
      expect(sendIntentMock).toHaveBeenCalledWith({
        domain: 'world',
        action: 'duplicateZone',
        payload: { zoneId: 'zone-1', name: 'Beta Wing' },
      });
    });

    await waitFor(() => {
      expect(useUIStore.getState().activeModal).toBeNull();
    });
  });

  it('dispatches deleteZone intent when confirming the delete zone modal', async () => {
    const snapshot = buildSnapshotWithZone();
    act(() => {
      useSimulationStore.setState({
        snapshot,
        timeStatus: { ...pausedStatus },
        events: [],
        connectionStatus: 'connected',
        zoneHistory: {},
        lastTick: snapshot.clock.tick,
      });
    });

    sendIntentMock.mockResolvedValueOnce({ ok: true });

    render(<ModalHost bridge={bridge} />);
    const user = userEvent.setup();

    act(() => {
      useUIStore.getState().openModal({
        id: 'delete-zone-1',
        type: 'deleteZone',
        title: 'Remove zone',
        context: { zoneId: 'zone-1' },
      });
    });

    const confirmationInput = await screen.findByPlaceholderText('Zone One');
    const confirmButtonInitial = screen.getByRole('button', { name: /Remove zone/i });
    expect(confirmButtonInitial).toBeDisabled();

    await user.type(confirmationInput, 'Zone One');

    const confirmButton = screen.getByRole('button', { name: /Remove zone/i });
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);

    await waitFor(() => {
      expect(sendIntentMock).toHaveBeenCalledWith({
        domain: 'world',
        action: 'deleteZone',
        payload: { zoneId: 'zone-1' },
      });
    });

    await waitFor(() => {
      expect(useUIStore.getState().activeModal).toBeNull();
    });
  });

  it('renders the tune device modal when requested', async () => {
    render(<ModalHost bridge={bridge} />);

    act(() => {
      useUIStore.getState().openModal({ id: 'tune', type: 'tuneDevice', title: 'Tune device' });
    });

    expect(
      await screen.findByText(
        /Device data unavailable\. Select a zone and device to adjust settings\./i,
      ),
    ).toBeInTheDocument();
  });
});
