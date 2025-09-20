import dotenv from 'dotenv';

dotenv.config();

export interface SimulationConfig {
  tickLengthMinutes: number;
  seed: string;
  dataPath: string;
  socketPort: number;
  maxTicksPerFrame: number;
}

export const config: SimulationConfig = {
  tickLengthMinutes: Number(process.env.TICK_LENGTH_MINUTES ?? 5),
  seed: process.env.SIM_SEED ?? 'wb-sim-seed',
  dataPath: process.env.DATA_PATH ?? new URL('../../data', import.meta.url).pathname,
  socketPort: Number(process.env.SOCKET_PORT ?? 4050),
  maxTicksPerFrame: Number(process.env.MAX_TICKS_PER_FRAME ?? 10)
};
