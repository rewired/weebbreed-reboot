import { ButtonHTMLAttributes, forwardRef } from 'react';

type IconButtonVariant = 'solid' | 'outline' | 'ghost';
type IconButtonTone = 'default' | 'accent' | 'danger';
type IconButtonSize = 'sm' | 'md' | 'lg';

type IconButtonProps = {
  variant?: IconButtonVariant;
  tone?: IconButtonTone;
  size?: IconButtonSize;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const sizeClassName: Record<IconButtonSize, string> = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-9 w-9 text-base',
  lg: 'h-10 w-10 text-lg',
};

const variantToneClassName: Record<IconButtonVariant, Record<IconButtonTone, string>> = {
  solid: {
    accent:
      'border border-accent/60 bg-accent/90 text-surface shadow-soft hover:bg-accent focus-visible:outline-accent',
    default:
      'border border-border/60 bg-surfaceAlt text-text-secondary hover:border-accent/60 hover:text-text-primary focus-visible:outline-accent',
    danger:
      'border border-danger/60 bg-danger/15 text-danger hover:bg-danger/25 focus-visible:outline-danger',
  },
  outline: {
    accent:
      'border border-accent/60 bg-transparent text-accent hover:bg-accent/10 focus-visible:outline-accent',
    default:
      'border border-border/60 bg-transparent text-text-secondary hover:border-accent hover:text-text-primary focus-visible:outline-accent',
    danger:
      'border border-danger/60 bg-transparent text-danger hover:bg-danger/10 focus-visible:outline-danger',
  },
  ghost: {
    accent:
      'bg-transparent text-accent hover:text-accent/80 focus-visible:outline focus-visible:outline-accent',
    default:
      'bg-transparent text-text-muted hover:text-text-primary focus-visible:outline focus-visible:outline-accent',
    danger:
      'bg-transparent text-danger hover:text-danger/80 focus-visible:outline focus-visible:outline-danger',
  },
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'ghost',
      tone = 'default',
      size = 'md',
      className,
      type = 'button',
      children,
      ...props
    },
    ref,
  ) => {
    const baseClass =
      'inline-flex items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

    const finalClass = [
      baseClass,
      sizeClassName[size],
      variantToneClassName[variant][tone],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} type={type} className={finalClass} {...props}>
        {children}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';

export type { IconButtonProps, IconButtonSize, IconButtonTone, IconButtonVariant };
export default IconButton;
