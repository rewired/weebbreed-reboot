import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { SimulationState } from '../../shared/domain.js';
import { saveGameSchema } from '../schemas/savegame.js';
import { logger } from '../lib/logger.js';

const SAVE_VERSION = '1.0.0';

export class SaveLoadService {
  constructor(private readonly directory: string) {}

  public async save(state: SimulationState, fileName?: string): Promise<string> {
    const name = fileName ?? `save-${state.tick}.json`;
    const filePath = path.resolve(this.directory, name);
    const payload = {
      kind: 'WeedBreedSave',
      version: SAVE_VERSION,
      createdAt: new Date().toISOString(),
      tickLengthMinutes: state.tickLengthMinutes,
      rngSeed: state.rngSeed,
      state
    };
    await fs.mkdir(this.directory, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    logger.info({ filePath }, 'Simulation saved');
    return filePath;
  }

  public async load(filePath: string): Promise<SimulationState> {
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = saveGameSchema.parse(JSON.parse(data));
    logger.info({ filePath }, 'Simulation loaded');
    return parsed.state;
  }
}
