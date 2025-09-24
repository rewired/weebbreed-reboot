import { FormEvent, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import FormField from '@/components/forms/FormField';
import { TextInput } from '@/components/inputs';
import type { DeviceSnapshot } from '@/types/simulation';

type UpdateDeviceModalProps = {
  device: DeviceSnapshot;
  onSubmit: (settings: Record<string, unknown>) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

const baseTextareaClass =
  'min-h-[140px] w-full rounded-md border border-border/60 bg-surface p-3 font-mono text-sm text-text-primary shadow-inner focus:outline-none focus:ring-1 focus:ring-accent/60';

const UpdateDeviceModal = ({
  device,
  onSubmit,
  onCancel,
  title,
  description,
}: UpdateDeviceModalProps) => {
  const initialText = useMemo(() => {
    if (device.settings && Object.keys(device.settings).length > 0) {
      try {
        return JSON.stringify(device.settings, null, 2);
      } catch (error) {
        console.warn('Failed to stringify device settings for modal bootstrap', error);
      }
    }
    return '';
  }, [device.settings]);

  const [settingsText, setSettingsText] = useState(initialText);
  const [settingsError, setSettingsError] = useState<string | undefined>();

  const parseSettings = () => {
    const trimmed = settingsText.trim();
    if (!trimmed) {
      setSettingsError('Provide at least one key to update.');
      return undefined;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setSettingsError('Settings patch must be a JSON object.');
        return undefined;
      }
      if (Object.keys(parsed).length === 0) {
        setSettingsError('Provide at least one setting to update.');
        return undefined;
      }
      setSettingsError(undefined);
      return parsed as Record<string, unknown>;
    } catch (error) {
      console.error('Failed to parse device settings patch', error);
      setSettingsError('Settings must be valid JSON.');
      return undefined;
    }
  };

  const handleSubmit = (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    const parsedSettings = parseSettings();
    if (!parsedSettings) {
      return;
    }
    onSubmit(parsedSettings);
  };

  return (
    <Modal
      isOpen
      size="lg"
      title={title ?? `Update ${device.name}`}
      description={
        description ??
        'Provide a JSON patch for the device configuration. Keys left out remain unchanged; the facade validates numeric ranges and compatibility.'
      }
      onClose={onCancel}
      actions={[
        {
          label: 'Cancel',
          onClick: onCancel,
          variant: 'secondary',
        },
        {
          label: 'Apply changes',
          onClick: () => handleSubmit(),
          variant: 'primary',
        },
      ]}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="Device instance" secondaryLabel={device.id}>
          <TextInput value={device.name} readOnly />
        </FormField>

        <FormField
          label="Settings patch (JSON)"
          description="Only the provided keys are forwarded to facade.devices.updateDevice."
        >
          <textarea
            className={[
              baseTextareaClass,
              settingsError ? 'border-danger focus:ring-danger/40' : undefined,
            ]
              .filter(Boolean)
              .join(' ')}
            value={settingsText}
            onChange={(event) => {
              setSettingsText(event.target.value);
              if (settingsError) {
                setSettingsError(undefined);
              }
            }}
            placeholder={'{ "power": 0.75 }'}
          />
          {settingsError ? <p className="text-xs text-danger">{settingsError}</p> : null}
        </FormField>

        <p className="text-xs text-text-muted">
          The command targets <code>facade.devices.updateDevice</code> with{' '}
          <code>{'{ instanceId, settings }'}</code>. Validation errors are surfaced by the facade
          and shown in the event log.
        </p>
      </form>
    </Modal>
  );
};

export type { UpdateDeviceModalProps };
export default UpdateDeviceModal;
