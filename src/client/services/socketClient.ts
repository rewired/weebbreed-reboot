import { io, type Socket } from 'socket.io-client';
import type { SimulationControlEvent } from '../../shared/types/events';

export type SimulationSocket = Socket<
  {
    simulationUpdate: (payload: unknown) => void;
    'sim.tickCompleted': (payload: unknown) => void;
    'sim.error': (payload: { message: string }) => void;
  },
  {
    simulationControl: (event: SimulationControlEvent) => void;
  }
>;

export const connectSimulationSocket = (): SimulationSocket => {
  const socket: SimulationSocket = io({
    autoConnect: false
  });

  socket.connect();
  return socket;
};
