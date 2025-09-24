import { FormEvent, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import FormField from '@/components/forms/FormField';
import { Button, TextInput } from '@/components/inputs';
import type { DeviceSnapshot, ZoneSnapshot } from '@/types/simulation';

type DeviceSettingDraft = {
  key: string;
  value: string;
};

type UpdateDeviceModalProps = {
  device: DeviceSnapshot;
  zone?: ZoneSnapshot;
  onSubmit: (options: { settings: Record<string, unknown> }) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

const serializeSettingValue = (value: unknown): string => {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return value !== undefined ? String(value) : '';
};

const normalizeSettings = (entries: DeviceSettingDraft[]): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const entry of entries) {
    const key = entry.key.trim();
    if (!key) {
      continue;
    }
    const rawValue = entry.value.trim();
    if (rawValue.length === 0) {
      continue;
    }

    if (rawValue === 'true') {
      result[key] = true;
      continue;
    }
    if (rawValue === 'false') {
      result[key] = false;
      continue;
    }
    if (rawValue === 'null') {
      result[key] = null;
      continue;
    }

    const numericValue = Number(rawValue);
    if (!Number.isNaN(numericValue)) {
      result[key] = numericValue;
      continue;
    }

    if (
      (rawValue.startsWith('{') && rawValue.endsWith('}')) ||
      (rawValue.startsWith('[') && rawValue.endsWith(']'))
    ) {
      try {
        result[key] = JSON.parse(rawValue);
        continue;
      } catch (error) {
        console.warn('Failed to parse JSON settings value', error);
      }
    }

    result[key] = rawValue;
  }

  return result;
};

const UpdateDeviceModal = ({
  device,
  zone,
  onSubmit,
  onCancel,
  title,
  description,
}: UpdateDeviceModalProps) => {
  const initialEntries = useMemo<DeviceSettingDraft[]>(() => {
    const settings = device.settings ?? {};
    const entries = Object.entries(settings).map(([key, value]) => ({
      key,
      value: serializeSettingValue(value),
    }));
    return entries.length > 0 ? entries : [{ key: '', value: '' }];
  }, [device.settings]);

  const [settingsEntries, setSettingsEntries] = useState<DeviceSettingDraft[]>(initialEntries);

  const canSubmit = settingsEntries.some((entry) => entry.key.trim() && entry.value.trim());

  const handleSubmit = (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    if (!canSubmit) {
      return;
    }

    const payload = normalizeSettings(settingsEntries);
    if (Object.keys(payload).length === 0) {
      return;
    }
    onSubmit({ settings: payload });
  };

  const updateEntry = (index: number, patch: Partial<DeviceSettingDraft>) => {
    setSettingsEntries((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)),
    );
  };

  const addEntry = () => {
    setSettingsEntries((current) => [...current, { key: '', value: '' }]);
  };

  const removeEntry = (index: number) => {
    setSettingsEntries((current) => current.filter((_, entryIndex) => entryIndex !== index));
  };

  return (
    <Modal
      isOpen
      title={title ?? `Update ${device.name}`}
      description={
        description ??
        'Adjust device settings. Only key/value pairs supplied here will be forwarded to the façade as a patch.'
      }
      onClose={onCancel}
      size="lg"
      actions={[
        { label: 'Cancel', onClick: onCancel, variant: 'secondary' },
        {
          label: 'Update device',
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

        {zone ? (
          <FormField label="Current zone" secondaryLabel={zone.id}>
            <p className="text-sm text-text-secondary">
              {zone.structureName} / {zone.roomName}
            </p>
          </FormField>
        ) : null}

        <FormField
          label="Settings patch"
          description="Provide one or more settings to update. Leave unused rows empty or remove them before submitting."
        >
          <div className="space-y-3">
            {settingsEntries.map((entry, index) => (
              <div
                key={index}
                className="rounded-lg border border-border/40 bg-surfaceAlt/50 p-3 shadow-inner"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextInput
                    value={entry.key}
                    onChange={(event) => updateEntry(index, { key: event.target.value })}
                    placeholder="Setting key"
                  />
                  <TextInput
                    value={entry.value}
                    onChange={(event) => updateEntry(index, { value: event.target.value })}
                    placeholder="Value"
                  />
                </div>
                {settingsEntries.length > 1 ? (
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      tone="danger"
                      size="sm"
                      onClick={() => removeEntry(index)}
                    >
                      Remove entry
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
            <Button type="button" variant="outline" tone="default" size="sm" onClick={addEntry}>
              Add setting
            </Button>
          </div>
        </FormField>
      </form>
    </Modal>
  );
};

export type { UpdateDeviceModalProps };
export default UpdateDeviceModal;
