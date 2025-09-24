import type { RoomSnapshot, StructureSnapshot, ZoneSnapshot } from '@/types/simulation';
import type { GameStoreState, ZoneStoreState } from './types';

export const selectFinanceSummary = (state: ZoneStoreState) => state.financeSummary;

export const selectCapital = (state: ZoneStoreState): number => {
  return state.financeSummary?.cashOnHand ?? 0;
};

export const selectCumulativeYield = (state: ZoneStoreState): number => {
  return Object.values(state.plants).reduce(
    (total, plant) => total + (plant.yieldDryGrams ?? 0),
    0,
  );
};

export const selectCurrentTick = (state: GameStoreState): number => {
  return state.timeStatus?.tick ?? state.lastSnapshotTick ?? 0;
};

export const selectTimeStatus = (state: GameStoreState) => state.timeStatus;

export const selectLastTickEvent = (state: GameStoreState) => state.lastTickCompleted;

export const selectIsPaused = (state: GameStoreState): boolean => {
  if (state.timeStatus) {
    return Boolean(state.timeStatus.paused);
  }
  if (state.lastClockSnapshot) {
    return state.lastClockSnapshot.isPaused;
  }
  return true;
};

export const selectTargetTickRate = (state: GameStoreState): number => {
  if (state.timeStatus) {
    return state.timeStatus.targetTickRate;
  }
  if (state.lastClockSnapshot) {
    return state.lastClockSnapshot.targetTickRate;
  }
  return 1;
};

export const selectCurrentSpeed = (state: GameStoreState): number => {
  if (state.timeStatus) {
    return state.timeStatus.speed;
  }
  if (state.lastClockSnapshot) {
    return state.lastClockSnapshot.targetTickRate;
  }
  return 1;
};

export const selectAlertEvents = (state: GameStoreState) => {
  return state.events.filter((event) => event.level === 'warning' || event.level === 'error');
};

export const selectRecentEvents = (limit: number) => (state: GameStoreState) => {
  if (limit <= 0) {
    return [];
  }
  return state.events.slice(-limit).reverse();
};

export const selectAlertCount = (state: GameStoreState): number => {
  return state.events.reduce((count, event) => {
    return count + (event.level === 'warning' || event.level === 'error' ? 1 : 0);
  }, 0);
};

export const selectStructureById =
  (structureId?: string) =>
  (state: ZoneStoreState): StructureSnapshot | undefined => {
    return structureId ? state.structures[structureId] : undefined;
  };

export const selectRoomById =
  (roomId?: string) =>
  (state: ZoneStoreState): RoomSnapshot | undefined => {
    return roomId ? state.rooms[roomId] : undefined;
  };

export const selectZoneById = (zoneId?: string) => (state: ZoneStoreState) => {
  return zoneId ? state.zones[zoneId] : undefined;
};

export const selectStructureByRoomId =
  (roomId?: string) =>
  (state: ZoneStoreState): StructureSnapshot | undefined => {
    if (!roomId) {
      return undefined;
    }

    const room = state.rooms[roomId];
    return room ? state.structures[room.structureId] : undefined;
  };

export const selectStructureByZoneId =
  (zoneId?: string) =>
  (state: ZoneStoreState): StructureSnapshot | undefined => {
    if (!zoneId) {
      return undefined;
    }

    const zone = state.zones[zoneId];
    return zone ? state.structures[zone.structureId] : undefined;
  };

export const selectRoomByZoneId =
  (zoneId?: string) =>
  (state: ZoneStoreState): RoomSnapshot | undefined => {
    if (!zoneId) {
      return undefined;
    }

    const zone = state.zones[zoneId];
    return zone ? state.rooms[zone.roomId] : undefined;
  };

export const selectRoomsByStructureId =
  (structureId?: string) =>
  (state: ZoneStoreState): RoomSnapshot[] => {
    if (!structureId) {
      return [];
    }

    return Object.values(state.rooms).filter((room) => room.structureId === structureId);
  };

export const selectZonesByStructureId =
  (structureId?: string) =>
  (state: ZoneStoreState): ZoneSnapshot[] => {
    if (!structureId) {
      return [];
    }

    return Object.values(state.zones).filter((zone) => zone.structureId === structureId);
  };

export const selectZonesByRoomId =
  (roomId?: string) =>
  (state: ZoneStoreState): ZoneSnapshot[] => {
    if (!roomId) {
      return [];
    }

    return Object.values(state.zones).filter((zone) => zone.roomId === roomId);
  };

export const selectRoomsGroupedByStructure = (
  state: ZoneStoreState,
): Record<string, RoomSnapshot[]> => {
  const grouped: Record<string, RoomSnapshot[]> = {};

  for (const room of Object.values(state.rooms)) {
    const list = grouped[room.structureId] ?? [];
    list.push(room);
    grouped[room.structureId] = list;
  }

  return grouped;
};

export const selectZonesGroupedByStructure = (
  state: ZoneStoreState,
): Record<string, ZoneSnapshot[]> => {
  const grouped: Record<string, ZoneSnapshot[]> = {};

  for (const zone of Object.values(state.zones)) {
    const list = grouped[zone.structureId] ?? [];
    list.push(zone);
    grouped[zone.structureId] = list;
  }

  return grouped;
};

export const selectZonesGroupedByRoom = (state: ZoneStoreState): Record<string, ZoneSnapshot[]> => {
  const grouped: Record<string, ZoneSnapshot[]> = {};

  for (const zone of Object.values(state.zones)) {
    const list = grouped[zone.roomId] ?? [];
    list.push(zone);
    grouped[zone.roomId] = list;
  }

  return grouped;
};
