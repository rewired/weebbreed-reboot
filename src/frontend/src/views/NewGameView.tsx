import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { useNavigationStore } from '@/store/navigation';
import { type SimulationBridge } from '@/facade/systemFacade';
import { EnhancedModifierInputs } from '../components/modifiers/EnhancedModifierInputs';
import { DifficultyModifiers } from '../types/difficulty';
import { generateTimestampSeed } from '../utils/seedGenerator';
import { useDifficultyConfig } from '@/hooks/useDifficultyConfig';

interface NewGameViewProps {
  bridge: SimulationBridge;
}

const Feedback = ({ message }: { message: string }) => (
  <p className="text-sm text-warning">{message}</p>
);

export const NewGameView = ({ bridge }: NewGameViewProps) => {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'normal' | 'hard'>(
    'normal',
  );
  const [seed, setSeed] = useState<string>(generateTimestampSeed());
  const [customModifiers, setCustomModifiers] = useState<DifficultyModifiers | null>(null);

  const {
    config: difficultyConfig,
    loading: difficultyLoading,
    error: difficultyError,
    refresh: reloadDifficultyConfig,
  } = useDifficultyConfig();

  const backToStart = useNavigationStore((state) => state.backToStart);
  const enterDashboard = useNavigationStore((state) => state.enterDashboard);

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
      initialCapital: `€${(config.modifiers.economics.initialCapital / 1_000_000).toFixed(1)}M`,
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

  const handleRefreshSeed = () => {
    setSeed(generateTimestampSeed());
  };

  const handleCreateNewGame = async () => {
    if (!customModifiers) {
      setFeedback(
        'Difficulty presets are still loading. Please try again once they are available.',
      );
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      await bridge.sendControl({ action: 'pause' });

      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'newGame',
        payload: {
          difficulty: selectedDifficulty,
          modifiers: customModifiers,
          ...(seed.trim() && { seed: seed.trim() }),
        },
      });

      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Failed to create new game.');
        return;
      }

      enterDashboard();
    } catch (error) {
      console.error('Failed to create new game', error);
      setFeedback('Connection error while creating new game.');
    } finally {
      setBusy(false);
    }
  };

  const presetsUnavailable = difficultyOptions.length === 0 || !customModifiers;

  return (
    <div className="flex min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-10 border-b border-border/50 bg-surface/95 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={backToStart}
              icon={<Icon name="arrow_back" />}
            >
              Back to Start
            </Button>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-lg font-semibold text-text">New Game Setup</h1>
          </div>
          <div></div>
        </div>
      </div>

      <div className="flex-1 pt-14">
        <div className="mx-auto max-w-6xl p-6">
          <div className="grid gap-3">
            <div className="mb-3">
              <p className="text-xs text-text-muted">
                Create a completely empty simulation session with no structures or content.
                Customize your game experience by adjusting difficulty settings and modifiers below.
              </p>
            </div>

            <div className="mb-3 rounded-lg border border-border/50 bg-surface/80 p-4">
              <h2 className="mb-3 text-base font-semibold text-text">Game Seed</h2>
              <div className="grid gap-2">
                <label className="grid gap-1 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Random Seed
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={seed}
                      onChange={(event) => setSeed(event.target.value)}
                      placeholder="word1-word2-word3"
                      className="flex-1 rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleRefreshSeed}
                      icon={<Icon name="refresh" />}
                      title="Generate new seed"
                    ></Button>
                  </div>
                  <span className="text-xs text-text-muted">
                    Use the same seed to generate identical worlds. Click refresh for a new random
                    combination.
                  </span>
                </label>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <div className="rounded-lg border border-border/50 bg-surface/80 p-4">
                  <h2 className="mb-4 text-base font-semibold text-text">Difficulty Preset</h2>
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
                      Loading difficulty presets from the backend…
                    </div>
                  ) : difficultyOptions.length === 0 ? (
                    <div className="rounded-lg border border-border/40 bg-surface-muted/40 p-4 text-sm text-text-muted">
                      Difficulty presets are not available. Please retry once the backend responds.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {difficultyOptions.map((option) => (
                        <label
                          key={option.id}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/30 bg-surface-muted/40 p-3 transition hover:border-primary hover:bg-surface-muted/60"
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
                              <span className={`text-sm font-semibold ${option.color}`}>
                                {option.name}
                              </span>
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
              </div>

              <div className="col-span-2">
                <div className="rounded-lg border border-border/50 bg-surface/80 p-4">
                  <h2 className="mb-4 text-base font-semibold text-text">Game Balance Modifiers</h2>
                  <p className="mb-4 text-xs text-text-muted">
                    Fine-tune your game experience. Difficulty presets provide starting values that
                    you can customize.
                  </p>
                  {customModifiers ? (
                    <EnhancedModifierInputs
                      modifiers={customModifiers}
                      onChange={setCustomModifiers}
                    />
                  ) : (
                    <div className="rounded border border-border/40 bg-surface-muted/60 p-4 text-sm text-text-muted">
                      Difficulty presets are loading…
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Button
                variant="primary"
                onClick={handleCreateNewGame}
                disabled={busy || presetsUnavailable}
                icon={busy ? undefined : <Icon name="play_arrow" />}
                className="w-full py-4 text-lg font-bold"
              >
                {busy ? 'Creating Game…' : 'Start New Game'}
              </Button>
            </div>

            {feedback && (
              <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
                <Feedback message={feedback} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
