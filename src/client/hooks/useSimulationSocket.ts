import { useCallback, useEffect, useState } from 'react';
import type { SimulationControlEvent } from '../../shared/types/events';
import type { SimulationSnapshot } from '../../shared/types/simulation';
import { connectSimulationSocket, type SimulationSocket } from '../services/socketClient';
import { useSimulationStore, type SimulationUpdatePayload } from '../store/simulationStore';

const snapshotToUpdate = (snapshot: SimulationSnapshot): SimulationUpdatePayload => ({
  tick: snapshot.clock.tick,
  ts: snapshot.clock.lastTickCompletedAt,
  env: snapshot.zones.map((zone) => ({
    zoneId: zone.id,
    temperature: zone.environment.temperature,
    humidity: zone.environment.humidity,
    co2: zone.environment.co2,
    ppfd: zone.environment.ppfd,
    vpd: zone.environment.vpd
  })),
  plants: snapshot.plants.map((plant) => ({
    id: plant.id,
    stage: plant.stage,
    biomass: plant.biomassDryGrams,
    health: plant.health,
    stress: plant.stress
  })),
  events: []
});

export const useSimulationSocket = () => {
  const [socket, setSocket] = useState<SimulationSocket | null>(null);
  const setConnected = useSimulationStore((state) => state.setConnected);
  const applyUpdate = useSimulationStore((state) => state.applyUpdate);
  const reset = useSimulationStore((state) => state.reset);

  useEffect(() => {
    const socketInstance = connectSimulationSocket();
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
      reset();
    });

    socketInstance.on('simulationInit', (payload: SimulationSnapshot) => {
      applyUpdate(snapshotToUpdate(payload));
    });

    socketInstance.on('simulationUpdate', (payload: unknown) => {
      const update = payload as SimulationUpdatePayload;
      if (update && typeof update === 'object' && 'tick' in update) {
        applyUpdate(update);
      }
    });

    socketInstance.on('sim.error', (payload) => {
      // eslint-disable-next-line no-console
      console.error('Simulation error', payload);
    });

    return () => {
      socketInstance.disconnect();
      setConnected(false);
    };
  }, [applyUpdate, reset, setConnected]);

  const sendControl = useCallback(
    (event: SimulationControlEvent) => {
      socket?.emit('simulationControl', event);
    },
    [socket]
  );

  return { socket, sendControl };
};
