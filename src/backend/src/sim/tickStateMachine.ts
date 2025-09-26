import { TICK_PHASES, type TickPhase } from './tickPhases.js';

export type MachineState =
  | { status: 'idle' }
  | { status: 'running'; phaseIndex: number; tick: number }
  | { status: 'completed'; tick: number }
  | { status: 'failed'; tick?: number; error: unknown };

export interface TickStateMachine {
  start(tick: number): void;
  currentPhase(): TickPhase;
  advance(): MachineState;
  reset(): void;
  fail(error: unknown): void;
  isRunning(): boolean;
  getState(): MachineState;
}

class TickStateMachineImpl implements TickStateMachine {
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

  reset(): void {
    this.state = { status: 'idle' };
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
}

export function createTickStateMachine(): TickStateMachine {
  return new TickStateMachineImpl();
}
