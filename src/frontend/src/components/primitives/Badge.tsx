import cx from 'clsx';
import type { HTMLAttributes } from 'react';

type BadgeTone = 'default' | 'success' | 'warning' | 'danger';

const toneClasses: Record<BadgeTone, string> = {
  default: 'bg-surface-muted/80 text-text-muted border border-border/60',
  success: 'bg-success/20 text-success border border-success/30',
  warning: 'bg-warning/20 text-warning border border-warning/30',
  danger: 'bg-danger/20 text-danger border border-danger/30',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export const Badge = ({ tone = 'default', className, children, ...props }: BadgeProps) => (
  <span
    className={cx(
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
      toneClasses[tone],
      className,
    )}
    {...props}
  >
    {children}
  </span>
);
