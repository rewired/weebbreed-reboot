import { useEffect } from 'react';
import { getSimulationBridge } from '@/facade/systemFacade';

export const useSimulationBridge = () => {
  const bridge = getSimulationBridge();

  useEffect(() => {
    bridge.connect();
  }, [bridge]);

  return bridge;
};
