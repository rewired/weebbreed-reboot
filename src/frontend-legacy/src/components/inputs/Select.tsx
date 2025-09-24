import { SelectHTMLAttributes, forwardRef } from 'react';

type SelectSize = 'sm' | 'md';

type SelectProps = {
  size?: SelectSize;
  className?: string;
} & SelectHTMLAttributes<HTMLSelectElement>;

const sizeClassName: Record<SelectSize, string> = {
  sm: 'px-2.5 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ size = 'md', className, ...props }, ref) => {
    const baseClass =
      'w-full rounded-md border border-border/60 bg-surface text-text-primary shadow-inner focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-60';

    const finalClass = [baseClass, sizeClassName[size], className].filter(Boolean).join(' ');

    return <select ref={ref} className={finalClass} {...props} />;
  },
);

Select.displayName = 'Select';

export type { SelectProps, SelectSize };
export default Select;
