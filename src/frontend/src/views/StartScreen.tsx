import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { useNavigationStore } from '@/store/navigation';
import { useUIStore } from '@/store/ui';
import type { SimulationBridge } from '@/facade/systemFacade';

interface StartScreenProps {
  bridge: SimulationBridge;
}

export const StartScreen = ({ bridge }: StartScreenProps) => {
  const enterDashboard = useNavigationStore((state) => state.enterDashboard);
  const openModal = useUIStore((state) => state.openModal);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-surface text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight text-text">Weedbreed.AI — Reboot</h1>
        <p className="max-w-xl text-base text-text-muted">
          Your AI-powered cannabis cultivation simulator. Launch a deterministic grow, monitor
          telemetry snapshots, and steer every change through the System Facade.
        </p>
      </div>
      <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          variant="primary"
          icon={<Icon name="auto_mode" />}
          onClick={() => {
            bridge.loadQuickStart();
            bridge.sendControl({ action: 'pause' });
            enterDashboard();
          }}
        >
          Quick Start
        </Button>
        <Button
          variant="secondary"
          icon={<Icon name="add" />}
          onClick={() =>
            openModal({
              id: 'new-game',
              type: 'newGame',
              title: 'New Simulation',
              subtitle: 'Seed a fresh deterministic run',
            })
          }
        >
          New Game
        </Button>
        <Button
          variant="secondary"
          icon={<Icon name="folder_open" />}
          onClick={() => openModal({ id: 'load-game', type: 'loadGame', title: 'Load Simulation' })}
        >
          Load Game
        </Button>
        <Button
          variant="secondary"
          icon={<Icon name="ios_share" />}
          onClick={() => openModal({ id: 'import-game', type: 'importGame', title: 'Import Save' })}
        >
          Import Game
        </Button>
      </div>
    </div>
  );
};
