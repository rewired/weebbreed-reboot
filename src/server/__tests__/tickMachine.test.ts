import { describe, expect, it } from 'vitest';
import type { SimulationState } from '../../shared/types/simulation';
import { runTick } from '../engine/tickMachine';
import { loadBlueprints } from '../loaders/blueprintLoader';
import type { TickContext } from '../engine/types';

const createState = async (): Promise<{ state: SimulationState; context: TickContext }> => {
  const bundle = await loadBlueprints();
  const strain = bundle.strains[0];
  if (!strain) {
    throw new Error('No strain blueprint available');
  }
  const lamp = bundle.devices.find((device) => device.kind.toLowerCase().includes('lamp')) ?? bundle.devices[0];
  const zoneId = 'zone-test';
  const plantId = 'plant-test';
  const deviceId = 'device-test';

  const state: SimulationState = {
    clock: {
      tick: 0,
      tickLengthMinutes: 1,
      lastTickCompletedAt: Date.now(),
      isRunning: false
    },
    zones: {
      [zoneId]: {
        id: zoneId,
        name: 'Test Zone',
        area: 4,
        volume: 12,
        environment: {
          temperature: 24,
          humidity: 0.6,
          co2: 420,
          ppfd: 0,
          vpd: 0
        },
        deviceIds: [deviceId],
        plantIds: [plantId]
      }
    },
    plants: {
      [plantId]: {
        id: plantId,
        strainId: strain.id,
        stage: 'seedling',
        ageDays: 0,
        biomassDryGrams: 1,
        health: 1,
        stress: 0,
        lastGrowthRate: 0
      }
    },
    devices: {
      [deviceId]: {
        id: deviceId,
        blueprintId: lamp.id,
        zoneId,
        isActive: true,
        coverageArea: lamp.coverageArea_m2 ?? 4
      }
    }
  };

  const context: TickContext = {
    simulation: state,
    blueprints: {
      strains: new Map(bundle.strains.map((item) => [item.id, item])),
      devices: new Map(bundle.devices.map((item) => [item.id, item]))
    },
    tickHours: state.clock.tickLengthMinutes / 60,
    events: [],
    ambient: {
      temperature: 22,
      humidity: 0.55,
      co2: 420
    },
    setpoints: {}
  };

  return { state, context };
};

describe('tickMachine', () => {
  it('runs through phases and commits at the end of the tick', async () => {
    const { context } = await createState();
    const result = runTick(context);
    expect(result?.snapshot.clock.tick).toBe(1);
    expect(context.events[0]?.type).toBe('zone.irrigationPlanned');
    expect(context.events.some((event) => event.type === 'finance.tick')).toBe(true);
  });
});
