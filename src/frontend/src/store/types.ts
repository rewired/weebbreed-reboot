import type {
  DeviceSnapshot,
  FacadeIntentCommand,
  FinanceSummarySnapshot,
  PlantSnapshot,
  PersonnelSnapshot,
  RoomSnapshot,
  SimulationConfigUpdate,
  SimulationControlCommand,
  SimulationEvent,
  SimulationSnapshot,
  SimulationTickEvent,
  SimulationTimeStatus,
  SimulationUpdateEntry,
  StructureSnapshot,
  ZoneSnapshot,
} from '@/types/simulation';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export type NavigationView = 'overview' | 'world' | 'personnel' | 'finance' | 'settings';

export interface SimulationTimelineEntry {
  tick: number;
  ts: number;
  zoneId?: string;
  temperature?: number;
  humidity?: number;
  vpd?: number;
  co2?: number;
  ppfd?: number;
}

export interface FinanceTickEntry {
  tick: number;
  ts: number;
  revenue: number;
  expenses: number;
  netIncome: number;
  capex: number;
  opex: number;
  utilities: {
    totalCost: number;
    energy: number;
    water: number;
    nutrients: number;
  };
  maintenanceTotal: number;
  maintenanceDetails: MaintenanceExpenseEntry[];
}

export interface MaintenanceExpenseEntry {
  deviceId: string;
  blueprintId: string;
  totalCost: number;
  degradationMultiplier: number;
}

export interface GameStoreState {
  connectionStatus: ConnectionStatus;
  lastError?: string;
  events: SimulationEvent[];
  timeStatus?: SimulationTimeStatus;
  lastTickCompleted?: SimulationTickEvent;
  lastSnapshotTick?: number;
  lastSnapshotTimestamp?: number;
  lastClockSnapshot?: SimulationSnapshot['clock'];
  lastRequestedTickLength?: number;
  sendControlCommand?: (command: SimulationControlCommand) => void;
  sendConfigUpdate?: (update: SimulationConfigUpdate) => void;
  setConnectionStatus: (status: ConnectionStatus, errorMessage?: string) => void;
  ingestUpdate: (update: SimulationUpdateEntry) => void;
  appendEvents: (events: SimulationEvent[]) => void;
  registerTickCompleted: (event: SimulationTickEvent) => void;
  setCommandHandlers: (
    control: (command: SimulationControlCommand) => void,
    config: (update: SimulationConfigUpdate) => void,
  ) => void;
  issueControlCommand: (command: SimulationControlCommand) => void;
  requestTickLength: (minutes: number) => void;
  reset: () => void;
}

export interface ZoneStoreState {
  structures: Record<string, StructureSnapshot>;
  rooms: Record<string, RoomSnapshot>;
  zones: Record<string, ZoneSnapshot>;
  devices: Record<string, DeviceSnapshot>;
  plants: Record<string, PlantSnapshot>;
  timeline: SimulationTimelineEntry[];
  financeSummary?: FinanceSummarySnapshot;
  financeHistory: FinanceTickEntry[];
  lastSnapshotTimestamp?: number;
  lastSnapshotTick?: number;
  lastSetpoints: Record<string, number | undefined>;
  sendConfigUpdate?: (update: SimulationConfigUpdate) => void;
  sendFacadeIntent?: (intent: FacadeIntentCommand) => void;
  ingestUpdate: (update: SimulationUpdateEntry) => void;
  recordFinanceTick: (entry: FinanceTickEntry) => void;
  setConfigHandler: (handler: (update: SimulationConfigUpdate) => void) => void;
  setIntentHandler: (handler: (intent: FacadeIntentCommand) => void) => void;
  sendSetpoint: (
    zoneId: string,
    metric: 'temperature' | 'relativeHumidity' | 'co2' | 'ppfd' | 'vpd',
    value: number,
  ) => void;
  issueFacadeIntent: (intent: FacadeIntentCommand) => void;
  updateStructureName: (structureId: string, name: string) => void;
  updateRoomName: (roomId: string, name: string) => void;
  updateZoneName: (zoneId: string, name: string) => void;
  duplicateRoom: (roomId: string) => void;
  duplicateZone: (zoneId: string) => void;
  removeStructure: (structureId: string) => void;
  removeRoom: (roomId: string) => void;
  removeZone: (zoneId: string) => void;
  applyWater: (zoneId: string, liters: number) => void;
  applyNutrients: (zoneId: string, nutrients: { N: number; P: number; K: number }) => void;
  toggleDeviceGroup: (zoneId: string, deviceKind: string, enabled: boolean) => void;
  harvestPlanting: (plantingId: string) => void;
  harvestPlantings: (plantingIds: string[]) => void;
  togglePlantingPlan: (zoneId: string, enabled: boolean) => void;
  reset: () => void;
}

export interface PersonnelStoreState {
  personnel?: PersonnelSnapshot;
  hrEvents: SimulationEvent[];
  ingestUpdate: (update: SimulationUpdateEntry) => void;
  recordHREvent: (event: SimulationEvent) => void;
  reset: () => void;
}

export interface NavigationSlice {
  currentView: NavigationView;
  selectedStructureId?: string;
  selectedRoomId?: string;
  selectedZoneId?: string;
  setCurrentView: (view: NavigationView) => void;
  navigateUp: () => void;
  selectStructure: (structureId?: string) => void;
  selectRoom: (roomId?: string) => void;
  selectZone: (zoneId?: string) => void;
  resetSelection: () => void;
}

export type ModalKind =
  | 'settings'
  | 'installDevice'
  | 'planting'
  | 'automationPlan'
  | 'treatment'
  | 'createEntity'
  | 'updateEntity'
  | 'deleteEntity'
  | 'custom';

export interface ModalDescriptor {
  kind: ModalKind;
  title?: string;
  description?: string;
  payload?: Record<string, unknown>;
  autoPause?: boolean;
}

export interface ModalSlice {
  activeModal: ModalDescriptor | null;
  wasRunningBeforeModal: boolean;
  openModal: (modal: ModalDescriptor) => void;
  closeModal: () => void;
  setWasRunningBeforeModal: (wasRunning: boolean) => void;
}

export type AppStoreState = NavigationSlice & ModalSlice;
