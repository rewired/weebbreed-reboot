import { describe, expect, it } from 'vitest';
import { ClimateController } from './climateController.js';

describe('ClimateController', () => {
  const baseSetpoints = {
    temperature: 24,
    humidity: 0.6,
    co2: 1000,
  };

  it('increases heating power when below the temperature setpoint', () => {
    const controller = new ClimateController();
    const output = controller.update(
      baseSetpoints,
      {
        temperature: 22,
        humidity: 0.6,
        co2: 1000,
      },
      1,
    );

    expect(output.temperatureHeating).toBe(42);
    expect(output.temperatureCooling).toBe(0);
    expect(Number.isInteger(output.temperatureHeating)).toBe(true);
  });

  it('requests cooling when above the temperature setpoint', () => {
    const controller = new ClimateController();
    const output = controller.update(
      baseSetpoints,
      {
        temperature: 28,
        humidity: 0.6,
        co2: 1000,
      },
      1,
    );

    expect(output.temperatureHeating).toBe(0);
    expect(output.temperatureCooling).toBe(84);
  });

  it('handles humidification and dehumidification', () => {
    const humidifyController = new ClimateController();

    const humidify = humidifyController.update(
      baseSetpoints,
      {
        temperature: 24,
        humidity: 0.5,
        co2: 1000,
      },
      1,
    );
    expect(humidify.humidityHumidify).toBe(44);
    expect(humidify.humidityDehumidify).toBe(0);

    const dehumidifyController = new ClimateController();
    const dehumidify = dehumidifyController.update(
      baseSetpoints,
      {
        temperature: 24,
        humidity: 0.7,
        co2: 1000,
      },
      1,
    );
    expect(dehumidify.humidityHumidify).toBe(0);
    expect(dehumidify.humidityDehumidify).toBe(44);
  });

  it('modulates CO₂ injection when below the target', () => {
    const controller = new ClimateController();
    const output = controller.update(
      baseSetpoints,
      {
        temperature: 24,
        humidity: 0.6,
        co2: 700,
      },
      1,
    );

    expect(output.co2Injection).toBe(36);
    expect(Number.isInteger(output.co2Injection)).toBe(true);
  });

  it('prevents integrator windup under saturation', () => {
    const controller = new ClimateController();

    for (let i = 0; i < 5; i += 1) {
      const saturated = controller.update(
        { ...baseSetpoints, temperature: 40 },
        {
          temperature: 10,
          humidity: 0.4,
          co2: 300,
        },
        1,
      );
      expect(saturated.temperatureHeating).toBe(100);
    }

    const recovery = controller.update(
      baseSetpoints,
      {
        temperature: 26,
        humidity: 0.6,
        co2: 1100,
      },
      1,
    );

    expect(recovery.temperatureHeating).toBe(0);
    expect(recovery.temperatureCooling).toBeGreaterThan(0);
    expect(recovery.temperatureCooling).toBeLessThanOrEqual(100);
  });
});
