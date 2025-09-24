import { ReactNode } from 'react';
import { Button } from '@/components/inputs';

type SimulationStatus = 'live' | 'paused' | 'fastForward';

type TimeDisplayMeta = {
  label: string;
  value: string;
};

type TimeDisplayProps = {
  tick: number;
  simulationTimeLabel: string;
  realTimeLabel?: string;
  status?: SimulationStatus;
  tickLengthMinutes?: number;
  meta?: TimeDisplayMeta[];
  onSync?: () => void;
  syncLabel?: string;
  prefix?: ReactNode;
  className?: string;
};

const statusClassName: Record<SimulationStatus, string> = {
  live: 'bg-positive/90',
  paused: 'bg-text-muted',
  fastForward: 'bg-accent',
};

const statusLabel: Record<SimulationStatus, string> = {
  live: 'Live',
  paused: 'Paused',
  fastForward: 'Fast forward',
};

const TimeDisplay = ({
  tick,
  simulationTimeLabel,
  realTimeLabel,
  status = 'live',
  tickLengthMinutes,
  meta,
  onSync,
  syncLabel = 'Jump to live',
  prefix,
  className,
}: TimeDisplayProps) => {
  const containerClass = [
    'flex flex-col gap-4 rounded-lg border border-border/60 bg-surfaceAlt/60 p-4 text-sm text-text-secondary shadow-soft md:flex-row md:items-center md:justify-between md:text-base',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const statusIndicator = status ? statusClassName[status] : statusClassName.live;

  return (
    <section className={containerClass}>
      <div className="flex flex-1 items-center gap-4">
        <span
          className={['inline-flex h-3 w-3 rounded-full', statusIndicator].join(' ')}
          aria-label={statusLabel[status]}
        />
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {prefix ? <span className="text-text-muted">{prefix}</span> : null}
            <span className="font-semibold uppercase tracking-wide text-text-muted">
              Tick #{tick}
            </span>
            {tickLengthMinutes !== undefined ? (
              <span className="rounded-full border border-border/50 px-2 py-0.5 text-xs font-medium text-text-muted">
                {tickLengthMinutes} min/tick
              </span>
            ) : null}
          </div>
          <p className="text-lg font-medium text-text-primary md:text-xl">{simulationTimeLabel}</p>
          {realTimeLabel ? (
            <p className="text-xs text-text-muted md:text-sm">Real time: {realTimeLabel}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col items-start gap-4 md:items-end">
        {meta && meta.length > 0 ? (
          <dl className="grid grid-cols-1 gap-3 text-left text-xs text-text-muted sm:grid-cols-2">
            {meta.map((entry) => (
              <div key={entry.label} className="space-y-1">
                <dt className="uppercase tracking-wide text-text-muted/80">{entry.label}</dt>
                <dd className="text-sm font-medium text-text-primary">{entry.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {onSync ? (
          <Button onClick={onSync} variant="outline" tone="accent" size="xs" leadingIcon="⟳">
            {syncLabel}
          </Button>
        ) : null}
      </div>
    </section>
  );
};

export type { SimulationStatus, TimeDisplayMeta, TimeDisplayProps };
export default TimeDisplay;
