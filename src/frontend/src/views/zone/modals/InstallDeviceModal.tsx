import { FormEvent, useState } from 'react';
import Modal from '@/components/Modal';
import FormField from '@/components/forms/FormField';
import { Button, TextInput } from '@/components/inputs';
import type { ZoneSnapshot } from '@/types/simulation';

type DeviceSettingDraft = {
  key: string;
  value: string;
};

type InstallDeviceModalProps = {
  zone: ZoneSnapshot;
  onSubmit: (options: { deviceId: string; settings?: Record<string, unknown> }) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

const normalizeSettings = (entries: DeviceSettingDraft[]): Record<string, unknown> | undefined => {
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

  return Object.keys(result).length > 0 ? result : undefined;
};

const InstallDeviceModal = ({
  zone,
  onSubmit,
  onCancel,
  title,
  description,
}: InstallDeviceModalProps) => {
  const [deviceId, setDeviceId] = useState('');
  const [settings, setSettings] = useState<DeviceSettingDraft[]>([{ key: '', value: '' }]);

  const canSubmit = deviceId.trim().length > 0;

  const handleSubmit = (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    if (!canSubmit) {
      return;
    }

    const payloadSettings = normalizeSettings(settings);
    onSubmit({
      deviceId: deviceId.trim(),
      settings: payloadSettings,
    });
  };

  const updateEntry = (index: number, patch: Partial<DeviceSettingDraft>) => {
    setSettings((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)),
    );
  };

  const addEntry = () => {
    setSettings((current) => [...current, { key: '', value: '' }]);
  };

  const removeEntry = (index: number) => {
    setSettings((current) => current.filter((_, entryIndex) => entryIndex !== index));
  };

  return (
    <Modal
      isOpen
      title={title ?? `Install device in ${zone.name}`}
      description={
        description ??
        'Provide a device blueprint identifier and optional settings to schedule an installation in this zone.'
      }
      onClose={onCancel}
      size="lg"
      actions={[
        { label: 'Cancel', onClick: onCancel, variant: 'secondary' },
        {
          label: 'Install device',
          onClick: () => handleSubmit(),
          variant: 'primary',
          disabled: !canSubmit,
        },
      ]}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="Target zone" secondaryLabel={zone.id}>
          <p className="text-sm text-text-secondary">
            {zone.structureName} / {zone.roomName}
          </p>
        </FormField>

        <FormField label="Device blueprint or ID">
          <TextInput
            value={deviceId}
            onChange={(event) => setDeviceId(event.target.value)}
            placeholder="e.g. device:lighting:sunstream-pro-led"
            autoFocus
          />
        </FormField>

        <FormField
          label="Initial settings"
          description="Optional key/value pairs will be forwarded to the façade. Leave blank to accept blueprint defaults."
        >
          <div className="space-y-3">
            {settings.map((entry, index) => (
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
                {settings.length > 1 ? (
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

export type { InstallDeviceModalProps };
export default InstallDeviceModal;
