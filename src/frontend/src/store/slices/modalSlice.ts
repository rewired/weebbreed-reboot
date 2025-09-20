import type { StateCreator } from 'zustand';
import type { AppStoreState, ModalDescriptor, ModalSlice } from '../types';

export const createModalSlice: StateCreator<AppStoreState, [], [], ModalSlice> = (set) => ({
  activeModal: null,
  openModal: (modal: ModalDescriptor) => set(() => ({ activeModal: modal })),
  closeModal: () => set(() => ({ activeModal: null })),
});
