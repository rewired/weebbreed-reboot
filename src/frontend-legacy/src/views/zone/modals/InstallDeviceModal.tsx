import { FormEvent, useId, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import FormField from '@/components/forms/FormField';
import { TextInput } from '@/components/inputs';
import type { ZoneSnapshot } from '@/types/simulation';

type DeviceBlueprintOption = {
  id: string;
  label?: string;
  kind?: string;
};

type InstallDeviceModalProps = {
  zone: ZoneSnapshot;
  blueprintOptions?: DeviceBlueprintOption[];
  onSubmit: (options: { deviceId: string; settings?: Record<string, unknown> }) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

const baseTextareaClass =
  'min-h-[120px] w-full rounded-md border border-border/60 bg-surface p-3 font-mono text-sm text-text-primary shadow-inner focus:outline-none focus:ring-1 focus:ring-accent/60';

const InstallDeviceModal = ({
  zone,
  blueprintOptions,
  onSubmit,
  onCancel,
  title,
  description,
}: InstallDeviceModalProps) => {
  const suggestions = useMemo(() => {
    if (!blueprintOptions?.length) {
      return [] as DeviceBlueprintOption[];
    }
    const seen = new Set<string>();
    const entries: DeviceBlueprintOption[] = [];
    for (const option of blueprintOptions) {
      if (!option.id || seen.has(option.id)) {
        continue;
      }
      seen.add(option.id);
      entries.push(option);
    }
    return entries;
  }, [blueprintOptions]);

  const [deviceId, setDeviceId] = useState(() => suggestions[0]?.id ?? '');
  const [settingsText, setSettingsText] = useState('');
  const [settingsError, setSettingsError] = useState<string | undefined>();

  const datalistId = useId();

  const isDeviceIdValid = deviceId.trim().length > 0;

  const parseSettings = () => {
    const trimmed = settingsText.trim();
    if (!trimmed) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setSettingsError('Settings must be provided as a JSON object.');
        return undefined;
      }
      setSettingsError(undefined);
      return parsed as Record<string, unknown>;
    } catch (error) {
      console.error('Failed to parse device settings', error);
      setSettingsError('Settings must be valid JSON.');
      return undefined;
    }
  };

  const handleSubmit = (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    if (!isDeviceIdValid) {
      return;
    }
    const parsedSettings = parseSettings();
    if (settingsText.trim() && !parsedSettings) {
      return;
    }
    onSubmit({
      deviceId: deviceId.trim(),
      settings: parsedSettings,
    });
  };

  return (
    <Modal
      isOpen
      size="lg"
      title={title ?? `Install device in ${zone.name}`}
      description={
        description ??
        'Select a device blueprint to dispatch an installation request. The simulation facade validates placement rules ' +
          'for the chosen zone.'
      }
      onClose={onCancel}
      actions={[
        {
          label: 'Cancel',
          onClick: onCancel,
          variant: 'secondary',
        },
        {
          label: 'Install device',
          onClick: () => handleSubmit(),
          variant: 'primary',
          disabled: !isDeviceIdValid,
        },
      ]}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField
          label="Device blueprint"
          secondaryLabel={deviceId.trim() || undefined}
          description="Provide the blueprint identifier to install. Suggestions are populated from devices already known in the snapshot."
        >
          <TextInput
            value={deviceId}
            onChange={(event) => setDeviceId(event.target.value)}
            placeholder="device:lighting:sunstream-pro-led"
            list={suggestions.length ? datalistId : undefined}
            autoFocus
          />
          {suggestions.length ? (
            <datalist id={datalistId}>
              {suggestions.map((option) => (
                <option
                  key={option.id}
                  value={option.id}
                  label={option.label ?? (option.kind ? `${option.kind}` : undefined)}
                />
              ))}
            </datalist>
          ) : null}
        </FormField>

        <FormField
          label="Settings (JSON)"
          description="Optional override payload. Leave empty to use blueprint defaults."
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
            placeholder={'{ "power": 0.8, "ppfd": 550 }'}
          />
          {settingsError ? <p className="text-xs text-danger">{settingsError}</p> : null}
        </FormField>

        <p className="text-xs text-text-muted">
          The request forwards to <code>facade.devices.installDevice</code> with the provided
          blueprint identifier and optional settings.
        </p>
      </form>
    </Modal>
  );
};

export type { DeviceBlueprintOption, InstallDeviceModalProps };
export default InstallDeviceModal;
