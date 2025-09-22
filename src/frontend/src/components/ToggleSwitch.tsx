import { KeyboardEvent, ReactNode } from 'react';

type ToggleSize = 'sm' | 'md';

type ToggleSwitchProps = {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  size?: ToggleSize;
  className?: string;
};

const sizeClassName: Record<ToggleSize, { track: string; thumb: string }> = {
  sm: {
    track: 'h-5 w-9',
    thumb: 'h-4 w-4 translate-x-0.5 data-[state=on]:translate-x-[1.55rem]',
  },
  md: {
    track: 'h-6 w-11',
    thumb: 'h-5 w-5 translate-x-1 data-[state=on]:translate-x-[1.65rem]',
  },
};

const ToggleSwitch = ({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className,
}: ToggleSwitchProps) => {
  const containerClass = [
    'flex items-center gap-3 rounded-md border border-transparent px-2 py-2 transition',
    disabled ? 'opacity-60' : 'hover:border-accent/60',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const { track, thumb } = sizeClassName[size];

  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={containerClass}>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === 'string' ? label : undefined}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        data-state={checked ? 'on' : 'off'}
        className={[
          'relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-border/60 bg-surfaceAlt transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          checked ? 'border-accent bg-accent/70' : 'hover:border-accent/50',
          disabled ? 'cursor-not-allowed' : '',
          track,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block rounded-full bg-surface shadow-soft transition-transform duration-200 ease-in-out',
            thumb,
          ]
            .filter(Boolean)
            .join(' ')}
        />
      </button>
      {(label || description) && (
        <label htmlFor={id} className="flex flex-col text-left">
          {label ? <span className="text-sm font-medium text-text-primary">{label}</span> : null}
          {description ? <span className="text-xs text-text-muted">{description}</span> : null}
        </label>
      )}
    </div>
  );
};

export type { ToggleSize, ToggleSwitchProps };
export default ToggleSwitch;
