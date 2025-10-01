import { describe, expect, it } from 'vitest';
import {
  cloneControl,
  cloneCultivation,
  cloneDeviceFailureModifiers,
  cloneEnvironment,
  cloneMetrics,
  clonePlantStressModifiers,
  createDefaultResources,
  createEmptyHealth,
  deepCloneSettings,
  defaultMaintenanceIntervalTicks,
  deriveDuplicateName,
} from './worldDefaults.js';
import {
  DEFAULT_MAINTENANCE_INTERVAL_TICKS,
  DEFAULT_ZONE_NUTRIENT_LITERS,
  DEFAULT_ZONE_RESERVOIR_LEVEL,
  DEFAULT_ZONE_WATER_LITERS,
} from '@/constants/world.js';

const baseMetrics = {
  averageTemperature: 23,
  averageHumidity: 0.55,
  averageCo2: 900,
  averagePpfd: 450,
  stressLevel: 0.2,
  lastUpdatedTick: 5,
} as const;

describe('deriveDuplicateName', () => {
  it('appends copy suffix when name is simple text', () => {
    expect(deriveDuplicateName('Blue Dream', '(fallback)')).toBe('Blue Dream Copy');
  });

  it('returns trimmed fallback when original is blank', () => {
    expect(deriveDuplicateName('   ', '(fallback)')).toBe('(fallback)');
  });

  it('returns original when it already references copy', () => {
    expect(deriveDuplicateName('Existing Copy', '(fallback)')).toBe('Existing Copy');
  });
});

describe('cloneMetrics', () => {
  it('creates a new metrics object with updated tick', () => {
    const input = { ...baseMetrics };
    const result = cloneMetrics(input, 42);

    expect(result).toEqual({ ...input, lastUpdatedTick: 42 });
    expect(result).not.toBe(input);
    expect(input.lastUpdatedTick).toBe(5);
  });
});

describe('cloneCultivation', () => {
  it('returns undefined when cultivation is missing', () => {
    expect(cloneCultivation(undefined)).toBeUndefined();
  });

  it('clones optional container and substrate objects only when present', () => {
    const cultivation = {
      container: { volumeLiters: 50, material: 'plastic' },
      substrate: { type: 'coco', ph: 6.2 },
    } as const;

    const result = cloneCultivation(cultivation);

    expect(result).toEqual({
      container: { volumeLiters: 50, material: 'plastic' },
      substrate: { type: 'coco', ph: 6.2 },
    });
    expect(result).not.toBe(cultivation);
    expect(result?.container).not.toBe(cultivation.container);
    expect(result?.substrate).not.toBe(cultivation.substrate);
  });

  it('handles cultivation objects with missing pieces', () => {
    const cultivation = {
      container: { volumeLiters: 30 },
    } as const;

    const result = cloneCultivation(cultivation);

    expect(result).toEqual({ container: { volumeLiters: 30 } });
    expect(result?.container).not.toBe(cultivation.container);
    expect(result?.substrate).toBeUndefined();
  });
});

describe('createDefaultResources', () => {
  it('uses the configured defaults and produces a fresh object', () => {
    const first = createDefaultResources();
    const second = createDefaultResources();

    expect(first).toEqual({
      waterLiters: DEFAULT_ZONE_WATER_LITERS,
      nutrientSolutionLiters: DEFAULT_ZONE_NUTRIENT_LITERS,
      nutrientStrength: 1,
      substrateHealth: 1,
      reservoirLevel: DEFAULT_ZONE_RESERVOIR_LEVEL,
      lastTranspirationLiters: 0,
    });
    expect(second).not.toBe(first);
  });
});

describe('createEmptyHealth', () => {
  it('returns isolated arrays and maps each time', () => {
    const first = createEmptyHealth();
    const second = createEmptyHealth();

    expect(first).toEqual({ plantHealth: {}, pendingTreatments: [], appliedTreatments: [] });
    expect(second).toEqual(first);
    expect(second.pendingTreatments).not.toBe(first.pendingTreatments);
    expect(second.appliedTreatments).not.toBe(first.appliedTreatments);
    expect(second.plantHealth).not.toBe(first.plantHealth);
  });
});

describe('cloneEnvironment', () => {
  it('clones environment readings without mutating the original', () => {
    const environment = {
      temperature: 24,
      relativeHumidity: 0.6,
      co2: 950,
      ppfd: 500,
      vpd: 1.1,
    } as const;

    const result = cloneEnvironment(environment);

    expect(result).toEqual(environment);
    expect(result).not.toBe(environment);
  });
});

describe('cloneControl', () => {
  it('returns empty setpoints when control is undefined', () => {
    expect(cloneControl(undefined)).toEqual({ setpoints: {} });
  });

  it('clones setpoints while tolerating undefined values', () => {
    const control = {
      setpoints: {
        temperature: 24,
        humidity: undefined,
        co2: 900,
        ppfd: 500,
        vpd: undefined,
      },
    } as const;

    const result = cloneControl(control);

    expect(result).toEqual({ setpoints: { ...control.setpoints } });
    expect(result).not.toBe(control);
    expect(result.setpoints).not.toBe(control.setpoints);
  });
});

describe('clonePlantStressModifiers', () => {
  it('creates a shallow copy of stress modifiers', () => {
    const modifiers = {
      optimalRangeMultiplier: 0.9,
      stressAccumulationMultiplier: 1.1,
    } as const;

    const result = clonePlantStressModifiers(modifiers);

    expect(result).toEqual(modifiers);
    expect(result).not.toBe(modifiers);
  });
});

describe('cloneDeviceFailureModifiers', () => {
  it('duplicates modifier values without sharing references', () => {
    const modifiers = {
      mtbfMultiplier: 1.5,
    } as const;

    const result = cloneDeviceFailureModifiers(modifiers);

    expect(result).toEqual(modifiers);
    expect(result).not.toBe(modifiers);
  });
});

describe('deepCloneSettings', () => {
  it('performs a deep clone for nested settings structures', () => {
    const settings = {
      name: 'complex device',
      levels: [1, 2, { step: 3 }],
      nested: { enable: true, thresholds: { min: 0.1, max: 0.9 } },
    };

    const result = deepCloneSettings(settings);

    expect(result).toEqual(settings);
    expect(result).not.toBe(settings);
    expect(result.levels).not.toBe(settings.levels);
    expect(result.nested).not.toBe(settings.nested);
    expect(result.levels[2]).not.toBe(settings.levels[2]);
    expect(result.nested.thresholds).not.toBe(settings.nested.thresholds);
  });
});

describe('defaultMaintenanceIntervalTicks', () => {
  it('matches the exported constant', () => {
    expect(defaultMaintenanceIntervalTicks).toBe(DEFAULT_MAINTENANCE_INTERVAL_TICKS);
  });
});
