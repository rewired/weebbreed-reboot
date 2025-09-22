import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import type { PriceCatalog } from './pricing.js';

export const createPriceCatalogFromRepository = (repository: BlueprintRepository): PriceCatalog => {
  const devicePrices = new Map(repository.listDevicePrices());
  const strainPrices = new Map(repository.listStrainPrices());
  const utilityPrices = repository.getUtilityPrices();

  return {
    devicePrices,
    strainPrices,
    utilityPrices: {
      pricePerKwh: utilityPrices.pricePerKwh,
      pricePerLiterWater: utilityPrices.pricePerLiterWater,
      pricePerGramNutrients: utilityPrices.pricePerGramNutrients,
    },
  };
};
