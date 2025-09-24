import { ReactNode, useEffect } from 'react';
import { Button, IconButton } from '@/components/inputs';

type ModalAction = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

type ModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children?: ReactNode;
  actions?: ModalAction[];
  size?: 'sm' | 'md' | 'lg';
  closeOnOverlay?: boolean;
  className?: string;
};

const sizeClassName = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
};

const mapActionToButton = (variant: NonNullable<ModalAction['variant']>) => {
  switch (variant) {
    case 'primary':
      return { variant: 'solid' as const, tone: 'accent' as const };
    case 'danger':
      return { variant: 'solid' as const, tone: 'danger' as const };
    default:
      return { variant: 'outline' as const, tone: 'default' as const };
  }
};

const Modal = ({
  isOpen,
  title,
  description,
  onClose,
  children,
  actions,
  size = 'md',
  closeOnOverlay = true,
  className,
}: ModalProps) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const dialogClass = [
    'relative z-10 w-full rounded-lg border border-border/40 bg-surfaceElevated p-6 text-text-secondary shadow-strong backdrop-blur-lg',
    sizeClassName[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleOverlayClick = () => {
    if (closeOnOverlay) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div
        className="absolute inset-0 bg-overlay"
        aria-hidden="true"
        onClick={handleOverlayClick}
      />
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className={dialogClass}>
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 id="modal-title" className="text-xl font-semibold text-text-primary">
              {title}
            </h2>
            {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
          </div>
          <IconButton
            onClick={onClose}
            aria-label="Close dialog"
            variant="ghost"
            tone="default"
            size="md"
          >
            ×
          </IconButton>
        </header>
        <div className="space-y-4 text-sm text-text-secondary">{children}</div>
        {actions && actions.length > 0 ? (
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {actions.map((action) => {
              const variant = action.variant ?? 'secondary';
              const buttonConfig = mapActionToButton(variant);
              return (
                <Button
                  key={action.label}
                  onClick={action.onClick}
                  variant={buttonConfig.variant}
                  tone={buttonConfig.tone}
                  size="md"
                  disabled={action.disabled}
                >
                  {action.label}
                </Button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export type { ModalAction, ModalProps };
export default Modal;
