import { FormEvent, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import FormField from '@/components/forms/FormField';
import { Select } from '@/components/inputs';
import type { DeviceSnapshot, ZoneSnapshot } from '@/types/simulation';

type MoveDeviceModalProps = {
  device: DeviceSnapshot;
  currentZone?: ZoneSnapshot;
  zones: ZoneSnapshot[];
  onSubmit: (options: { targetZoneId: string }) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

const MoveDeviceModal = ({
  device,
  currentZone,
  zones,
  onSubmit,
  onCancel,
  title,
  description,
}: MoveDeviceModalProps) => {
  const candidateZones = useMemo(
    () => zones.filter((zone) => zone.id !== device.zoneId),
    [device.zoneId, zones],
  );

  const [targetZoneId, setTargetZoneId] = useState(() => candidateZones[0]?.id ?? '');

  const canSubmit = Boolean(targetZoneId && targetZoneId !== device.zoneId);

  const handleSubmit = (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    if (!canSubmit) {
      return;
    }
    onSubmit({ targetZoneId });
  };

  return (
    <Modal
      isOpen
      title={title ?? `Move ${device.name}`}
      description={
        description ??
        'Select a destination zone to schedule the move through the simulation façade.'
      }
      onClose={onCancel}
      size="md"
      actions={[
        { label: 'Cancel', onClick: onCancel, variant: 'secondary' },
        {
          label: 'Move device',
          onClick: () => handleSubmit(),
          variant: 'primary',
          disabled: !canSubmit,
        },
      ]}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="Device" secondaryLabel={device.id}>
          <div className="text-sm text-text-secondary">
            <p>{device.name}</p>
            <p className="text-xs text-text-muted">{device.kind}</p>
          </div>
        </FormField>

        {currentZone ? (
          <FormField label="Current zone" secondaryLabel={currentZone.id}>
            <p className="text-sm text-text-secondary">
              {currentZone.structureName} / {currentZone.roomName}
            </p>
          </FormField>
        ) : null}

        <FormField label="Destination zone">
          {candidateZones.length === 0 ? (
            <p className="text-sm text-text-muted">
              No other zones available. Duplicate or create a new zone before moving this device.
            </p>
          ) : (
            <Select value={targetZoneId} onChange={(event) => setTargetZoneId(event.target.value)}>
              {candidateZones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} — {zone.structureName} / {zone.roomName}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </form>
    </Modal>
  );
};

export type { MoveDeviceModalProps };
export default MoveDeviceModal;
