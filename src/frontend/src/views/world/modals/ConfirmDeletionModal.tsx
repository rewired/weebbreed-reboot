import Modal from '@/components/Modal';

type ConfirmDeletionModalProps = {
  entityLabel: string;
  entityName?: string;
  impactDescription?: string;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

const ConfirmDeletionModal = ({
  entityLabel,
  entityName,
  impactDescription,
  onConfirm,
  onCancel,
  title,
  description,
}: ConfirmDeletionModalProps) => {
  const effectiveTitle = title ?? `Delete ${entityLabel}?`;
  const effectiveDescription =
    description ??
    `This ${entityLabel.toLowerCase()} will be removed from the simulation snapshot. Related telemetry and assignments will be updated by the facade.`;

  return (
    <Modal
      isOpen
      title={effectiveTitle}
      description={effectiveDescription}
      onClose={onCancel}
      size="sm"
      actions={[
        {
          label: 'Cancel',
          onClick: onCancel,
          variant: 'secondary',
        },
        {
          label: `Delete ${entityLabel.toLowerCase()}`,
          onClick: onConfirm,
          variant: 'danger',
        },
      ]}
    >
      <div className="space-y-3 text-sm text-text-secondary">
        {entityName ? (
          <p>
            <span className="font-medium text-text-primary">{entityName}</span> will be removed.
          </p>
        ) : null}
        {impactDescription ? <p>{impactDescription}</p> : null}
        <p className="text-xs text-text-muted">
          Deletion requests are processed deterministically. Any CapEx reversals or cleanup actions
          are handled by the simulation facade.
        </p>
      </div>
    </Modal>
  );
};

export type { ConfirmDeletionModalProps };
export default ConfirmDeletionModal;
