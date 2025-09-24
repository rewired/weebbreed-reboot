/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GlobalStats {
  time: string;
  balance: number;
  dailyOpex: number;
  water: string;
}

export interface Footprint {
  width: number;
  length: number;
  height: number;
}

export interface Structure {
  id: string;
  name: string;
  footprint: Footprint;
  totalArea: number;
  usedArea: number;
  dailyCost: number;
  rooms: Room[];
}

export interface Room {
  id: string;
  name: string;
  purpose: string;
  area: number;
  zones: Zone[];
  occupancy?: { current: number };
  curingBatches?: CuringBatch[];
}

export interface Zone {
  id: string;
  name: string;
  method: string;
  area: number;
  maxPlants: number;
  strain: string;
  phase: string;
  estYield?: number;
  stress: number;
  kpis: KPI[];
  plants: Plant[];
  devices: Device[];
  controls: Controls;
}

export interface KPI {
  title: string;
  value: string;
  unit: string;
  target: number;
  status: 'optimal' | 'warning' | 'danger';
}

export interface Plant {
  id: string;
  name: string;
  stress: number;
  status: string;
  health: number;
  progress: number;
  harvestable: boolean;
}

export interface Device {
  id: string;
  name: string;
  type: string;
}

export interface ControlValue {
  value: number;
  min: number;
  max: number;
  target: number;
}

export interface LightControl {
  power: number;
  on: boolean;
  cycle: string;
}

export interface Controls {
  temperature: ControlValue;
  humidity: ControlValue;
  co2: ControlValue;
  light: LightControl;
}

export interface CuringBatch {
  id: string;
  strain: string;
  yield: number;
  thc: number;
  cbd: number;
  progress: number;
}

export interface AvailableStructure {
  id: string;
  name: string;
  totalArea: number;
  footprint: Footprint;
  cost: number;
}

export interface Employee {
  id: string;
  name: string;
  desiredRole: string;
  assignment: string;
  skills: { [key: string]: number };
  traits: string[];
  expectedSalary: number;
}

export interface Candidate {
  id: string;
  name: string;
  desiredRole: string;
  expectedSalary: number;
  skills: { [key: string]: number };
  traits: string[];
}

export interface FinanceBreakdownItem {
  item: string;
  amount: number;
}

export interface FinanceCategory {
  total: number;
  breakdown: FinanceBreakdownItem[];
}

export interface Finance {
  netIncome7d: number;
  opex7d: number;
  capex7d: number;
  revenue: FinanceCategory;
  opex: FinanceCategory;
  capex: FinanceCategory;
}

export interface EventLogItem {
  time: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
}

export interface GameData {
  globalStats: GlobalStats;
  structures: Structure[];
  availableStructures: AvailableStructure[];
  employees: Employee[];
  candidates: Candidate[];
  finance: Finance;
  events: EventLogItem[];
}

export interface Selection {
  view: 'dashboard' | 'personnel' | 'finance';
  structureId: string | null;
  roomId: string | null;
  zoneId: string | null;
}
