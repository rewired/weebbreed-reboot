import { describe, expect, it } from 'vitest';
import {
  calculateVpd,
  accumulateDeviceEffects,
  applyEnvironmentDelta
} from '../engine/envPhysics.js';
import type { DeviceInstance, ZoneEnvironmentState } from '../../shared/domain.js';

const baseEnvironment: ZoneEnvironmentState = {
  temperature: 25,
  humidity: 0.6,
  co2: 900,
  ppfd: 0,
  vpd: 0
};

describe('envPhysics', () => {
  it('calculates higher VPD when humidity drops', () => {
    const vpdHighHumidity = calculateVpd(25, 0.8);
    const vpdLowHumidity = calculateVpd(25, 0.4);
    expect(vpdLowHumidity).toBeGreaterThan(vpdHighHumidity);
  });

  it('applies lamp coverage limits', () => {
    const device: DeviceInstance = {
      id: 'test-lamp',
      isActive: true,
      coverageArea: 4,
      blueprint: {
        id: 'lamp',
        name: 'Lamp',
        kind: 'Lamp',
        settings: { power: 0.5, ppfd: 1000, coverageArea: 4 }
      }
    };
    const delta = accumulateDeviceEffects([device], baseEnvironment, {
      tickHours: 1,
      zoneVolume: 30,
      zoneArea: 9
    });
    const updated = applyEnvironmentDelta(baseEnvironment, delta);
    expect(updated.ppfd).toBeLessThan(1000);
  });
});
