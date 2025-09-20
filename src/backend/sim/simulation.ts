import { eventBus } from '../lib/eventBus.js';
import { logger } from '../lib/logger.js';
import { runTick } from './tickStateMachine.js';
import type { SimulationEvent, SimulationState } from '../../shared/domain.js';
import type { PhaseHandlers } from './tickStateMachine.js';
import type { TickContext } from './types.js';
import { applyDevicesPhase } from './phases/applyDevicesPhase.js';
import { deriveEnvironmentPhase } from './phases/deriveEnvironmentPhase.js';
import { irrigationAndNutrientsPhase } from './phases/irrigationPhase.js';
import { updatePlantsPhase } from './phases/updatePlantsPhase.js';
import { harvestAndInventoryPhase } from './phases/harvestPhase.js';
import { accountingPhase } from './phases/accountingPhase.js';
import { commitPhase } from './phases/commitPhase.js';
import { config } from '../config.js';

const PHASE_HANDLERS: PhaseHandlers = {
  applyDevices: applyDevicesPhase,
  deriveEnvironment: deriveEnvironmentPhase,
  irrigationAndNutrients: irrigationAndNutrientsPhase,
  updatePlants: updatePlantsPhase,
  harvestAndInventory: harvestAndInventoryPhase,
  accounting: accountingPhase,
  commit: commitPhase
};

export type SimulationControlAction = 'play' | 'pause' | 'step' | 'fastForward';

export class SimulationEngine {
  private accumulatorMs = 0;
  private lastFrameTs = Date.now();
  private speed = 1;
  private timer?: ReturnType<typeof setTimeout>;
  private processing = false;

  constructor(private readonly state: SimulationState) {}

  public get snapshot(): SimulationState {
    return this.state;
  }

  public setTickLength(minutes: number): void {
    this.state.tickLengthMinutes = minutes;
    logger.info({ minutes }, 'Tick length updated');
  }

  public setSpeed(speed: number): void {
    this.speed = Math.max(0.1, speed);
    logger.info({ speed: this.speed }, 'Simulation speed updated');
  }

  public async step(): Promise<void> {
    await this.processTick();
  }

  public play(): void {
    if (!this.state.isPaused) return;
    this.state.isPaused = false;
    this.lastFrameTs = Date.now();
    this.scheduleLoop();
    logger.info('Simulation resumed');
  }

  public pause(): void {
    this.state.isPaused = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    logger.info('Simulation paused');
  }

  public fastForward(multiplier: number): void {
    this.setSpeed(multiplier);
  }

  private scheduleLoop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    const frame = async (): Promise<void> => {
      if (this.state.isPaused) {
        this.timer = undefined;
        return;
      }
      const now = Date.now();
      const delta = now - this.lastFrameTs;
      this.lastFrameTs = now;
      this.accumulatorMs += delta * this.speed;
      const tickMs = this.state.tickLengthMinutes * 60_000;
      let processed = 0;
      while (this.accumulatorMs >= tickMs && processed < config.maxTicksPerFrame) {
        await this.processTick();
        this.accumulatorMs -= tickMs;
        processed += 1;
      }
      this.timer = setTimeout(frame, 50);
    };
    this.timer = setTimeout(frame, 50);
  }

  private async processTick(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      const tickHours = this.state.tickLengthMinutes / 60;
      const context: TickContext = {
        state: this.state,
        tickHours,
        events: []
      };
      await runTick(PHASE_HANDLERS, context);
      this.flushEvents(context.events);
    } catch (error) {
      logger.error({ err: error }, 'Tick processing failed');
      throw error;
    } finally {
      this.processing = false;
    }
  }

  private flushEvents(events: SimulationEvent[]): void {
    for (const event of events) {
      eventBus.publish(event);
    }
  }
}
