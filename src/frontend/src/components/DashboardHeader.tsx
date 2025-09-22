import { ReactNode } from 'react';

type DashboardHeaderStatusTone = 'default' | 'positive' | 'warning' | 'danger';

type DashboardHeaderStatus = {
  label: string;
  tone?: DashboardHeaderStatusTone;
  icon?: ReactNode;
  tooltip?: string;
};

type HeaderMeta = {
  label: string;
  value: string;
};

type DashboardHeaderProps = {
  title: string;
  subtitle?: string;
  status?: DashboardHeaderStatus;
  actions?: ReactNode;
  children?: ReactNode;
  meta?: HeaderMeta[];
  className?: string;
};

const toneClassName: Record<DashboardHeaderStatusTone, string> = {
  default:
    'border border-border/60 bg-surfaceAlt/70 text-text-secondary shadow-soft hover:border-border-strong',
  positive: 'border border-positive/40 bg-positive/10 text-positive',
  warning: 'border border-warning/40 bg-warning/10 text-warning',
  danger: 'border border-danger/40 bg-danger/10 text-danger',
};

const DashboardHeader = ({
  title,
  subtitle,
  status,
  actions,
  children,
  meta,
  className,
}: DashboardHeaderProps) => {
  const containerClass = [
    'rounded-lg bg-surfaceElevated/80 px-6 py-6 shadow-soft backdrop-blur-md md:px-8',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={containerClass}>
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
              {title}
            </h1>
            {status ? (
              <span
                className={[
                  'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium transition-colors',
                  toneClassName[status.tone ?? 'default'],
                ]
                  .filter(Boolean)
                  .join(' ')}
                title={status.tooltip}
              >
                {status.icon}
                <span>{status.label}</span>
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <p className="max-w-3xl text-base text-text-secondary md:text-lg">{subtitle}</p>
          ) : null}
          {meta && meta.length > 0 ? (
            <dl className="grid grid-cols-1 gap-4 text-sm text-text-muted sm:grid-cols-2 lg:grid-cols-3">
              {meta.map((entry) => (
                <div
                  key={entry.label}
                  className="space-y-1 rounded-md border border-border/40 bg-surfaceAlt/50 p-3"
                >
                  <dt className="text-xs uppercase tracking-wide text-text-muted/80">
                    {entry.label}
                  </dt>
                  <dd className="text-base font-medium text-text-primary">{entry.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full items-center justify-start gap-3 md:w-auto md:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </header>
  );
};

export type { DashboardHeaderProps, DashboardHeaderStatus, DashboardHeaderStatusTone };
export default DashboardHeader;
