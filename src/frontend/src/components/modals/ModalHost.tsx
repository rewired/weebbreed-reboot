import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { ModalFrame } from '@/components/modals/ModalFrame';
import { Feedback } from '@/components/modals/common';
import type { SimulationBridge } from '@/facade/systemFacade';
import { useSimulationStore } from '@/store/simulation';
import { useUIStore } from '@/store/ui';
import type { ModalDescriptor } from '@/store/ui';
import { modalRegistry, type ModalRenderer } from './modalRegistry';

interface ModalHostProps {
  bridge: SimulationBridge;
}

type PauseContext = {
  resumable: boolean;
  speed: number;
  pauseConfirmed: boolean;
};

const resolveRenderer = (type: ModalDescriptor['type']): ModalRenderer | undefined =>
  modalRegistry[type];

export const ModalHost = ({ bridge }: ModalHostProps) => {
  const activeModal = useUIStore((state) => state.activeModal);
  const closeModal = useUIStore((state) => state.closeModal);
  const pauseContext = useRef<PauseContext | null>(null);
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [pauseFeedback, setPauseFeedback] = useState<string | null>(null);

  const handleCloseModal = useCallback(() => {
    const context = pauseContext.current;
    if (context?.resumable && context.pauseConfirmed) {
      setPauseFeedback(null);
      setResuming(true);
      void bridge
        .sendControl({ action: 'play', gameSpeed: context.speed })
        .then((response) => {
          if (!response.ok) {
            const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
            setPauseFeedback(
              warning ??
                'Failed to resume simulation after modal actions. Please resume from the toolbar.',
            );
            return;
          }
          pauseContext.current = null;
          closeModal();
        })
        .catch((error) => {
          console.error('Failed to resume simulation after modal close', error);
          setPauseFeedback('Connection error while resuming simulation. Please try again.');
        })
        .finally(() => {
          setResuming(false);
        });
      return;
    }
    pauseContext.current = null;
    closeModal();
  }, [bridge, closeModal]);

  useEffect(() => {
    if (!activeModal) {
      const context = pauseContext.current;
      pauseContext.current = null;
      setPausing(false);
      setResuming(false);
      setPauseFeedback(null);
      if (context?.resumable && context.pauseConfirmed) {
        void bridge.sendControl({ action: 'play', gameSpeed: context.speed }).catch((error) => {
          console.error('Failed to resume simulation after modal close', error);
        });
      }
      return;
    }
    if (pauseContext.current) {
      return;
    }
    setPauseFeedback(null);
    setResuming(false);
    const snapshot = useSimulationStore.getState().snapshot;
    const timeStatus = useSimulationStore.getState().timeStatus;
    const timeStatusPaused = typeof timeStatus?.paused === 'boolean' ? timeStatus.paused : null;
    const snapshotPaused = snapshot ? snapshot.clock.isPaused : null;
    let isPaused = true;

    if (timeStatusPaused !== null && snapshotPaused !== null) {
      isPaused = timeStatusPaused === snapshotPaused ? timeStatusPaused : true;
    } else if (timeStatusPaused !== null) {
      isPaused = timeStatusPaused;
    } else if (snapshotPaused !== null) {
      isPaused = snapshotPaused;
    }

    const resumable = !isPaused;
    const speed = timeStatus?.speed ?? snapshot?.clock.targetTickRate ?? 1;
    const context: PauseContext = { resumable, speed, pauseConfirmed: !resumable };
    pauseContext.current = context;
    if (resumable) {
      setPausing(true);
      void bridge
        .sendControl({ action: 'pause' })
        .then((response) => {
          if (pauseContext.current !== context) {
            return;
          }
          if (!response.ok) {
            const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
            setPauseFeedback(
              warning ??
                'Failed to pause simulation before opening the modal. Simulation will keep running.',
            );
            pauseContext.current = null;
            return;
          }
          pauseContext.current = { ...context, pauseConfirmed: true };
        })
        .catch((error) => {
          if (pauseContext.current !== context) {
            return;
          }
          console.error('Failed to pause simulation for modal', error);
          setPauseFeedback(
            'Connection error while pausing simulation. Simulation will keep running.',
          );
          pauseContext.current = null;
        })
        .finally(() => {
          if (pauseContext.current === context) {
            setPausing(false);
          } else if (!pauseContext.current) {
            setPausing(false);
          }
        });
    }
  }, [activeModal, bridge]);

  const content = useMemo<ReactElement | null>(() => {
    if (!activeModal) {
      return null;
    }
    const renderer = resolveRenderer(activeModal.type);
    if (!renderer) {
      return null;
    }
    return renderer({ bridge, closeModal: handleCloseModal, context: activeModal.context });
  }, [activeModal, bridge, handleCloseModal]);

  if (!activeModal || !content) {
    return null;
  }

  const subtitle = pausing
    ? 'Pausing simulation…'
    : resuming
      ? 'Resuming simulation…'
      : activeModal.subtitle;

  return (
    <ModalFrame title={activeModal.title} subtitle={subtitle} onClose={handleCloseModal}>
      {pauseFeedback ? <Feedback message={pauseFeedback} /> : null}
      {content}
    </ModalFrame>
  );
};
