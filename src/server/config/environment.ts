import dotenv from 'dotenv';

dotenv.config();

export interface EnvironmentConfig {
  port: number;
  tickLengthMinutes: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  rngSeed: string;
  fastForwardMultiplier: number;
}

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const loadConfig = (): EnvironmentConfig => ({
  port: parseNumber(process.env.PORT, 4000),
  tickLengthMinutes: parseNumber(process.env.TICK_LENGTH_MINUTES, 1),
  logLevel: (process.env.LOG_LEVEL as EnvironmentConfig['logLevel']) ?? 'info',
  rngSeed: process.env.RNG_SEED ?? 'weedbreed-seed',
  fastForwardMultiplier: parseNumber(process.env.FAST_FORWARD_MULTIPLIER, 10)
});
