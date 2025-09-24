import { ChangeEvent, ReactNode } from 'react';
import { Button, RangeInput } from '@/components/inputs';

type SimulationRunState = 'running' | 'paused' | 'fastForward';

type DashboardControlsProps = {
  state: SimulationRunState;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onFastForward?: () => void;
  tickLengthMinutes: number;
  minTickLength?: number;
  maxTickLength?: number;
  onTickLengthChange?: (value: number) => void;
  setpointControls?: ReactNode;
  footer?: ReactNode;
  disabled?: boolean;
  className?: string;
};

const stateLabel: Record<SimulationRunState, string> = {
  running: 'Simulation running',
  paused: 'Simulation paused',
  fastForward: 'Fast forward active',
};

const DashboardControls = ({
  state,
  onPlay,
  onPause,
  onStep,
  onFastForward,
  tickLengthMinutes,
  minTickLength = 1,
  maxTickLength = 10,
  onTickLengthChange,
  setpointControls,
  footer,
  disabled = false,
  className,
}: DashboardControlsProps) => {
  const containerClass = [
    'space-y-6 rounded-lg border border-border/60 bg-surfaceAlt/80 p-6 shadow-soft',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleTickLengthChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!onTickLengthChange) {
      return;
    }

    onTickLengthChange(Number(event.target.value));
  };

  return (
    <section className={containerClass} aria-label="Simulation controls">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wide text-text-muted">
            {stateLabel[state]}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="solid"
              tone="accent"
              size="sm"
              leadingIcon="▶"
              onClick={onPlay}
              disabled={disabled || state === 'running'}
            >
              Play
            </Button>
            <Button
              variant="outline"
              tone="default"
              size="sm"
              leadingIcon="⏸"
              onClick={onPause}
              disabled={disabled}
              isActive={state === 'paused'}
            >
              Pause
            </Button>
            <Button
              variant="outline"
              tone="default"
              size="sm"
              leadingIcon="⏭"
              onClick={onStep}
              disabled={disabled}
            >
              Step
            </Button>
            {onFastForward ? (
              <Button
                variant="outline"
                tone="default"
                size="sm"
                leadingIcon="⏩"
                onClick={onFastForward}
                disabled={disabled}
                isActive={state === 'fastForward'}
              >
                Fast forward
              </Button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <label className="flex flex-col gap-2 text-sm text-text-secondary">
            <span className="font-medium text-text-primary">Tick length</span>
            <div className="flex items-center gap-3">
              <RangeInput
                min={minTickLength}
                max={maxTickLength}
                step={1}
                value={tickLengthMinutes}
                onChange={handleTickLengthChange}
                disabled={disabled || !onTickLengthChange}
              />
              <span className="w-20 text-right font-mono text-sm text-text-muted">
                {tickLengthMinutes.toFixed(0)}m
              </span>
            </div>
            <span className="text-xs text-text-muted">
              {minTickLength}–{maxTickLength} minutes per simulation tick.
            </span>
          </label>
        </div>
      </div>
      {setpointControls ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {setpointControls}
        </div>
      ) : null}
      {footer ? (
        <div className="border-t border-border/50 pt-4 text-sm text-text-muted">{footer}</div>
      ) : null}
    </section>
  );
};

export type { DashboardControlsProps, SimulationRunState };
export default DashboardControls;
