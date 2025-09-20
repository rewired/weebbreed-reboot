export interface SimulationEnvironmentSnapshot {
  zoneId: string;
  temperature: number;
  humidity: number;
  co2: number;
  ppfd: number;
  vpd?: number;
}

export interface SimulationPlantSnapshot {
  id: string;
  stage: string;
  biomass?: number;
  health?: number;
  zoneId?: string;
  strainId?: string;
}

export interface SimulationEvent {
  type: string;
  severity?: 'debug' | 'info' | 'warning' | 'error';
  message?: string;
  tick?: number;
  ts?: number;
  plantId?: string;
  deviceId?: string;
  zoneId?: string;
  payload?: Record<string, unknown>;
}

export interface SimulationSnapshot {
  type?: 'simulationUpdate';
  tick: number;
  ts: number;
  env?: SimulationEnvironmentSnapshot | SimulationEnvironmentSnapshot[];
  plants?: SimulationPlantSnapshot[];
  events?: SimulationEvent[];
}

export interface SimulationTickEvent {
  type?: 'sim.tickCompleted';
  tick: number;
  ts: number;
  durationMs?: number;
  queuedTicks?: number;
}

export type SimulationControlCommand =
  | { action: 'play' | 'pause' | 'step' | 'fastForward' }
  | { action: 'setTickLength'; minutes: number }
  | { action: 'setSetpoint'; target: string; value: number };

export interface SimulationConfigUpdate {
  scope: string;
  payload: Record<string, unknown>;
}

export type DomainEventPayload = SimulationEvent | Record<string, unknown>;
