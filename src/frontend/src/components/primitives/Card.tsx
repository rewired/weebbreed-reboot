import cx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  action?: ReactNode;
  subtitle?: ReactNode;
}

export const Card = ({ title, action, subtitle, className, children, ...props }: CardProps) => (
  <div
    className={cx(
      'flex flex-col gap-3 rounded-2xl border border-border/40 bg-surface-elevated/80 p-5 shadow-sm backdrop-blur',
      className,
    )}
    {...props}
  >
    {title ? (
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold tracking-tight text-text">{title}</h3>
          {subtitle ? <span className="text-xs text-text-muted">{subtitle}</span> : null}
        </div>
        {action}
      </div>
    ) : null}
    {children}
  </div>
);
