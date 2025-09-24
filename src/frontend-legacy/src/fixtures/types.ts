export interface ClickDummyGlobalStats {
  time: string;
  balance: number;
  dailyOpex: number;
  water: string;
}

export interface ClickDummyFootprint {
  width: number;
  length: number;
  height: number;
}

export interface ClickDummyDevice {
  id: string;
  name: string;
  type: string;
}

export interface ClickDummyControlValue {
  value: number;
  min: number;
  max: number;
  target: number;
}

export interface ClickDummyLightControl {
  power: number;
  on: boolean;
  cycle: string;
}

export interface ClickDummyControls {
  temperature: ClickDummyControlValue;
  humidity: ClickDummyControlValue;
  co2: ClickDummyControlValue;
  light: ClickDummyLightControl;
}

export interface ClickDummyPlant {
  id: string;
  name: string;
  stress: number;
  status: string;
  health: number;
  progress: number;
  harvestable: boolean;
}

export interface ClickDummyKpi {
  title: string;
  value: string;
  unit: string;
  target: number;
  status: 'optimal' | 'warning' | 'danger';
}

export interface ClickDummyZone {
  id: string;
  name: string;
  method: string;
  area: number;
  maxPlants: number;
  strain: string;
  phase: string;
  estYield?: number;
  stress: number;
  kpis: ClickDummyKpi[];
  plants: ClickDummyPlant[];
  devices: ClickDummyDevice[];
  controls: ClickDummyControls;
}

export interface ClickDummyCuringBatch {
  id: string;
  strain: string;
  yield: number;
  thc: number;
  cbd: number;
  progress: number;
}

export interface ClickDummyRoom {
  id: string;
  name: string;
  purpose: string;
  area: number;
  zones: ClickDummyZone[];
  occupancy?: { current: number };
  curingBatches?: ClickDummyCuringBatch[];
}

export interface ClickDummyStructure {
  id: string;
  name: string;
  footprint: ClickDummyFootprint;
  totalArea: number;
  usedArea: number;
  dailyCost: number;
  rooms: ClickDummyRoom[];
}

export interface ClickDummyAvailableStructure {
  id: string;
  name: string;
  totalArea: number;
  footprint: ClickDummyFootprint;
  cost: number;
}

export interface ClickDummyEmployee {
  id: string;
  name: string;
  desiredRole: string;
  assignment: string;
  skills: Record<string, number>;
  traits: string[];
  expectedSalary: number;
}

export interface ClickDummyCandidate {
  id: string;
  name: string;
  desiredRole: string;
  expectedSalary: number;
  skills: Record<string, number>;
  traits: string[];
}

export interface ClickDummyFinanceBreakdownItem {
  item: string;
  amount: number;
}

export interface ClickDummyFinanceCategory {
  total: number;
  breakdown: ClickDummyFinanceBreakdownItem[];
}

export interface ClickDummyFinance {
  netIncome7d: number;
  opex7d: number;
  capex7d: number;
  revenue: ClickDummyFinanceCategory;
  opex: ClickDummyFinanceCategory;
  capex: ClickDummyFinanceCategory;
}

export interface ClickDummyEventLogItem {
  time: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
}

export interface ClickDummyGameData {
  globalStats: ClickDummyGlobalStats;
  structures: ClickDummyStructure[];
  availableStructures: ClickDummyAvailableStructure[];
  employees: ClickDummyEmployee[];
  candidates: ClickDummyCandidate[];
  finance: ClickDummyFinance;
  events: ClickDummyEventLogItem[];
}
