import { FormEvent, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import FormField from '@/components/forms/FormField';
import NumberInputField from '@/components/forms/NumberInputField';
import { Select, TextInput } from '@/components/inputs';
import type { RoomSnapshot, StructureSnapshot } from '@/types/simulation';

type CreateRoomModalProps = {
  structure: StructureSnapshot;
  existingRooms: RoomSnapshot[];
  onSubmit: (options: { name: string; purposeId: string; area: number; height: number }) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

const DEFAULT_PURPOSE_OPTIONS: { value: string; label: string }[] = [
  { value: 'purpose:growroom', label: 'Grow room' },
  { value: 'purpose:drying', label: 'Drying room' },
  { value: 'purpose:processing', label: 'Processing room' },
  { value: 'purpose:curing', label: 'Curing room' },
  { value: 'purpose:breakroom', label: 'Break room' },
];

const CreateRoomModal = ({
  structure,
  existingRooms,
  onSubmit,
  onCancel,
  title,
  description,
}: CreateRoomModalProps) => {
  const usedArea = useMemo(
    () => existingRooms.reduce((sum, room) => sum + Math.max(room.area, 0), 0),
    [existingRooms],
  );

  const availableArea = Math.max(structure.footprint.area - usedArea, 0);

  const [name, setName] = useState(() => `${structure.name} room ${existingRooms.length + 1}`);
  const [purposeId, setPurposeId] = useState(
    () => DEFAULT_PURPOSE_OPTIONS[0]?.value ?? 'purpose:growroom',
  );
  const [area, setArea] = useState(() =>
    availableArea > 0 ? Math.min(Math.round(Math.max(availableArea / 2, 10)), availableArea) : 0,
  );
  const [height, setHeight] = useState(() => Math.round(structure.footprint.height));

  const purposeOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];

    for (const option of DEFAULT_PURPOSE_OPTIONS) {
      if (!seen.has(option.value)) {
        seen.add(option.value);
        options.push(option);
      }
    }

    for (const room of existingRooms) {
      const value = room.purposeId || `purpose:${room.purposeKind}`;
      const label = room.purposeName || room.purposeKind || 'Custom purpose';
      if (!value || seen.has(value)) {
        continue;
      }
      seen.add(value);
      options.push({ value, label });
    }

    return options;
  }, [existingRooms]);

  const isNameValid = name.trim().length > 0;
  const isAreaValid = area > 0 && area <= availableArea;
  const isHeightValid = height > 0;
  const canSubmit = isNameValid && isAreaValid && isHeightValid;

  const handleSubmit = (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    if (!canSubmit) {
      return;
    }
    onSubmit({
      name: name.trim(),
      purposeId,
      area,
      height,
    });
  };

  return (
    <Modal
      isOpen
      title={title ?? `Create room in ${structure.name}`}
      description={
        description ??
        'Allocate footprint and select a room purpose to expand the structure. Geometry is validated by the simulation facade.'
      }
      onClose={onCancel}
      size="lg"
      actions={[
        {
          label: 'Cancel',
          onClick: onCancel,
          variant: 'secondary',
        },
        {
          label: 'Create room',
          onClick: () => handleSubmit(),
          variant: 'primary',
          disabled: !canSubmit,
        },
      ]}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="Room name" secondaryLabel={name.trim() || undefined}>
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Flowering wing"
            autoFocus
          />
        </FormField>

        <FormField label="Room purpose">
          <Select value={purposeId} onChange={(event) => setPurposeId(event.target.value)}>
            {purposeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        <NumberInputField
          label="Footprint area"
          value={area}
          onChange={setArea}
          min={1}
          max={availableArea}
          unit="m²"
          description={`Available footprint: ${availableArea.toLocaleString()} m²`}
          footer={
            !isAreaValid ? (
              <p className="text-xs text-danger">
                Area must be positive and within the remaining footprint.
              </p>
            ) : null
          }
        />

        <NumberInputField
          label="Ceiling height"
          value={height}
          onChange={setHeight}
          min={2}
          step={1}
          unit="m"
          description="Used for derived volume and HVAC capacity checks."
        />
      </form>
    </Modal>
  );
};

export type { CreateRoomModalProps };
export default CreateRoomModal;
