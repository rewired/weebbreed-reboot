import type {
  SimulationConfigUpdate,
  SimulationControlCommand,
  SimulationEvent,
  SimulationSnapshot,
  SimulationTickEvent,
  SimulationEnvironmentSnapshot,
  SimulationPlantSnapshot,
} from '../types/simulation';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export type NavigationView = 'overview' | 'zones' | 'plants' | 'devices' | 'settings';

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

export interface SimulationSlice {
  connectionStatus: ConnectionStatus;
  lastError?: string;
  lastSnapshot?: SimulationSnapshot;
  zones: Record<string, SimulationEnvironmentSnapshot>;
  plants: Record<string, SimulationPlantSnapshot>;
  events: SimulationEvent[];
  timeline: SimulationTimelineEntry[];
  lastTickCompleted?: SimulationTickEvent;
  lastRequestedTickLength?: number;
  lastSetpoints: Record<string, number | undefined>;
  setConnectionStatus: (status: ConnectionStatus, errorMessage?: string) => void;
  ingestSnapshot: (snapshot: SimulationSnapshot) => void;
  appendEvents: (events: SimulationEvent[]) => void;
  registerTickCompleted: (event: SimulationTickEvent) => void;
  resetSimulation: () => void;
  sendControlCommand?: (command: SimulationControlCommand) => void;
  sendConfigUpdate?: (update: SimulationConfigUpdate) => void;
  issueControlCommand: (command: SimulationControlCommand) => void;
  requestTickLength: (minutes: number) => void;
  sendSetpoint: (target: string, value: number) => void;
  setCommandHandlers: (
    control: (command: SimulationControlCommand) => void,
    config: (update: SimulationConfigUpdate) => void,
  ) => void;
}

export interface NavigationSlice {
  currentView: NavigationView;
  history: NavigationView[];
  setCurrentView: (view: NavigationView) => void;
  goBack: () => void;
  clearHistory: () => void;
}

export type ModalKind = 'settings' | 'snapshot' | 'custom';

export interface ModalDescriptor {
  kind: ModalKind;
  title?: string;
  description?: string;
  payload?: Record<string, unknown>;
}

export interface ModalSlice {
  activeModal: ModalDescriptor | null;
  openModal: (modal: ModalDescriptor) => void;
  closeModal: () => void;
}

export type AppStoreState = SimulationSlice & NavigationSlice & ModalSlice;
