import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import type { DeviceBlueprint } from '@/data/schemas/index.js';
import type {
  EconomicsSettings,
  FinanceState,
  FinancialSummary,
  LedgerEntry,
  StructureBlueprint,
} from '../models.js';
import type { RngStream } from '@/lib/rng.js';
import { DevicePriceRegistry } from '@/engine/economy/devicePriceRegistry.js';
import { generateId } from './common.js';

const sumDeviceCapitalCosts = (
  devices: DeviceBlueprint[],
  registry: DevicePriceRegistry,
): number => {
  return devices.reduce((sum, device) => {
    const price = registry.require(device.id, {
      context: 'computing initial device capital expenditure',
      blueprintName: device.name,
    });
    return sum + price.capitalExpenditure;
  }, 0);
};

export const createFinanceState = (
  createdAt: string,
  economics: EconomicsSettings,
  blueprint: StructureBlueprint | undefined,
  installedDevices: DeviceBlueprint[],
  repository: BlueprintRepository,
  idStream: RngStream,
): FinanceState => {
  const utilityPrices = repository.getUtilityPrices();
  const ledgerEntries: LedgerEntry[] = [];
  const addEntry = (
    entry: Omit<LedgerEntry, 'id' | 'tick' | 'timestamp'> & { tick?: number; timestamp?: string },
  ) => {
    ledgerEntries.push({
      id: generateId(idStream, 'ledger'),
      tick: entry.tick ?? 0,
      timestamp: entry.timestamp ?? createdAt,
      amount: entry.amount,
      type: entry.type,
      category: entry.category,
      description: entry.description,
    });
  };

  addEntry({
    amount: economics.initialCapital,
    type: 'income',
    category: 'capital',
    description: 'Initial capital injection',
  });

  if (blueprint && blueprint.upfrontFee > 0) {
    addEntry({
      amount: -blueprint.upfrontFee,
      type: 'expense',
      category: 'structure',
      description: `Lease upfront payment for ${blueprint.name}`,
    });
  }

  const devicePriceRegistry = DevicePriceRegistry.fromRepository(repository);
  const deviceCosts = sumDeviceCapitalCosts(installedDevices, devicePriceRegistry);
  if (deviceCosts > 0) {
    addEntry({
      amount: -deviceCosts,
      type: 'expense',
      category: 'device',
      description: 'Initial device purchases',
    });
  }

  const upfrontFee = blueprint?.upfrontFee ?? 0;
  const cashOnHand = economics.initialCapital - upfrontFee - deviceCosts;
  const totalExpenses = upfrontFee + deviceCosts;

  const summary: FinancialSummary = {
    totalRevenue: economics.initialCapital,
    totalExpenses,
    totalPayroll: 0,
    totalMaintenance: 0,
    netIncome: economics.initialCapital - totalExpenses,
    lastTickRevenue: economics.initialCapital,
    lastTickExpenses: totalExpenses,
  };

  return {
    cashOnHand,
    reservedCash: 0,
    outstandingLoans: [],
    ledger: ledgerEntries,
    summary,
    utilityPrices: {
      pricePerKwh: utilityPrices.pricePerKwh,
      pricePerLiterWater: utilityPrices.pricePerLiterWater,
      pricePerGramNutrients: utilityPrices.pricePerGramNutrients,
    },
  };
};

export { sumDeviceCapitalCosts };
