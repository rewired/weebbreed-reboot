import cx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

interface BaseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconTrailing?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-black hover:bg-primary-strong transition-colors focus-visible:ring-2 focus-visible:ring-primary-strong',
  secondary:
    'bg-surface-elevated text-text hover:bg-surface-muted border border-border/60 transition-colors',
  ghost: 'bg-transparent text-text hover:bg-surface-muted/60 border border-transparent',
  danger: 'bg-danger/80 text-white hover:bg-danger',
};

const sizeClasses: Record<ButtonSize, string> = {
  md: 'h-10 px-4 text-sm font-medium',
  sm: 'h-9 px-3 text-xs font-semibold',
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  icon,
  iconTrailing,
  fullWidth,
  disabled,
  ...props
}: BaseButtonProps) => (
  <button
    type="button"
    className={cx(
      'inline-flex items-center justify-center gap-2 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60',
      variantClasses[variant],
      sizeClasses[size],
      fullWidth && 'w-full',
      className,
    )}
    disabled={disabled}
    {...props}
  >
    {icon ? <span className="inline-flex items-center">{icon}</span> : null}
    <span>{children}</span>
    {iconTrailing ? <span className="inline-flex items-center">{iconTrailing}</span> : null}
  </button>
);

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md';
  active?: boolean;
}

export const IconButton = ({
  size = 'md',
  className,
  active = false,
  ...props
}: IconButtonProps) => (
  <button
    type="button"
    className={cx(
      'inline-flex items-center justify-center rounded-lg border border-transparent text-text-muted transition-colors duration-200 hover:text-text hover:bg-surface-muted/80 focus-visible:ring-2 focus-visible:ring-primary',
      size === 'sm' ? 'h-9 w-9' : 'h-10 w-10',
      active && 'bg-primary/20 text-primary-strong',
      className,
    )}
    {...props}
  />
);
