import { FormEvent, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import FormField from '@/components/forms/FormField';
import { Select, TextInput } from '@/components/inputs';
import type { DeviceSnapshot, ZoneSnapshot } from '@/types/simulation';

type ZoneOption = {
  id: string;
  name: string;
  roomName?: string;
  structureName?: string;
};

type MoveDeviceModalProps = {
  device: DeviceSnapshot;
  currentZone: ZoneSnapshot;
  availableZones: ZoneOption[];
  onSubmit: (targetZoneId: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

const MoveDeviceModal = ({
  device,
  currentZone,
  availableZones,
  onSubmit,
  onCancel,
  title,
  description,
}: MoveDeviceModalProps) => {
  const orderedZones = useMemo(() => {
    return availableZones
      .filter((zone) => zone.id !== currentZone.id)
      .sort((a, b) => {
        const structureCompare = (a.structureName ?? '').localeCompare(b.structureName ?? '');
        if (structureCompare !== 0) {
          return structureCompare;
        }
        const roomCompare = (a.roomName ?? '').localeCompare(b.roomName ?? '');
        if (roomCompare !== 0) {
          return roomCompare;
        }
        return a.name.localeCompare(b.name);
      });
  }, [availableZones, currentZone.id]);

  const [targetZoneId, setTargetZoneId] = useState(() => orderedZones[0]?.id ?? '');

  const hasTargets = orderedZones.length > 0;
  const canSubmit = hasTargets && targetZoneId && targetZoneId !== currentZone.id;

  const handleSubmit = (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    if (!canSubmit) {
      return;
    }
    onSubmit(targetZoneId);
  };

  return (
    <Modal
      isOpen
      size="lg"
      title={title ?? `Relocate ${device.name}`}
      description={
        description ??
        'Select the destination zone for this device. The facade validates coverage constraints and allowed room purposes.'
      }
      onClose={onCancel}
      actions={[
        {
          label: 'Cancel',
          onClick: onCancel,
          variant: 'secondary',
        },
        {
          label: 'Move device',
          onClick: () => handleSubmit(),
          variant: 'primary',
          disabled: !canSubmit,
        },
      ]}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="Current zone" secondaryLabel={currentZone.id}>
          <TextInput value={currentZone.name} readOnly />
        </FormField>

        <FormField
          label="Target zone"
          description={
            hasTargets
              ? 'Eligible zones are listed alphabetically by structure and room.'
              : 'No other eligible zones are currently available for this device.'
          }
        >
          <Select
            value={targetZoneId}
            onChange={(event) => setTargetZoneId(event.target.value)}
            disabled={!hasTargets}
          >
            {orderedZones.map((zone) => {
              const labelParts = [zone.structureName, zone.roomName, zone.name].filter(Boolean);
              return (
                <option key={zone.id} value={zone.id}>
                  {labelParts.join(' • ')}
                </option>
              );
            })}
          </Select>
        </FormField>

        <p className="text-xs text-text-muted">
          The command forwards to <code>facade.devices.moveDevice</code> with the selected target
          zone. Placement failures are surfaced via the domain event stream.
        </p>
      </form>
    </Modal>
  );
};

export type { MoveDeviceModalProps, ZoneOption };
export default MoveDeviceModal;
