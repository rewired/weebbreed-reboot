import { z } from 'zod';
import type { DifficultyConfig } from '@/data/configs/difficulty.js';
import { emptyObjectSchema } from './commonSchemas.js';
import {
  createServiceCommand,
  type CommandRegistration,
  type GenericCommandRegistration,
  type MissingCommandHandler,
  type ServiceCommandHandler,
} from './commandRegistry.js';

const getDifficultyConfigSchema = emptyObjectSchema;

export type GetDifficultyConfigIntent = z.infer<typeof getDifficultyConfigSchema>;

export interface ConfigIntentHandlers {
  getDifficultyConfig: ServiceCommandHandler<GetDifficultyConfigIntent, DifficultyConfig>;
}

export interface ConfigCommandRegistry {
  getDifficultyConfig: CommandRegistration<GetDifficultyConfigIntent, DifficultyConfig>;
  [key: string]: GenericCommandRegistration;
}

export interface ConfigCommandOptions {
  services: () => Partial<ConfigIntentHandlers>;
  onMissingHandler: MissingCommandHandler;
}

export const buildConfigCommands = ({
  services,
  onMissingHandler,
}: ConfigCommandOptions): ConfigCommandRegistry => ({
  getDifficultyConfig: createServiceCommand(
    'config.getDifficultyConfig',
    getDifficultyConfigSchema,
    () => services().getDifficultyConfig,
    onMissingHandler,
    (payload) => payload ?? {},
  ),
});

export const schemas = {
  getDifficultyConfigSchema,
};
