import { promises as fs } from 'fs';
import path from 'path';
import type { SimulationState } from '../../shared/types/simulation';
import type { SaveGame } from '../../shared/types/saveGame';
import { validateSave } from '../../shared/schemas/index';
import { logger } from './logger';

export interface SaveOptions {
  version: string;
  rngSeed: string;
  tickLengthMinutes: number;
}

export class SaveLoadService {
  constructor(private readonly baseDir: string = path.join(process.cwd(), 'saves')) {}

  public async save(state: SimulationState, options: SaveOptions): Promise<string> {
    const payload: SaveGame = {
      kind: 'WeedBreedSave',
      version: options.version,
      createdAt: new Date().toISOString(),
      tickLengthMinutes: options.tickLengthMinutes,
      rngSeed: options.rngSeed,
      state
    };

    validateSave(payload);

    await fs.mkdir(this.baseDir, { recursive: true });
    const fileName = `save-${payload.createdAt.replace(/[:.]/g, '-')}.json`;
    const filePath = path.join(this.baseDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    logger.info({ filePath }, 'Saved simulation state');
    return filePath;
  }

  public async load(filePath: string): Promise<SaveGame> {
    const raw = await fs.readFile(filePath, 'utf-8');
    const payload = JSON.parse(raw) as SaveGame;
    validateSave(payload);
    logger.info({ filePath }, 'Loaded simulation state');
    return payload;
  }
}
