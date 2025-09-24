import { InputHTMLAttributes, forwardRef } from 'react';

type TextInputSize = 'sm' | 'md';

type TextInputProps = {
  size?: TextInputSize;
  invalid?: boolean;
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>;

const sizeClassName: Record<TextInputSize, string> = {
  sm: 'px-2.5 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
};

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ size = 'md', invalid = false, className, type = 'text', ...props }, ref) => {
    const baseClass =
      'w-full rounded-md border border-border/60 bg-surface text-text-primary shadow-inner focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-60 placeholder:text-text-muted/60';
    const invalidClass = invalid
      ? 'border-danger/70 focus:border-danger focus:ring-danger/40'
      : undefined;

    const finalClass = [baseClass, sizeClassName[size], invalidClass, className]
      .filter(Boolean)
      .join(' ');

    return <input ref={ref} type={type} className={finalClass} {...props} />;
  },
);

TextInput.displayName = 'TextInput';

export type { TextInputProps, TextInputSize };
export default TextInput;
