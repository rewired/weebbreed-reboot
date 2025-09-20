import { performance } from 'node:perf_hooks';
import { loadConfig } from '../config/environment';
import { SimulationService } from '../services/simulationService';

const run = async () => {
  const config = loadConfig();
  const simulation = new SimulationService(config);
  await simulation.initialize();
  const iterations = 50;
  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await simulation.step();
  }
  const duration = performance.now() - start;
  // eslint-disable-next-line no-console
  console.log(`Executed ${iterations} ticks in ${duration.toFixed(2)} ms (avg ${(duration / iterations).toFixed(2)} ms)`);
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Benchmark failed', error);
  process.exit(1);
});
