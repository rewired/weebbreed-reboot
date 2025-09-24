import { FormEvent, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import FormField from '@/components/forms/FormField';
import NumberInputField from '@/components/forms/NumberInputField';
import { Select, TextInput } from '@/components/inputs';
import type { RoomSnapshot, ZoneSnapshot } from '@/types/simulation';

type CultivationMethodOption = {
  id: string;
  name: string;
  description?: string;
};

type CreateZoneModalProps = {
  room: RoomSnapshot;
  existingZones: ZoneSnapshot[];
  availableMethods?: CultivationMethodOption[];
  onSubmit: (options: {
    name: string;
    area: number;
    methodId?: string;
    targetPlantCount?: number;
  }) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

const DEFAULT_METHOD_OPTIONS: CultivationMethodOption[] = [
  { id: 'method:sea-of-green', name: 'Sea of Green' },
  { id: 'method:screen-of-green', name: 'SCROG (Screen of Green)' },
  { id: 'method:vertical-stack', name: 'Vertical stack' },
  { id: 'method:empty', name: 'Empty (no automation)' },
];

const CreateZoneModal = ({
  room,
  existingZones,
  availableMethods,
  onSubmit,
  onCancel,
  title,
  description,
}: CreateZoneModalProps) => {
  const usedArea = useMemo(
    () => existingZones.reduce((sum, zone) => sum + Math.max(zone.area, 0), 0),
    [existingZones],
  );

  const availableArea = Math.max(room.area - usedArea, 0);
  const defaultArea =
    availableArea > 0 ? Math.min(Math.round(Math.max(availableArea / 3, 10)), availableArea) : 0;

  const methodOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: CultivationMethodOption[] = [];

    for (const method of DEFAULT_METHOD_OPTIONS) {
      if (!seen.has(method.id)) {
        seen.add(method.id);
        options.push(method);
      }
    }

    if (availableMethods) {
      for (const method of availableMethods) {
        if (!method.id || seen.has(method.id)) {
          continue;
        }
        seen.add(method.id);
        options.push(method);
      }
    }

    for (const zone of existingZones) {
      if (!zone.cultivationMethodId) {
        continue;
      }
      if (seen.has(zone.cultivationMethodId)) {
        continue;
      }
      seen.add(zone.cultivationMethodId);
      options.push({ id: zone.cultivationMethodId, name: `Reuse ${zone.cultivationMethodId}` });
    }

    return options;
  }, [availableMethods, existingZones]);

  const [name, setName] = useState(() => `${room.name} zone ${existingZones.length + 1}`);
  const [area, setArea] = useState(defaultArea);
  const [methodId, setMethodId] = useState(() => methodOptions[0]?.id);
  const [targetPlantCount, setTargetPlantCount] = useState(24);

  const isNameValid = name.trim().length > 0;
  const isAreaValid = area > 0 && area <= availableArea;
  const canSubmit = isNameValid && isAreaValid;

  const handleSubmit = (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    if (!canSubmit) {
      return;
    }
    onSubmit({
      name: name.trim(),
      area,
      methodId: methodId || undefined,
      targetPlantCount: Number.isFinite(targetPlantCount)
        ? Math.max(0, targetPlantCount)
        : undefined,
    });
  };

  return (
    <Modal
      isOpen
      title={title ?? `Create zone in ${room.name}`}
      description={
        description ??
        'Zones inherit HVAC and staffing requirements from their parent room. Choose a cultivation method and target footprint ' +
          'to allocate space deterministically.'
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
          label: 'Create zone',
          onClick: () => handleSubmit(),
          variant: 'primary',
          disabled: !canSubmit,
        },
      ]}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="Zone name" secondaryLabel={name.trim() || undefined}>
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Flower bench"
            autoFocus
          />
        </FormField>

        <NumberInputField
          label="Allocated area"
          value={area}
          onChange={setArea}
          min={1}
          max={availableArea}
          unit="m²"
          description={`Available room area: ${availableArea.toLocaleString()} m²`}
          footer={
            !isAreaValid ? (
              <p className="text-xs text-danger">
                Area must fit within the remaining room capacity.
              </p>
            ) : null
          }
        />

        <FormField label="Cultivation method">
          <Select
            value={methodId ?? ''}
            onChange={(event) => setMethodId(event.target.value || undefined)}
          >
            {methodOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </FormField>

        <NumberInputField
          label="Target plant count"
          value={targetPlantCount}
          onChange={setTargetPlantCount}
          min={0}
          step={4}
          description="Optional planning hint for automation and labour scheduling."
        />
      </form>
    </Modal>
  );
};

export type { CultivationMethodOption, CreateZoneModalProps };
export default CreateZoneModal;
