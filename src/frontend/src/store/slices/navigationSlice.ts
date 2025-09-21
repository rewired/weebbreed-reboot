import type { StateCreator } from 'zustand';
import type { AppStoreState, NavigationSlice, NavigationView } from '../types';

export const createNavigationSlice: StateCreator<AppStoreState, [], [], NavigationSlice> = (
  set,
) => ({
  currentView: 'overview',
  selectedStructureId: undefined,
  selectedRoomId: undefined,
  selectedZoneId: undefined,
  setCurrentView: (view: NavigationView) =>
    set((state) => {
      if (state.currentView === view) {
        return {};
      }

      return {
        currentView: view,
        ...(view !== 'world'
          ? { selectedStructureId: undefined, selectedRoomId: undefined, selectedZoneId: undefined }
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
      const room = state.rooms[roomId];
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
      const zone = state.zones[zoneId];
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
});
