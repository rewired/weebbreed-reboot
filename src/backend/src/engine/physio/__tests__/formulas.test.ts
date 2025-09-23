import { describe, expect, it } from 'vitest';
import {
  actualVaporPressure,
  saturationVaporPressure,
  vaporPressureDeficit,
} from '@/engine/physio/vpd.js';
import { lightSaturationResponse, ppfdToMoles } from '@/engine/physio/ppfd.js';
import { approachTemperature } from '@/engine/physio/temp.js';
import { approachRelativeHumidity } from '@/engine/physio/rh.js';
import { approachCo2, co2HalfSaturationResponse } from '@/engine/physio/co2.js';
import { estimateTranspirationLiters } from '@/engine/physio/transpiration.js';

const EPSILON = 1e-6;

describe('physio formulas', () => {
  it('computes vapor pressure deficit with consistent saturation pressure', () => {
    const saturation = saturationVaporPressure(25);
    const actual = actualVaporPressure(25, 0.6);
    const vpd = vaporPressureDeficit(25, 0.6);

    expect(Math.abs(saturation - 3.1677777175068473)).toBeLessThan(EPSILON);
    expect(Math.abs(actual - 1.9006666305041082)).toBeLessThan(EPSILON);
    expect(Math.abs(vpd - 1.2671110870027391)).toBeLessThan(EPSILON);
  });

  it('integrates PPFD and applies saturation response', () => {
    const mol = ppfdToMoles(500, 1);
    const response = lightSaturationResponse(600, 300);

    expect(Math.abs(mol - 1.8)).toBeLessThan(EPSILON);
    expect(Math.abs(response - 0.6666666667)).toBeLessThan(1e-9);
  });

  it('approaches ambient conditions for temperature, humidity, and CO2', () => {
    const mixedTemperature = approachTemperature(28, 22, 0.2, 0.5);
    const mixedHumidity = approachRelativeHumidity(0.35, 0.6, 0.1, 1);
    const mixedCo2 = approachCo2(950, 420, 0.3, 0.25);

    expect(Math.abs(mixedTemperature - 27.429024508215758)).toBeLessThan(1e-9);
    expect(Math.abs(mixedHumidity - 0.3737906454910101)).toBeLessThan(1e-9);
    expect(Math.abs(mixedCo2 - 911.704047754133)).toBeLessThan(1e-9);
  });

  it('computes CO2 half-saturation response', () => {
    const response = co2HalfSaturationResponse(1000, 600);
    expect(Math.abs(response - 0.625)).toBeLessThan(EPSILON);
  });

  it('estimates transpiration from canopy conductance', () => {
    const liters = estimateTranspirationLiters({
      vpdKPa: 1.2,
      canopyAreaM2: 0.4,
      leafAreaIndex: 3,
      durationHours: 0.25,
      stomatalFactor: 0.75,
    });
    expect(Math.abs(liters - 0.046655999999999996)).toBeLessThan(1e-9);
  });
});
