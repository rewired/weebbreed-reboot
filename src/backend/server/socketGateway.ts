import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { SimulationEngine } from '../sim/simulation.js';
import { eventBus } from '../lib/eventBus.js';
import { createSimulationSnapshot } from '../lib/serialization.js';
import type { SimulationSnapshot } from '../../shared/domain.js';
import { logger } from '../lib/logger.js';

interface SimulationControlMessage {
  action: 'play' | 'pause' | 'step' | 'fastForward' | 'setTickLength';
  minutes?: number;
  speed?: number;
}

export class SocketGateway {
  private io?: Server;
  private readonly server = createServer();
  private subscription?: { unsubscribe: () => void };

  constructor(private readonly simulation: SimulationEngine) {}

  public async start(port: number): Promise<void> {
    this.io = new Server(this.server, {
      cors: {
        origin: '*'
      }
    });

    this.io.on('connection', (socket) => {
      logger.info({ socketId: socket.id }, 'Client connected');
      socket.emit('simulationUpdate', this.createSnapshot());
      socket.on('simulationControl', (message: SimulationControlMessage) => {
        this.handleControl(message);
      });
      socket.on('disconnect', () => {
        logger.info({ socketId: socket.id }, 'Client disconnected');
      });
    });

    this.subscription = eventBus.events.subscribe((event) => {
      this.io?.emit(event.type, event);
      if (event.type === 'sim.tickCompleted') {
        this.io?.emit('simulationUpdate', event.payload as SimulationSnapshot);
      }
    });

    await new Promise<void>((resolve) => {
      this.server.listen(port, () => {
        logger.info({ port }, 'Socket server started');
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    this.subscription?.unsubscribe();
    if (this.io) {
      this.io.removeAllListeners();
    }
    await new Promise<void>((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private handleControl(message: SimulationControlMessage): void {
    switch (message.action) {
      case 'play':
        this.simulation.play();
        break;
      case 'pause':
        this.simulation.pause();
        break;
      case 'step':
        void this.simulation.step();
        break;
      case 'fastForward':
        if (message.speed) {
          this.simulation.fastForward(message.speed);
        }
        break;
      case 'setTickLength':
        if (message.minutes) {
          this.simulation.setTickLength(message.minutes);
        }
        break;
      default:
        logger.warn({ message }, 'Unknown simulation control action');
    }
  }

  private createSnapshot(): SimulationSnapshot {
    const state = this.simulation.snapshot;
    return createSimulationSnapshot(state);
  }
}
