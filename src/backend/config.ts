import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

export interface SimulationConfig {
  tickLengthMinutes: number;
  seed: string;
  dataPath: string;
  socketPort: number;
  maxTicksPerFrame: number;
}

const defaultDataPath = fileURLToPath(new URL('../../data', import.meta.url));

export const config: SimulationConfig = {
  tickLengthMinutes: Number(process.env.TICK_LENGTH_MINUTES ?? 5),
  seed: process.env.SIM_SEED ?? 'wb-sim-seed',
  dataPath: process.env.DATA_PATH ? path.resolve(process.env.DATA_PATH) : defaultDataPath,
  socketPort: Number(process.env.SOCKET_PORT ?? 4050),
  maxTicksPerFrame: Number(process.env.MAX_TICKS_PER_FRAME ?? 10)
};
