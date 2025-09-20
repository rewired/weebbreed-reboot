import { describe, expect, it } from 'vitest';
import { calculatePhotosynthesis, calculateTranspiration, calculateVpd } from '../engine/envPhysics';

describe('envPhysics', () => {
  it('calculates VPD that increases when humidity decreases', () => {
    const vpdHighHumidity = calculateVpd({ temperature: 26, humidity: 0.8 });
    const vpdLowHumidity = calculateVpd({ temperature: 26, humidity: 0.4 });
    expect(vpdLowHumidity).toBeGreaterThan(vpdHighHumidity);
  });

  it('returns zero photosynthesis at zero PPFD', () => {
    const rate = calculatePhotosynthesis({
      ppfd: 0,
      maxPhotosynthesisRate: 20,
      lightResponseCurve: { alpha: 0.05, theta: 0.7 },
      temperatureFactor: 1,
      co2Factor: 1
    });
    expect(rate).toBe(0);
  });

  it('clamps transpiration with higher LAI', () => {
    const lowLai = calculateTranspiration({
      temperature: 25,
      humidity: 0.6,
      leafAreaIndex: 2,
      maxTranspirationRate: 8
    });
    const highLai = calculateTranspiration({
      temperature: 25,
      humidity: 0.6,
      leafAreaIndex: 5,
      maxTranspirationRate: 8
    });
    expect(highLai).toBeLessThanOrEqual(8);
    expect(highLai).toBeGreaterThan(lowLai);
  });
});
