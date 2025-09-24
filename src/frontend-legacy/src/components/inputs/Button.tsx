import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';

type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'link';
type ButtonTone = 'default' | 'accent' | 'danger';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

type ButtonProps = {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  isActive?: boolean;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const sizeClassName: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

const variantToneClassName: Record<ButtonVariant, Record<ButtonTone, string>> = {
  solid: {
    accent:
      'border border-accent/70 bg-accent/90 text-surface shadow-soft hover:bg-accent focus-visible:outline-accent',
    default:
      'border border-border/60 bg-surfaceAlt text-text-secondary hover:border-accent/60 hover:text-text-primary focus-visible:outline-accent',
    danger:
      'border border-danger/60 bg-danger/15 text-danger hover:bg-danger/25 focus-visible:outline-danger',
  },
  outline: {
    accent:
      'border border-accent/60 bg-transparent text-accent hover:bg-accent/10 focus-visible:outline-accent',
    default:
      'border border-border/60 bg-surfaceAlt/70 text-text-secondary hover:border-accent hover:text-text-primary focus-visible:outline-accent',
    danger:
      'border border-danger/60 bg-transparent text-danger hover:bg-danger/10 focus-visible:outline-danger',
  },
  ghost: {
    accent:
      'bg-transparent text-accent hover:text-accent/80 focus-visible:outline focus-visible:outline-accent',
    default:
      'bg-transparent text-text-secondary hover:text-text-primary focus-visible:outline focus-visible:outline-accent',
    danger:
      'bg-transparent text-danger hover:text-danger/80 focus-visible:outline focus-visible:outline-danger',
  },
  link: {
    accent:
      'bg-transparent px-0 py-0 text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-accent',
    default:
      'bg-transparent px-0 py-0 text-sm font-medium text-text-secondary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-accent',
    danger:
      'bg-transparent px-0 py-0 text-sm font-medium text-danger underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-danger',
  },
};

const activeVariantClassName: Partial<Record<ButtonVariant, Partial<Record<ButtonTone, string>>>> =
  {
    solid: {
      accent: 'border-accent bg-accent text-surface shadow-strong',
      default: 'border-accent text-text-primary shadow-soft',
      danger: 'border-danger text-danger shadow-soft',
    },
    outline: {
      accent: 'border-accent bg-accent/15 text-accent shadow-soft',
      default: 'border-accent bg-surfaceElevated text-text-primary shadow-soft',
      danger: 'border-danger bg-danger/10 text-danger shadow-soft',
    },
    ghost: {
      accent: 'text-accent',
      default: 'text-text-primary',
      danger: 'text-danger',
    },
    link: {
      accent: 'underline',
      default: 'underline',
      danger: 'underline',
    },
  };

const resolveIconClassName = (size: ButtonSize) => {
  switch (size) {
    case 'xs':
      return 'text-xs';
    case 'lg':
      return 'text-lg';
    case 'md':
      return 'text-base';
    default:
      return 'text-sm';
  }
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'solid',
      tone = 'accent',
      size = 'sm',
      leadingIcon,
      trailingIcon,
      fullWidth = false,
      isActive = false,
      className,
      type = 'button',
      children,
      ...props
    },
    ref,
  ) => {
    const baseClass =
      'inline-flex items-center justify-center gap-2 rounded-md font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

    const resolvedSizeClass = variant === 'link' ? 'text-sm' : sizeClassName[size];
    const variantClass = variantToneClassName[variant][tone];
    const activeClass = isActive ? activeVariantClassName[variant]?.[tone] : undefined;
    const widthClass = fullWidth ? 'w-full' : undefined;

    const finalClass = [
      baseClass,
      resolvedSizeClass,
      variantClass,
      activeClass,
      widthClass,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const iconClass = resolveIconClassName(size);

    return (
      <button ref={ref} type={type} className={finalClass} {...props}>
        {leadingIcon ? (
          <span aria-hidden="true" className={['flex items-center', iconClass].join(' ')}>
            {leadingIcon}
          </span>
        ) : null}
        {children}
        {trailingIcon ? (
          <span aria-hidden="true" className={['flex items-center', iconClass].join(' ')}>
            {trailingIcon}
          </span>
        ) : null}
      </button>
    );
  },
);

Button.displayName = 'Button';

export type { ButtonProps, ButtonSize, ButtonTone, ButtonVariant };
export default Button;
