import { randomUUID } from 'node:crypto';
import type { BlueprintBundle } from '../../shared/types/blueprints';
import type { SimulationEventPayload, SimulationSnapshot, SimulationState } from '../../shared/types/simulation';
import { loadConfig, type EnvironmentConfig } from '../config/environment';
import { logger } from './logger';
import { eventBus } from './eventBus';
import { loadBlueprints } from '../loaders/blueprintLoader';
import { runTick } from '../engine/tickMachine';
import type { TickContext, BlueprintIndex } from '../engine/types';

const DEFAULT_AMBIENT = {
  temperature: 22,
  humidity: 0.55,
  co2: 420
};

const selectDevices = (bundle: BlueprintBundle) => {
  const lamp = bundle.devices.find((d) => d.kind.toLowerCase().includes('lamp')) ?? bundle.devices[0];
  const climate = bundle.devices.find((d) => d.kind.toLowerCase().includes('climate')) ?? bundle.devices[1] ?? lamp;
  const ventilation = bundle.devices.find((d) => d.kind.toLowerCase().includes('vent')) ?? bundle.devices[2] ?? lamp;
  const co2 = bundle.devices.find((d) => d.kind.toLowerCase().includes('co2'));
  return [lamp, climate, ventilation, co2].filter(Boolean);
};

const createInitialState = (bundle: BlueprintBundle, tickLengthMinutes: number): SimulationState => {
  const strain = bundle.strains[0];
  if (!strain) {
    throw new Error('No strain blueprints available');
  }

  const cultivation = bundle.cultivationMethods[0];
  const plantCount = 4;
  const areaPerPlant = cultivation?.areaPerPlant ?? 1.2;
  const zoneArea = areaPerPlant * plantCount;
  const zoneHeight = 3;
  const zoneVolume = zoneArea * zoneHeight;

  const [tempMin, tempMax] = strain.environmentalPreferences.idealTemperature.vegetation;
  const [humidityMin, humidityMax] = strain.environmentalPreferences.idealHumidity.vegetation;

  const zoneId = 'zone-alpha';
  const environment = {
    temperature: (tempMin + tempMax) / 2,
    humidity: (humidityMin + humidityMax) / 2,
    co2: 420,
    ppfd: 0,
    vpd: 0
  };

  const plantId = randomUUID();
  const plant = {
    id: plantId,
    strainId: strain.id,
    stage: 'seedling' as const,
    ageDays: 0,
    biomassDryGrams: 1,
    health: 0.9,
    stress: 0,
    lastGrowthRate: 0
  };

  const devices = selectDevices(bundle).map((blueprint) => ({
    id: randomUUID(),
    blueprintId: blueprint!.id,
    zoneId,
    isActive: true,
    coverageArea: blueprint?.coverageArea_m2 ?? zoneArea
  }));

  const zone = {
    id: zoneId,
    name: 'Alpha Zone',
    area: zoneArea,
    volume: zoneVolume,
    environment,
    deviceIds: devices.map((device) => device.id),
    plantIds: [plantId]
  };

  const state: SimulationState = {
    clock: {
      tick: 0,
      tickLengthMinutes,
      lastTickCompletedAt: Date.now(),
      isRunning: false
    },
    zones: {
      [zoneId]: zone
    },
    plants: {
      [plantId]: plant
    },
    devices: Object.fromEntries(devices.map((device) => [device.id, device]))
  };

  return state;
};

const buildBlueprintIndex = (bundle: BlueprintBundle): BlueprintIndex => ({
  strains: new Map(bundle.strains.map((strain) => [strain.id, strain])),
  devices: new Map(bundle.devices.map((device) => [device.id, device]))
});

const buildSimulationUpdate = (snapshot: SimulationSnapshot, events: SimulationEventPayload[]) => ({
  type: 'simulationUpdate' as const,
  tick: snapshot.clock.tick,
  ts: snapshot.clock.lastTickCompletedAt,
  env: snapshot.zones.map((zone) => ({
    zoneId: zone.id,
    temperature: zone.environment.temperature,
    humidity: zone.environment.humidity,
    co2: zone.environment.co2,
    ppfd: zone.environment.ppfd,
    vpd: zone.environment.vpd
  })),
  plants: snapshot.plants.map((plant) => ({
    id: plant.id,
    stage: plant.stage,
    biomass: plant.biomassDryGrams,
    health: plant.health,
    stress: plant.stress
  })),
  events: events.map((event) => ({
    type: event.type,
    level: event.level,
    ...event.payload
  }))
});

export class SimulationService {
  private readonly config: EnvironmentConfig;
  private state!: SimulationState;
  private blueprintBundle!: BlueprintBundle;
  private blueprintIndex!: BlueprintIndex;
  private timer?: NodeJS.Timeout;
  private speed = 1;
  private ambient = { ...DEFAULT_AMBIENT };
  private setpoints: TickContext['setpoints'] = {};
  private initialized = false;

  constructor(config = loadConfig()) {
    this.config = config;
  }

  public async initialize() {
    this.blueprintBundle = await loadBlueprints();
    this.blueprintIndex = buildBlueprintIndex(this.blueprintBundle);
    this.state = createInitialState(this.blueprintBundle, this.config.tickLengthMinutes);
    this.initialized = true;
    logger.info('Simulation service initialized');
  }

  private ensureInitialized() {
    if (!this.initialized) {
      throw new Error('SimulationService not initialized');
    }
  }

  private clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private scheduleTimer() {
    this.clearTimer();
    const interval = (this.state.clock.tickLengthMinutes * 60 * 1000) / this.speed;
    this.timer = setInterval(() => {
      void this.executeTick();
    }, interval);
  }

  private async executeTick() {
    const tickHours = this.state.clock.tickLengthMinutes / 60;
    const context: TickContext = {
      simulation: this.state,
      blueprints: this.blueprintIndex,
      tickHours,
      events: [],
      ambient: this.ambient,
      setpoints: this.setpoints
    };

    const commitResult = runTick(context);
    const events = context.events;

    events.forEach((event) => eventBus.emit(event));

    if (commitResult) {
      const snapshot = commitResult.snapshot;
      const update = buildSimulationUpdate(snapshot, events);
      eventBus.emit({
        type: 'sim.tickCompleted',
        tick: snapshot.clock.tick,
        ts: snapshot.clock.lastTickCompletedAt,
        payload: snapshot
      });
      eventBus.emit({
        type: 'simulationUpdate',
        tick: snapshot.clock.tick,
        ts: snapshot.clock.lastTickCompletedAt,
        payload: update
      });
    }
  }

  public start() {
    this.ensureInitialized();
    if (this.state.clock.isRunning) return;
    this.state.clock.isRunning = true;
    this.scheduleTimer();
    logger.info('Simulation started');
  }

  public pause() {
    this.ensureInitialized();
    if (!this.state.clock.isRunning) return;
    this.state.clock.isRunning = false;
    this.clearTimer();
    logger.info('Simulation paused');
  }

  public async step() {
    this.ensureInitialized();
    await this.executeTick();
  }

  public setTickLength(minutes: number) {
    this.ensureInitialized();
    this.state.clock.tickLengthMinutes = minutes;
    if (this.state.clock.isRunning) {
      this.scheduleTimer();
    }
  }

  public setSpeed(multiplier: number) {
    this.speed = multiplier;
    if (this.state.clock.isRunning) {
      this.scheduleTimer();
    }
  }

  public setSetpoint(target: 'temperature' | 'humidity' | 'co2' | 'ppfd', value: number) {
    if (target === 'temperature') {
      this.ambient.temperature = value;
      this.setpoints.temperature = value;
    } else if (target === 'humidity') {
      this.ambient.humidity = value > 1 ? value / 100 : value;
      this.setpoints.humidity = this.ambient.humidity;
    } else if (target === 'co2') {
      this.ambient.co2 = value;
      this.setpoints.co2 = value;
    } else if (target === 'ppfd') {
      this.setpoints.ppfd = value;
    }
  }

  public getSnapshot(): SimulationSnapshot {
    return {
      clock: { ...this.state.clock },
      zones: Object.values(this.state.zones).map((zone) => ({ ...zone, environment: { ...zone.environment } })),
      plants: Object.values(this.state.plants).map((plant) => ({ ...plant })),
      devices: Object.values(this.state.devices).map((device) => ({ ...device }))
    };
  }
}
