import { useMemo } from 'react';
import { Card } from '@/components/primitives/Card';
import { Icon } from '@/components/common/Icon';
import { useSimulationStore } from '@/store/simulation';

const severityStyles: Record<string, string> = {
  info: 'text-text-muted',
  warning: 'text-warning',
  error: 'text-danger',
  debug: 'text-text-muted',
};

export const EventLog = () => {
  const events = useSimulationStore((state) => state.events);
  const latest = useMemo(() => [...events].slice(-6).reverse(), [events]);

  if (!latest.length) {
    return null;
  }

  return (
    <Card
      title="Recent Events"
      subtitle="Telemetry grouped by severity"
      className="bg-surface-muted/80"
    >
      <div className="grid gap-2 text-sm">
        {latest.map((event) => (
          <div
            key={`${event.type}-${event.ts ?? event.tick}`}
            className="flex items-start justify-between rounded-xl border border-border/40 bg-surface-elevated/60 px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <Icon
                name={
                  event.level === 'error' ? 'error' : event.level === 'warning' ? 'warning' : 'info'
                }
                className={severityStyles[event.level ?? 'info']}
              />
              <div className="flex flex-col">
                <span className="font-medium text-text">{event.message ?? event.type}</span>
                <span className="text-xs text-text-muted">
                  Tick {event.tick ?? '—'} · {event.type}
                </span>
              </div>
            </div>
            {event.zoneId ? <span className="text-xs text-text-muted">{event.zoneId}</span> : null}
          </div>
        ))}
      </div>
    </Card>
  );
};
