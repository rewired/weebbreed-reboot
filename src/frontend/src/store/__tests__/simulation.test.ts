import { beforeEach, describe, expect, it } from 'vitest';

import { useSimulationStore } from '../simulation';
import type {
  SimulationEvent,
  SimulationSnapshot,
  SimulationUpdateEntry,
  ZoneControlSetpoints,
} from '@/types/simulation';

const buildSnapshot = (
  setpoints: Record<string, number | undefined> & {
    humidity?: number;
    relativeHumidity?: number;
  },
  options: { tick?: number } = {},
): SimulationSnapshot => {
  const controlSetpoints: ZoneControlSetpoints & { relativeHumidity?: number } = {
    temperature: setpoints.temperature,
    humidity: setpoints.humidity,
    co2: setpoints.co2,
    ppfd: setpoints.ppfd,
    vpd: setpoints.vpd,
  };

  if (setpoints.relativeHumidity !== undefined) {
    controlSetpoints.relativeHumidity = setpoints.relativeHumidity;
  }

  return {
    tick: options.tick ?? 42,
    clock: {
      tick: options.tick ?? 42,
      isPaused: false,
      targetTickRate: 1,
      startedAt: new Date(0).toISOString(),
      lastUpdatedAt: new Date(0).toISOString(),
    },
    structures: [
      {
        id: 'structure-1',
        name: 'Structure 1',
        status: 'active',
        footprint: {
          length: 1,
          width: 1,
          height: 1,
          area: 1,
          volume: 1,
        },
        rentPerTick: 0,
        roomIds: ['room-1'],
      },
    ],
    rooms: [
      {
        id: 'room-1',
        name: 'Room 1',
        structureId: 'structure-1',
        structureName: 'Structure 1',
        purposeId: 'purpose-1',
        purposeKind: 'veg',
        purposeName: 'Vegetation',
        purposeFlags: {},
        area: 1,
        height: 1,
        volume: 1,
        cleanliness: 1,
        maintenanceLevel: 1,
        zoneIds: ['zone-1'],
      },
    ],
    zones: [
      {
        id: 'zone-1',
        name: 'Zone 1',
        structureId: 'structure-1',
        structureName: 'Structure 1',
        roomId: 'room-1',
        roomName: 'Room 1',
        area: 1,
        ceilingHeight: 1,
        volume: 1,
        environment: {
          temperature: 20,
          relativeHumidity: 0.5,
          co2: 500,
          ppfd: 300,
          vpd: 1,
        },
        resources: {
          waterLiters: 0,
          nutrientSolutionLiters: 0,
          nutrientStrength: 0,
          substrateHealth: 1,
          reservoirLevel: 0,
          lastTranspirationLiters: 0,
        },
        metrics: {
          averageTemperature: 20,
          averageHumidity: 0.5,
          averageCo2: 500,
          averagePpfd: 300,
          stressLevel: 0,
          lastUpdatedTick: 42,
        },
        devices: [],
        plants: [],
        control: {
          setpoints: controlSetpoints,
        },
        health: {
          diseases: 0,
          pests: 0,
          pendingTreatments: 0,
          appliedTreatments: 0,
        },
      },
    ],
    personnel: {
      employees: [],
      applicants: [],
      overallMorale: 1,
    },
    finance: {
      cashOnHand: 0,
      reservedCash: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
      lastTickRevenue: 0,
      lastTickExpenses: 0,
    },
  } as SimulationSnapshot;
};

const buildEvent = (control: Record<string, number | undefined>): SimulationEvent => ({
  type: 'env.setpointUpdated',
  payload: {
    zoneId: 'zone-1',
    control,
  },
});

const snapshotWithoutControl = buildSnapshot({});

const buildUpdate = (
  setpoints: Record<string, number | undefined> & {
    humidity?: number;
    relativeHumidity?: number;
  },
  tick: number,
) =>
  ({
    tick,
    ts: 0,
    snapshot: buildSnapshot(setpoints, { tick }),
    events: [],
    time: {
      running: true,
      paused: false,
      speed: 1,
      tick,
      targetTickRate: 1,
    },
  }) satisfies SimulationUpdateEntry;

describe('simulation store humidity aliases', () => {
  beforeEach(() => {
    useSimulationStore.getState().reset();
  });

  it('hydrates humidity from snapshot regardless of key alias', () => {
    const snapshotWithHumidity = buildSnapshot({ humidity: 0.6 });
    useSimulationStore.getState().hydrate({ snapshot: snapshotWithHumidity });
    const humidityState = structuredClone(useSimulationStore.getState().zoneSetpoints);

    useSimulationStore.getState().reset();

    const snapshotWithRelativeHumidity = buildSnapshot({ relativeHumidity: 0.6 });
    useSimulationStore.getState().hydrate({ snapshot: snapshotWithRelativeHumidity });
    const relativeState = structuredClone(useSimulationStore.getState().zoneSetpoints);

    expect(relativeState).toEqual(humidityState);
    expect(relativeState['zone-1']?.humidity).toBe(0.6);
    expect(relativeState['zone-1']).not.toHaveProperty('relativeHumidity');
  });

  it('applies setpoint events for humidity aliases identically', () => {
    useSimulationStore.getState().hydrate({ snapshot: snapshotWithoutControl });
    useSimulationStore.getState().recordEvents([buildEvent({ relativeHumidity: 0.55 })]);
    const relativeState = structuredClone(useSimulationStore.getState().zoneSetpoints);

    useSimulationStore.getState().reset();

    useSimulationStore.getState().hydrate({ snapshot: snapshotWithoutControl });
    useSimulationStore.getState().recordEvents([buildEvent({ humidity: 0.55 })]);
    const humidityState = structuredClone(useSimulationStore.getState().zoneSetpoints);

    expect(relativeState).toEqual(humidityState);
    expect(relativeState['zone-1']?.humidity).toBe(0.55);
    expect(relativeState['zone-1']).not.toHaveProperty('relativeHumidity');
  });
});

describe('simulation store setpoint tolerances', () => {
  beforeEach(() => {
    useSimulationStore.getState().reset();
  });

  it('keeps previous setpoints when temperature differs only within tolerance', () => {
    useSimulationStore
      .getState()
      .hydrate({ snapshot: buildSnapshot({ temperature: 24 }, { tick: 41 }) });

    const initialSetpoints = useSimulationStore.getState().zoneSetpoints;
    const initialZoneSetpoints = initialSetpoints['zone-1'];

    useSimulationStore.getState().applyUpdate(buildUpdate({ temperature: 24.03 }, 42));

    const nextSetpoints = useSimulationStore.getState().zoneSetpoints;
    expect(nextSetpoints).toBe(initialSetpoints);
    expect(nextSetpoints['zone-1']).toBe(initialZoneSetpoints);
    expect(nextSetpoints['zone-1']?.temperature).toBe(24);
  });

  it('updates setpoints when temperature difference exceeds tolerance', () => {
    useSimulationStore
      .getState()
      .hydrate({ snapshot: buildSnapshot({ temperature: 24 }, { tick: 41 }) });

    const initialSetpoints = useSimulationStore.getState().zoneSetpoints;
    const initialZoneSetpoints = initialSetpoints['zone-1'];

    useSimulationStore.getState().applyUpdate(buildUpdate({ temperature: 24.2 }, 42));

    const nextSetpoints = useSimulationStore.getState().zoneSetpoints;
    expect(nextSetpoints).not.toBe(initialSetpoints);
    expect(nextSetpoints['zone-1']).not.toBe(initialZoneSetpoints);
    expect(nextSetpoints['zone-1']?.temperature).toBeCloseTo(24.2);
  });

  it('treats CO₂ differences within tolerance as equal', () => {
    useSimulationStore.getState().hydrate({ snapshot: buildSnapshot({ co2: 900 }, { tick: 41 }) });

    const initialSetpoints = useSimulationStore.getState().zoneSetpoints;

    useSimulationStore.getState().applyUpdate(buildUpdate({ co2: 904 }, 42));

    const nextSetpoints = useSimulationStore.getState().zoneSetpoints;
    expect(nextSetpoints).toBe(initialSetpoints);
    expect(nextSetpoints['zone-1']?.co2).toBe(900);
  });

  it('recognises PPFD changes beyond tolerance', () => {
    useSimulationStore.getState().hydrate({ snapshot: buildSnapshot({ ppfd: 480 }, { tick: 41 }) });

    const initialSetpoints = useSimulationStore.getState().zoneSetpoints;

    useSimulationStore.getState().applyUpdate(buildUpdate({ ppfd: 484 }, 42));

    const nextSetpoints = useSimulationStore.getState().zoneSetpoints;
    expect(nextSetpoints).not.toBe(initialSetpoints);
    expect(nextSetpoints['zone-1']?.ppfd).toBe(484);
  });
});
