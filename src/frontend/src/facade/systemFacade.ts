import type {
  FacadeIntentCommand,
  SimulationConfigUpdate,
  SimulationControlCommand,
  SimulationUpdateEntry,
} from '@/types/simulation';
import { mockEvents, mockUpdate, mockUpdates, quickstartSnapshot } from '@/data/mockTelemetry';
import { useSimulationStore } from '@/store/simulation';
import { useUIStore } from '@/store/ui';

export interface SimulationBridge {
  connect: () => void;
  loadQuickStart: () => void;
  sendControl: (command: SimulationControlCommand) => void;
  sendConfigUpdate: (update: SimulationConfigUpdate) => void;
  sendIntent: (intent: FacadeIntentCommand) => void;
  subscribeToUpdates: (handler: (update: SimulationUpdateEntry) => void) => () => void;
}

class MockSystemFacade implements SimulationBridge {
  private updateHandlers = new Set<(update: SimulationUpdateEntry) => void>();
  private syntheticTick = mockUpdate.tick;

  connect() {
    const { setConnectionStatus } = useSimulationStore.getState();
    setConnectionStatus('connecting');
    setTimeout(() => {
      setConnectionStatus('connected');
    }, 150);
  }

  loadQuickStart() {
    const { hydrate } = useSimulationStore.getState();
    hydrate({
      snapshot: quickstartSnapshot,
      updates: mockUpdates,
      events: mockEvents,
      time: mockUpdate.time,
    });
    this.syntheticTick = quickstartSnapshot.clock.tick;
    const warningCount = mockEvents.filter(
      (event) => event.level === 'warning' || event.level === 'error',
    ).length;
    if (warningCount) {
      useUIStore.getState().incrementNotifications(warningCount);
    }
  }

  sendControl(command: SimulationControlCommand) {
    const state = useSimulationStore.getState();
    const { markPaused, markRunning } = state;
    switch (command.action) {
      case 'pause':
        markPaused();
        break;
      case 'play':
        markRunning(command.gameSpeed ?? 1);
        break;
      case 'resume': {
        const resumeSpeed = state.timeStatus?.speed ?? state.snapshot?.clock.targetTickRate ?? 1;
        markRunning(resumeSpeed);
        break;
      }
      case 'fastForward':
        markRunning(command.multiplier);
        break;
      case 'step':
        this.dispatchSyntheticUpdate();
        break;
      default:
        break;
    }
  }

  sendConfigUpdate(update: SimulationConfigUpdate) {
    console.info('[MockFacade] config update', update);
  }

  sendIntent(intent: FacadeIntentCommand) {
    console.info('[MockFacade] facade intent', intent);
    useUIStore.getState().incrementNotifications();
  }

  subscribeToUpdates(handler: (update: SimulationUpdateEntry) => void) {
    this.updateHandlers.add(handler);
    return () => {
      this.updateHandlers.delete(handler);
    };
  }

  private dispatchSyntheticUpdate() {
    this.syntheticTick += 1;
    const update: SimulationUpdateEntry = {
      ...mockUpdate,
      tick: this.syntheticTick,
      ts: Date.now(),
      snapshot: {
        ...quickstartSnapshot,
        tick: this.syntheticTick,
        clock: {
          ...quickstartSnapshot.clock,
          tick: this.syntheticTick,
          lastUpdatedAt: new Date().toISOString(),
        },
      },
    };
    useSimulationStore.getState().applyUpdate(update);
    for (const handler of this.updateHandlers) {
      handler(update);
    }
  }
}

let instance: SimulationBridge | null = null;

export const getSimulationBridge = (): SimulationBridge => {
  if (!instance) {
    instance = new MockSystemFacade();
  }
  return instance;
};
