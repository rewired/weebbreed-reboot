import { useEffect } from 'react';
import cx from 'clsx';
import { Icon } from '@/components/common/Icon';
import { Button } from '@/components/primitives/Button';
import { useUIStore, type ToastDescriptor } from '@/store/ui';

const TONE_ICON: Record<ToastDescriptor['tone'], string> = {
  success: 'check_circle',
  info: 'info',
  warning: 'warning',
  error: 'error',
};

const TONE_CLASSES: Record<ToastDescriptor['tone'], string> = {
  success: 'border-success/50 bg-success/10 text-success',
  info: 'border-primary/40 bg-primary/10 text-primary',
  warning: 'border-warning/50 bg-warning/10 text-warning',
  error: 'border-danger/50 bg-danger/10 text-danger',
};

const DEFAULT_DURATION_MS = 6000;

const ToastEntry = ({ toast }: { toast: ToastDescriptor }) => {
  const dismissToast = useUIStore((state) => state.dismissToast);

  useEffect(() => {
    if (toast.durationMs === 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      dismissToast(toast.id);
    }, toast.durationMs ?? DEFAULT_DURATION_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [dismissToast, toast.durationMs, toast.id]);

  return (
    <div
      role="status"
      className={cx(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-surface-elevated/95 p-4 shadow-lg backdrop-blur',
        TONE_CLASSES[toast.tone],
      )}
      data-testid={`toast-${toast.tone}`}
    >
      <Icon name={TONE_ICON[toast.tone]} size={24} className="mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-text">{toast.title}</p>
        {toast.description ? (
          <p className="mt-1 text-sm text-text-muted">{toast.description}</p>
        ) : null}
      </div>
      <Button
        size="sm"
        variant="ghost"
        aria-label="Dismiss notification"
        onClick={() => {
          dismissToast(toast.id);
        }}
      >
        <Icon name="close" size={18} />
      </Button>
    </div>
  );
};

export const ToastViewport = () => {
  const toasts = useUIStore((state) => state.toasts);

  if (!toasts.length) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-[70] flex flex-col items-center gap-3 px-4 sm:items-end sm:px-6">
      {toasts.map((toast) => (
        <ToastEntry key={toast.id} toast={toast} />
      ))}
    </div>
  );
};
