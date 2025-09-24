import { create } from 'zustand';
import type { FacadeIntentCommand, SimulationUpdateEntry } from '@/types/simulation';
import { indexById, truncate } from './utils/collections';
import type {
  FinanceTickEntry,
  MaintenanceExpenseEntry,
  SimulationTimelineEntry,
  ZoneStoreState,
} from './types';

const MAX_TIMELINE_ENTRIES = 360;
const MAX_FINANCE_HISTORY = 720;

const mapTimelineEntries = (update: SimulationUpdateEntry) => {
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

const appendTimelineEntries = (
  timeline: SimulationTimelineEntry[],
  incoming: SimulationTimelineEntry[],
  limit: number,
): SimulationTimelineEntry[] => {
  if (!incoming.length) {
    return timeline;
  }

  const keyOf = (entry: SimulationTimelineEntry) => {
    const zonePart = entry.zoneId ?? 'global';
    return `${zonePart}:${entry.tick}:${entry.ts}`;
  };

  const combined = new Map<string, SimulationTimelineEntry>();
  for (const entry of timeline) {
    combined.set(keyOf(entry), entry);
  }
  for (const entry of incoming) {
    combined.set(keyOf(entry), entry);
  }

  return truncate(Array.from(combined.values()), limit);
};

const extractDevices = (snapshot: SimulationUpdateEntry['snapshot']) => {
  return snapshot.zones.reduce<Record<string, (typeof snapshot.zones)[number]['devices'][number]>>(
    (accumulator, zone) => {
      for (const device of zone.devices) {
        accumulator[device.id] = device;
      }
      return accumulator;
    },
    {},
  );
};

const extractPlants = (snapshot: SimulationUpdateEntry['snapshot']) => {
  return snapshot.zones.reduce<Record<string, (typeof snapshot.zones)[number]['plants'][number]>>(
    (accumulator, zone) => {
      for (const plant of zone.plants) {
        accumulator[plant.id] = {
          ...plant,
          zoneId: zone.id,
          structureId: zone.structureId,
          roomId: zone.roomId,
        };
      }
      return accumulator;
    },
    {},
  );
};

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

export const useZoneStore = create<ZoneStoreState>()((set) => ({
  structures: {},
  rooms: {},
  zones: {},
  devices: {},
  plants: {},
  timeline: [],
  financeSummary: undefined,
  financeHistory: [],
  lastSnapshotTimestamp: undefined,
  lastSnapshotTick: undefined,
  lastSetpoints: {},
  ingestUpdate: (update: SimulationUpdateEntry) =>
    set((state) => {
      const { snapshot } = update;
      const structures = indexById(snapshot.structures);
      const rooms = indexById(snapshot.rooms);
      const zones = indexById(snapshot.zones);
      const devices = extractDevices(snapshot);
      const plants = extractPlants(snapshot);
      const timelineEntries = mapTimelineEntries(update);
      const financeEntries = extractFinanceEvents(update);

      let nextFinanceHistory = state.financeHistory;
      for (const entry of financeEntries) {
        nextFinanceHistory = appendFinanceHistory(nextFinanceHistory, entry);
      }

      return {
        structures,
        rooms,
        zones,
        devices,
        plants,
        timeline: appendTimelineEntries(state.timeline, timelineEntries, MAX_TIMELINE_ENTRIES),
        financeSummary: snapshot.finance,
        financeHistory: nextFinanceHistory,
        lastSnapshotTimestamp: update.ts,
        lastSnapshotTick: snapshot.tick,
      };
    }),
  recordFinanceTick: (entry) =>
    set((state) => ({
      financeHistory: appendFinanceHistory(state.financeHistory, entry),
    })),
  setConfigHandler: (handler) =>
    set(() => ({
      sendConfigUpdate: handler,
    })),
  setIntentHandler: (handler) =>
    set(() => ({
      sendFacadeIntent: handler,
    })),
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
  issueFacadeIntent: (intent: FacadeIntentCommand) =>
    set((state) => {
      state.sendFacadeIntent?.(intent);
      return {};
    }),
  updateStructureName: (structureId, name) =>
    set((state) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return {};
      }

      const currentName = state.structures[structureId]?.name?.trim();
      if (currentName === trimmedName) {
        return {};
      }

      state.sendFacadeIntent?.({
        domain: 'world',
        action: 'renameStructure',
        payload: { structureId, name: trimmedName },
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
  duplicateRoom: (roomId, options) =>
    set((state) => {
      const name = options?.name?.trim();
      const payload: Record<string, unknown> = { roomId };
      if (name) {
        payload.name = name;
      }

      state.sendFacadeIntent?.({
        domain: 'world',
        action: 'duplicateRoom',
        payload,
      });
      return {};
    }),
  duplicateZone: (zoneId, options) =>
    set((state) => {
      const name = options?.name?.trim();
      const payload: Record<string, unknown> = { zoneId };
      if (name) {
        payload.name = name;
      }

      state.sendFacadeIntent?.({
        domain: 'world',
        action: 'duplicateZone',
        payload,
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
  reset: () =>
    set(() => ({
      structures: {},
      rooms: {},
      zones: {},
      devices: {},
      plants: {},
      timeline: [],
      financeSummary: undefined,
      financeHistory: [],
      lastSnapshotTimestamp: undefined,
      lastSnapshotTick: undefined,
      lastSetpoints: {},
    })),
  sendConfigUpdate: undefined,
  sendFacadeIntent: undefined,
}));
