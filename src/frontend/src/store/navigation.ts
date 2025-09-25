import { create } from 'zustand';

type View = 'start' | 'dashboard' | 'structure' | 'room' | 'zone' | 'personnel';

interface NavigationState {
  currentView: View;
  selectedStructureId?: string;
  selectedRoomId?: string;
  selectedZoneId?: string;
  isSidebarOpen: boolean;
}

interface NavigationActions {
  enterDashboard: () => void;
  openStructure: (structureId: string) => void;
  openRoom: (structureId: string, roomId: string) => void;
  openZone: (structureId: string, roomId: string, zoneId: string) => void;
  openPersonnel: () => void;
  goToStructures: () => void;
  goToRoom: (roomId: string) => void;
  goToStructure: (structureId: string) => void;
  reset: () => void;
  toggleSidebar: (open?: boolean) => void;
}

const initialState: NavigationState = {
  currentView: 'start',
  isSidebarOpen: false,
};

export const useNavigationStore = create<NavigationState & NavigationActions>((set, get) => ({
  ...initialState,
  enterDashboard: () =>
    set((state) => ({
      currentView: 'dashboard',
      selectedStructureId: state.selectedStructureId,
      isSidebarOpen: false,
    })),
  openStructure: (structureId) =>
    set(() => ({
      currentView: 'structure',
      selectedStructureId: structureId,
      selectedRoomId: undefined,
      selectedZoneId: undefined,
      isSidebarOpen: false,
    })),
  openRoom: (structureId, roomId) =>
    set(() => ({
      currentView: 'room',
      selectedStructureId: structureId,
      selectedRoomId: roomId,
      selectedZoneId: undefined,
      isSidebarOpen: false,
    })),
  openZone: (structureId, roomId, zoneId) =>
    set(() => ({
      currentView: 'zone',
      selectedStructureId: structureId,
      selectedRoomId: roomId,
      selectedZoneId: zoneId,
      isSidebarOpen: false,
    })),
  goToStructures: () =>
    set((state) => ({
      currentView: 'dashboard',
      selectedStructureId: state.selectedStructureId,
      selectedRoomId: undefined,
      selectedZoneId: undefined,
      isSidebarOpen: false,
    })),
  goToStructure: (structureId) =>
    set(() => ({
      currentView: 'structure',
      selectedStructureId: structureId,
      selectedRoomId: undefined,
      selectedZoneId: undefined,
      isSidebarOpen: false,
    })),
  openPersonnel: () =>
    set(() => ({
      currentView: 'personnel',
      selectedStructureId: undefined,
      selectedRoomId: undefined,
      selectedZoneId: undefined,
      isSidebarOpen: false,
    })),
  goToRoom: (roomId) => {
    const { selectedStructureId } = get();
    if (!selectedStructureId) {
      return;
    }
    set({
      currentView: 'room',
      selectedRoomId: roomId,
      selectedZoneId: undefined,
      isSidebarOpen: false,
    });
  },
  reset: () => set(initialState),
  toggleSidebar: (open) =>
    set((state) => ({
      isSidebarOpen: open ?? !state.isSidebarOpen,
    })),
}));
