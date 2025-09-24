import type { ReactNode } from 'react';

export type FormFieldProps = {
  label: string;
  secondaryLabel?: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
};

const FormField = ({ label, secondaryLabel, description, children, className }: FormFieldProps) => {
  const containerClass = [
    'flex flex-col gap-3 rounded-lg border border-border/60 bg-surfaceAlt/60 p-4 shadow-soft transition-colors',
    'hover:border-accent/60',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          {label}
        </span>
        {secondaryLabel ? (
          <span className="text-xs font-mono text-text-muted">{secondaryLabel}</span>
        ) : null}
      </div>
      {description ? <div className="text-xs text-text-muted">{description}</div> : null}
      {children}
    </div>
  );
};

export default FormField;
