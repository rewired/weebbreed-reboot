import { useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { useNavigationStore } from '@/store/navigation';
import { useSimulationStore } from '@/store/simulation';
import { useUIStore } from '@/store/ui';
import { buildBackendReachabilityMessage } from '@/config/socket';
import type { SimulationBridge } from '@/facade/systemFacade';

const DEV_README_URL =
  'https://github.com/WeedBreed/weebbreed-reboot/blob/main/README.md#getting-started';
const CONNECTION_HELP_MESSAGE = `${buildBackendReachabilityMessage()} See README.md (Getting Started) for setup steps.`;

interface StartScreenProps {
  bridge: SimulationBridge;
}

export const StartScreen = ({ bridge }: StartScreenProps) => {
  const enterDashboard = useNavigationStore((state) => state.enterDashboard);
  const openModal = useUIStore((state) => state.openModal);
  const connectionStatus = useSimulationStore((state) => state.connectionStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDevHelp, setShowDevHelp] = useState(false);

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
          disabled={loading}
          onClick={async () => {
            if (loading) {
              return;
            }
            setError(null);
            setShowDevHelp(false);
            if (connectionStatus !== 'connected') {
              setError(CONNECTION_HELP_MESSAGE);
              setShowDevHelp(true);
              return;
            }
            setLoading(true);
            try {
              const quickStart = await bridge.loadQuickStart();
              if (!quickStart.ok) {
                setError('Quick Start failed. Review facade warnings in the event log.');
                return;
              }
              await bridge.sendControl({ action: 'pause' });
              enterDashboard();
            } catch (exception) {
              console.error('Failed to initialise quick start', exception);
              const message =
                exception instanceof Error
                  ? exception.message
                  : 'Quick Start failed. Check backend connectivity.';
              setError(message);
              setShowDevHelp(message.includes(buildBackendReachabilityMessage()));
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? 'Initialising…' : 'Quick Start'}
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
      {error ? (
        <p className="text-sm text-danger">
          {error}{' '}
          {showDevHelp ? (
            <a
              href={DEV_README_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline"
            >
              Development README
            </a>
          ) : null}
        </p>
      ) : null}
    </div>
  );
};
