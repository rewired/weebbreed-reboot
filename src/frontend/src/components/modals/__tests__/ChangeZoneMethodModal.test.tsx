// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ModalHost, setStorageHandoffHandler } from '../ModalHost';
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
  },
  {
    id: 'container-pot-10l',
    slug: 'pot-10l',
    name: '10 L Pot',
    type: 'pot',
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
    fireEvent.change(methodSelect, { target: { value: 'method-scrog' } });

    const confirmButton = screen.getByRole('button', { name: 'Apply method' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(updateZone).toHaveBeenCalledWith({ zoneId: 'zone-c', methodId: 'method-scrog' });
    });

    expect(storageStub).toHaveBeenCalledTimes(1);
    expect(storageStub).toHaveBeenCalledWith({
      zoneId: 'zone-c',
      zoneName: 'South Canopy',
      currentMethodId: 'method-basic-pot',
      nextMethodId: 'method-scrog',
      containerName: '10 L Pot',
      substrateName: 'Single-Cycle Soil',
    });
  });

  it('aborts the update when storage confirmation is declined', async () => {
    const updateZone = vi.fn(async () => ({ ok: true }));
    const bridge = buildBridge({ world: { updateZone } } as Partial<SimulationBridge>);
    setStorageHandoffHandler(async () => false);

    render(<ModalHost bridge={bridge} />);

    act(() => {
      useUIStore.getState().openModal({
        id: 'change-method-zone-c',
        type: 'changeZoneMethod',
        title: 'Change method',
        context: { zoneId: 'zone-c' },
      });
    });

    const confirmButton = await screen.findByRole('button', { name: 'Apply method' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(
        screen.getByText('Storage handoff must be confirmed before changing the method.'),
      ).toBeVisible();
    });

    expect(updateZone).not.toHaveBeenCalled();
  });
});
