import cx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';

interface IconProps extends ComponentPropsWithoutRef<'span'> {
  name: string;
  filled?: boolean;
  weight?: number;
  size?: number;
}

export const Icon = ({
  name,
  className,
  filled = false,
  weight = 400,
  size = 24,
  style,
  ...props
}: IconProps) => (
  <span
    aria-hidden
    className={cx('material-symbols-rounded text-text-muted', className)}
    style={{
      fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
      fontSize: size,
      ...style,
    }}
    {...props}
  >
    {name}
  </span>
);
