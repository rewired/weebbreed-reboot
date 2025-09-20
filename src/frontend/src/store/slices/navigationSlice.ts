import type { StateCreator } from 'zustand';
import type { AppStoreState, NavigationSlice, NavigationView } from '../types';

const HISTORY_LIMIT = 10;

export const createNavigationSlice: StateCreator<AppStoreState, [], [], NavigationSlice> = (
  set,
) => ({
  currentView: 'overview',
  history: [],
  selectedStructureId: undefined,
  selectedRoomId: undefined,
  selectedZoneId: undefined,
  setCurrentView: (view: NavigationView) =>
    set((state) => {
      if (state.currentView === view) {
        return {};
      }

      const nextHistory = [...state.history, state.currentView];
      if (nextHistory.length > HISTORY_LIMIT) {
        nextHistory.shift();
      }

      return {
        currentView: view,
        history: nextHistory,
        ...(view !== 'world'
          ? { selectedStructureId: undefined, selectedRoomId: undefined, selectedZoneId: undefined }
          : {}),
      };
    }),
  goBack: () =>
    set((state) => {
      if (state.history.length === 0) {
        return {};
      }

      const nextHistory = [...state.history];
      const previous = nextHistory.pop() ?? 'overview';

      return {
        currentView: previous,
        history: nextHistory,
        ...(previous !== 'world'
          ? { selectedStructureId: undefined, selectedRoomId: undefined, selectedZoneId: undefined }
          : {}),
      };
    }),
  clearHistory: () => set(() => ({ history: [] })),
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
