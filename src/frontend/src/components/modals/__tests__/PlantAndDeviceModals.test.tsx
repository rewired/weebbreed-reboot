import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ModalHost } from '../ModalHost';
import { useSimulationStore } from '@/store/simulation';
import { useUIStore } from '@/store/ui';
import type { SimulationBridge } from '@/facade/systemFacade';
import type { SimulationSnapshot } from '@/types/simulation';

const baseSnapshot: SimulationSnapshot = {
  tick: 0,
  clock: {
    tick: 0,
    isPaused: true,
    targetTickRate: 1,
    startedAt: new Date(0).toISOString(),
    lastUpdatedAt: new Date(0).toISOString(),
  },
  structures: [],
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
      zoneIds: ['zone-1'],
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

describe('Plant and Device modals', () => {
  let bridge: SimulationBridge;

  beforeEach(() => {
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
            defaults: { settings: { coverageArea: 1.5, power: 0.7 } },
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
            settings: { coverageArea: 1.5, power: 0.7 },
          },
        ],
      })),
      getDifficultyConfig: vi.fn(async () => ({ ok: true })),
      sendControl: vi.fn(async () => ({ ok: true })),
      sendConfigUpdate: vi.fn(async () => ({ ok: true })),
      sendIntent: vi.fn(async () => ({ ok: true })),
      subscribeToUpdates: () => () => undefined,
      plants: {
        addPlanting: vi.fn(async () => ({
          ok: true,
          warnings: ['Capacity tight, monitor stress.'],
        })),
      },
      devices: {
        installDevice: vi.fn(async () => ({ ok: true, warnings: ['Device load near limit.'] })),
      },
    } satisfies SimulationBridge;

    act(() => {
      useSimulationStore.setState({
        snapshot: structuredClone(baseSnapshot),
        events: [],
        timeStatus: null,
        connectionStatus: 'connected',
        zoneHistory: {},
        lastTick: 0,
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

  it('validates device settings JSON and reports facade warnings', async () => {
    render(<ModalHost bridge={bridge} />);

    act(() => {
      useUIStore.getState().openModal({
        id: 'install-device',
        type: 'installDevice',
        title: 'Install device',
        context: { zoneId: 'zone-1' },
      });
    });

    expect(await screen.findByText(/Covers up to/i)).toBeInTheDocument();

    const textarea = screen.getByLabelText('Settings (JSON)');
    fireEvent.change(textarea, { target: { value: '{"power":' } });
    fireEvent.click(screen.getByRole('button', { name: 'Install device' }));
    expect(await screen.findByText('Settings must be valid JSON.')).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: '{"power":0.5}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Install device' }));

    await screen.findByText('Device load near limit.');
    expect(bridge.devices.installDevice).toHaveBeenCalledWith({
      targetId: 'zone-1',
      deviceId: 'device-1',
      settings: { power: 0.5 },
    });
  });
});
