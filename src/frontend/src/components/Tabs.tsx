import { ReactNode } from 'react';

type TabItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
  disabled?: boolean;
};

type TabsProps = {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
};

const Tabs = ({
  tabs,
  activeTab,
  onTabChange,
  orientation = 'horizontal',
  className,
}: TabsProps) => {
  const containerClass = [
    orientation === 'vertical'
      ? 'flex flex-col gap-2 rounded-lg border border-border/60 bg-surfaceAlt/70 p-2 shadow-soft'
      : 'flex flex-wrap gap-2 rounded-full border border-border/60 bg-surfaceAlt/60 p-2 shadow-soft',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass} role="tablist" aria-orientation={orientation}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const baseClass =
          'group inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
        const activeClass = isActive
          ? 'bg-accent/20 text-text-primary shadow-soft'
          : 'text-text-muted hover:bg-surfaceAlt/90 hover:text-text-primary';
        const disabledClass = tab.disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer';

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`${tab.id}-panel`}
            className={[baseClass, activeClass, disabledClass].filter(Boolean).join(' ')}
            onClick={() => (tab.disabled ? undefined : onTabChange(tab.id))}
            disabled={tab.disabled}
          >
            {tab.icon ? <span className="text-base text-text-secondary">{tab.icon}</span> : null}
            <span>{tab.label}</span>
            {tab.badge !== undefined ? (
              <span className="ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full border border-border/60 bg-surfaceElevated px-2 py-0.5 text-xs font-semibold text-text-secondary">
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

export type { TabItem, TabsProps };
export default Tabs;
