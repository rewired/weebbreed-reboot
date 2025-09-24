import { ReactNode } from 'react';

type PanelPadding = 'none' | 'sm' | 'md' | 'lg';
type PanelVariant = 'default' | 'ghost' | 'elevated';

type PanelProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  padding?: PanelPadding;
  variant?: PanelVariant;
  className?: string;
};

const paddingClassName: Record<PanelPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const variantClassName: Record<PanelVariant, string> = {
  default: 'border border-border/60 bg-surfaceAlt/70 shadow-soft',
  ghost: 'border border-transparent bg-transparent',
  elevated: 'border border-border/40 bg-surfaceElevated shadow-strong backdrop-blur-md',
};

const Panel = ({
  title,
  description,
  action,
  footer,
  children,
  padding = 'md',
  variant = 'default',
  className,
}: PanelProps) => {
  const containerClass = [
    'rounded-lg',
    paddingClassName[padding],
    variantClassName[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={containerClass}>
      {(title || description || action) && (
        <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            {title ? <h2 className="text-lg font-semibold text-text-primary">{title}</h2> : null}
            {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
          </div>
          {action ? <div className="flex items-center gap-2">{action}</div> : null}
        </header>
      )}
      <div className="space-y-4 text-sm text-text-secondary">{children}</div>
      {footer ? (
        <footer className="mt-6 border-t border-border/40 pt-4 text-sm text-text-muted">
          {footer}
        </footer>
      ) : null}
    </section>
  );
};

export type { PanelPadding, PanelProps, PanelVariant };
export default Panel;
