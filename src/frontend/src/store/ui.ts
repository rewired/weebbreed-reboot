import { create } from 'zustand';

type ModalType =
  | 'gameMenu'
  | 'loadGame'
  | 'importGame'
  | 'newGame'
  | 'notifications'
  | 'rentStructure'
  | 'duplicateStructure'
  | 'renameStructure'
  | 'deleteStructure'
  | 'createRoom'
  | 'duplicateRoom'
  | 'deleteRoom'
  | 'createZone'
  | 'deleteZone';

export interface ModalDescriptor {
  id: string;
  type: ModalType;
  title: string;
  subtitle?: string;
  context?: Record<string, unknown>;
}

interface UIState {
  activeModal: ModalDescriptor | null;
  modalQueue: ModalDescriptor[];
  notificationsUnread: number;
  theme: 'dark' | 'light';
}

interface UIActions {
  openModal: (modal: ModalDescriptor) => void;
  closeModal: () => void;
  markNotificationsRead: () => void;
  incrementNotifications: (count?: number) => void;
  setTheme: (theme: UIState['theme']) => void;
}

export const useUIStore = create<UIState & UIActions>((set) => ({
  activeModal: null,
  modalQueue: [],
  notificationsUnread: 0,
  theme: 'dark',
  openModal: (modal) =>
    set((state) => {
      if (state.activeModal) {
        return { modalQueue: [...state.modalQueue, modal] };
      }
      document.documentElement.dataset.blur = 'true';
      return { activeModal: modal };
    }),
  closeModal: () =>
    set((state) => {
      const next = state.modalQueue[0] ?? null;
      if (!next) {
        delete document.documentElement.dataset.blur;
        return { activeModal: null, modalQueue: [] };
      }
      return { activeModal: next, modalQueue: state.modalQueue.slice(1) };
    }),
  markNotificationsRead: () => set({ notificationsUnread: 0 }),
  incrementNotifications: (count = 1) =>
    set((state) => ({ notificationsUnread: Math.max(0, state.notificationsUnread + count) })),
  setTheme: (theme) =>
    set(() => {
      if (theme === 'light') {
        document.documentElement.classList.add('theme-light');
      } else {
        document.documentElement.classList.remove('theme-light');
      }
      return { theme };
    }),
}));
