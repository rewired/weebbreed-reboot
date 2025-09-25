import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';

interface ModalFrameProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

const getModalRoot = () => document.getElementById('modal-root') ?? document.body;

export const ModalFrame = ({ title, subtitle, onClose, children }: ModalFrameProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = containerRef.current;
    const focusable = root?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    focusable?.[0]?.focus({ preventScroll: true });

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'Tab' && focusable && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur">
      <div
        ref={containerRef}
        className="relative flex w-full max-w-3xl flex-col gap-6 rounded-3xl border border-border/60 bg-surface-elevated/90 p-8 shadow-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-text">{title}</h2>
            {subtitle ? <p className="text-sm text-text-muted">{subtitle}</p> : null}
          </div>
          <Button
            aria-label="Close modal"
            variant="ghost"
            size="sm"
            icon={<Icon name="close" />}
            onClick={onClose}
          >
            Close
          </Button>
        </header>
        <div className="grid gap-4 text-sm text-text-muted">{children}</div>
      </div>
    </div>,
    getModalRoot(),
  );
};
