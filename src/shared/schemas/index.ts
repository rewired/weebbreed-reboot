import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { strainSchema } from './strainSchema';
import { deviceSchema } from './deviceSchema';
import { cultivationMethodSchema } from './cultivationMethodSchema';
import { saveGameSchema } from './saveGameSchema';
import type { BlueprintBundle } from '../types/blueprints';
import type { SaveGame } from '../types/saveGame';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export const validateStrain = ajv.compile(strainSchema);
export const validateDevice = ajv.compile(deviceSchema);
export const validateCultivationMethod = ajv.compile(cultivationMethodSchema);
export const validateSaveGame = ajv.compile(saveGameSchema);

export type SaveGameValidator = ReturnType<typeof validateSaveGame>;
export type BlueprintValidators = {
  strain: typeof validateStrain;
  device: typeof validateDevice;
  cultivation: typeof validateCultivationMethod;
};

export const validators: BlueprintValidators = {
  strain: validateStrain,
  device: validateDevice,
  cultivation: validateCultivationMethod
};

export const validateBlueprintBundle = (bundle: BlueprintBundle) => {
  bundle.strains.forEach((strain) => {
    if (!validateStrain(strain)) {
      throw new Error(`Strain blueprint validation failed: ${ajv.errorsText(validateStrain.errors)}`);
    }
  });

  bundle.devices.forEach((device) => {
    if (!validateDevice(device)) {
      throw new Error(`Device blueprint validation failed: ${ajv.errorsText(validateDevice.errors)}`);
    }
  });

  bundle.cultivationMethods.forEach((method) => {
    if (!validateCultivationMethod(method)) {
      throw new Error(`Cultivation method validation failed: ${ajv.errorsText(validateCultivationMethod.errors)}`);
    }
  });
};

export const validateSave = (save: SaveGame) => {
  if (!validateSaveGame(save)) {
    throw new Error(`Savegame validation failed: ${ajv.errorsText(validateSaveGame.errors)}`);
  }
};
