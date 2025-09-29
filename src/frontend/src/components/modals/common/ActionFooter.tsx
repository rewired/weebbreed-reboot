import { Button } from '@/components/primitives/Button';

export interface ActionFooterProps {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmDisabled: boolean;
  cancelDisabled: boolean;
}

export const ActionFooter = ({
  onCancel,
  onConfirm,
  confirmLabel,
  confirmDisabled,
  cancelDisabled,
}: ActionFooterProps) => (
  <div className="flex justify-end gap-2">
    <Button variant="ghost" onClick={onCancel} disabled={cancelDisabled}>
      Cancel
    </Button>
    <Button variant="primary" onClick={onConfirm} disabled={confirmDisabled}>
      {confirmLabel}
    </Button>
  </div>
);
