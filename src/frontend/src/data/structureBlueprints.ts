export interface StructureBlueprintOption {
  id: string;
  name: string;
  area: number;
  description: string;
  upfrontFee: number;
  rentalCostPerSqmPerMonth: number;
}

export const structureBlueprintOptions: StructureBlueprintOption[] = [
  {
    id: 'd96dd659-4678-4d5d-a97c-a590ab52c2f2',
    name: 'Shed',
    area: 30,
    description: 'Compact outbuilding suited for pilot grows and early research runs.',
    upfrontFee: 50,
    rentalCostPerSqmPerMonth: 1,
  },
  {
    id: '43ee4095-627d-4a0c-860b-b10affbcf603',
    name: 'Small Warehouse',
    area: 400,
    description: 'Baseline warehouse footprint for deterministic quick-start scenarios.',
    upfrontFee: 500,
    rentalCostPerSqmPerMonth: 10,
  },
  {
    id: '59ec5597-42f5-4e52-acb9-cb65d68fd72d',
    name: 'Medium Warehouse',
    area: 2400,
    description: 'Expanded floor area supporting multi-room production with buffer zones.',
    upfrontFee: 1500,
    rentalCostPerSqmPerMonth: 10,
  },
];
