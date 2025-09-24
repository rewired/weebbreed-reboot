import type { StateCreator } from 'zustand';
import { useZoneStore } from '../zoneStore';
import { usePersonnelStore } from '../personnelStore';
import type {
  AppStoreState,
  NavigationCounts,
  NavigationSlice,
  NavigationStructureNode,
  NavigationView,
  NavigationViewItem,
} from '../types';
import type {
  PersonnelSnapshot,
  RoomSnapshot,
  StructureSnapshot,
  ZoneSnapshot,
} from '@/types/simulation';

const NAVIGATION_LABELS: Record<NavigationView, string> = {
  overview: 'Overview',
  world: 'Structures',
  personnel: 'Personnel',
  finance: 'Finances',
  settings: 'Settings',
};

const DEFAULT_COUNTS: NavigationCounts = {
  structures: 0,
  rooms: 0,
  zones: 0,
  employees: 0,
  applicants: 0,
};

const formatBadge = (value: number): string | undefined => {
  return value > 0 ? value.toLocaleString() : undefined;
};

const buildPrimaryNavigation = (counts: NavigationCounts): NavigationViewItem[] => [
  { id: 'overview', label: NAVIGATION_LABELS.overview },
  { id: 'world', label: NAVIGATION_LABELS.world, badge: formatBadge(counts.zones) },
  { id: 'personnel', label: NAVIGATION_LABELS.personnel, badge: formatBadge(counts.employees) },
  { id: 'finance', label: NAVIGATION_LABELS.finance },
];

type ZoneStateSlice = {
  structures: Record<string, StructureSnapshot>;
  rooms: Record<string, RoomSnapshot>;
  zones: Record<string, ZoneSnapshot>;
};

const sortByName = <T extends { name: string }>(items: T[]): T[] => {
  return items.slice().sort((a, b) => a.name.localeCompare(b.name));
};

const buildStructureHierarchy = ({
  structures,
  rooms,
  zones,
}: ZoneStateSlice): {
  hierarchy: NavigationStructureNode[];
  counts: Pick<NavigationCounts, 'structures' | 'rooms' | 'zones'>;
} => {
  const zonesByRoom: Record<string, NavigationStructureNode['rooms'][number]['zones']> = {};

  for (const zone of Object.values(zones)) {
    const list = zonesByRoom[zone.roomId] ?? [];
    list.push({
      id: zone.id,
      name: zone.name,
      roomId: zone.roomId,
      structureId: zone.structureId,
      temperature: zone.environment.temperature,
    });
    zonesByRoom[zone.roomId] = list;
  }

  for (const roomId of Object.keys(zonesByRoom)) {
    zonesByRoom[roomId] = sortByName(zonesByRoom[roomId]);
  }

  const roomsByStructure: Record<string, NavigationStructureNode['rooms']> = {};

  for (const room of Object.values(rooms)) {
    const roomZones = zonesByRoom[room.id] ?? [];
    const roomNode = {
      id: room.id,
      name: room.name,
      structureId: room.structureId,
      zoneCount: roomZones.length,
      zones: roomZones,
    } satisfies NavigationStructureNode['rooms'][number];

    const list = roomsByStructure[room.structureId] ?? [];
    list.push(roomNode);
    roomsByStructure[room.structureId] = list;
  }

  for (const structureId of Object.keys(roomsByStructure)) {
    roomsByStructure[structureId] = sortByName(roomsByStructure[structureId]);
  }

  const structuresList = sortByName(
    Object.values(structures).map<NavigationStructureNode>((structure) => {
      const structureRooms = roomsByStructure[structure.id] ?? [];
      const zoneCount = structureRooms.reduce((sum, room) => sum + room.zoneCount, 0);
      return {
        id: structure.id,
        name: structure.name,
        roomCount: structureRooms.length,
        zoneCount,
        rooms: structureRooms,
      } satisfies NavigationStructureNode;
    }),
  );

  const counts = structuresList.reduce(
    (accumulator, structure) => {
      accumulator.structures += 1;
      accumulator.rooms += structure.roomCount;
      accumulator.zones += structure.zoneCount;
      return accumulator;
    },
    { structures: 0, rooms: 0, zones: 0 },
  );

  return { hierarchy: structuresList, counts };
};

const derivePersonnelCounts = (
  personnel?: PersonnelSnapshot,
): Pick<NavigationCounts, 'employees' | 'applicants'> => ({
  employees: personnel?.employees?.length ?? 0,
  applicants: personnel?.applicants?.length ?? 0,
});

export const createNavigationSlice: StateCreator<AppStoreState, [], [], NavigationSlice> = (
  set,
  get,
) => {
  const initialZoneState = useZoneStore.getState();
  const { hierarchy: initialHierarchy, counts: initialZoneCounts } =
    buildStructureHierarchy(initialZoneState);
  const personnelCounts = derivePersonnelCounts(usePersonnelStore.getState().personnel);
  const initialCounts: NavigationCounts = {
    ...DEFAULT_COUNTS,
    ...initialZoneCounts,
    ...personnelCounts,
  };

  const slice: NavigationSlice = {
    currentView: 'overview',
    selectedStructureId: undefined,
    selectedRoomId: undefined,
    selectedZoneId: undefined,
    navigationItems: buildPrimaryNavigation(initialCounts),
    structureHierarchy: initialHierarchy,
    facilityCounts: initialCounts,
    setCurrentView: (view: NavigationView) =>
      set((state) => {
        if (state.currentView === view) {
          return {};
        }

        return {
          currentView: view,
          ...(view !== 'world'
            ? {
                selectedStructureId: undefined,
                selectedRoomId: undefined,
                selectedZoneId: undefined,
              }
            : {}),
        };
      }),
    navigateUp: () =>
      set((state) => {
        if (state.currentView !== 'world') {
          return { currentView: 'overview' };
        }

        if (state.selectedZoneId) {
          return { selectedZoneId: undefined };
        }

        if (state.selectedRoomId) {
          return { selectedRoomId: undefined, selectedZoneId: undefined };
        }

        if (state.selectedStructureId) {
          return {
            selectedStructureId: undefined,
            selectedRoomId: undefined,
            selectedZoneId: undefined,
          };
        }

        return {};
      }),
    selectStructure: (structureId) =>
      set(() => ({
        selectedStructureId: structureId,
        selectedRoomId: undefined,
        selectedZoneId: undefined,
        currentView: 'world',
      })),
    selectRoom: (roomId) =>
      set((state) => {
        if (!roomId) {
          return { selectedRoomId: undefined, selectedZoneId: undefined };
        }
        const room = useZoneStore.getState().rooms[roomId];
        return {
          selectedStructureId: room?.structureId ?? state.selectedStructureId,
          selectedRoomId: roomId,
          selectedZoneId: undefined,
          currentView: 'world',
        };
      }),
    selectZone: (zoneId) =>
      set((state) => {
        if (!zoneId) {
          return { selectedZoneId: undefined };
        }
        const zone = useZoneStore.getState().zones[zoneId];
        return {
          selectedStructureId: zone?.structureId ?? state.selectedStructureId,
          selectedRoomId: zone?.roomId ?? state.selectedRoomId,
          selectedZoneId: zoneId,
          currentView: 'world',
        };
      }),
    resetSelection: () =>
      set(() => ({
        selectedStructureId: undefined,
        selectedRoomId: undefined,
        selectedZoneId: undefined,
      })),
  } satisfies NavigationSlice;

  useZoneStore.subscribe(
    (state) => ({
      structures: state.structures,
      rooms: state.rooms,
      zones: state.zones,
    }),
    (nextZoneState) => {
      const { hierarchy, counts } = buildStructureHierarchy(nextZoneState);
      const currentCounts = get().facilityCounts;
      const updatedCounts: NavigationCounts = {
        ...currentCounts,
        structures: counts.structures,
        rooms: counts.rooms,
        zones: counts.zones,
      };

      const updates: Partial<NavigationSlice> = {
        structureHierarchy: hierarchy,
        facilityCounts: updatedCounts,
        navigationItems: buildPrimaryNavigation(updatedCounts),
      };

      const { selectedStructureId, selectedRoomId, selectedZoneId } = get();

      if (selectedStructureId && !nextZoneState.structures[selectedStructureId]) {
        updates.selectedStructureId = undefined;
        updates.selectedRoomId = undefined;
        updates.selectedZoneId = undefined;
      } else if (selectedRoomId && !nextZoneState.rooms[selectedRoomId]) {
        updates.selectedRoomId = undefined;
        updates.selectedZoneId = undefined;
      } else if (selectedZoneId && !nextZoneState.zones[selectedZoneId]) {
        updates.selectedZoneId = undefined;
      }

      set(updates);
    },
    { fireImmediately: false },
  );

  usePersonnelStore.subscribe(
    (state) => state.personnel,
    (personnel) => {
      const counts = get().facilityCounts;
      const personnelCounts = derivePersonnelCounts(personnel);
      if (
        counts.employees === personnelCounts.employees &&
        counts.applicants === personnelCounts.applicants
      ) {
        return;
      }

      const nextCounts: NavigationCounts = {
        ...counts,
        employees: personnelCounts.employees,
        applicants: personnelCounts.applicants,
      };

      set({
        facilityCounts: nextCounts,
        navigationItems: buildPrimaryNavigation(nextCounts),
      });
    },
    { fireImmediately: false },
  );

  return slice;
};

export type { NavigationViewItem };
