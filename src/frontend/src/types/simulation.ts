export interface SimulationEnvironmentState {
  temperature: number;
  relativeHumidity: number;
  co2: number;
  ppfd: number;
  vpd: number;
}

export interface ZoneResourceSnapshot {
  waterLiters: number;
  nutrientSolutionLiters: number;
  nutrientStrength: number;
  substrateHealth: number;
  reservoirLevel: number;
}

export interface DeviceMaintenanceSnapshot {
  lastServiceTick: number;
  nextDueTick: number;
  condition: number;
  degradation: number;
}

export interface DeviceSnapshot {
  id: string;
  blueprintId: string;
  kind: string;
  name: string;
  zoneId: string;
  status: 'operational' | 'maintenance' | 'offline' | 'failed';
  efficiency: number;
  runtimeHours: number;
  maintenance: DeviceMaintenanceSnapshot;
  settings: Record<string, unknown>;
}

export interface ZoneHealthSnapshot {
  diseases: number;
  pests: number;
  pendingTreatments: number;
  appliedTreatments: number;
  reentryRestrictedUntilTick?: number;
  preHarvestRestrictedUntilTick?: number;
}

export interface PlantSnapshot {
  id: string;
  strainId: string;
  stage: string;
  health: number;
  stress: number;
  biomassDryGrams: number;
  yieldDryGrams: number;
  zoneId?: string;
  structureId?: string;
  roomId?: string;
}

export interface ZoneSnapshot {
  id: string;
  name: string;
  structureId: string;
  structureName: string;
  roomId: string;
  roomName: string;
  environment: SimulationEnvironmentState;
  resources: ZoneResourceSnapshot;
  metrics: {
    averageTemperature: number;
    averageHumidity: number;
    averageCo2: number;
    averagePpfd: number;
    stressLevel: number;
    lastUpdatedTick: number;
  };
  devices: DeviceSnapshot[];
  plants: PlantSnapshot[];
  health: ZoneHealthSnapshot;
}

export interface RoomSnapshot {
  id: string;
  name: string;
  structureId: string;
  structureName: string;
  purposeId: string;
  area: number;
  height: number;
  volume: number;
  cleanliness: number;
  maintenanceLevel: number;
  zoneIds: string[];
}

export interface StructureSnapshot {
  id: string;
  name: string;
  status: 'active' | 'underConstruction' | 'decommissioned';
  footprint: {
    length: number;
    width: number;
    height: number;
    area: number;
    volume: number;
  };
  rentPerTick: number;
  roomIds: string[];
}

export interface EmployeeSnapshot {
  id: string;
  name: string;
  role: string;
  salaryPerTick: number;
  morale: number;
  energy: number;
  status: string;
  assignedStructureId?: string;
}

export interface ApplicantSnapshot {
  id: string;
  name: string;
  desiredRole: string;
  expectedSalary: number;
}

export interface PersonnelSnapshot {
  employees: EmployeeSnapshot[];
  applicants: ApplicantSnapshot[];
  overallMorale: number;
}

export interface FinanceSummarySnapshot {
  cashOnHand: number;
  reservedCash: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  lastTickRevenue: number;
  lastTickExpenses: number;
}

export interface SimulationSnapshot {
  tick: number;
  clock: {
    tick: number;
    isPaused: boolean;
    targetTickRate: number;
  };
  structures: StructureSnapshot[];
  rooms: RoomSnapshot[];
  zones: ZoneSnapshot[];
  personnel: PersonnelSnapshot;
  finance: FinanceSummarySnapshot;
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

export interface SimulationUpdateEntry {
  tick: number;
  ts: number;
  durationMs?: number;
  phaseTimings?: Record<string, { startedAt: number; completedAt: number; durationMs: number }>;
  events: SimulationEvent[];
  snapshot: SimulationSnapshot;
  time: SimulationTimeStatus;
}

export interface SimulationUpdateMessage {
  updates: SimulationUpdateEntry[];
}

export interface SimulationTimeStatus {
  running: boolean;
  paused: boolean;
  speed: number;
  tick: number;
  targetTickRate: number;
}

export interface SimulationTickEvent {
  type?: 'sim.tickCompleted';
  tick: number;
  ts: number;
  durationMs?: number;
  queuedTicks?: number;
  eventCount?: number;
}

export type SimulationControlCommand =
  | { action: 'play'; gameSpeed?: number; maxTicksPerFrame?: number }
  | { action: 'pause' }
  | { action: 'resume' }
  | { action: 'step'; ticks?: number }
  | { action: 'fastForward'; multiplier: number };

export type SimulationConfigUpdate =
  | { requestId?: string; type: 'tickLength'; minutes: number }
  | {
      requestId?: string;
      type: 'setpoint';
      zoneId: string;
      metric: 'temperature' | 'relativeHumidity' | 'co2' | 'ppfd' | 'vpd';
      value: number;
    };

export interface FacadeIntentCommand {
  domain: 'world' | 'devices' | 'plants' | 'health' | 'workforce' | 'finance';
  action: string;
  payload?: Record<string, unknown>;
  requestId?: string;
}

export type DomainEventPayload = SimulationEvent | Record<string, unknown>;
