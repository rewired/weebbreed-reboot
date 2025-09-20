import { z } from 'zod';

export const devicePriceSchema = z.object({
  capitalExpenditure: z.number(),
  baseMaintenanceCostPerTick: z.number(),
  costIncreasePer1000Ticks: z.number(),
});

export const devicePricesSchema = z
  .object({
    version: z.string().optional(),
    devicePrices: z.record(z.string().uuid(), devicePriceSchema),
  })
  .passthrough();

export type DevicePriceEntry = z.infer<typeof devicePriceSchema>;
export type DevicePriceMap = z.infer<typeof devicePricesSchema>['devicePrices'];

export const strainPriceSchema = z.object({
  seedPrice: z.number(),
  harvestPricePerGram: z.number(),
});

export const strainPricesSchema = z
  .object({
    version: z.string().optional(),
    strainPrices: z.record(z.string().uuid(), strainPriceSchema),
  })
  .passthrough();

export type StrainPriceEntry = z.infer<typeof strainPriceSchema>;
export type StrainPriceMap = z.infer<typeof strainPricesSchema>['strainPrices'];

export const utilityPricesSchema = z
  .object({
    version: z.string().optional(),
    pricePerKwh: z.number(),
    pricePerLiterWater: z.number(),
    pricePerGramNutrients: z.number(),
  })
  .passthrough();

export type UtilityPrices = z.infer<typeof utilityPricesSchema>;
