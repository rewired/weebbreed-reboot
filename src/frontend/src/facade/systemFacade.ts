import { io, type Socket } from 'socket.io-client';
import { SOCKET_PATH, SOCKET_URL, buildBackendReachabilityMessage } from '@/config/socket';
import type {
  FacadeIntentCommand,
  SimulationConfigUpdate,
  SimulationControlCommand,
  SimulationEvent,
  SimulationTimeStatus,
  SimulationUpdateEntry,
} from '@/types/simulation';
import { useSimulationStore } from '@/store/simulation';
import type { DifficultyConfig } from '@/types/difficulty';
import type {
  CultivationMethodCatalogEntry,
  ContainerCatalogEntry,
  SubstrateCatalogEntry,
} from '@/types/blueprints';

type CommandError = {
  code?: string;
  message: string;
  path?: (string | number)[];
};

type CommandResponse<T> = {
  ok: boolean;
  data?: T;
  warnings?: string[];
  errors?: CommandError[];
  requestId?: string;
};

type PendingResolver<T> = {
  resolve: (response: CommandResponse<T>) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type ResultEvent = 'simulationControl.result' | 'config.update.result' | 'facade.intent.result';

const QUICKSTART_STRUCTURE_ID = '43ee4095-627d-4a0c-860b-b10affbcf603';
const REQUEST_TIMEOUT_MS = 15_000;
const INITIAL_RECONNECT_DELAY = 1_000;
const MAX_RECONNECT_DELAY = 30_000;
const QUICKSTART_HELP_SUFFIX = ' See README.md (Getting Started) for setup steps.';

export interface StructureBlueprint {
  id: string;
  name: string;
  footprint: {
    length: number;
    width: number;
    height: number;
  };
  rentalCostPerSqmPerMonth: number;
  upfrontFee: number;
}

export interface StrainCompatibilityHints {
  methodAffinity: Record<string, number>;
  stressTolerance?: Record<string, number>;
}

export interface StrainDefaultSettings {
  envBands?: Record<string, unknown>;
  phaseDurations?: Record<string, unknown>;
  photoperiod?: Record<string, unknown>;
  nutrientDemand?: Record<string, unknown>;
  waterDemand?: Record<string, unknown>;
  growthModel?: Record<string, unknown>;
  yieldModel?: Record<string, unknown>;
}

export interface StrainTraits {
  morphology?: Record<string, unknown>;
  noise?: Record<string, unknown>;
}

export interface StrainPriceEntry {
  seedPrice: number;
  harvestPricePerGram: number;
}

export interface StrainBlueprint {
  id: string;
  slug: string;
  name: string;
  lineage: Record<string, unknown>;
  genotype: Record<string, unknown>;
  chemotype: Record<string, unknown>;
  generalResilience: number;
  germinationRate: number;
  compatibility: StrainCompatibilityHints;
  defaults: StrainDefaultSettings;
  traits: StrainTraits;
  metadata?: Record<string, unknown>;
  price?: StrainPriceEntry;
  methodAffinity?: Record<string, number>;
}

export interface DeviceCompatibilityHints {
  roomPurposes: string[];
}

export interface DeviceDefaultSettings {
  settings: Record<string, unknown>;
  coverage?: Record<string, unknown>;
  limits?: Record<string, unknown>;
}

export interface DevicePriceEntry {
  capitalExpenditure: number;
  baseMaintenanceCostPerTick: number;
  costIncreasePer1000Ticks: number;
}

export interface DeviceCoverageMetadata {
  maxArea_m2?: number;
  coverageArea?: number;
  [key: string]: unknown;
}

export interface DeviceBlueprint {
  id: string;
  kind: string;
  name: string;
  quality: number;
  complexity: number;
  lifetimeHours: number;
  capexEur?: number;
  efficiencyDegeneration?: number;
  compatibility: DeviceCompatibilityHints;
  defaults: DeviceDefaultSettings;
  maintenance?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  price?: DevicePriceEntry;
  roomPurposes?: string[];
  coverage?: DeviceCoverageMetadata;
  limits?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export type CultivationMethodBlueprint = CultivationMethodCatalogEntry;
export type ContainerBlueprint = ContainerCatalogEntry;
export type SubstrateBlueprint = SubstrateCatalogEntry;

export interface AddPlantingOptions {
  zoneId: string;
  strainId: string;
  count: number;
  startTick?: number;
}

export interface PlantingResult {
  plantIds: string[];
  warnings?: string[];
}

export interface HarvestPlantOptions {
  plantId: string;
}

export interface HarvestPlantResult {
  plantId: string;
  zoneId: string;
  roomId: string;
  structureId: string;
  harvestBatchId: string;
  weightGrams: number;
  quality: number;
  warnings?: string[];
}

export interface CullPlantOptions {
  plantId: string;
}

export interface CullPlantResult {
  plantId: string;
  zoneId: string;
  roomId: string;
  structureId: string;
  stage: string;
  warnings?: string[];
}

export interface InstallDeviceOptions {
  targetId: string;
  deviceId: string;
  settings?: Record<string, unknown>;
}

export interface DeviceInstallationResult {
  deviceId: string;
  warnings?: string[];
}

export interface AdjustLightingCycleOptions {
  zoneId: string;
  photoperiodHours: { on: number; off: number };
}

export interface AdjustLightingCycleResult {
  photoperiodHours: { on: number; off: number };
}

export interface MoveDeviceOptions {
  instanceId: string;
  targetZoneId: string;
}

export interface RemoveDeviceOptions {
  instanceId: string;
}

export interface SimulationBridge {
  connect: () => void;
  loadQuickStart: () => Promise<CommandResponse<unknown>>;
  getStructureBlueprints: () => Promise<CommandResponse<StructureBlueprint[]>>;
  getStrainBlueprints: () => Promise<CommandResponse<StrainBlueprint[]>>;
  getDeviceBlueprints: () => Promise<CommandResponse<DeviceBlueprint[]>>;
  getCultivationMethodBlueprints: () => Promise<CommandResponse<CultivationMethodBlueprint[]>>;
  getContainerBlueprints: () => Promise<CommandResponse<ContainerBlueprint[]>>;
  getSubstrateBlueprints: () => Promise<CommandResponse<SubstrateBlueprint[]>>;
  getDifficultyConfig: () => Promise<CommandResponse<DifficultyConfig>>;
  sendControl: (
    command: SimulationControlCommand,
  ) => Promise<CommandResponse<SimulationTimeStatus | undefined>>;
  sendConfigUpdate: (
    update: SimulationConfigUpdate,
  ) => Promise<CommandResponse<SimulationTimeStatus | undefined>>;
  sendIntent: <T = unknown>(intent: FacadeIntentCommand) => Promise<CommandResponse<T>>;
  subscribeToUpdates: (handler: (update: SimulationUpdateEntry) => void) => () => void;
  plants: {
    addPlanting: (options: AddPlantingOptions) => Promise<CommandResponse<PlantingResult>>;
    harvestPlant: (options: HarvestPlantOptions) => Promise<CommandResponse<HarvestPlantResult>>;
    cullPlant: (options: CullPlantOptions) => Promise<CommandResponse<CullPlantResult>>;
  };
  devices: {
    installDevice: (
      options: InstallDeviceOptions,
    ) => Promise<CommandResponse<DeviceInstallationResult>>;
    adjustLightingCycle: (
      options: AdjustLightingCycleOptions,
    ) => Promise<CommandResponse<AdjustLightingCycleResult>>;
    moveDevice: (options: MoveDeviceOptions) => Promise<CommandResponse<unknown>>;
    removeDevice: (options: RemoveDeviceOptions) => Promise<CommandResponse<unknown>>;
  };
}

const generateRequestId = () =>
  typeof crypto !== 'undefined' ? crypto.randomUUID() : `req_${Date.now()}`;

const isSimulationUpdateMessage = (
  payload: unknown,
): payload is { updates: SimulationUpdateEntry[] } =>
  Boolean(
    payload &&
      typeof payload === 'object' &&
      Array.isArray((payload as { updates?: unknown }).updates),
  );

const extractEvents = (payload: unknown): SimulationEvent[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }
  const events = (payload as { events?: unknown }).events;
  return Array.isArray(events) ? (events as SimulationEvent[]) : [];
};

class SocketSystemFacade implements SimulationBridge {
  private socket: Socket | null = null;

  private readonly updateHandlers = new Set<(update: SimulationUpdateEntry) => void>();

  private readonly pending: Map<string, PendingResolver<unknown>> = new Map();

  private reconnectDelay = INITIAL_RECONNECT_DELAY;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private isConnecting = false;

  private async refreshCatalogs(): Promise<void> {
    const store = useSimulationStore.getState();
    const updateCatalog = store.setCatalogStatus;

    const loaders: Array<
      [
        'cultivationMethods' | 'containers' | 'substrates',
        () => Promise<
          CommandResponse<
            CultivationMethodBlueprint[] | ContainerBlueprint[] | SubstrateBlueprint[]
          >
        >,
      ]
    > = [
      ['cultivationMethods', () => this.getCultivationMethodBlueprints()],
      ['containers', () => this.getContainerBlueprints()],
      ['substrates', () => this.getSubstrateBlueprints()],
    ];

    for (const [catalog, loader] of loaders) {
      updateCatalog(catalog, 'loading');
      try {
        const response = await loader();
        if (response.ok && Array.isArray(response.data)) {
          updateCatalog(catalog, 'ready', { data: response.data, error: null });
        } else {
          const message =
            response.errors?.[0]?.message ?? response.warnings?.[0] ?? 'Failed to load catalog.';
          updateCatalog(catalog, 'error', { error: message });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        updateCatalog(catalog, 'error', { error: message });
      }
    }
  }

  readonly plants = {
    addPlanting: async (options: AddPlantingOptions) => {
      this.requireConnected();
      const payload = {
        zoneId: options.zoneId,
        strainId: options.strainId,
        count: options.count,
        ...(options.startTick !== undefined ? { startTick: options.startTick } : {}),
      } satisfies FacadeIntentCommand['payload'];
      const intent: FacadeIntentCommand = {
        domain: 'plants',
        action: 'addPlanting',
        payload,
      };
      return this.sendIntent<PlantingResult>(intent);
    },
    harvestPlant: async (options: HarvestPlantOptions) => {
      this.requireConnected();
      const payload = {
        plantId: options.plantId,
      } satisfies FacadeIntentCommand['payload'];
      const intent: FacadeIntentCommand = {
        domain: 'plants',
        action: 'harvestPlant',
        payload,
      };
      return this.sendIntent<HarvestPlantResult>(intent);
    },
    cullPlant: async (options: CullPlantOptions) => {
      this.requireConnected();
      const payload = {
        plantId: options.plantId,
      } satisfies FacadeIntentCommand['payload'];
      const intent: FacadeIntentCommand = {
        domain: 'plants',
        action: 'cullPlant',
        payload,
      };
      return this.sendIntent<CullPlantResult>(intent);
    },
  };

  readonly devices = {
    installDevice: async (options: InstallDeviceOptions) => {
      this.requireConnected();
      const payload = {
        targetId: options.targetId,
        deviceId: options.deviceId,
        ...(options.settings ? { settings: options.settings } : {}),
      } satisfies FacadeIntentCommand['payload'];
      const intent: FacadeIntentCommand = {
        domain: 'devices',
        action: 'installDevice',
        payload,
      };
      return this.sendIntent<DeviceInstallationResult>(intent);
    },
    adjustLightingCycle: async (options: AdjustLightingCycleOptions) => {
      this.requireConnected();
      const payload = {
        zoneId: options.zoneId,
        photoperiodHours: options.photoperiodHours,
      } satisfies FacadeIntentCommand['payload'];
      const intent: FacadeIntentCommand = {
        domain: 'devices',
        action: 'adjustLightingCycle',
        payload,
      };
      return this.sendIntent<AdjustLightingCycleResult>(intent);
    },
    moveDevice: async (options: MoveDeviceOptions) => {
      this.requireConnected();
      const payload = {
        instanceId: options.instanceId,
        targetZoneId: options.targetZoneId,
      } satisfies FacadeIntentCommand['payload'];
      const intent: FacadeIntentCommand = {
        domain: 'devices',
        action: 'moveDevice',
        payload,
      };
      return this.sendIntent(intent);
    },
    removeDevice: async (options: RemoveDeviceOptions) => {
      this.requireConnected();
      const payload = {
        instanceId: options.instanceId,
      } satisfies FacadeIntentCommand['payload'];
      const intent: FacadeIntentCommand = {
        domain: 'devices',
        action: 'removeDevice',
        payload,
      };
      return this.sendIntent(intent);
    },
  };

  connect() {
    if (this.socket || this.isConnecting) {
      return;
    }
    this.isConnecting = true;
    const store = useSimulationStore.getState();
    store.setConnectionStatus('connecting');

    const socket = io(SOCKET_URL, {
      path: SOCKET_PATH,
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: false,
      reconnection: false,
    });

    (window as typeof window & { __wb_socket?: Socket }).__wb_socket = socket;

    socket.on('connect', () => {
      this.isConnecting = false;
      this.reconnectDelay = INITIAL_RECONNECT_DELAY;
      store.setConnectionStatus('connected');
      void this.refreshCatalogs();
    });

    socket.on('disconnect', () => {
      store.setConnectionStatus('reconnecting');
      this.scheduleReconnect();
    });

    socket.on('reconnect_attempt', () => {
      store.setConnectionStatus('reconnecting');
    });

    socket.on('time.status', (payload: { status?: SimulationTimeStatus }) => {
      store.setTimeStatus(payload.status ?? null);
    });

    socket.on('simulationUpdate', (payload) => {
      if (!isSimulationUpdateMessage(payload)) {
        return;
      }

      const currentSnapshot = useSimulationStore.getState().snapshot;
      console.log('📡 SimulationUpdate received:', {
        updateCount: payload.updates.length,
        hasSnapshot: !!currentSnapshot,
        latestTick: payload.updates[0]?.tick,
      });

      // Handle the first update as initial hydration
      if (payload.updates.length > 0 && !currentSnapshot) {
        const firstUpdate = payload.updates[0];
        console.log('🔄 Initial hydration with tick:', firstUpdate.tick);
        store.hydrate({
          snapshot: firstUpdate.snapshot,
          events: firstUpdate.events || [],
          time: firstUpdate.time,
        });

        // Process remaining updates normally
        for (let i = 1; i < payload.updates.length; i++) {
          const update = payload.updates[i];
          console.log('⚡ Processing additional update tick:', update.tick);
          store.applyUpdate(update);
        }
      } else {
        // Normal update processing
        for (const update of payload.updates) {
          console.log(
            '🔥 Processing ongoing update tick:',
            update.tick,
            'structures:',
            update.snapshot?.structures?.length,
          );
          store.applyUpdate(update);
        }
      }

      // Notify update handlers
      for (const update of payload.updates) {
        for (const handler of this.updateHandlers) {
          handler(update);
        }
      }
    });

    socket.on('domainEvents', (payload) => {
      const events = extractEvents(payload);
      if (events.length) {
        store.recordEvents(events);
      }
    });

    socket.on('sim.tickCompleted', (payload) => {
      const events = extractEvents(payload);
      if (events.length) {
        store.recordEvents(events);
      }
    });

    socket.on('simulationControl.result', (response) => {
      this.resolvePending('simulationControl.result', response);
    });

    socket.on('config.update.result', (response) => {
      this.resolvePending('config.update.result', response);
    });

    socket.on('facade.intent.result', (response) => {
      this.resolvePending('facade.intent.result', response);
    });

    socket.on('error', () => {
      if (!socket.connected) {
        store.setConnectionStatus('reconnecting');
        this.scheduleReconnect();
      }
    });

    socket.connect();
    this.socket = socket;
  }

  async loadQuickStart(): Promise<CommandResponse<unknown>> {
    this.requireConnected();
    const intent: FacadeIntentCommand = {
      domain: 'world',
      action: 'rentStructure',
      payload: { structureId: QUICKSTART_STRUCTURE_ID },
    };
    return this.sendIntent(intent);
  }

  async getStructureBlueprints(): Promise<CommandResponse<StructureBlueprint[]>> {
    this.requireConnected();
    const intent: FacadeIntentCommand = {
      domain: 'world',
      action: 'getStructureBlueprints',
      payload: {},
    };
    return this.sendIntent<StructureBlueprint[]>(intent);
  }

  async getStrainBlueprints(): Promise<CommandResponse<StrainBlueprint[]>> {
    this.requireConnected();
    const intent: FacadeIntentCommand = {
      domain: 'world',
      action: 'getStrainBlueprints',
      payload: {},
    };
    return this.sendIntent<StrainBlueprint[]>(intent);
  }

  async getDeviceBlueprints(): Promise<CommandResponse<DeviceBlueprint[]>> {
    this.requireConnected();
    const intent: FacadeIntentCommand = {
      domain: 'world',
      action: 'getDeviceBlueprints',
      payload: {},
    };
    return this.sendIntent<DeviceBlueprint[]>(intent);
  }

  async getCultivationMethodBlueprints(): Promise<CommandResponse<CultivationMethodBlueprint[]>> {
    this.requireConnected();
    const intent: FacadeIntentCommand = {
      domain: 'world',
      action: 'getCultivationMethodBlueprints',
      payload: {},
    };
    return this.sendIntent<CultivationMethodBlueprint[]>(intent);
  }

  async getContainerBlueprints(): Promise<CommandResponse<ContainerBlueprint[]>> {
    this.requireConnected();
    const intent: FacadeIntentCommand = {
      domain: 'world',
      action: 'getContainerBlueprints',
      payload: {},
    };
    return this.sendIntent<ContainerBlueprint[]>(intent);
  }

  async getSubstrateBlueprints(): Promise<CommandResponse<SubstrateBlueprint[]>> {
    this.requireConnected();
    const intent: FacadeIntentCommand = {
      domain: 'world',
      action: 'getSubstrateBlueprints',
      payload: {},
    };
    return this.sendIntent<SubstrateBlueprint[]>(intent);
  }

  async getDifficultyConfig(): Promise<CommandResponse<DifficultyConfig>> {
    this.requireConnected();
    const intent: FacadeIntentCommand = {
      domain: 'config',
      action: 'getDifficultyConfig',
      payload: {},
    };
    return this.sendIntent<DifficultyConfig>(intent);
  }

  sendControl(
    command: SimulationControlCommand,
  ): Promise<CommandResponse<SimulationTimeStatus | undefined>> {
    return this.emitWithAck('simulationControl', command, 'simulationControl.result');
  }

  sendConfigUpdate(
    update: SimulationConfigUpdate,
  ): Promise<CommandResponse<SimulationTimeStatus | undefined>> {
    return this.emitWithAck('config.update', update, 'config.update.result');
  }

  sendIntent<T = unknown>(intent: FacadeIntentCommand): Promise<CommandResponse<T>> {
    return this.emitWithAck('facade.intent', intent, 'facade.intent.result');
  }

  subscribeToUpdates(handler: (update: SimulationUpdateEntry) => void) {
    this.updateHandlers.add(handler);
    return () => {
      this.updateHandlers.delete(handler);
    };
  }

  private emitWithAck<T>(event: string, payload: unknown, resultEvent: ResultEvent) {
    const socket = this.socket;
    if (!socket) {
      return Promise.reject(new Error('Socket connection not initialised.'));
    }
    const requestId =
      (payload as { requestId?: string } | undefined)?.requestId ?? generateRequestId();
    const enriched = { ...((payload ?? {}) as Record<string, unknown>), requestId };

    return new Promise<CommandResponse<T>>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Request ${requestId} timed out after ${REQUEST_TIMEOUT_MS}ms.`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(requestId, {
        resolve: resolve as (value: CommandResponse<unknown>) => void,
        reject,
        timeout,
      });
      socket.emit(event, enriched, (ack: CommandResponse<T>) => {
        if (ack && typeof ack === 'object' && ack.requestId === requestId) {
          this.resolvePending(resultEvent, ack);
        }
      });
    });
  }

  private resolvePending(event: ResultEvent, response: CommandResponse<unknown>) {
    const requestId = response.requestId;
    if (!requestId) {
      return;
    }
    const entry = this.pending.get(requestId);
    if (!entry) {
      return;
    }
    clearTimeout(entry.timeout);
    this.pending.delete(requestId);
    entry.resolve(response);
    if (event === 'simulationControl.result' && response.ok && response.data) {
      useSimulationStore.getState().setTimeStatus(response.data as SimulationTimeStatus);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }
    const attempt = () => {
      if (!this.socket) {
        return;
      }
      if (this.socket.connected || this.isConnecting) {
        this.reconnectTimer = null;
        return;
      }
      this.isConnecting = true;
      this.socket.connect();
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY);
    };
    this.reconnectTimer = setTimeout(attempt, this.reconnectDelay);
  }

  private requireConnected() {
    if (!this.socket || !this.socket.connected) {
      const message = `${buildBackendReachabilityMessage()}${QUICKSTART_HELP_SUFFIX}`;
      throw new Error(message);
    }
  }
}

let instance: SimulationBridge | null = null;

export const getSimulationBridge = (): SimulationBridge => {
  if (!instance) {
    instance = new SocketSystemFacade();
  }
  return instance;
};
