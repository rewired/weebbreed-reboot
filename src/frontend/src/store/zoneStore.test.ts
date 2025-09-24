import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SimulationUpdateEntry, ZoneSnapshot } from '@/types/simulation';

type CreateUpdateOptions = {
  tick?: number;
  ts?: number;
  zone?: Partial<ZoneSnapshot>;
};

const createUpdate = (options: CreateUpdateOptions = {}): SimulationUpdateEntry => {
  const { tick = 1, ts = Date.now(), zone: zoneOverrides = {} } = options;
  const zoneId = zoneOverrides.id ?? 'zone-1';
  const structureId = zoneOverrides.structureId ?? 'structure-1';
  const structureName = zoneOverrides.structureName ?? 'North Wing';
  const roomId = zoneOverrides.roomId ?? 'room-1';
  const roomName = zoneOverrides.roomName ?? 'Propagation';

  const zone: ZoneSnapshot = {
    id: zoneId,
    name: zoneOverrides.name ?? 'Zone 1',
    structureId,
    structureName,
    roomId,
    roomName,
    area: zoneOverrides.area ?? 120,
    ceilingHeight: zoneOverrides.ceilingHeight ?? 4.2,
    volume: zoneOverrides.volume ?? 504,
    cultivationMethodId: zoneOverrides.cultivationMethodId ?? 'method-1',
    environment:
      zoneOverrides.environment ??
      ({
        temperature: 24,
        relativeHumidity: 0.62,
        co2: 820,
        ppfd: 640,
        vpd: 1.18,
      } satisfies ZoneSnapshot['environment']),
    resources:
      zoneOverrides.resources ??
      ({
        waterLiters: 520,
        nutrientSolutionLiters: 260,
        nutrientStrength: 0.78,
        substrateHealth: 0.92,
        reservoirLevel: 0.74,
        lastTranspirationLiters: 4.6,
      } satisfies ZoneSnapshot['resources']),
    metrics:
      zoneOverrides.metrics ??
      ({
        averageTemperature: 24,
        averageHumidity: 0.62,
        averageCo2: 820,
        averagePpfd: 640,
        stressLevel: 0.12,
        lastUpdatedTick: tick,
      } satisfies ZoneSnapshot['metrics']),
    devices: zoneOverrides.devices ?? [],
    plants: zoneOverrides.plants ?? [],
    health:
      zoneOverrides.health ??
      ({
        diseases: 0,
        pests: 0,
        pendingTreatments: 0,
        appliedTreatments: 0,
      } satisfies ZoneSnapshot['health']),
    lighting: zoneOverrides.lighting,
    supplyStatus: zoneOverrides.supplyStatus,
    plantingGroups: zoneOverrides.plantingGroups ?? [],
    plantingPlan: zoneOverrides.plantingPlan ?? null,
    deviceGroups: zoneOverrides.deviceGroups ?? [],
  } satisfies ZoneSnapshot;

  return {
    tick,
    ts,
    events: [],
    snapshot: {
      tick,
      clock: {
        tick,
        isPaused: false,
        targetTickRate: 1,
        startedAt: new Date(ts - 60_000).toISOString(),
        lastUpdatedAt: new Date(ts).toISOString(),
      },
      structures: [
        {
          id: structureId,
          name: structureName,
          status: 'active',
          footprint: {
            length: 30,
            width: 18,
            height: 6,
            area: 540,
            volume: 3240,
          },
          rentPerTick: 0,
          roomIds: [roomId],
        },
      ],
      rooms: [
        {
          id: roomId,
          name: roomName,
          structureId,
          structureName,
          purposeId: 'grow',
          purposeKind: 'grow',
          purposeName: 'Grow room',
          purposeFlags: {},
          area: 180,
          height: 6,
          volume: 1080,
          cleanliness: 0.95,
          maintenanceLevel: 0.96,
          zoneIds: [zoneId],
        },
      ],
      zones: [zone],
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
    },
    time: {
      running: true,
      paused: false,
      speed: 1,
      tick,
      targetTickRate: 1,
    },
  } satisfies SimulationUpdateEntry;
};

describe('zoneStore timeline handling', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('deduplicates timeline entries that share the same zone, tick, and timestamp', async () => {
    const { useZoneStore } = await import('./zoneStore');
    const sharedTs = 1_736_258_400_000;

    useZoneStore.getState().ingestUpdate(
      createUpdate({
        tick: 158,
        ts: sharedTs,
        zone: {
          environment: {
            temperature: 24,
            relativeHumidity: 0.6,
            co2: 800,
            ppfd: 620,
            vpd: 1.1,
          },
        },
      }),
    );

    let timeline = useZoneStore.getState().timeline;
    expect(timeline).toHaveLength(1);

    useZoneStore.getState().ingestUpdate(
      createUpdate({
        tick: 158,
        ts: sharedTs,
        zone: {
          environment: {
            temperature: 26,
            relativeHumidity: 0.55,
            co2: 900,
            ppfd: 680,
            vpd: 1.32,
          },
        },
      }),
    );

    timeline = useZoneStore.getState().timeline;
    expect(timeline).toHaveLength(1);
    expect(timeline[0]).toMatchObject({
      tick: 158,
      ts: sharedTs,
      temperature: 26,
      humidity: 0.55,
      co2: 900,
      ppfd: 680,
      vpd: 1.32,
    });
  });
});
