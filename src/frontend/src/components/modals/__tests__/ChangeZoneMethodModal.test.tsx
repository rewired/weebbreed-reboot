// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ModalHost } from '../ModalHost';
import { setStorageHandoffHandler } from '../zones/storageHandoff';
import { useSimulationStore } from '@/store/simulation';
import { useUIStore } from '@/store/ui';
import { quickstartSnapshot } from '@/data/mockTelemetry';
import type { SimulationBridge } from '@/facade/systemFacade';

const cultivationMethods = [
  {
    id: 'method-sog',
    name: 'Sea of Green',
    laborIntensity: 0.6,
    areaPerPlant: 0.25,
    minimumSpacing: 0.2,
    compatibility: {
      compatibleContainerTypes: ['ebbFlowTable'],
      compatibleSubstrateTypes: ['coco'],
    },
  },
  {
    id: 'method-scrog',
    name: 'Screen of Green',
    laborIntensity: 0.8,
    areaPerPlant: 1,
    minimumSpacing: 0.6,
    compatibility: { compatibleContainerTypes: ['pot'], compatibleSubstrateTypes: ['soil'] },
  },
];

const containerCatalog = [
  {
    id: 'container-flood-table',
    slug: 'ebb-flow-tray',
    name: 'Flood Table',
    type: 'ebbFlowTable',
    footprintArea: 1.2,
    packingDensity: 1,
    volumeInLiters: 25,
  },
  {
    id: 'container-pot-10l',
    slug: 'pot-10l',
    name: '10 L Pot',
    type: 'pot',
    footprintArea: 0.3,
    packingDensity: 0.9,
    volumeInLiters: 10,
  },
];

const substrateCatalog = [
  {
    id: 'substrate-coco-mix',
    slug: 'coco-blend',
    name: 'Coco Blend',
    type: 'coco',
  },
  {
    id: 'substrate-soil-single',
    slug: 'soil-single-cycle',
    name: 'Single-Cycle Soil',
    type: 'soil',
  },
];

const buildBridge = (overrides: Partial<SimulationBridge> = {}): SimulationBridge => ({
  connect: () => undefined,
  loadQuickStart: async () => ({ ok: true }),
  getStructureBlueprints: async () => ({ ok: true, data: [] }),
  getStrainBlueprints: async () => ({ ok: true, data: [] }),
  getDeviceBlueprints: async () => ({ ok: true, data: [] }),
  getCultivationMethodBlueprints: async () => ({ ok: true, data: [] }),
  getContainerBlueprints: async () => ({ ok: true, data: [] }),
  getSubstrateBlueprints: async () => ({ ok: true, data: [] }),
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
  world: {
    updateZone: vi.fn(async () => ({ ok: true })),
  },
  ...overrides,
});

describe('ChangeZoneMethodModal', () => {
  beforeEach(() => {
    useSimulationStore.getState().reset();
    useUIStore.setState({ activeModal: null, modalQueue: [], toasts: [] });
    useSimulationStore.getState().hydrate({ snapshot: quickstartSnapshot });
    useSimulationStore.setState((state) => ({
      catalogs: {
        cultivationMethods: { status: 'ready', data: cultivationMethods, error: null },
        containers: { status: 'ready', data: containerCatalog, error: null },
        substrates: { status: 'ready', data: substrateCatalog, error: null },
      },
      snapshot: state.snapshot,
      events: state.events,
      timeStatus: state.timeStatus,
      connectionStatus: state.connectionStatus,
      zoneHistory: state.zoneHistory,
      zoneSetpoints: state.zoneSetpoints,
      lastTick: state.lastTick,
    }));
  });

  afterEach(() => {
    cleanup();
    setStorageHandoffHandler(null);
    useUIStore.setState({ activeModal: null, modalQueue: [], toasts: [] });
    useSimulationStore.getState().reset();
  });

  it('requests storage confirmation before dispatching update', async () => {
    const updateZone = vi.fn(async () => ({ ok: true }));
    const bridge = buildBridge({ world: { updateZone } } as Partial<SimulationBridge>);
    const storageStub = vi.fn(async () => true);
    setStorageHandoffHandler(storageStub);

    render(<ModalHost bridge={bridge} />);

    act(() => {
      useUIStore.getState().openModal({
        id: 'change-method-zone-c',
        type: 'changeZoneMethod',
        title: 'Change method',
        context: { zoneId: 'zone-c' },
      });
    });

    const methodSelect = await screen.findByRole('combobox', { name: 'New method' });
    fireEvent.change(methodSelect, { target: { value: 'method-sog' } });

    const containerSelect = await screen.findByRole('combobox', { name: 'Container' });
    const containerOptions = within(containerSelect).getAllByRole('option');
    expect(containerOptions).toHaveLength(1);
    expect(containerOptions[0]).toHaveTextContent('Flood Table');

    const substrateSelect = screen.getByRole('combobox', { name: 'Substrate' });
    const substrateOptions = within(substrateSelect).getAllByRole('option');
    expect(substrateOptions).toHaveLength(1);
    expect(substrateOptions[0]).toHaveTextContent('Coco Blend');

    expect(storageStub).not.toHaveBeenCalled();
  });

  it('clamps container count to the calculated maximum and submits consumable payload', async () => {
    const updateZone = vi.fn(async () => ({ ok: true }));
    const bridge = buildBridge({ world: { updateZone } } as Partial<SimulationBridge>);
    setStorageHandoffHandler(async () => true);

    useSimulationStore.setState((state) => ({
      catalogs: state.catalogs,
      snapshot: state.snapshot
        ? {
            ...state.snapshot,
            zones: state.snapshot.zones.map((zone) =>
              zone.id === 'zone-c' ? { ...zone, area: 5 } : zone,
            ),
          }
        : state.snapshot,
      events: state.events,
      timeStatus: state.timeStatus,
      connectionStatus: state.connectionStatus,
      zoneHistory: state.zoneHistory,
      zoneSetpoints: state.zoneSetpoints,
      lastTick: state.lastTick,
    }));

    render(<ModalHost bridge={bridge} />);

    act(() => {
      useUIStore.getState().openModal({
        id: 'change-method-zone-c',
        type: 'changeZoneMethod',
        title: 'Change method',
        context: { zoneId: 'zone-c' },
      });
    });

    const methodSelect = await screen.findByRole('combobox', { name: 'New method' });
    fireEvent.change(methodSelect, { target: { value: 'method-scrog' } });

    const countInput = await screen.findByRole('spinbutton', { name: 'Container count' });
    fireEvent.change(countInput, { target: { value: '50' } });
    expect(countInput).toHaveValue(15);

    const applyButton = screen.getByRole('button', { name: 'Apply changes' });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(updateZone).toHaveBeenCalledWith({
        zoneId: 'zone-c',
        methodId: 'method-scrog',
        container: { blueprintId: 'container-pot-10l', type: 'pot', count: 15 },
        substrate: { blueprintId: 'substrate-soil-single', type: 'soil', volumeLiters: 150 },
      });
    });
  });

  it('disables confirmation when the container cannot fit within the zone area', async () => {
    setStorageHandoffHandler(async () => true);

    useSimulationStore.setState((state) => ({
      catalogs: state.catalogs,
      snapshot: state.snapshot
        ? {
            ...state.snapshot,
            zones: state.snapshot.zones.map((zone) =>
              zone.id === 'zone-c' ? { ...zone, area: 0.1 } : zone,
            ),
          }
        : state.snapshot,
      events: state.events,
      timeStatus: state.timeStatus,
      connectionStatus: state.connectionStatus,
      zoneHistory: state.zoneHistory,
      zoneSetpoints: state.zoneSetpoints,
      lastTick: state.lastTick,
    }));

    render(<ModalHost bridge={buildBridge()} />);

    act(() => {
      useUIStore.getState().openModal({
        id: 'change-method-zone-c',
        type: 'changeZoneMethod',
        title: 'Change method',
        context: { zoneId: 'zone-c' },
      });
    });

    const warning = await screen.findByText(/Selected container cannot fit/);
    expect(warning).toBeVisible();

    const applyButton = screen.getByRole('button', { name: 'Apply changes' });
    expect(applyButton).toBeDisabled();
  });
});
