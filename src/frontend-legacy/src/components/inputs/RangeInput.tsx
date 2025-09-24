import { InputHTMLAttributes, forwardRef } from 'react';

type RangeInputProps = InputHTMLAttributes<HTMLInputElement>;

const RangeInput = forwardRef<HTMLInputElement, RangeInputProps>(({ className, ...props }, ref) => {
  const baseClass =
    'h-2 w-full cursor-pointer appearance-none rounded-full bg-border/60 accent-accent/70 disabled:cursor-not-allowed disabled:opacity-60';

  const finalClass = [baseClass, className].filter(Boolean).join(' ');

  return <input ref={ref} type="range" className={finalClass} {...props} />;
});

RangeInput.displayName = 'RangeInput';

export type { RangeInputProps };
export default RangeInput;
