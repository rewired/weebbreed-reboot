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
import type { GameState } from '@/state/types.js';
import { createMutableStateView, restoreMutableStateSnapshot } from '@/state/snapshots.js';
import { eventBus as telemetryEventBus } from '@runtime/eventBus.js';
import {
  EventBus,
  createEventCollector,
  type EventCollector,
  type SimulationEvent,
} from '@/lib/eventBus.js';
import {
  createAccountingProcessor,
  type AccountingPhaseTools,
  type AccountingProcessor,
  type AccountingProcessorOptions,
} from './accountingProcessor.js';
import { defaultCommitPhase, type CommitPhaseHandler } from './commitPhase.js';
import { TICK_PHASES, type TickPhase } from './tickPhases.js';
import { createTickStateMachine } from './tickStateMachine.js';

export type { AccountingPhaseTools } from './accountingProcessor.js';
export type { AccountingProcessorOptions as SimulationLoopAccountingOptions } from './accountingProcessor.js';
export { TICK_PHASES } from './tickPhases.js';
export type { TickPhase } from './tickPhases.js';

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

export interface SimulationLoopOptions {
  state: GameState;
  eventBus?: EventBus;
  phases?: SimulationPhaseHandlers;
  environment?: ZoneEnvironmentOptions;
  harvestQuality?: HarvestQualityOptions;
  accounting?: AccountingProcessorOptions;
}

const NOOP_PHASE: SimulationPhaseHandler = () => undefined;

export class SimulationLoop {
  private readonly state: GameState;

  private readonly eventBus: EventBus;

  private readonly environmentService?: ZoneEnvironmentService;

  private readonly degradationService: DeviceDegradationService;

  private readonly harvestQualityService: HarvestQualityService;

  private readonly accountingProcessor: AccountingProcessor;

  private readonly phaseHandlers: Record<NonCommitPhase, SimulationPhaseHandler>;

  private readonly commitPhase: CommitPhaseHandler;

  private readonly machine = createTickStateMachine();

  constructor(options: SimulationLoopOptions) {
    this.state = options.state;
    this.eventBus = options.eventBus ?? telemetryEventBus;
    const phases = options.phases ?? {};
    this.degradationService = new DeviceDegradationService();
    this.harvestQualityService = new HarvestQualityService(options.harvestQuality);

    this.accountingProcessor = createAccountingProcessor(options.accounting);

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
        this.accountingProcessor.finalize({
          state: context.state,
          tick: context.tick,
          tickLengthMinutes: context.tickLengthMinutes,
          events: context.events,
        });
      },
    };

    const commitHandler = phases.commit;
    this.commitPhase = commitHandler
      ? async (context, tick) => {
          await commitHandler(context);
          return defaultCommitPhase(context, tick);
        }
      : defaultCommitPhase;
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

    this.accountingProcessor.beginTick();
    this.machine.start(tickNumber);

    try {
      while (this.machine.isRunning()) {
        const phase = this.machine.currentPhase();
        const phaseStart = performance.now();
        const phaseView = createMutableStateView(this.state);
        const accountingSnapshot = this.accountingProcessor.createSnapshot();
        const eventCheckpoint = collector.checkpoint();
        const context: SimulationPhaseContext = {
          state: phaseView.draft,
          tick: tickNumber,
          tickLengthMinutes,
          phase,
          events: collector,
          accounting: this.accountingProcessor.tools,
        };

        try {
          if (phase === 'commit') {
            commitTimestamp = await this.commitPhase(context, tickNumber);
          } else {
            const handler = this.phaseHandlers[phase as NonCommitPhase];
            await handler(context);
          }
          phaseView.commit();
        } catch (phaseError) {
          restoreMutableStateSnapshot(this.state, phaseView.snapshot);
          this.accountingProcessor.restoreSnapshot(accountingSnapshot);
          eventCheckpoint.restore();
          throw phaseError;
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
      this.accountingProcessor.reset();
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
}
