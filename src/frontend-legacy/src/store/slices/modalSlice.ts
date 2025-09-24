import type { StateCreator } from 'zustand';
import { useGameStore } from '../gameStore';
import { selectIsPaused } from '../selectors';
import type { AppStoreState, ModalDescriptor, ModalSlice } from '../types';

export const createModalSlice: StateCreator<AppStoreState, [], [], ModalSlice> = (set, get) => ({
  activeModal: null,
  wasRunningBeforeModal: false,
  openModal: (modal: ModalDescriptor) => {
    const shouldAutoPause = modal.autoPause ?? true;
    const previousWasRunning = get().wasRunningBeforeModal;
    let resumeOnClose = previousWasRunning;

    if (shouldAutoPause) {
      const gameState = useGameStore.getState();
      const isCurrentlyPaused = selectIsPaused(gameState);

      if (!isCurrentlyPaused) {
        gameState.issueControlCommand?.({ action: 'pause' });
        resumeOnClose = true;
      }
    }

    set({
      activeModal: modal,
      wasRunningBeforeModal: resumeOnClose,
    });
  },
  closeModal: () => {
    const { wasRunningBeforeModal } = get();

    set({ activeModal: null, wasRunningBeforeModal: false });

    if (wasRunningBeforeModal) {
      const gameState = useGameStore.getState();
      gameState.issueControlCommand?.({ action: 'resume' });
    }
  },
});
