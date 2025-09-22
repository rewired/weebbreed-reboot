import { performance } from 'node:perf_hooks';
import {
  ZoneEnvironmentService,
  type ZoneEnvironmentOptions,
} from '@/engine/environment/zoneEnvironment.js';
import { DeviceDegradationService } from '@/engine/environment/deviceDegradation.js';
import {
  HarvestQualityService,
  type HarvestQualityOptions,
} from '@/engine/harvest/harvestQualityService.js';
import {
  CostAccountingService,
  type TickAccumulator,
  type UtilityConsumption,
} from '@/engine/economy/costAccounting.js';
import type { PriceCatalog } from '@/engine/economy/pricing.js';
import type { GameState } from '@/state/models.js';
import { eventBus as telemetryEventBus } from '@runtime/eventBus.js';
import {
  EventBus,
  createEventCollector,
  type EventCollector,
  type SimulationEvent,
} from '@/lib/eventBus.js';

export const TICK_PHASES = [
  'applyDevices',
  'deriveEnvironment',
  'irrigationAndNutrients',
  'updatePlants',
  'harvestAndInventory',
  'accounting',
  'commit',
] as const;

export type TickPhase = (typeof TICK_PHASES)[number];

export interface PhaseTiming {
  startedAt: number;
  completedAt: number;
  durationMs: number;
}

export interface TickCompletedPayload {
  tick: number;
  durationMs: number;
  eventCount: number;
  phaseTimings: Record<TickPhase, PhaseTiming>;
  events: SimulationEvent[];
}

export interface TickResult {
  tick: number;
  startedAt: number;
  completedAt: number;
  events: SimulationEvent[];
  phaseTimings: Record<TickPhase, PhaseTiming>;
}

export interface AccountingPhaseTools {
  recordUtility(consumption: UtilityConsumption): void;
  recordDevicePurchase(blueprintId: string, quantity: number, description?: string): void;
}

export interface SimulationPhaseContext {
  readonly state: GameState;
  readonly tick: number;
  readonly tickLengthMinutes: number;
  readonly phase: TickPhase;
  readonly events: EventCollector;
  readonly accounting: AccountingPhaseTools;
}

export type SimulationPhaseHandler = (context: SimulationPhaseContext) => void | Promise<void>;

export type SimulationPhaseHandlers = Partial<Record<TickPhase, SimulationPhaseHandler>>;

type NonCommitPhase = Exclude<TickPhase, 'commit'>;

type MachineState =
  | { status: 'idle' }
  | { status: 'running'; phaseIndex: number; tick: number }
  | { status: 'completed'; tick: number }
  | { status: 'failed'; tick?: number; error: unknown };

const NOOP_PHASE: SimulationPhaseHandler = () => undefined;

class TickStateMachine {
  private state: MachineState = { status: 'idle' };

  start(tick: number): void {
    if (this.state.status === 'running') {
      throw new Error('Cannot start a new tick while another tick is running.');
    }
    this.state = { status: 'running', phaseIndex: 0, tick };
  }

  currentPhase(): TickPhase {
    if (this.state.status !== 'running') {
      throw new Error('Tick state machine is not running.');
    }
    return TICK_PHASES[this.state.phaseIndex];
  }

  advance(): MachineState {
    if (this.state.status !== 'running') {
      throw new Error('Cannot advance tick state machine when it is not running.');
    }
    const nextIndex = this.state.phaseIndex + 1;
    if (nextIndex >= TICK_PHASES.length) {
      this.state = { status: 'completed', tick: this.state.tick };
    } else {
      this.state = { status: 'running', phaseIndex: nextIndex, tick: this.state.tick };
    }
    return this.state;
  }

  fail(error: unknown): void {
    const tick =
      this.state.status === 'running' || this.state.status === 'completed'
        ? this.state.tick
        : undefined;
    this.state = { status: 'failed', tick, error };
  }

  isRunning(): boolean {
    return this.state.status === 'running';
  }

  getState(): MachineState {
    return this.state;
  }

  reset(): void {
    this.state = { status: 'idle' };
  }
}

export interface SimulationLoopAccountingOptions {
  service?: CostAccountingService;
  priceCatalog?: PriceCatalog;
}

export interface SimulationLoopOptions {
  state: GameState;
  eventBus?: EventBus;
  phases?: SimulationPhaseHandlers;
  environment?: ZoneEnvironmentOptions;
  harvestQuality?: HarvestQualityOptions;
  accounting?: SimulationLoopAccountingOptions;
}

interface UtilityTotals {
  energyKwh: number;
  waterLiters: number;
  nutrientsGrams: number;
}

interface PendingDevicePurchase {
  blueprintId: string;
  quantity: number;
  description?: string;
}

interface AccountingRuntime {
  accumulator: TickAccumulator;
  utilities: UtilityTotals;
  purchases: PendingDevicePurchase[];
}

export class SimulationLoop {
  private readonly state: GameState;

  private readonly eventBus: EventBus;

  private readonly environmentService?: ZoneEnvironmentService;

  private readonly degradationService: DeviceDegradationService;

  private readonly harvestQualityService: HarvestQualityService;

  private readonly costAccountingService?: CostAccountingService;

  private readonly accountingTools: AccountingPhaseTools;

  private accountingRuntime: AccountingRuntime | null = null;

  private readonly phaseHandlers: Record<NonCommitPhase, SimulationPhaseHandler>;

  private readonly commitHook?: SimulationPhaseHandler;

  private readonly machine = new TickStateMachine();

  constructor(options: SimulationLoopOptions) {
    this.state = options.state;
    this.eventBus = options.eventBus ?? telemetryEventBus;
    const phases = options.phases ?? {};
    this.degradationService = new DeviceDegradationService();
    this.harvestQualityService = new HarvestQualityService(options.harvestQuality);
    const accountingOptions = options.accounting ?? {};
    if (accountingOptions.service) {
      this.costAccountingService = accountingOptions.service;
    } else if (accountingOptions.priceCatalog) {
      this.costAccountingService = new CostAccountingService(accountingOptions.priceCatalog);
    }
    this.accountingTools = this.costAccountingService
      ? {
          recordUtility: (consumption: UtilityConsumption) =>
            this.recordUtilityConsumption(consumption),
          recordDevicePurchase: (blueprintId: string, quantity: number, description?: string) =>
            this.recordDevicePurchase(blueprintId, quantity, description),
        }
      : {
          recordUtility: () => undefined,
          recordDevicePurchase: () => undefined,
        };
    if (!phases.applyDevices || !phases.deriveEnvironment) {
      this.environmentService = new ZoneEnvironmentService(options.environment);
    }
    const accountingHandler = phases.accounting ?? NOOP_PHASE;
    this.phaseHandlers = {
      applyDevices:
        phases.applyDevices ??
        this.environmentService?.createApplyDevicePhaseHandler() ??
        NOOP_PHASE,
      deriveEnvironment:
        phases.deriveEnvironment ??
        this.environmentService?.createNormalizationPhaseHandler() ??
        NOOP_PHASE,
      irrigationAndNutrients: phases.irrigationAndNutrients ?? NOOP_PHASE,
      updatePlants: phases.updatePlants ?? NOOP_PHASE,
      harvestAndInventory:
        phases.harvestAndInventory ??
        ((context) =>
          this.harvestQualityService.process(
            context.state,
            context.tick,
            context.tickLengthMinutes,
          )),
      accounting: async (context) => {
        this.degradationService.process(context.state, context.tick, context.tickLengthMinutes);
        await accountingHandler(context);
        this.processAccountingPhase(context);
      },
    };
    this.commitHook = phases.commit;
  }

  async processTick(): Promise<TickResult> {
    if (this.machine.isRunning()) {
      throw new Error('A tick is already being processed.');
    }

    const tickNumber = this.state.clock.tick + 1;
    const tickLengthMinutes = this.state.metadata.tickLengthMinutes;
    const tickStartMonotonic = performance.now();
    const eventBuffer: SimulationEvent[] = [];
    const collector = createEventCollector(eventBuffer, tickNumber);

    const timings: Partial<Record<TickPhase, PhaseTiming>> = {};
    let commitTimestamp: number | undefined;

    this.accountingRuntime = this.costAccountingService ? this.createAccountingRuntime() : null;
    this.machine.start(tickNumber);

    try {
      while (this.machine.isRunning()) {
        const phase = this.machine.currentPhase();
        const phaseStart = performance.now();
        const context: SimulationPhaseContext = {
          state: this.state,
          tick: tickNumber,
          tickLengthMinutes,
          phase,
          events: collector,
          accounting: this.accountingTools,
        };

        if (phase === 'commit') {
          commitTimestamp = await this.executeCommit(context, tickNumber);
        } else {
          const handler = this.phaseHandlers[phase as NonCommitPhase];
          await handler(context);
        }

        const phaseEnd = performance.now();
        timings[phase] = {
          startedAt: phaseStart - tickStartMonotonic,
          completedAt: phaseEnd - tickStartMonotonic,
          durationMs: phaseEnd - phaseStart,
        };

        this.machine.advance();
      }
    } catch (error) {
      this.machine.fail(error);
      throw error;
    } finally {
      this.accountingRuntime = null;
    }

    const state = this.machine.getState();
    if (state.status !== 'completed') {
      throw new Error('Tick did not reach a completed state.');
    }

    this.machine.reset();

    const commitTime = commitTimestamp ?? Date.now();
    const enrichedEvents = eventBuffer.map((event) => ({
      ...event,
      tick: event.tick ?? tickNumber,
      ts: event.ts ?? commitTime,
    }));

    const orderedTimings: Record<TickPhase, PhaseTiming> = {} as Record<TickPhase, PhaseTiming>;
    for (const phase of TICK_PHASES) {
      const timing = timings[phase];
      if (!timing) {
        throw new Error(`Missing timing information for phase ${phase}`);
      }
      orderedTimings[phase] = timing;
    }

    const tickEndMonotonic = performance.now();
    const result: TickResult = {
      tick: tickNumber,
      startedAt: tickStartMonotonic,
      completedAt: tickEndMonotonic,
      events: enrichedEvents,
      phaseTimings: orderedTimings,
    };

    if (enrichedEvents.length > 0) {
      this.eventBus.emitMany(enrichedEvents);
    }

    const tickCompletedEvent: SimulationEvent<TickCompletedPayload> = {
      type: 'sim.tickCompleted',
      tick: tickNumber,
      ts: commitTime,
      level: 'info',
      payload: {
        tick: tickNumber,
        durationMs: tickEndMonotonic - tickStartMonotonic,
        eventCount: enrichedEvents.length,
        phaseTimings: orderedTimings,
        events: enrichedEvents,
      },
    };

    this.eventBus.emit(tickCompletedEvent);

    return result;
  }

  private createAccountingRuntime(): AccountingRuntime {
    if (!this.costAccountingService) {
      throw new Error('Cost accounting service is not configured.');
    }

    return {
      accumulator: this.costAccountingService.createAccumulator(),
      utilities: {
        energyKwh: 0,
        waterLiters: 0,
        nutrientsGrams: 0,
      },
      purchases: [],
    };
  }

  private recordUtilityConsumption(consumption: UtilityConsumption): void {
    if (!this.accountingRuntime || !consumption) {
      return;
    }

    const utilities = this.accountingRuntime.utilities;
    const addUtility = (value: number | undefined, key: keyof UtilityTotals) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return;
      }
      const sanitized = Math.max(value, 0);
      if (sanitized <= 0) {
        return;
      }
      utilities[key] += sanitized;
    };

    addUtility(consumption.energyKwh, 'energyKwh');
    addUtility(consumption.waterLiters, 'waterLiters');
    addUtility(consumption.nutrientsGrams, 'nutrientsGrams');
  }

  private recordDevicePurchase(blueprintId: string, quantity: number, description?: string): void {
    if (!this.accountingRuntime || typeof blueprintId !== 'string' || blueprintId.length === 0) {
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return;
    }

    this.accountingRuntime.purchases.push({
      blueprintId,
      quantity,
      description:
        typeof description === 'string' && description.length > 0 ? description : undefined,
    });
  }

  private processAccountingPhase(context: SimulationPhaseContext): void {
    if (!this.costAccountingService || !this.accountingRuntime) {
      return;
    }

    const timestamp = new Date().toISOString();
    const runtime = this.accountingRuntime;

    const utilities = runtime.utilities;
    if (utilities.energyKwh > 0 || utilities.waterLiters > 0 || utilities.nutrientsGrams > 0) {
      this.costAccountingService.applyUtilityConsumption(
        context.state,
        utilities,
        context.tick,
        timestamp,
        runtime.accumulator,
        context.events,
      );
    }

    for (const structure of context.state.structures) {
      for (const room of structure.rooms) {
        for (const zone of room.zones) {
          for (const device of zone.devices) {
            this.costAccountingService.applyMaintenanceExpense(
              context.state,
              device,
              context.tick,
              timestamp,
              runtime.accumulator,
              context.events,
            );
          }
        }
      }
    }

    for (const purchase of runtime.purchases) {
      this.costAccountingService.recordDevicePurchase(
        context.state,
        purchase.blueprintId,
        purchase.quantity,
        context.tick,
        timestamp,
        runtime.accumulator,
        context.events,
        purchase.description,
      );
    }

    this.costAccountingService.finalizeTick(
      context.state,
      runtime.accumulator,
      context.tick,
      timestamp,
      context.events,
    );

    this.accountingRuntime = null;
  }

  private async executeCommit(context: SimulationPhaseContext, tick: number): Promise<number> {
    if (this.commitHook) {
      await this.commitHook(context);
    }

    const commitTimestamp = Date.now();
    context.state.clock.tick = tick;
    context.state.clock.lastUpdatedAt = new Date(commitTimestamp).toISOString();
    return commitTimestamp;
  }
}
