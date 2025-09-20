import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { SimulationEvent, SimulationSnapshot } from '../../shared/domain.js';
import { useSimulationStore } from '../store/simulationStore.ts';

export interface SimulationControlMessage {
  action: 'play' | 'pause' | 'step' | 'fastForward' | 'setTickLength';
  minutes?: number;
  speed?: number;
}

export function useSimulationSocket(endpoint: string) {
  const updateFromSnapshot = useSimulationStore((state) => state.updateFromSnapshot);
  const appendEvent = useSimulationStore((state) => state.appendEvent);
  const socketRef = useRef<Socket>();

  useEffect(() => {
    const socket = io(endpoint, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('simulationUpdate', (snapshot: SimulationSnapshot) => {
      updateFromSnapshot(snapshot);
    });

    const eventHandler = (event: SimulationEvent) => {
      appendEvent(event);
    };

    socket.on('sim.tickCompleted', (event: SimulationEvent<SimulationSnapshot>) => {
      appendEvent(event);
      if (event.payload) {
        updateFromSnapshot(event.payload);
      }
    });

    socket.on('plant.stageChanged', eventHandler);
    socket.on('plant.harvestReady', eventHandler);
    socket.on('zone.irrigationLow', eventHandler);
    socket.on('accounting.tick', eventHandler);

    return () => {
      socket.disconnect();
    };
  }, [appendEvent, endpoint, updateFromSnapshot]);

  const sendControl = (message: SimulationControlMessage) => {
    socketRef.current?.emit('simulationControl', message);
  };

  return { sendControl };
}
