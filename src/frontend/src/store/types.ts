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

export interface NavigationZoneNode {
  id: string;
  name: string;
  roomId: string;
  structureId: string;
  temperature: number;
}

export interface NavigationRoomNode {
  id: string;
  name: string;
  structureId: string;
  zoneCount: number;
  zones: NavigationZoneNode[];
}

export interface NavigationStructureNode {
  id: string;
  name: string;
  roomCount: number;
  zoneCount: number;
  rooms: NavigationRoomNode[];
}

export interface NavigationCounts {
  structures: number;
  rooms: number;
  zones: number;
  employees: number;
  applicants: number;
}

export interface NavigationViewItem {
  id: NavigationView;
  label: string;
  badge?: string | number;
  disabled?: boolean;
  tooltip?: string;
}

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
  hasLiveTransport: boolean;
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
  setTransportAvailability: (available: boolean) => void;
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
  duplicateRoom: (roomId: string, options?: { name?: string }) => void;
  duplicateZone: (
    zoneId: string,
    options?: { name?: string; includeDevices?: boolean; includeMethod?: boolean },
  ) => void;
  duplicateStructure: (structureId: string, options?: { name?: string }) => void;
  rentStructure: (structureId: string) => void;
  createRoom: (
    structureId: string,
    options: { name: string; purposeId: string; area: number; height?: number },
  ) => void;
  createZone: (
    roomId: string,
    options: { name: string; area: number; methodId?: string; targetPlantCount?: number },
  ) => void;
  removeStructure: (structureId: string) => void;
  removeRoom: (roomId: string) => void;
  removeZone: (zoneId: string) => void;
  applyWater: (zoneId: string, liters: number) => void;
  applyNutrients: (zoneId: string, nutrients: { N: number; P: number; K: number }) => void;
  toggleDeviceGroup: (zoneId: string, deviceKind: string, enabled: boolean) => void;
  installDevice: (
    zoneId: string,
    deviceId: string,
    options?: { settings?: Record<string, unknown> },
  ) => void;
  updateDevice: (deviceId: string, settings: Record<string, unknown>) => void;
  moveDevice: (deviceId: string, targetZoneId: string) => void;
  removeDevice: (deviceId: string) => void;
  harvestPlanting: (plantingId: string) => void;
  harvestPlantings: (plantingIds: string[]) => void;
  togglePlantingPlan: (zoneId: string, enabled: boolean) => void;
  reset: () => void;
}

export interface PersonnelStoreState {
  personnel?: PersonnelSnapshot;
  hrEvents: SimulationEvent[];
  sendFacadeIntent?: (intent: FacadeIntentCommand) => void;
  ingestUpdate: (update: SimulationUpdateEntry) => void;
  recordHREvent: (event: SimulationEvent) => void;
  setIntentHandler: (handler: (intent: FacadeIntentCommand) => void) => void;
  hireCandidate: (candidateId: string, options?: { role?: string; wage?: number }) => void;
  fireEmployee: (employeeId: string) => void;
  refreshCandidates: () => void;
  reset: () => void;
}

export interface NavigationSlice {
  currentView: NavigationView;
  selectedStructureId?: string;
  selectedRoomId?: string;
  selectedZoneId?: string;
  navigationItems: NavigationViewItem[];
  structureHierarchy: NavigationStructureNode[];
  facilityCounts: NavigationCounts;
  setCurrentView: (view: NavigationView) => void;
  navigateUp: () => void;
  selectStructure: (structureId?: string) => void;
  selectRoom: (roomId?: string) => void;
  selectZone: (zoneId?: string) => void;
  resetSelection: () => void;
}

export type ModalSize = 'sm' | 'md' | 'lg';

type ModalDescriptorBase<TKind extends string, TPayload = undefined> = {
  kind: TKind;
  title?: string;
  description?: string;
  autoPause?: boolean;
  size?: ModalSize;
} & (TPayload extends undefined ? { payload?: undefined } : { payload: TPayload });

export type HireEmployeeModalDescriptor = ModalDescriptorBase<
  'hireEmployee',
  { candidateId: string }
>;

export type FireEmployeeModalDescriptor = ModalDescriptorBase<
  'fireEmployee',
  { employeeId: string }
>;

export type CreateRoomModalDescriptor = ModalDescriptorBase<'createRoom', { structureId: string }>;

export type CreateZoneModalDescriptor = ModalDescriptorBase<'createZone', { roomId: string }>;

export type DuplicateRoomModalDescriptor = ModalDescriptorBase<'duplicateRoom', { roomId: string }>;

export type DuplicateZoneModalDescriptor = ModalDescriptorBase<'duplicateZone', { zoneId: string }>;

export type DuplicateStructureModalDescriptor = ModalDescriptorBase<
  'duplicateStructure',
  { structureId: string }
>;

export type RentStructureModalDescriptor = ModalDescriptorBase<
  'rentStructure',
  { structureId: string }
>;

export type RenameStructureModalDescriptor = ModalDescriptorBase<
  'renameStructure',
  { structureId: string }
>;

export type RenameRoomModalDescriptor = ModalDescriptorBase<'renameRoom', { roomId: string }>;

export type RenameZoneModalDescriptor = ModalDescriptorBase<'renameZone', { zoneId: string }>;

export type DeleteStructureModalDescriptor = ModalDescriptorBase<
  'deleteStructure',
  { structureId: string }
>;

export type DeleteRoomModalDescriptor = ModalDescriptorBase<'deleteRoom', { roomId: string }>;

export type DeleteZoneModalDescriptor = ModalDescriptorBase<'deleteZone', { zoneId: string }>;

export type PlantDetailModalDescriptor = ModalDescriptorBase<'plantDetails', { plantId: string }>;

export type InstallDeviceModalDescriptor = ModalDescriptorBase<'installDevice', { zoneId: string }>;

export type UpdateDeviceModalDescriptor = ModalDescriptorBase<'updateDevice', { deviceId: string }>;

export type MoveDeviceModalDescriptor = ModalDescriptorBase<'moveDevice', { deviceId: string }>;

export type RemoveDeviceModalDescriptor = ModalDescriptorBase<'removeDevice', { deviceId: string }>;

export type ModalDescriptor =
  | HireEmployeeModalDescriptor
  | FireEmployeeModalDescriptor
  | CreateRoomModalDescriptor
  | CreateZoneModalDescriptor
  | DuplicateRoomModalDescriptor
  | DuplicateZoneModalDescriptor
  | DuplicateStructureModalDescriptor
  | RentStructureModalDescriptor
  | RenameStructureModalDescriptor
  | RenameRoomModalDescriptor
  | RenameZoneModalDescriptor
  | DeleteStructureModalDescriptor
  | DeleteRoomModalDescriptor
  | DeleteZoneModalDescriptor
  | PlantDetailModalDescriptor
  | InstallDeviceModalDescriptor
  | UpdateDeviceModalDescriptor
  | MoveDeviceModalDescriptor
  | RemoveDeviceModalDescriptor;

export type ModalKind = ModalDescriptor['kind'];

export interface ModalSlice {
  activeModal: ModalDescriptor | null;
  wasRunningBeforeModal: boolean;
  openModal: (modal: ModalDescriptor) => void;
  closeModal: () => void;
}

export type AppStoreState = NavigationSlice & ModalSlice;
