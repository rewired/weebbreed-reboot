import { ReactNode, useEffect } from 'react';

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

const actionClassName: Record<NonNullable<ModalAction['variant']>, string> = {
  primary:
    'inline-flex items-center justify-center rounded-md border border-accent/80 bg-accent/90 px-4 py-2 text-sm font-medium text-surface shadow-strong transition hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
  secondary:
    'inline-flex items-center justify-center rounded-md border border-border/60 bg-surfaceAlt px-4 py-2 text-sm font-medium text-text-secondary transition hover:border-accent hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
  danger:
    'inline-flex items-center justify-center rounded-md border border-danger/60 bg-danger/20 px-4 py-2 text-sm font-medium text-danger transition hover:bg-danger/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger',
};

const sizeClassName = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
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
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/40 text-lg text-text-muted transition hover:border-accent hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label="Close dialog"
          >
            ×
          </button>
        </header>
        <div className="space-y-4 text-sm text-text-secondary">{children}</div>
        {actions && actions.length > 0 ? (
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {actions.map((action) => {
              const variant = action.variant ?? 'secondary';
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={actionClassName[variant]}
                  disabled={action.disabled}
                >
                  {action.label}
                </button>
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
