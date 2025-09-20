import { config } from './config.js';
import { loadBlueprintRegistry } from './data/loader.js';
import { createInitialWorldState } from './data/worldFactory.js';
import { SimulationEngine } from './sim/simulation.js';
import { SocketGateway } from './server/socketGateway.js';
import { SaveLoadService } from './services/saveLoadService.js';
import { logger } from './lib/logger.js';

async function bootstrap(): Promise<void> {
  try {
    logger.info('Loading blueprints');
    const registry = await loadBlueprintRegistry(config.dataPath);
    const state = createInitialWorldState(registry);
    const simulation = new SimulationEngine(state);
    const gateway = new SocketGateway(simulation);
    const saveService = new SaveLoadService(new URL('../../saves', import.meta.url).pathname);

    await gateway.start(config.socketPort);
    simulation.play();

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down');
      simulation.pause();
      await gateway.stop();
      await saveService.save(simulation.snapshot, 'autosave.json');
      process.exit(0);
    });
  } catch (error) {
    logger.error({ err: error }, 'Bootstrap failed');
    process.exit(1);
  }
}

void bootstrap();
