import { clamp } from '../../shared/utils/math';

export interface VpdInputs {
  temperature: number; // °C
  humidity: number; // fraction 0..1
}

export interface TranspirationInputs extends VpdInputs {
  leafAreaIndex: number;
  maxTranspirationRate: number; // mmol m^-2 s^-1 equivalent proxy
}

export interface PhotosynthesisInputs {
  ppfd: number; // µmol m^-2 s^-1
  maxPhotosynthesisRate: number; // µmol CO2 m^-2 s^-1
  lightResponseCurve: {
    alpha: number;
    theta: number;
  };
  temperatureFactor: number;
  co2Factor: number;
}

const MIN_VPD = 0.1;
const MAX_VPD = 3.5;

export const saturationVaporPressure = (temperature: number): number =>
  0.6108 * Math.exp((17.27 * temperature) / (temperature + 237.3));

export const calculateVpd = ({ temperature, humidity }: VpdInputs): number => {
  const es = saturationVaporPressure(temperature);
  const ea = es * clamp(humidity, 0, 1);
  const vpd = clamp(es - ea, MIN_VPD, MAX_VPD);
  return vpd;
};

export const calculateTranspiration = (inputs: TranspirationInputs): number => {
  const vpd = calculateVpd(inputs);
  const laiFactor = clamp(inputs.leafAreaIndex / 3, 0.2, 1.5);
  const transpiration = inputs.maxTranspirationRate * laiFactor * (vpd / MAX_VPD);
  return clamp(transpiration, 0, inputs.maxTranspirationRate);
};

export const calculatePhotosynthesis = (inputs: PhotosynthesisInputs): number => {
  const { ppfd, maxPhotosynthesisRate, lightResponseCurve, temperatureFactor, co2Factor } = inputs;
  if (ppfd <= 0) {
    return 0;
  }

  const alpha = lightResponseCurve.alpha;
  const theta = lightResponseCurve.theta;
  const intermediate = (alpha * ppfd + maxPhotosynthesisRate - Math.sqrt((alpha * ppfd + maxPhotosynthesisRate) ** 2 - 4 * theta * alpha * ppfd * maxPhotosynthesisRate)) / (2 * theta);
  const rate = intermediate * temperatureFactor * co2Factor;
  return clamp(rate, 0, maxPhotosynthesisRate);
};

export const gaussianResponse = (value: number, optimum: number, width: number): number => {
  const exponent = -((value - optimum) ** 2) / (2 * width ** 2);
  return Math.exp(exponent);
};
