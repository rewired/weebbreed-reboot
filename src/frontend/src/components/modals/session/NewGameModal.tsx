import { useEffect, useMemo, useState } from 'react';
import { ActionFooter, Feedback } from '@/components/modals/common';
import { Button } from '@/components/primitives/Button';
import { ModifierInputs } from '@/components/modifiers/ModifierInputs';
import type { SimulationBridge } from '@/facade/systemFacade';
import { useDifficultyConfig } from '@/hooks/useDifficultyConfig';
import { useNavigationStore } from '@/store/navigation';
import type { DifficultyModifiers } from '@/types/difficulty';
import { formatNumber } from '@/utils/formatNumber';

export interface NewGameModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
}

export const NewGameModal = ({ bridge, closeModal }: NewGameModalProps) => {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'normal' | 'hard'>(
    'normal',
  );
  const [customModifiers, setCustomModifiers] = useState<DifficultyModifiers | null>(null);
  const enterDashboard = useNavigationStore((state) => state.enterDashboard);

  const {
    config: difficultyConfig,
    loading: difficultyLoading,
    error: difficultyError,
    refresh: reloadDifficultyConfig,
  } = useDifficultyConfig();

  const difficultyOptions = useMemo(() => {
    if (!difficultyConfig) {
      return [] as Array<{
        id: 'easy' | 'normal' | 'hard';
        name: string;
        description: string;
        initialCapital: string;
        color: string;
      }>;
    }
    return Object.entries(difficultyConfig).map(([key, config]) => ({
      id: key as 'easy' | 'normal' | 'hard',
      name: config.name,
      description: config.description,
      initialCapital: `€${formatNumber(config.modifiers.economics.initialCapital / 1_000_000, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}M`,
      color:
        key === 'easy' ? 'text-green-600' : key === 'normal' ? 'text-yellow-600' : 'text-red-600',
    }));
  }, [difficultyConfig]);

  const selectedPreset = difficultyConfig?.[selectedDifficulty];

  useEffect(() => {
    if (selectedPreset) {
      setCustomModifiers(selectedPreset.modifiers);
    }
  }, [selectedPreset]);

  const handleDifficultyChange = (difficultyId: 'easy' | 'normal' | 'hard') => {
    setSelectedDifficulty(difficultyId);
  };

  const handleCreateNewGame = async () => {
    if (!customModifiers) {
      setFeedback('Difficulty presets are still loading. Please try again shortly.');
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      // Stop the simulation if it's running
      await bridge.sendControl({ action: 'pause' });

      // Send the newGame intent with custom modifiers
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'newGame',
        payload: {
          difficulty: selectedDifficulty,
          modifiers: customModifiers,
        },
      });

      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Failed to create new game.');
        return;
      }

      // Navigate to dashboard and close modal
      enterDashboard();
      closeModal();
    } catch (error) {
      console.error('Failed to create new game', error);
      setFeedback('Connection error while creating new game.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Create a completely empty simulation session with no structures or content. Choose your
        difficulty level to set economic conditions and game balance.
      </p>

      <div className="grid gap-3">
        <h4 className="text-sm font-semibold text-text">Difficulty Level</h4>
        {difficultyError ? (
          <div className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
            <p>Failed to load difficulty presets: {difficultyError}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => reloadDifficultyConfig()}
            >
              Retry
            </Button>
          </div>
        ) : difficultyLoading ? (
          <div className="rounded-lg border border-border/40 bg-surface-muted/40 p-4 text-sm text-text-muted">
            Loading difficulty presets…
          </div>
        ) : difficultyOptions.length === 0 ? (
          <div className="rounded-lg border border-border/40 bg-surface-muted/40 p-4 text-sm text-text-muted">
            Difficulty presets are not available yet. Please retry once the backend responds.
          </div>
        ) : (
          <div className="grid gap-3">
            {difficultyOptions.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/50 bg-surface-muted/60 p-3 transition hover:border-primary"
              >
                <input
                  type="radio"
                  className="mt-1 size-4 shrink-0 accent-primary"
                  name="difficulty"
                  value={option.id}
                  checked={selectedDifficulty === option.id}
                  onChange={() => handleDifficultyChange(option.id)}
                />
                <div className="flex flex-col gap-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${option.color}`}>{option.name}</span>
                    <span className="text-xs text-text-muted">
                      {option.initialCapital} starting capital
                    </span>
                  </div>
                  <span className="text-xs text-text-muted">{option.description}</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-2 rounded-lg border border-border/40 bg-surface-muted/30 p-4">
        <h4 className="text-sm font-semibold text-text">Game Modifiers</h4>
        <p className="text-xs text-text-muted mb-2">
          Adjust the game balance by modifying these values. Each difficulty preset provides a
          starting point.
        </p>
        {customModifiers ? (
          <ModifierInputs modifiers={customModifiers} onChange={setCustomModifiers} />
        ) : (
          <div className="rounded border border-border/40 bg-surface-muted/60 p-4 text-sm text-text-muted">
            Difficulty presets are loading…
          </div>
        )}
      </div>

      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleCreateNewGame}
        confirmLabel={busy ? 'Creating…' : 'Create New Game'}
        confirmDisabled={busy || !customModifiers}
        cancelDisabled={busy}
      />
    </div>
  );
};
