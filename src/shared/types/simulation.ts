export type PhaseName =
  | 'applyDevices'
  | 'deriveEnvironment'
  | 'irrigationAndNutrients'
  | 'updatePlants'
  | 'harvestAndInventory'
  | 'accounting'
  | 'commit';

export interface SimulationClock {
  tick: number;
  tickLengthMinutes: number;
  lastTickCompletedAt: number;
  isRunning: boolean;
}

export interface EnvironmentState {
  temperature: number; // °C
  humidity: number; // 0..1
  co2: number; // ppm
  ppfd: number; // µmol m^-2 s^-1
  vpd: number; // kPa
}

export interface ZoneState {
  id: string;
  name: string;
  area: number; // m^2
  volume: number; // m^3
  environment: EnvironmentState;
  deviceIds: string[];
  plantIds: string[];
}

export interface PlantState {
  id: string;
  strainId: string;
  stage: PlantStage;
  ageDays: number;
  biomassDryGrams: number;
  health: number;
  stress: number;
  lastGrowthRate: number;
}

export type PlantStage = 'seedling' | 'vegetation' | 'flowering' | 'harvested';

export interface DeviceState {
  id: string;
  blueprintId: string;
  zoneId: string;
  isActive: boolean;
  coverageArea: number;
}

export interface SimulationState {
  clock: SimulationClock;
  zones: Record<string, ZoneState>;
  plants: Record<string, PlantState>;
  devices: Record<string, DeviceState>;
}

export interface SimulationSnapshot {
  clock: SimulationClock;
  zones: ZoneState[];
  plants: PlantState[];
  devices: DeviceState[];
}

export interface SimulationEventPayload<TPayload = unknown> {
  type: string;
  tick: number;
  ts: number;
  payload: TPayload;
  level?: 'info' | 'warn' | 'error';
}

export interface SimulationUpdateMessage {
  type: 'simulationUpdate';
  tick: number;
  ts: number;
  env: Array<{
    zoneId: string;
    temperature: number;
    humidity: number;
    co2: number;
    ppfd: number;
    vpd: number;
  }>;
  plants: Array<{
    id: string;
    stage: PlantStage;
    biomass: number;
    health: number;
    stress: number;
  }>;
  events: Array<{ type: string; level?: 'info' | 'warn' | 'error'; [key: string]: unknown }>;
}
