import { useEffect } from 'react';
import { getSimulationBridge } from '@/facade/systemFacade';
import { useSimulationStore } from '@/store/simulation';

export const useSimulationBridge = () => {
  const bridge = getSimulationBridge();
  const applyUpdate = useSimulationStore((state) => state.applyUpdate);

  useEffect(() => {
    bridge.connect();
    const unsubscribe = bridge.subscribeToUpdates((update) => {
      applyUpdate(update);
    });
    return () => {
      unsubscribe();
    };
  }, [applyUpdate, bridge]);

  return bridge;
};
