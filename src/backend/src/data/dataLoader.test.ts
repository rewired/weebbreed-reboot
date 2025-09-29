import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadBlueprintData } from './dataLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixtureDataDirectory = path.resolve(__dirname, '../../../../data');

describe('loadBlueprintData', () => {
  it('validates cultivation method blueprints with compatibility thresholds', async () => {
    const result = await loadBlueprintData(fixtureDataDirectory);

    const cultivationMethods = result.data.cultivationMethods;
    const substrates = result.data.substrates;
    const containers = result.data.containers;
    expect(cultivationMethods.size).toBeGreaterThan(0);
    expect(substrates.size).toBeGreaterThan(0);
    expect(containers.size).toBeGreaterThan(0);

    const scrog = cultivationMethods.get('41229377-ef2d-4723-931f-72eea87d7a62');
    expect(scrog?.strainTraitCompatibility?.preferred?.['genotype.sativa']?.min).toBe(0.5);
    expect(scrog?.strainTraitCompatibility?.conflicting?.['genotype.indica']?.min).toBe(0.7);
    expect(scrog?.compatibleContainerSlugs).toContain('pot-25l');
    expect(scrog?.compatibleSubstrateSlugs).toContain('soil-multi-cycle');

    const methodPrices = result.data.prices.cultivationMethods;
    expect(methodPrices.get('41229377-ef2d-4723-931f-72eea87d7a62')?.setupCost).toBe(15);

    const substratePrice = result.data.prices.consumables.substrates.get('soil-multi-cycle');
    expect(substratePrice?.costPerSquareMeter).toBe(3.5);
    const containerPrice = result.data.prices.consumables.containers.get('pot-25l');
    expect(containerPrice?.costPerUnit).toBe(4);

    const sog = cultivationMethods.get('659ba4d7-a5fc-482e-98d4-b614341883ac');
    expect(sog?.strainTraitCompatibility?.preferred?.['photoperiod.vegetationTime']?.max).toBe(
      1_814_400,
    );
    expect(sog?.strainTraitCompatibility?.conflicting?.['photoperiod.vegetationTime']?.min).toBe(
      2_419_200,
    );
    expect(sog?.compatibleContainerSlugs).toContain('pot-11l');
    expect(sog?.compatibleSubstrateSlugs).toContain('soil-multi-cycle');
  });
});
