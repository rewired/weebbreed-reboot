import { ReactNode } from 'react';

type MetricTrend = 'up' | 'down' | 'steady';

type MetricDefinition = {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  change?: number | string;
  changeLabel?: string;
  trend?: MetricTrend;
  hint?: string;
  icon?: ReactNode;
};

type MetricsBarProps = {
  metrics: MetricDefinition[];
  onMetricClick?: (metric: MetricDefinition) => void;
  layout?: 'comfortable' | 'compact';
  className?: string;
};

const trendClassName: Record<MetricTrend, string> = {
  up: 'text-positive',
  down: 'text-danger',
  steady: 'text-text-muted',
};

const MetricsBar = ({
  metrics,
  onMetricClick,
  layout = 'comfortable',
  className,
}: MetricsBarProps) => {
  const gridClassName = [
    'grid grid-cols-1',
    layout === 'compact'
      ? 'gap-3 sm:grid-cols-2 xl:grid-cols-4'
      : 'gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={gridClassName}>
      {metrics.map((metric) => {
        const valueText =
          typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value;
        const changeText =
          typeof metric.change === 'number'
            ? `${metric.change > 0 ? '+' : ''}${metric.change.toFixed(2)}${metric.changeLabel ?? ''}`
            : metric.change;
        const showChange = changeText !== undefined && changeText !== null && changeText !== '';
        const Component = onMetricClick ? 'button' : 'div';
        const interactive = Boolean(onMetricClick);

        return (
          <Component
            key={metric.id}
            type={interactive ? 'button' : undefined}
            onClick={interactive ? () => onMetricClick(metric) : undefined}
            className={[
              'group flex flex-col gap-2 rounded-lg border border-border/50 bg-surfaceAlt/60 p-4 text-left shadow-soft transition-all',
              interactive
                ? 'hover:-translate-y-0.5 hover:border-accent hover:shadow-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            title={metric.hint}
          >
            <div className="flex items-center justify-between gap-3 text-sm text-text-muted">
              <span className="font-medium uppercase tracking-wide">{metric.label}</span>
              {metric.icon ? (
                <span className="text-lg text-text-secondary">{metric.icon}</span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-semibold text-text-primary">{valueText}</span>
              {metric.unit ? (
                <span className="text-sm font-medium text-text-muted">{metric.unit}</span>
              ) : null}
            </div>
            {showChange ? (
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={[
                    'font-medium',
                    metric.trend ? trendClassName[metric.trend] : 'text-text-secondary',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {changeText}
                </span>
                {metric.trend === 'up' ? (
                  <span aria-hidden="true" className="text-positive">
                    ▲
                  </span>
                ) : null}
                {metric.trend === 'down' ? (
                  <span aria-hidden="true" className="text-danger">
                    ▼
                  </span>
                ) : null}
                {metric.trend === 'steady' ? (
                  <span aria-hidden="true" className="text-text-muted">
                    ▬
                  </span>
                ) : null}
              </div>
            ) : null}
          </Component>
        );
      })}
    </section>
  );
};

export type { MetricDefinition, MetricsBarProps, MetricTrend };
export default MetricsBar;
