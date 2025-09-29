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

export const cultivationMethodPriceSchema = z.object({
  setupCost: z.number(),
});

export const cultivationMethodPricesSchema = z
  .object({
    version: z.string().optional(),
    cultivationMethodPrices: z.record(z.string().uuid(), cultivationMethodPriceSchema),
  })
  .passthrough();

export type CultivationMethodPriceEntry = z.infer<typeof cultivationMethodPriceSchema>;
export type CultivationMethodPriceMap = z.infer<
  typeof cultivationMethodPricesSchema
>['cultivationMethodPrices'];

export const substratePriceSchema = z
  .object({
    costPerSquareMeter: z.number().optional(),
    costPerLiter: z.number().optional(),
  })
  .refine((value) => value.costPerSquareMeter !== undefined || value.costPerLiter !== undefined, {
    message: 'substrate price must include costPerSquareMeter or costPerLiter',
  });

export const containerPriceSchema = z.object({
  costPerUnit: z.number(),
});

export const consumablePricesSchema = z
  .object({
    version: z.string().optional(),
    substrates: z.record(z.string().min(1), substratePriceSchema),
    containers: z.record(z.string().min(1), containerPriceSchema),
  })
  .passthrough();

export type SubstratePriceEntry = z.infer<typeof substratePriceSchema>;
export type ContainerPriceEntry = z.infer<typeof containerPriceSchema>;
export type ConsumablePriceLedger = z.infer<typeof consumablePricesSchema>;

export const utilityPricesSchema = z
  .object({
    version: z.string().optional(),
    pricePerKwh: z.number(),
    pricePerLiterWater: z.number(),
    pricePerGramNutrients: z.number(),
  })
  .passthrough();

export type UtilityPrices = z.infer<typeof utilityPricesSchema>;
