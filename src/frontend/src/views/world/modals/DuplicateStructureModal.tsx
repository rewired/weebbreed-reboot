import { FormEvent, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import FormField from '@/components/forms/FormField';
import { TextInput } from '@/components/inputs';
import type { RoomSnapshot, StructureSnapshot, ZoneSnapshot } from '@/types/simulation';

type DuplicateStructureModalProps = {
  structure: StructureSnapshot;
  rooms: RoomSnapshot[];
  zones: ZoneSnapshot[];
  onConfirm: (options: { name: string }) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

const DuplicateStructureModal = ({
  structure,
  rooms,
  zones,
  onConfirm,
  onCancel,
  title,
  description,
}: DuplicateStructureModalProps) => {
  const [name, setName] = useState(() => `${structure.name} copy`);

  const totalRoomArea = useMemo(
    () => rooms.reduce((sum, room) => sum + Math.max(room.area, 0), 0),
    [rooms],
  );

  const totalRoomVolume = useMemo(
    () => rooms.reduce((sum, room) => sum + Math.max(room.volume ?? 0, 0), 0),
    [rooms],
  );

  const deviceCount = useMemo(
    () => zones.reduce((sum, zone) => sum + zone.devices.length, 0),
    [zones],
  );

  const plantCount = useMemo(
    () => zones.reduce((sum, zone) => sum + zone.plants.length, 0),
    [zones],
  );

  const handleSubmit = (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    onConfirm({ name: trimmed });
  };

  const canSubmit = Boolean(name.trim());

  return (
    <Modal
      isOpen
      title={title ?? `Duplicate ${structure.name}`}
      description={
        description ??
        'Duplicating a structure clones its rooms, zones, cultivation methods, and associated devices. The simulation facade ' +
          'validates footprint availability, assigns unique identifiers, and replays CapEx where necessary.'
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
          label: 'Duplicate structure',
          onClick: () => handleSubmit(),
          variant: 'primary',
          disabled: !canSubmit,
        },
      ]}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="New structure name" secondaryLabel={name.trim() || undefined}>
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`${structure.name} copy`}
            autoFocus
          />
        </FormField>

        <div className="grid grid-cols-1 gap-3 rounded-lg border border-border/60 bg-surfaceAlt/50 p-4 text-sm text-text-secondary">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">Footprint area</span>
            <span className="font-medium text-text-primary">
              {structure.footprint.area.toLocaleString()} m²
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">
              Footprint volume
            </span>
            <span className="font-medium text-text-primary">
              {structure.footprint.volume.toLocaleString()} m³
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">Rooms to clone</span>
            <span className="font-medium text-text-primary">{rooms.length.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">Zones to clone</span>
            <span className="font-medium text-text-primary">{zones.length.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">
              Combined room area
            </span>
            <span className="font-medium text-text-primary">
              {totalRoomArea.toLocaleString()} m²
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">
              Combined room volume
            </span>
            <span className="font-medium text-text-primary">
              {totalRoomVolume.toLocaleString()} m³
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">
              Devices to re-purchase
            </span>
            <span className="font-medium text-text-primary">{deviceCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">
              Plants in snapshot
            </span>
            <span className="font-medium text-text-primary">{plantCount.toLocaleString()}</span>
          </div>
        </div>

        <p className="text-xs text-text-muted">
          Any geometry or budgeting conflicts are handled deterministically by the facade; the UI
          simply requests the duplication.
        </p>
      </form>
    </Modal>
  );
};

export type { DuplicateStructureModalProps };
export default DuplicateStructureModal;
