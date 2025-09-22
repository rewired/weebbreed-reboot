import { ChangeEvent, ReactNode } from 'react';

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

  const renderButton = (
    label: string,
    onClick: () => void,
    options?: {
      icon?: ReactNode;
      intent?: 'primary' | 'secondary';
      isActive?: boolean;
      isDisabled?: boolean;
    },
  ) => {
    const icon = options?.icon;
    const intent = options?.intent ?? 'secondary';
    const isActive = options?.isActive;
    const isDisabled = disabled || options?.isDisabled;

    const baseClass =
      'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
    const intentClass =
      intent === 'primary'
        ? 'border border-accent/70 bg-accent/90 text-surface shadow-strong hover:bg-accent focus-visible:outline-accent'
        : 'border border-border/70 bg-surfaceAlt text-text-secondary hover:border-accent/60 hover:text-text-primary focus-visible:outline-accent';

    const activeClass = isActive ? 'border-accent text-accent shadow-soft' : '';

    return (
      <button
        type="button"
        className={[baseClass, intentClass, activeClass].filter(Boolean).join(' ')}
        onClick={onClick}
        disabled={isDisabled}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <section className={containerClass} aria-label="Simulation controls">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wide text-text-muted">
            {stateLabel[state]}
          </p>
          <div className="flex flex-wrap gap-3">
            {renderButton('Play', onPlay, {
              icon: <span aria-hidden="true">▶</span>,
              intent: 'primary',
              isDisabled: state === 'running',
            })}
            {renderButton('Pause', onPause, {
              icon: <span aria-hidden="true">⏸</span>,
              isActive: state === 'paused',
            })}
            {renderButton('Step', onStep, {
              icon: <span aria-hidden="true">⏭</span>,
            })}
            {onFastForward
              ? renderButton('Fast forward', onFastForward, {
                  icon: <span aria-hidden="true">⏩</span>,
                  isActive: state === 'fastForward',
                })
              : null}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <label className="flex flex-col gap-2 text-sm text-text-secondary">
            <span className="font-medium text-text-primary">Tick length</span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={minTickLength}
                max={maxTickLength}
                step={1}
                value={tickLengthMinutes}
                onChange={handleTickLengthChange}
                disabled={disabled || !onTickLengthChange}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border/60 accent-accent/70"
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
