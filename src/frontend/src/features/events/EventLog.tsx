import { useMemo } from 'react';
import { ensureSimulationEventId } from '../../../../runtime/eventIdentity';
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
        {latest.map((event, index) => {
          const withId = ensureSimulationEventId(event, { sequence: index });
          return (
            <div
              key={withId.id}
              className="flex items-start justify-between rounded-xl border border-border/40 bg-surface-elevated/60 px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <Icon
                  name={
                    withId.level === 'error'
                      ? 'error'
                      : withId.level === 'warning'
                        ? 'warning'
                        : 'info'
                  }
                  className={severityStyles[withId.level ?? 'info']}
                />
                <div className="flex flex-col">
                  <span className="font-medium text-text">{withId.message ?? withId.type}</span>
                  <span className="text-xs text-text-muted">
                    Tick {withId.tick ?? '—'} · {withId.type}
                  </span>
                </div>
              </div>
              {withId.zoneId ? (
                <span className="text-xs text-text-muted">{withId.zoneId}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
