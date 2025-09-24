import Modal from '@/components/Modal';
import type { DeviceSnapshot, ZoneSnapshot } from '@/types/simulation';

type RemoveDeviceModalProps = {
  device: DeviceSnapshot;
  zone?: ZoneSnapshot;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

const RemoveDeviceModal = ({
  device,
  zone,
  onConfirm,
  onCancel,
  title,
  description,
}: RemoveDeviceModalProps) => {
  return (
    <Modal
      isOpen
      title={title ?? `Remove ${device.name}`}
      description={
        description ??
        'Removing a device schedules it for teardown. The simulation façade will handle cleanup and cost tracking.'
      }
      onClose={onCancel}
      size="md"
      actions={[
        { label: 'Cancel', onClick: onCancel, variant: 'secondary' },
        { label: 'Remove device', onClick: onConfirm, variant: 'danger' },
      ]}
    >
      <div className="space-y-3 text-sm text-text-secondary">
        <div>
          <p className="font-medium text-text-primary">{device.name}</p>
          <p className="text-xs uppercase tracking-wide text-text-muted">{device.kind}</p>
          <p className="text-xs text-text-muted">Blueprint: {device.blueprintId}</p>
        </div>
        {zone ? (
          <p className="text-xs text-text-muted">
            Assigned to {zone.name} ({zone.structureName} / {zone.roomName})
          </p>
        ) : null}
        <p className="text-xs text-text-muted">
          Maintenance history and telemetry remain archived in the simulation logs after removal.
        </p>
      </div>
    </Modal>
  );
};

export type { RemoveDeviceModalProps };
export default RemoveDeviceModal;
