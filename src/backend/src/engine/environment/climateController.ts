import {
  CLIMATE_CONTROLLER_DEFAULT_CO2_CONFIG,
  CLIMATE_CONTROLLER_DEFAULT_HUMIDITY_CONFIG,
  CLIMATE_CONTROLLER_DEFAULT_OUTPUT_STEP,
  CLIMATE_CONTROLLER_DEFAULT_TEMPERATURE_CONFIG,
} from '@/constants/environment.js';

export interface SinglePIControllerConfig {
  kp: number;
  ki: number;
  min?: number;
  max?: number;
}

export interface ClimateControllerOptions {
  temperature?: SinglePIControllerConfig;
  humidity?: SinglePIControllerConfig;
  co2?: SinglePIControllerConfig;
  outputStep?: number;
}

export interface ClimateControlSetpoints {
  temperature: number;
  humidity: number;
  co2: number;
}

export interface ClimateControlFeedback {
  temperature: number;
  humidity: number;
  co2: number;
}

export interface ClimateControlOutput {
  temperatureHeating: number;
  temperatureCooling: number;
  humidityHumidify: number;
  humidityDehumidify: number;
  co2Injection: number;
}

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

class SinglePIController {
  private integral = 0;

  constructor(private readonly config: Required<SinglePIControllerConfig>) {}

  update(error: number, dtMinutes: number): number {
    const { kp, ki, min, max } = this.config;
    const dt = Math.max(dtMinutes, 0);

    if (dt === 0 || ki === 0) {
      const proportional = kp * error;
      return clamp(proportional, min, max);
    }

    const deltaIntegral = error * dt;
    const candidateIntegral = this.integral + deltaIntegral;
    const candidateOutput = kp * error + ki * candidateIntegral;

    let integral = this.integral;
    let output: number;

    if (candidateOutput > max && error > 0) {
      output = max;
    } else if (candidateOutput < min && error < 0) {
      output = min;
    } else {
      integral = candidateIntegral;
      output = clamp(candidateOutput, min, max);
    }

    this.integral = integral;
    return output;
  }
}

export class ClimateController {
  private readonly temperature: SinglePIController;

  private readonly humidity: SinglePIController;

  private readonly co2: SinglePIController;

  private readonly outputStep: number;

  constructor(options: ClimateControllerOptions = {}) {
    const temperatureConfig: Required<SinglePIControllerConfig> = {
      ...CLIMATE_CONTROLLER_DEFAULT_TEMPERATURE_CONFIG,
      ...options.temperature,
      min: options.temperature?.min ?? CLIMATE_CONTROLLER_DEFAULT_TEMPERATURE_CONFIG.min,
      max: options.temperature?.max ?? CLIMATE_CONTROLLER_DEFAULT_TEMPERATURE_CONFIG.max,
    };

    const humidityConfig: Required<SinglePIControllerConfig> = {
      ...CLIMATE_CONTROLLER_DEFAULT_HUMIDITY_CONFIG,
      ...options.humidity,
      min: options.humidity?.min ?? CLIMATE_CONTROLLER_DEFAULT_HUMIDITY_CONFIG.min,
      max: options.humidity?.max ?? CLIMATE_CONTROLLER_DEFAULT_HUMIDITY_CONFIG.max,
    };

    const co2Config: Required<SinglePIControllerConfig> = {
      ...CLIMATE_CONTROLLER_DEFAULT_CO2_CONFIG,
      ...options.co2,
      min: options.co2?.min ?? CLIMATE_CONTROLLER_DEFAULT_CO2_CONFIG.min,
      max: options.co2?.max ?? CLIMATE_CONTROLLER_DEFAULT_CO2_CONFIG.max,
    };

    this.temperature = new SinglePIController(temperatureConfig);
    this.humidity = new SinglePIController(humidityConfig);
    this.co2 = new SinglePIController(co2Config);
    this.outputStep = options.outputStep ?? CLIMATE_CONTROLLER_DEFAULT_OUTPUT_STEP;
  }

  update(
    setpoints: ClimateControlSetpoints,
    feedback: ClimateControlFeedback,
    tickLengthMinutes: number,
  ): ClimateControlOutput {
    const dt = Math.max(tickLengthMinutes, 0);

    const temperatureError = setpoints.temperature - feedback.temperature;
    const rawTemperature = this.temperature.update(temperatureError, dt);
    const heating = rawTemperature > 0 ? this.quantize(rawTemperature) : 0;
    const cooling = rawTemperature < 0 ? this.quantize(Math.abs(rawTemperature)) : 0;

    const humidityError = setpoints.humidity - feedback.humidity;
    const rawHumidity = this.humidity.update(humidityError, dt);
    const humidify = rawHumidity > 0 ? this.quantize(rawHumidity) : 0;
    const dehumidify = rawHumidity < 0 ? this.quantize(Math.abs(rawHumidity)) : 0;

    const co2Error = setpoints.co2 - feedback.co2;
    const rawCo2 = this.co2.update(co2Error, dt);
    const injection = this.quantize(Math.max(0, rawCo2));

    return {
      temperatureHeating: heating,
      temperatureCooling: cooling,
      humidityHumidify: humidify,
      humidityDehumidify: dehumidify,
      co2Injection: injection,
    };
  }

  private quantize(value: number): number {
    const normalized = clamp(value, 0, 100);
    if (!Number.isFinite(normalized) || normalized === 0) {
      return 0;
    }

    const step = Math.max(this.outputStep, 1);
    const discrete = Math.round(normalized / step) * step;
    return clamp(discrete, 0, 100);
  }
}
