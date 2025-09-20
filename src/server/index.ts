import http from 'node:http';
import { Server } from 'socket.io';
import type { SimulationControlEvent } from '../shared/types/events';
import { loadConfig } from './config/environment';
import { SimulationService } from './services/simulationService';
import { eventBus } from './services/eventBus';
import { logger } from './services/logger';

const config = loadConfig();
const simulationService = new SimulationService(config);

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

const handleControl = async (event: SimulationControlEvent) => {
  switch (event.action) {
    case 'play':
      simulationService.start();
      break;
    case 'pause':
      simulationService.pause();
      break;
    case 'step':
      await simulationService.step();
      break;
    case 'fastForward':
      simulationService.setSpeed(event.multiplier);
      break;
    case 'setTickLength':
      simulationService.setTickLength(event.minutes);
      break;
    case 'setSetpoint':
      simulationService.setSetpoint(event.target, event.value);
      break;
    default:
      logger.warn({ event }, 'Unknown simulation control event');
  }
};

const start = async () => {
  await simulationService.initialize();
  simulationService.start();

  eventBus.onEvent().subscribe((event) => {
    if (event.type === 'simulationUpdate') {
      io.emit('simulationUpdate', event.payload);
    } else {
      io.emit(event.type, event.payload);
    }
  });

  io.on('connection', (socket) => {
    logger.info({ id: socket.id }, 'Client connected');
    socket.emit('simulationInit', simulationService.getSnapshot());

    socket.on('simulationControl', (control: SimulationControlEvent) => {
      handleControl(control).catch((error) => {
        logger.error({ err: error }, 'Failed to handle simulation control');
        socket.emit('sim.error', { message: (error as Error).message });
      });
    });

    socket.on('disconnect', () => {
      logger.info({ id: socket.id }, 'Client disconnected');
    });
  });

  server.listen(config.port, () => {
    logger.info({ port: config.port }, 'Server started');
  });
};

start().catch((error) => {
  logger.error({ err: error }, 'Failed to start server');
  process.exit(1);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down');
  simulationService.pause();
  server.close(() => process.exit(0));
});
