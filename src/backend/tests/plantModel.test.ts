import { describe, expect, it } from 'vitest';
import { createPlantInstance, updatePlant } from '../engine/plantModel.js';
import type { Strain, ZoneEnvironmentState } from '../../shared/domain.js';

const strain: Strain = {
  id: 'test-strain',
  name: 'Test Strain',
  growthModel: {
    baseLUE_gPerMol: 0.8,
    maxBiomassDry_g: 150
  },
  environmentalPreferences: {
    idealTemperature: {
      vegetation: [22, 28]
    },
    idealHumidity: {
      vegetation: [0.5, 0.7]
    },
    lightIntensity: {
      vegetation: [400, 800]
    }
  },
  waterDemand: {
    dailyWaterUsagePerSquareMeter: {
      vegetation: 0.3
    }
  },
  photoperiod: {
    vegetationDays: 28,
    floweringDays: 56
  }
};

describe('plantModel', () => {
  it('yields near-zero growth when PPFD is zero', () => {
    const plant = createPlantInstance(strain);
    plant.stage = 'vegetation';
    const environment: ZoneEnvironmentState = {
      temperature: 25,
      humidity: 0.6,
      co2: 900,
      ppfd: 0,
      vpd: 0.5
    };
    const result = updatePlant({ plant, zoneArea: 10, environment, tickHours: 1 }, 1);
    expect(result.updatedPlant.lastTickPhotosynthesis_g).toBeLessThan(0.01);
  });

  it('increases stress when humidity deviates strongly', () => {
    const plant = createPlantInstance(strain);
    plant.stage = 'vegetation';
    const humidEnvironment: ZoneEnvironmentState = {
      temperature: 25,
      humidity: 0.6,
      co2: 900,
      ppfd: 600,
      vpd: 0.8
    };
    const dryEnvironment: ZoneEnvironmentState = {
      ...humidEnvironment,
      humidity: 0.2,
      vpd: 2
    };
    const baseline = updatePlant({ plant, zoneArea: 10, environment: humidEnvironment, tickHours: 1 }, 1);
    const stressed = updatePlant({ plant: baseline.updatedPlant, zoneArea: 10, environment: dryEnvironment, tickHours: 1 }, 1);
    expect(stressed.updatedPlant.stress).toBeGreaterThan(baseline.updatedPlant.stress);
  });
});
