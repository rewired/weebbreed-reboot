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
  | 'deleteZone'
  | 'recruitStaff'
  | 'hireApplicant'
  | 'fireEmployee'
  | 'rejectApplicant'
  | 'employeeDetails'
  | 'plantZone'
  | 'installDevice'
  | 'tuneDevice'
  | 'moveDevice'
  | 'removeDevice'
  | 'confirmPlantAction';

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
  theme: 'weedbreed' | 'forest' | 'light';
  toasts: ToastDescriptor[];
}

interface UIActions {
  openModal: (modal: ModalDescriptor) => void;
  closeModal: () => void;
  markNotificationsRead: () => void;
  incrementNotifications: (count?: number) => void;
  setTheme: (theme: UIState['theme']) => void;
  pushToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
}

export interface ToastDescriptor {
  id: string;
  tone: 'info' | 'success' | 'warning' | 'error';
  title: string;
  description?: string;
  durationMs?: number;
}

type ToastInput = Omit<ToastDescriptor, 'id'> & { id?: string };

export const useUIStore = create<UIState & UIActions>((set) => ({
  activeModal: null,
  modalQueue: [],
  notificationsUnread: 0,
  theme: 'weedbreed',
  toasts: [],
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
      const { classList } = document.documentElement;
      classList.remove('theme-light', 'theme-forest', 'theme-weedbreed');
      if (theme === 'light') {
        classList.add('theme-light');
      } else if (theme === 'forest') {
        classList.add('theme-forest');
      } else {
        classList.add('theme-weedbreed');
      }
      return { theme };
    }),
  pushToast: (toast) => {
    const id =
      toast.id ??
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `toast_${Date.now()}`);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    return id;
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
