import { describe, expect, it } from 'vitest';
import { addDeviceToZone } from './devices.js';
import type { DeviceInstanceState, ZoneState } from './models.js';

const baseMaintenance: DeviceInstanceState['maintenance'] = {
  lastServiceTick: 0,
  nextDueTick: 24,
  condition: 1,
  runtimeHoursAtLastService: 0,
  degradation: 0,
};

const createZone = (overrides: Partial<ZoneState> = {}): ZoneState => ({
  id: overrides.id ?? 'zone-1',
  roomId: overrides.roomId ?? 'room-1',
  name: overrides.name ?? 'Alpha Zone',
  cultivationMethodId: overrides.cultivationMethodId ?? 'method-1',
  strainId: overrides.strainId ?? 'strain-1',
  area: overrides.area ?? 10,
  ceilingHeight: overrides.ceilingHeight ?? 3,
  volume: overrides.volume ?? 30,
  environment:
    overrides.environment ??
    ({
      temperature: 24,
      relativeHumidity: 0.6,
      co2: 900,
      ppfd: 500,
      vpd: 1.2,
    } satisfies ZoneState['environment']),
  resources:
    overrides.resources ??
    ({
      waterLiters: 100,
      nutrientSolutionLiters: 50,
      nutrientStrength: 1,
      substrateHealth: 1,
      reservoirLevel: 0.8,
    } satisfies ZoneState['resources']),
  plants: overrides.plants ?? [],
  devices: overrides.devices ?? [],
  metrics:
    overrides.metrics ??
    ({
      averageTemperature: 24,
      averageHumidity: 0.6,
      averageCo2: 900,
      averagePpfd: 500,
      stressLevel: 0,
      lastUpdatedTick: 0,
    } satisfies ZoneState['metrics']),
  control:
    overrides.control ??
    ({
      setpoints: { ...(overrides.control?.setpoints ?? {}) },
    } satisfies ZoneState['control']),
  health:
    overrides.health ??
    ({
      plantHealth: {},
      pendingTreatments: [],
      appliedTreatments: [],
    } satisfies ZoneState['health']),
  activeTaskIds: overrides.activeTaskIds ?? [],
});

const createDevice = (
  id: string,
  settings: Record<string, unknown>,
  overrides: Partial<DeviceInstanceState> = {},
): DeviceInstanceState => ({
  id,
  blueprintId: overrides.blueprintId ?? `${id}-blueprint`,
  kind: overrides.kind ?? 'Lamp',
  name: overrides.name ?? `Device ${id}`,
  zoneId: overrides.zoneId ?? 'zone-1',
  status: overrides.status ?? 'operational',
  efficiency: overrides.efficiency ?? 1,
  runtimeHours: overrides.runtimeHours ?? 0,
  maintenance: overrides.maintenance ?? { ...baseMaintenance },
  settings: { ...settings },
});

describe('addDeviceToZone', () => {
  it('accepts devices that fit within zone geometry without warnings', () => {
    const zone = createZone();
    const device = createDevice('device-1', { coverageArea: 8, airflow: 80 });

    const result = addDeviceToZone(zone, device);

    expect(result.added).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(zone.devices).toHaveLength(1);
    expect(zone.devices[0]?.settings.coverageArea).toBe(8);
    expect(zone.devices[0]?.settings.airflow).toBe(80);
  });

  it('rejects devices with invalid coverage area definitions', () => {
    const zone = createZone();
    const device = createDevice('device-invalid', { coverageArea: 0 });

    const result = addDeviceToZone(zone, device);

    expect(result.added).toBe(false);
    expect(zone.devices).toHaveLength(0);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'invalid-coverage', level: 'error' }),
      ]),
    );
  });

  it('clamps airflow and flags oversubscription when exceeding zone capacity', () => {
    const zone = createZone({ area: 10, volume: 30 });
    const baseline = createDevice('device-baseline', { coverageArea: 6, airflow: 60 });
    const initial = addDeviceToZone(zone, baseline);

    expect(initial.added).toBe(true);
    expect(zone.devices).toHaveLength(1);

    const oversubscribed = createDevice('device-oversub', { coverageArea: 8, airflow: 200 });
    const result = addDeviceToZone(zone, oversubscribed);

    expect(result.added).toBe(true);
    expect(zone.devices).toHaveLength(2);
    expect(zone.devices[1]?.settings.airflow).toBeCloseTo(90, 6);
    expect(result.warnings.map((warning) => warning.type)).toEqual(
      expect.arrayContaining([
        'coverage-oversubscribed',
        'airflow-clamped',
        'airflow-oversubscribed',
      ]),
    );
  });
});
