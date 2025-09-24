import { FormEvent, useState } from 'react';
import Modal from '@/components/Modal';
import FormField from '@/components/forms/FormField';
import { TextInput } from '@/components/inputs';
import type { RoomSnapshot, ZoneSnapshot } from '@/types/simulation';

type DuplicateZoneModalProps = {
  zone: ZoneSnapshot;
  room: RoomSnapshot;
  availableArea: number;
  deviceCount: number;
  onConfirm: (options: { name: string; includeDevices: boolean; includeMethod: boolean }) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

const DuplicateZoneModal = ({
  zone,
  room,
  availableArea,
  deviceCount,
  onConfirm,
  onCancel,
  title,
  description,
}: DuplicateZoneModalProps) => {
  const [name, setName] = useState(() => `${zone.name} copy`);
  const [includeDevices, setIncludeDevices] = useState(true);
  const [includeMethod, setIncludeMethod] = useState(Boolean(zone.cultivationMethodId));

  const canDuplicate = zone.area <= availableArea;

  const handleSubmit = (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    if (!name.trim()) {
      return;
    }
    onConfirm({ name: name.trim(), includeDevices, includeMethod });
  };

  return (
    <Modal
      isOpen
      title={title ?? `Duplicate ${zone.name}`}
      description={
        description ??
        'Cloning a zone recreates its cultivation footprint and optionally reuses automation and device setup. The facade ' +
          'validates room capacity and charges for newly purchased hardware.'
      }
      onClose={onCancel}
      size="md"
      actions={[
        {
          label: 'Cancel',
          onClick: onCancel,
          variant: 'secondary',
        },
        {
          label: 'Duplicate zone',
          onClick: () => handleSubmit(),
          variant: 'primary',
          disabled: !name.trim() || !canDuplicate,
        },
      ]}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="New zone name" secondaryLabel={name.trim() || undefined}>
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`${zone.name} copy`}
            autoFocus
          />
        </FormField>

        <div className="grid grid-cols-1 gap-3 rounded-lg border border-border/60 bg-surfaceAlt/50 p-4 text-sm text-text-secondary">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">Room capacity</span>
            <span className="font-medium text-text-primary">{room.area.toLocaleString()} m²</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">Required area</span>
            <span className="font-medium text-text-primary">{zone.area.toLocaleString()} m²</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">Available area</span>
            <span
              className={canDuplicate ? 'font-medium text-positive' : 'font-medium text-danger'}
            >
              {availableArea.toLocaleString()} m²
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">
              Devices to duplicate
            </span>
            <span className="font-medium text-text-primary">{deviceCount.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border/60 bg-surfaceAlt/50 p-4 text-sm text-text-secondary">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={includeMethod}
              onChange={(event) => setIncludeMethod(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border border-border/60 bg-surface text-accent focus:outline-none focus:ring-1 focus:ring-accent/60"
            />
            <span>
              <span className="block font-medium text-text-primary">
                Duplicate cultivation method
              </span>
              <span className="text-xs text-text-muted">
                Reuses the source zone’s automation plan, planting targets, and method metadata when
                available.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={includeDevices}
              onChange={(event) => setIncludeDevices(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border border-border/60 bg-surface text-accent focus:outline-none focus:ring-1 focus:ring-accent/60"
            />
            <span>
              <span className="block font-medium text-text-primary">Duplicate devices</span>
              <span className="text-xs text-text-muted">
                Purchases new device instances for the duplicate zone. Costs and placement checks
                are enforced by the facade.
              </span>
            </span>
          </label>
        </div>

        {!canDuplicate ? (
          <p className="text-xs text-danger">
            The target room lacks sufficient free area. Adjust the room footprint before duplicating
            this zone.
          </p>
        ) : null}
      </form>
    </Modal>
  );
};

export type { DuplicateZoneModalProps };
export default DuplicateZoneModal;
