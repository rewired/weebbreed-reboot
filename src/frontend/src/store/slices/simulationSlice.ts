import type { StateCreator } from 'zustand';
import type {
  DeviceSnapshot,
  FacadeIntentCommand,
  FinanceSummarySnapshot,
  PlantSnapshot,
  PersonnelSnapshot,
  SimulationEvent,
  SimulationSnapshot,
  SimulationUpdateEntry,
  ZoneSnapshot,
} from '../../types/simulation';
import type {
  AppStoreState,
  BlueprintCatalogPayload,
  BlueprintCatalogState,
  FinanceTickEntry,
  MaintenanceExpenseEntry,
  SimulationSlice,
  SimulationTimelineEntry,
} from '../types';

const MAX_EVENTS = 250;
const MAX_TIMELINE_ENTRIES = 360;
const MAX_FINANCE_HISTORY = 720;
const MAX_HR_EVENTS = 200;

const truncate = <T>(items: T[], limit: number): T[] => {
  if (items.length <= limit) {
    return items;
  }

  return items.slice(items.length - limit);
};

const indexById = <T extends { id: string }>(items: T[]): Record<string, T> => {
  return items.reduce<Record<string, T>>((accumulator, item) => {
    accumulator[item.id] = item;
    return accumulator;
  }, {});
};

const mapTimelineEntries = (update: SimulationUpdateEntry): SimulationTimelineEntry[] => {
  return update.snapshot.zones.map((zone) => ({
    tick: update.tick,
    ts: update.ts,
    zoneId: zone.id,
    temperature: zone.environment.temperature,
    humidity: zone.environment.relativeHumidity,
    vpd: zone.environment.vpd,
    co2: zone.environment.co2,
    ppfd: zone.environment.ppfd,
  }));
};

const extractDevices = (zones: ZoneSnapshot[]): Record<string, DeviceSnapshot> => {
  return zones.reduce<Record<string, DeviceSnapshot>>((accumulator, zone) => {
    for (const device of zone.devices) {
      accumulator[device.id] = device;
    }
    return accumulator;
  }, {});
};

const extractPlants = (zones: ZoneSnapshot[]): Record<string, PlantSnapshot> => {
  return zones.reduce<Record<string, PlantSnapshot>>((accumulator, zone) => {
    for (const plant of zone.plants) {
      accumulator[plant.id] = {
        ...plant,
        zoneId: zone.id,
        structureId: zone.structureId,
        roomId: zone.roomId,
      };
    }
    return accumulator;
  }, {});
};

const eventKey = (event: SimulationEvent): string => {
  return [
    event.type,
    event.tick ?? 'na',
    event.ts ?? 'na',
    event.message ?? '',
    event.deviceId ?? '',
    event.plantId ?? '',
    event.zoneId ?? '',
  ].join('|');
};

const mergeEventsWithLimit = (
  existing: SimulationEvent[],
  incoming: SimulationEvent[],
  limit: number,
): SimulationEvent[] => {
  if (!incoming.length) {
    return existing;
  }

  const seen = new Set(existing.map(eventKey));
  const merged = [...existing];

  for (const event of incoming) {
    const key = eventKey(event);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(event);
  }

  return truncate(merged, limit);
};

const mergeEvents = (existing: SimulationEvent[], incoming: SimulationEvent[]): SimulationEvent[] =>
  mergeEventsWithLimit(existing, incoming, MAX_EVENTS);

const appendFinanceHistory = (
  history: FinanceTickEntry[],
  entry: FinanceTickEntry,
): FinanceTickEntry[] => {
  if (!history.length) {
    return [entry];
  }

  const last = history[history.length - 1];
  if (last.tick === entry.tick && Math.abs(last.ts - entry.ts) <= 1) {
    return history;
  }

  return truncate([...history, entry], MAX_FINANCE_HISTORY);
};

const normalizeMaintenance = (details: unknown): MaintenanceExpenseEntry[] => {
  if (!Array.isArray(details)) {
    return [];
  }

  return details
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return undefined;
      }
      const record = entry as Partial<MaintenanceExpenseEntry> & {
        deviceId?: string;
        blueprintId?: string;
        totalCost?: number;
        degradationMultiplier?: number;
      };
      if (!record.deviceId || !record.blueprintId || typeof record.totalCost !== 'number') {
        return undefined;
      }
      return {
        deviceId: record.deviceId,
        blueprintId: record.blueprintId,
        totalCost: record.totalCost,
        degradationMultiplier: record.degradationMultiplier ?? 1,
      } satisfies MaintenanceExpenseEntry;
    })
    .filter((entry): entry is MaintenanceExpenseEntry => Boolean(entry));
};

const toFinanceEntry = (
  event: SimulationUpdateEntry['events'][number],
): FinanceTickEntry | undefined => {
  if (!event || event.type !== 'finance.tick') {
    return undefined;
  }
  const payload = event.payload as
    | ({
        tick?: number;
        timestamp?: string;
        revenue?: number;
        expenses?: number;
        netIncome?: number;
        capex?: number;
        opex?: number;
        utilities?: {
          totalCost?: number;
          energy?: { totalCost?: number };
          water?: { totalCost?: number };
          nutrients?: { totalCost?: number };
        };
        maintenance?: unknown;
      } & Record<string, unknown>)
    | undefined;

  if (!payload) {
    return undefined;
  }

  const ts = payload.timestamp ? Date.parse(payload.timestamp) : (event.ts ?? Date.now());
  const maintenanceDetails = normalizeMaintenance(payload.maintenance);
  return {
    tick: payload.tick ?? event.tick ?? 0,
    ts,
    revenue: payload.revenue ?? 0,
    expenses: payload.expenses ?? 0,
    netIncome: payload.netIncome ?? 0,
    capex: payload.capex ?? 0,
    opex: payload.opex ?? 0,
    utilities: {
      totalCost: payload.utilities?.totalCost ?? 0,
      energy: payload.utilities?.energy?.totalCost ?? 0,
      water: payload.utilities?.water?.totalCost ?? 0,
      nutrients: payload.utilities?.nutrients?.totalCost ?? 0,
    },
    maintenanceTotal: maintenanceDetails.reduce((sum, item) => sum + item.totalCost, 0),
    maintenanceDetails,
  } satisfies FinanceTickEntry;
};

const extractFinanceEvents = (update: SimulationUpdateEntry): FinanceTickEntry[] => {
  return update.events.reduce<FinanceTickEntry[]>((entries, event) => {
    const mapped = toFinanceEntry(event);
    if (mapped) {
      entries.push(mapped);
    }
    return entries;
  }, []);
};

const extractHrEvents = (update: SimulationUpdateEntry): SimulationUpdateEntry['events'] => {
  return update.events.filter((event) => event.type.startsWith('hr.'));
};

const updatePersonnel = (snapshot: SimulationSnapshot): PersonnelSnapshot | undefined => {
  return snapshot.personnel;
};

const updateFinanceSummary = (snapshot: SimulationSnapshot): FinanceSummarySnapshot | undefined => {
  return snapshot.finance;
};

export const createSimulationSlice: StateCreator<AppStoreState, [], [], SimulationSlice> = (
  set,
) => ({
  connectionStatus: 'idle',
  structures: {},
  rooms: {},
  zones: {},
  devices: {},
  plants: {},
  blueprintCatalog: { strains: {}, devices: {} },
  events: [],
  timeline: [],
  lastSetpoints: {},
  financeHistory: [],
  hrEvents: [],
  setConnectionStatus: (status, errorMessage) =>
    set((state) => ({
      connectionStatus: status,
      lastError: status === 'error' ? (errorMessage ?? state.lastError) : undefined,
    })),
  ingestUpdate: (update) =>
    set((state) => {
      const { snapshot } = update;
      const structures = indexById(snapshot.structures);
      const rooms = indexById(snapshot.rooms);
      const zones = indexById(snapshot.zones);
      const devices = extractDevices(snapshot.zones);
      const plants = extractPlants(snapshot.zones);
      const timelineEntries = mapTimelineEntries(update);
      const financeEntries = extractFinanceEvents(update);
      const hrEvents = extractHrEvents(update);

      let nextFinanceHistory = state.financeHistory;
      for (const entry of financeEntries) {
        nextFinanceHistory = appendFinanceHistory(nextFinanceHistory, entry);
      }

      const nextHrEvents = hrEvents.length ? mergeEvents(state.hrEvents, hrEvents) : state.hrEvents;

      return {
        lastSnapshot: snapshot,
        lastSnapshotTimestamp: update.ts,
        structures,
        rooms,
        zones,
        devices,
        plants,
        timeline: truncate([...state.timeline, ...timelineEntries], MAX_TIMELINE_ENTRIES),
        events: mergeEvents(state.events, update.events),
        timeStatus: update.time,
        financeSummary: updateFinanceSummary(snapshot),
        personnel: updatePersonnel(snapshot),
        financeHistory: nextFinanceHistory,
        hrEvents: nextHrEvents,
      };
    }),
  ingestBlueprintCatalog: (catalog: BlueprintCatalogPayload) =>
    set((state) => {
      const nextCatalog: BlueprintCatalogState = {
        strains: catalog.strains ? indexById(catalog.strains) : state.blueprintCatalog.strains,
        devices: catalog.devices ? indexById(catalog.devices) : state.blueprintCatalog.devices,
      };

      return { blueprintCatalog: nextCatalog };
    }),
  appendEvents: (events) =>
    set((state) => {
      return events.length ? { events: mergeEvents(state.events, events) } : {};
    }),
  recordFinanceTick: (entry) =>
    set((state) => ({
      financeHistory: appendFinanceHistory(state.financeHistory, entry),
    })),
  recordHREvent: (event) =>
    set((state) => ({
      hrEvents: mergeEventsWithLimit(state.hrEvents, [event], MAX_HR_EVENTS),
    })),
  registerTickCompleted: (event) =>
    set(() => ({
      lastTickCompleted: event,
    })),
  resetSimulation: () =>
    set(() => ({
      lastSnapshot: undefined,
      structures: {},
      rooms: {},
      zones: {},
      devices: {},
      plants: {},
      blueprintCatalog: { strains: {}, devices: {} },
      events: [],
      timeline: [],
      lastTickCompleted: undefined,
      lastSnapshotTimestamp: undefined,
      financeHistory: [],
      hrEvents: [],
      financeSummary: undefined,
      personnel: undefined,
      timeStatus: undefined,
    })),
  setCommandHandlers: (control, config) =>
    set(() => ({
      sendControlCommand: control,
      sendConfigUpdate: config,
    })),
  setIntentHandler: (handler: (intent: FacadeIntentCommand) => void) =>
    set(() => ({
      sendFacadeIntent: handler,
    })),
  issueControlCommand: (command) =>
    set((state) => {
      state.sendControlCommand?.(command);
      return {};
    }),
  issueFacadeIntent: (intent) =>
    set((state) => {
      state.sendFacadeIntent?.(intent);
      return {};
    }),
  updateStructureName: (structureId, name) =>
    set((state) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return {};
      }
      state.sendFacadeIntent?.({
        domain: 'world',
        action: 'updateStructure',
        payload: { structureId, patch: { name: trimmed } },
      });
      return {};
    }),
  updateRoomName: (roomId, name) =>
    set((state) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return {};
      }
      state.sendFacadeIntent?.({
        domain: 'world',
        action: 'updateRoom',
        payload: { roomId, patch: { name: trimmed } },
      });
      return {};
    }),
  updateZoneName: (zoneId, name) =>
    set((state) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return {};
      }
      state.sendFacadeIntent?.({
        domain: 'world',
        action: 'updateZone',
        payload: { zoneId, patch: { name: trimmed } },
      });
      return {};
    }),
  duplicateRoom: (roomId) =>
    set((state) => {
      state.sendFacadeIntent?.({
        domain: 'world',
        action: 'duplicateRoom',
        payload: { roomId },
      });
      return {};
    }),
  duplicateZone: (zoneId) =>
    set((state) => {
      state.sendFacadeIntent?.({
        domain: 'world',
        action: 'duplicateZone',
        payload: { zoneId },
      });
      return {};
    }),
  removeStructure: (structureId) =>
    set((state) => {
      state.sendFacadeIntent?.({
        domain: 'world',
        action: 'deleteStructure',
        payload: { structureId },
      });
      return {};
    }),
  removeRoom: (roomId) =>
    set((state) => {
      state.sendFacadeIntent?.({
        domain: 'world',
        action: 'deleteRoom',
        payload: { roomId },
      });
      return {};
    }),
  removeZone: (zoneId) =>
    set((state) => {
      state.sendFacadeIntent?.({
        domain: 'world',
        action: 'deleteZone',
        payload: { zoneId },
      });
      return {};
    }),
  applyWater: (zoneId, liters) =>
    set((state) => {
      if (liters <= 0) {
        return {};
      }
      state.sendFacadeIntent?.({
        domain: 'plants',
        action: 'applyIrrigation',
        payload: { zoneId, liters },
      });
      return {};
    }),
  applyNutrients: (zoneId, nutrients) =>
    set((state) => {
      const payload = {
        zoneId,
        nutrients: {
          N: Math.max(0, nutrients.N),
          P: Math.max(0, nutrients.P),
          K: Math.max(0, nutrients.K),
        },
      } as const;
      state.sendFacadeIntent?.({
        domain: 'plants',
        action: 'applyFertilizer',
        payload,
      });
      return {};
    }),
  toggleDeviceGroup: (zoneId, deviceKind, enabled) =>
    set((state) => {
      state.sendFacadeIntent?.({
        domain: 'devices',
        action: 'toggleDeviceGroup',
        payload: { zoneId, kind: deviceKind, enabled },
      });
      return {};
    }),
  harvestPlanting: (plantingId) =>
    set((state) => {
      state.sendFacadeIntent?.({
        domain: 'plants',
        action: 'harvestPlanting',
        payload: { plantingId },
      });
      return {};
    }),
  harvestPlantings: (plantingIds) =>
    set((state) => {
      for (const plantingId of plantingIds) {
        state.sendFacadeIntent?.({
          domain: 'plants',
          action: 'harvestPlanting',
          payload: { plantingId },
        });
      }
      return {};
    }),
  togglePlantingPlan: (zoneId, enabled) =>
    set((state) => {
      state.sendFacadeIntent?.({
        domain: 'plants',
        action: 'togglePlantingPlan',
        payload: { zoneId, enabled },
      });
      return {};
    }),
  requestTickLength: (minutes) =>
    set((state) => {
      state.sendConfigUpdate?.({ type: 'tickLength', minutes });
      return { lastRequestedTickLength: minutes };
    }),
  sendSetpoint: (zoneId, metric, value) =>
    set((state) => {
      state.sendConfigUpdate?.({ type: 'setpoint', zoneId, metric, value });
      return {
        lastSetpoints: {
          ...state.lastSetpoints,
          [`${zoneId}:${metric}`]: value,
        },
      };
    }),
});
