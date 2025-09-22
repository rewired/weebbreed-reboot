import { ReactNode } from 'react';

type NavigationLayout = 'horizontal' | 'vertical';

type NavigationItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
  disabled?: boolean;
  tooltip?: string;
};

type NavigationProps = {
  items: NavigationItem[];
  activeItemId?: string;
  onSelect?: (id: string) => void;
  layout?: NavigationLayout;
  className?: string;
};

const Navigation = ({
  items,
  activeItemId,
  onSelect,
  layout = 'horizontal',
  className,
}: NavigationProps) => {
  const containerClass = [
    layout === 'vertical'
      ? 'flex flex-col gap-2 rounded-lg border border-border/60 bg-surfaceAlt/70 p-2 shadow-soft'
      : 'flex flex-wrap items-center gap-2 rounded-full border border-border/60 bg-surfaceAlt/60 p-2 shadow-soft',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <nav className={containerClass} aria-label="Dashboard navigation">
      {items.map((item) => {
        const isActive = item.id === activeItemId;
        const baseClass =
          'group inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
        const activeClass = isActive
          ? 'bg-accent/20 text-text-primary shadow-soft'
          : 'text-text-muted hover:bg-surfaceAlt/90 hover:text-text-primary';
        const disabledClass = item.disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer';

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => (item.disabled ? undefined : onSelect?.(item.id))}
            className={[baseClass, activeClass, disabledClass].filter(Boolean).join(' ')}
            title={item.tooltip}
            aria-pressed={isActive}
            aria-disabled={item.disabled}
          >
            {item.icon ? <span className="text-base text-text-secondary">{item.icon}</span> : null}
            <span>{item.label}</span>
            {item.badge !== undefined ? (
              <span className="ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full border border-border/60 bg-surfaceElevated px-2 py-0.5 text-xs font-semibold text-text-secondary">
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
};

export type { NavigationItem, NavigationLayout, NavigationProps };
export default Navigation;
