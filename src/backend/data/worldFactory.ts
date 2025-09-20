import type { BlueprintRegistry } from './loader.js';
import type { SimulationState, ZoneState, DeviceInstance } from '../../shared/domain.js';
import { createPlantInstance } from '../engine/plantModel.js';
import { calculateVpd } from '../engine/envPhysics.js';
import { config } from '../config.js';

function pickDevice(devices: DeviceInstance[], kind: string): DeviceInstance | undefined {
  return devices.find((device) => device.blueprint.kind === kind);
}

function instantiateDevices(registry: BlueprintRegistry): DeviceInstance[] {
  return registry.devices.map((blueprint) => ({
    id: blueprint.id,
    blueprint,
    isActive: true,
    coverageArea: blueprint.settings.coverageArea
  }));
}

export function createInitialWorldState(registry: BlueprintRegistry): SimulationState {
  const zoneArea = 12;
  const zoneHeight = 3;
  const volume = zoneArea * zoneHeight;
  const ambientTemperature = 24;
  const ambientHumidity = 0.6;
  const ambientCo2 = 900;
  const vpd = calculateVpd(ambientTemperature, ambientHumidity);
  const allDevices = instantiateDevices(registry);

  const zone: ZoneState = {
    id: 'zone-default',
    name: 'Default Zone',
    area: zoneArea,
    height: zoneHeight,
    volume,
    ambient: {
      temperature: ambientTemperature,
      humidity: ambientHumidity,
      co2: ambientCo2
    },
    environment: {
      temperature: ambientTemperature,
      humidity: ambientHumidity,
      co2: ambientCo2,
      ppfd: 0,
      vpd
    },
    devices: allDevices.filter((device) => ['Lamp', 'GrowLight', 'ClimateUnit', 'Dehumidifier', 'CO2Injector'].includes(device.blueprint.kind)),
    plants: [],
    irrigationReservoir_L: 100,
    lastIrrigationSatisfaction: 1,
    nutrientSatisfaction: 1,
    lastWaterSupplied_L: 0
  };

  if (registry.strains.length === 0) {
    throw new Error('No strains available to seed the simulation.');
  }
  const defaultStrain = registry.strains[0];
  const plantCount = 6;
  for (let i = 0; i < plantCount; i += 1) {
    zone.plants.push(createPlantInstance(defaultStrain));
  }

  // Ensure there is at least one light active to drive PPFD later
  const lamp = pickDevice(zone.devices, 'Lamp') ?? pickDevice(zone.devices, 'GrowLight');
  if (!lamp) {
    zone.devices.push({
      id: 'virtual-lamp',
      blueprint: {
        id: 'virtual-lamp-blueprint',
        name: 'Virtual Lamp',
        kind: 'Lamp',
        settings: { power: 0.5, ppfd: 450, coverageArea: zoneArea }
      },
      isActive: true,
      coverageArea: zoneArea
    });
  }

  return {
    tick: 0,
    tickLengthMinutes: config.tickLengthMinutes,
    rngSeed: config.seed,
    zones: [zone],
    isPaused: true,
    accumulatedTimeMs: 0
  };
}
