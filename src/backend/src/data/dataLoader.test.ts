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
    const substratesByType = result.data.substratesByType;
    const containers = result.data.containers;
    const containersByType = result.data.containersByType;
    expect(cultivationMethods.size).toBeGreaterThan(0);
    expect(substrates.size).toBeGreaterThan(0);
    expect(containers.size).toBeGreaterThan(0);
    expect(containersByType.size).toBeGreaterThan(0);

    const substrateSlugs = Array.from(substrates.values()).map((entry) => entry.slug);
    expect(substrateSlugs).toContain('coco-coir');
    const soilSubstrates = substratesByType.get('soil');
    const cocoSubstrates = substratesByType.get('coco');
    expect(soilSubstrates).toBeDefined();
    expect(cocoSubstrates).toBeDefined();
    expect(soilSubstrates?.map((entry) => entry.slug)).toContain('soil-multi-cycle');
    expect(cocoSubstrates?.map((entry) => entry.slug)).toContain('coco-coir');
    const cocoCoir = Array.from(substrates.values()).find((entry) => entry.slug === 'coco-coir');
    expect(cocoCoir?.type).toBe('coco');
    expect(cocoCoir?.meta?.description).toContain('coco coir blend');
    expect(cocoCoir?.meta?.advantages).toContain(
      'Excellent aeration drives rapid root development',
    );

    const potContainers = containersByType.get('pot');
    expect(potContainers).toBeDefined();
    expect(potContainers?.map((entry) => entry.slug)).toEqual(
      expect.arrayContaining(['pot-10l', 'pot-11l', 'pot-25l']),
    );
    const pot10l = Array.from(containers.values()).find((entry) => entry.slug === 'pot-10l');
    expect(pot10l?.meta?.advantages).toContain('Small footprint keeps canopy layouts tight');
    expect(pot10l?.meta?.disadvantages).toContain(
      'Limited root volume for extended vegetative phases',
    );

    const scrog = cultivationMethods.get('41229377-ef2d-4723-931f-72eea87d7a62');
    expect(scrog?.strainTraitCompatibility?.preferred?.['genotype.sativa']?.min).toBe(0.5);
    expect(scrog?.strainTraitCompatibility?.conflicting?.['genotype.indica']?.min).toBe(0.7);
    expect(scrog?.compatibleContainerTypes).toContain('pot');
    expect(scrog?.compatibleSubstrateTypes).toContain('soil');
    expect(scrog?.compatibleSubstrateTypes).toContain('coco');

    const methodPrices = result.data.prices.cultivationMethods;
    expect(methodPrices.get('41229377-ef2d-4723-931f-72eea87d7a62')?.setupCost).toBe(15);

    const substratePrice = result.data.prices.consumables.substrates.get('soil-multi-cycle');
    expect(substratePrice?.costPerLiter).toBe(0.035);
    const cocoPrice = result.data.prices.consumables.substrates.get('coco-coir');
    expect(cocoPrice?.costPerLiter).toBe(0.55);
    const containerPrice = result.data.prices.consumables.containers.get('pot-25l');
    expect(containerPrice?.costPerUnit).toBe(4);

    const sog = cultivationMethods.get('659ba4d7-a5fc-482e-98d4-b614341883ac');
    expect(sog?.strainTraitCompatibility?.preferred?.['photoperiod.vegetationTime']?.max).toBe(
      1_814_400,
    );
    expect(sog?.strainTraitCompatibility?.conflicting?.['photoperiod.vegetationTime']?.min).toBe(
      2_419_200,
    );
    expect(sog?.compatibleContainerTypes).toContain('pot');
    expect(sog?.compatibleSubstrateTypes).toContain('soil');
    expect(sog?.compatibleSubstrateTypes).toContain('coco');
  });
});
