import { HTMLAttributes, ReactNode } from 'react';

type CardProps = {
  title?: string;
  subtitle?: string;
  metadata?: Array<{ label: string; value: string }>;
  footer?: ReactNode;
  interactive?: boolean;
  children?: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

const Card = ({
  title,
  subtitle,
  metadata,
  footer,
  interactive = false,
  children,
  className,
  ...rest
}: CardProps) => {
  const containerClass = [
    'flex h-full flex-col gap-3 rounded-lg border border-border/50 bg-surfaceAlt/70 p-4 shadow-soft transition',
    interactive
      ? 'hover:-translate-y-0.5 hover:border-accent hover:shadow-strong focus-within:border-accent'
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass} {...rest}>
      {(title || subtitle) && (
        <header className="space-y-1">
          {title ? <h3 className="text-lg font-semibold text-text-primary">{title}</h3> : null}
          {subtitle ? <p className="text-sm text-text-secondary">{subtitle}</p> : null}
        </header>
      )}
      {metadata && metadata.length > 0 ? (
        <dl className="grid grid-cols-1 gap-3 text-xs text-text-muted sm:grid-cols-2">
          {metadata.map((entry) => (
            <div
              key={entry.label}
              className="space-y-1 rounded-md border border-border/40 bg-surfaceAlt/60 p-3"
            >
              <dt className="uppercase tracking-wide">{entry.label}</dt>
              <dd className="text-sm font-medium text-text-primary">{entry.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children ? <div className="flex-1 text-sm text-text-secondary">{children}</div> : null}
      {footer ? (
        <footer className="border-t border-border/40 pt-3 text-sm text-text-muted">{footer}</footer>
      ) : null}
    </div>
  );
};

export type { CardProps };
export default Card;
