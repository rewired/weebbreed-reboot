import { FormEvent, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import FormField from '@/components/forms/FormField';
import type { RoomSnapshot, StructureSnapshot, ZoneSnapshot } from '@/types/simulation';

type DuplicateRoomModalProps = {
  room: RoomSnapshot;
  structure: StructureSnapshot;
  zones: ZoneSnapshot[];
  availableArea: number;
  deviceCount: number;
  estimatedDeviceCapex?: number;
  onConfirm: (options: { name: string }) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

const DuplicateRoomModal = ({
  room,
  structure,
  zones,
  availableArea,
  deviceCount,
  estimatedDeviceCapex,
  onConfirm,
  onCancel,
  title,
  description,
}: DuplicateRoomModalProps) => {
  const [name, setName] = useState(() => `${room.name} copy`);

  const zoneArea = useMemo(
    () => zones.reduce((sum, zone) => sum + Math.max(zone.area, 0), 0),
    [zones],
  );

  const canAffordFootprint = room.area <= availableArea;

  const handleSubmit = (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    if (!name.trim()) {
      return;
    }
    onConfirm({ name: name.trim() });
  };

  const formattedCapex =
    estimatedDeviceCapex !== undefined
      ? `${estimatedDeviceCapex.toLocaleString()} €`
      : 'Calculated by facade';

  return (
    <Modal
      isOpen
      title={title ?? `Duplicate ${room.name}`}
      description={
        description ??
        'Duplicating a room recreates its zones, cultivation methods, and eligible devices. The backend validates footprint ' +
          'availability and charges CapEx for any re-purchased devices.'
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
          label: 'Duplicate room',
          onClick: () => handleSubmit(),
          variant: 'primary',
          disabled: !name.trim() || !canAffordFootprint,
        },
      ]}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="New room name" secondaryLabel={name.trim() || undefined}>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-border/60 bg-surface px-3 py-2 text-sm text-text-primary shadow-inner focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/60"
            placeholder={`${room.name} copy`}
            autoFocus
          />
        </FormField>

        <div className="grid grid-cols-1 gap-3 rounded-lg border border-border/60 bg-surfaceAlt/50 p-4 text-sm text-text-secondary">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">
              Structure footprint
            </span>
            <span className="font-medium text-text-primary">
              {structure.footprint.area.toLocaleString()} m²
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">Required area</span>
            <span className="font-medium text-text-primary">{room.area.toLocaleString()} m²</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">Available area</span>
            <span
              className={
                canAffordFootprint ? 'font-medium text-positive' : 'font-medium text-danger'
              }
            >
              {availableArea.toLocaleString()} m²
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">Zones to copy</span>
            <span className="font-medium text-text-primary">{zones.length.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">Zone footprint</span>
            <span className="font-medium text-text-primary">{zoneArea.toLocaleString()} m²</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">
              Devices to re-purchase
            </span>
            <span className="font-medium text-text-primary">{deviceCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">
              Estimated device CapEx
            </span>
            <span className="font-medium text-text-primary">{formattedCapex}</span>
          </div>
        </div>

        {!canAffordFootprint ? (
          <p className="text-xs text-danger">
            Insufficient available footprint. Consider expanding the structure or adjusting the
            duplication target.
          </p>
        ) : null}
      </form>
    </Modal>
  );
};

export type { DuplicateRoomModalProps };
export default DuplicateRoomModal;
