import pino from 'pino';
import { loadConfig } from '../config/environment';

const config = loadConfig();

export const logger = pino({
  level: config.logLevel,
  base: undefined
});
