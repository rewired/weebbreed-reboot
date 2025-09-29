import { useState } from 'react';
import { Feedback } from '@/components/modals/common';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import type { SimulationBridge } from '@/facade/systemFacade';
import { useNavigationStore } from '@/store/navigation';

export interface GameMenuModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
}

export const GameMenuModal = ({ bridge, closeModal }: GameMenuModalProps) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleResetSession = async () => {
    setBusy('reset');
    setFeedback(null);
    try {
      await bridge.sendControl({ action: 'pause' });
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'resetSession',
        payload: {},
      });

      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Failed to reset session.');
        return;
      }

      const resetNavigation = useNavigationStore.getState().reset;
      resetNavigation();
      closeModal();
    } catch (error) {
      console.error('Failed to reset session', error);
      setFeedback('Connection error while resetting session.');
    } finally {
      setBusy(null);
    }
  };

  const actions = [
    {
      label: 'Save Game',
      icon: 'save',
      disabled: true,
      tooltip: 'Save functionality coming soon',
    },
    {
      label: 'Load Game',
      icon: 'folder_open',
      disabled: true,
      tooltip: 'Load functionality coming soon',
    },
    {
      label: 'Export Save',
      icon: 'ios_share',
      disabled: true,
      tooltip: 'Export functionality coming soon',
    },
    {
      label: 'Reset Session',
      icon: 'restart_alt',
      disabled: busy !== null,
      onClick: handleResetSession,
      tooltip: 'Start a fresh game session',
    },
  ];

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Game menu actions for the current simulation session.
      </p>
      <div className="grid gap-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.label === 'Reset Session' ? 'primary' : 'secondary'}
            icon={<Icon name={action.icon} />}
            disabled={action.disabled}
            onClick={action.onClick}
            title={action.tooltip}
          >
            {busy === 'reset' && action.label === 'Reset Session' ? 'Resetting…' : action.label}
          </Button>
        ))}
      </div>
      {feedback ? <Feedback message={feedback} /> : null}
    </div>
  );
};
