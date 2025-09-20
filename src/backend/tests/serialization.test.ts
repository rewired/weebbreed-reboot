import { describe, expect, it } from 'vitest';
import { createSimulationSnapshot } from '../lib/serialization.js';
import type { SimulationState } from '../../shared/domain.js';

const baseState: SimulationState = {
  tick: 3,
  tickLengthMinutes: 5,
  rngSeed: 'seed',
  zones: [
    {
      id: 'zone-1',
      name: 'Zone 1',
      area: 12,
      height: 3,
      volume: 36,
      ambient: { temperature: 24, humidity: 0.6, co2: 900 },
      environment: { temperature: 26, humidity: 0.55, co2: 950, ppfd: 500, vpd: 1.2 },
      devices: [
        {
          id: 'device-1',
          isActive: true,
          coverageArea: 12,
          blueprint: {
            id: 'bp-1',
            name: 'Test Lamp',
            kind: 'Lamp',
            settings: { power: 0.6, ppfd: 900, coverageArea: 12 }
          }
        }
      ],
      plants: [
        {
          id: 'plant-1',
          strain: {
            id: 'strain-1',
            name: 'Arcade OG',
            environment: {
              temperature: { optMin_C: 22, optMax_C: 28 },
              humidity: { optMin: 0.45, optMax: 0.65 },
              light: { ppfdTarget: 700 }
            }
          },
          stage: 'vegetation',
          ageHours: 120,
          biomassDryGrams: 45,
          health: 0.9,
          stress: 0.1,
          transpiredWater_L: 0.3,
          lastTickPhotosynthesis_g: 1.2
        }
      ],
      irrigationReservoir_L: 40,
      lastIrrigationSatisfaction: 1,
      nutrientSatisfaction: 1,
      lastWaterSupplied_L: 4
    }
  ],
  isPaused: false,
  accumulatedTimeMs: 0
};

describe('serialization', () => {
  it('creates an immutable snapshot of the simulation state', () => {
    const snapshot = createSimulationSnapshot(baseState, { tick: 10, ts: 1234 });

    expect(snapshot.tick).toBe(10);
    expect(snapshot.ts).toBe(1234);
    expect(snapshot.zones).toHaveLength(1);

    const originalZone = baseState.zones[0];
    const clonedZone = snapshot.zones[0];

    expect(clonedZone).not.toBe(originalZone);
    expect(clonedZone.environment).not.toBe(originalZone.environment);
    expect(clonedZone.ambient).not.toBe(originalZone.ambient);
    expect(clonedZone.devices[0]).not.toBe(originalZone.devices[0]);
    expect(clonedZone.devices[0].blueprint).not.toBe(originalZone.devices[0].blueprint);
    expect(clonedZone.devices[0].blueprint.settings).not.toBe(
      originalZone.devices[0].blueprint.settings
    );
    expect(clonedZone.plants[0]).not.toBe(originalZone.plants[0]);
    expect(clonedZone.plants[0].strain).not.toBe(originalZone.plants[0].strain);

    clonedZone.environment.temperature = 99;
    clonedZone.devices[0].blueprint.settings.power = 1.2;
    clonedZone.plants[0].strain.name = 'Mutated';

    expect(originalZone.environment.temperature).toBe(26);
    expect(originalZone.devices[0].blueprint.settings.power).toBe(0.6);
    expect(originalZone.plants[0].strain.name).toBe('Arcade OG');
  });

  it('defaults to state tick when options not provided', () => {
    const snapshot = createSimulationSnapshot(baseState);
    expect(snapshot.tick).toBe(baseState.tick);
  });
});
