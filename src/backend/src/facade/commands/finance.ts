import { z } from 'zod';
import { nonNegativeNumber, positiveNumber, uuid } from './commonSchemas.js';
import {
  createServiceCommand,
  type CommandRegistration,
  type GenericCommandRegistration,
  type MissingCommandHandler,
  type ServiceCommandHandler,
} from './commandRegistry.js';

const sellInventorySchema = z
  .object({
    lotId: uuid,
    grams: nonNegativeNumber,
  })
  .strict();

const setUtilityPricesSchema = z
  .object({
    electricityCostPerKWh: nonNegativeNumber.optional(),
    waterCostPerM3: nonNegativeNumber.optional(),
    nutrientsCostPerKg: nonNegativeNumber.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.electricityCostPerKWh !== undefined ||
      value.waterCostPerM3 !== undefined ||
      value.nutrientsCostPerKg !== undefined,
    { message: 'At least one utility price must be provided.' },
  );

const setMaintenancePolicySchema = z
  .object({
    strategy: z.string().trim().min(1).optional(),
    multiplier: positiveNumber.optional(),
  })
  .strict()
  .refine((value) => value.strategy !== undefined || value.multiplier !== undefined, {
    message: 'At least one maintenance policy field must be provided.',
  });

export type SellInventoryIntent = z.infer<typeof sellInventorySchema>;
export type SetUtilityPricesIntent = z.infer<typeof setUtilityPricesSchema>;
export type SetMaintenancePolicyIntent = z.infer<typeof setMaintenancePolicySchema>;

export interface FinanceIntentHandlers {
  sellInventory: ServiceCommandHandler<SellInventoryIntent>;
  setUtilityPrices: ServiceCommandHandler<SetUtilityPricesIntent>;
  setMaintenancePolicy: ServiceCommandHandler<SetMaintenancePolicyIntent>;
}

export interface FinanceCommandRegistry {
  sellInventory: CommandRegistration<SellInventoryIntent>;
  setUtilityPrices: CommandRegistration<SetUtilityPricesIntent>;
  setMaintenancePolicy: CommandRegistration<SetMaintenancePolicyIntent>;
  [key: string]: GenericCommandRegistration;
}

export interface FinanceCommandOptions {
  services: () => Partial<FinanceIntentHandlers>;
  onMissingHandler: MissingCommandHandler;
}

export const buildFinanceCommands = ({
  services,
  onMissingHandler,
}: FinanceCommandOptions): FinanceCommandRegistry => ({
  sellInventory: createServiceCommand(
    'finance.sellInventory',
    sellInventorySchema,
    () => services().sellInventory,
    onMissingHandler,
  ),
  setUtilityPrices: createServiceCommand(
    'finance.setUtilityPrices',
    setUtilityPricesSchema,
    () => services().setUtilityPrices,
    onMissingHandler,
  ),
  setMaintenancePolicy: createServiceCommand(
    'finance.setMaintenancePolicy',
    setMaintenancePolicySchema,
    () => services().setMaintenancePolicy,
    onMissingHandler,
  ),
});

export const schemas = {
  sellInventorySchema,
  setUtilityPricesSchema,
  setMaintenancePolicySchema,
};
