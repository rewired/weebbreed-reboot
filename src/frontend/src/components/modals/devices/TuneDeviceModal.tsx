import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/primitives/Button';
import { useSimulationStore } from '@/store/simulation';
import type { SimulationBridge } from '@/facade/systemFacade';
import { formatNumber } from '@/utils/formatNumber';

type SetpointMetric = 'temperature' | 'relativeHumidity' | 'co2' | 'ppfd' | 'vpd';

const SETPOINT_KEY_MAP: Record<string, SetpointMetric> = {
  targetTemperature: 'temperature',
  temperatureTarget: 'temperature',
  targetHumidity: 'relativeHumidity',
  targetRelativeHumidity: 'relativeHumidity',
  humidityTarget: 'relativeHumidity',
  targetCo2: 'co2',
  targetCO2: 'co2',
  co2Target: 'co2',
  ppfd: 'ppfd',
  targetPpfd: 'ppfd',
  lightTarget: 'ppfd',
  targetVpd: 'vpd',
  vpdTarget: 'vpd',
};

type FieldState = {
  value: string;
  type: 'number' | 'boolean' | 'string';
  original: unknown;
};

const deriveFieldState = (
  settings: Record<string, unknown> | undefined,
): Record<string, FieldState> => {
  if (!settings) {
    return {};
  }

  const result: Record<string, FieldState> = {};

  for (const [key, rawValue] of Object.entries(settings)) {
    if (rawValue === null || rawValue === undefined) {
      continue;
    }
    const valueType = typeof rawValue;
    if (valueType === 'number') {
      result[key] = {
        value: String(rawValue),
        type: 'number',
        original: rawValue,
      };
    } else if (valueType === 'boolean') {
      result[key] = {
        value: rawValue ? 'true' : 'false',
        type: 'boolean',
        original: rawValue,
      };
    } else if (valueType === 'string') {
      result[key] = {
        value: String(rawValue),
        type: 'string',
        original: rawValue,
      };
    }
  }

  return result;
};

const toLabel = (key: string) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());

export interface TuneDeviceModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}

export const TuneDeviceModal = ({ bridge, closeModal, context }: TuneDeviceModalProps) => {
  const zoneId = typeof context?.zoneId === 'string' ? context.zoneId : null;
  const deviceId = typeof context?.deviceId === 'string' ? context.deviceId : null;
  const zone = useSimulationStore((state) =>
    zoneId ? (state.snapshot?.zones.find((candidate) => candidate.id === zoneId) ?? null) : null,
  );
  const device = useMemo(
    () => zone?.devices.find((candidate) => candidate.id === deviceId) ?? null,
    [zone, deviceId],
  );
  const [fields, setFields] = useState<Record<string, FieldState>>(() =>
    deriveFieldState(device?.settings),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFields(deriveFieldState(device?.settings));
    setFieldErrors({});
    setWarnings([]);
    setFeedback(null);
  }, [device]);

  const handleFieldChange = (key: string, value: string) => {
    setFields((previous) => {
      const field = previous[key];
      if (!field) {
        return previous;
      }
      return {
        ...previous,
        [key]: { ...field, value },
      };
    });
    setFieldErrors((previous) => {
      if (!previous[key]) {
        return previous;
      }
      const next = { ...previous };
      delete next[key];
      return next;
    });
    setFeedback(null);
    setWarnings([]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!zoneId || !deviceId || !device) {
      setFeedback('Device context missing. Close the modal and retry.');
      return;
    }

    const nextErrors: Record<string, string> = {};
    const changedSettings: Record<string, unknown> = {};
    const setpointChanges: { key: string; metric: SetpointMetric; value: number }[] = [];
    let invalid = false;

    for (const [key, field] of Object.entries(fields)) {
      let parsed: unknown = field.value;

      if (field.type === 'number') {
        const trimmed = field.value.trim();
        if (!trimmed.length) {
          nextErrors[key] = 'Value is required.';
          invalid = true;
          continue;
        }
        const numeric = Number(trimmed);
        if (!Number.isFinite(numeric)) {
          nextErrors[key] = 'Enter a valid number.';
          invalid = true;
          continue;
        }
        parsed = numeric;
      } else if (field.type === 'boolean') {
        parsed = field.value === 'true';
      }

      const isChanged =
        field.type === 'number' && typeof field.original === 'number'
          ? Number(parsed) !== field.original
          : field.type === 'boolean' && typeof field.original === 'boolean'
            ? parsed !== field.original
            : parsed !== field.original;

      if (!isChanged) {
        continue;
      }

      const metric = typeof parsed === 'number' ? SETPOINT_KEY_MAP[key] : undefined;
      if (metric) {
        setpointChanges.push({ key, metric, value: parsed as number });
      } else {
        changedSettings[key] = parsed;
      }
    }

    setFieldErrors(nextErrors);

    if (invalid) {
      setFeedback('Resolve the highlighted errors and try again.');
      return;
    }

    if (!setpointChanges.length && !Object.keys(changedSettings).length) {
      setFeedback('No changes detected. Update a value before applying.');
      return;
    }

    if (setpointChanges.length && Object.keys(changedSettings).length) {
      setFeedback('Apply zone setpoint updates separately from other device settings.');
      return;
    }

    setBusy(true);
    setFeedback(null);
    setWarnings([]);

    try {
      if (setpointChanges.length) {
        const aggregatedWarnings: string[] = [];
        for (const change of setpointChanges) {
          const response = await bridge.sendConfigUpdate({
            type: 'setpoint',
            zoneId,
            metric: change.metric,
            value: change.value,
          });
          if (!response.ok) {
            const message =
              response.errors?.[0]?.message ??
              response.warnings?.[0] ??
              `Failed to update ${toLabel(change.key)}.`;
            setFeedback(message);
            return;
          }
          if (response.warnings?.length) {
            aggregatedWarnings.push(...response.warnings);
          }
        }
        if (aggregatedWarnings.length) {
          setWarnings(aggregatedWarnings);
          return;
        }
        closeModal();
        return;
      }

      const response = await bridge.sendIntent({
        domain: 'devices',
        action: 'adjustSettings',
        payload: {
          zoneId,
          deviceId,
          settings: changedSettings,
        },
      });

      if (!response.ok) {
        const message =
          response.errors?.[0]?.message ??
          response.warnings?.[0] ??
          'Device rejected the requested settings.';
        setFeedback(message);
        return;
      }

      if (response.warnings?.length) {
        setWarnings(response.warnings);
        return;
      }

      closeModal();
    } catch (error) {
      console.error('Failed to adjust device settings', error);
      setFeedback('Connection error while updating device settings.');
    } finally {
      setBusy(false);
    }
  };

  const fieldEntries = useMemo(
    () => Object.entries(fields).sort(([a], [b]) => a.localeCompare(b)),
    [fields],
  );

  if (!zone || !device) {
    return (
      <p className="text-sm text-text-muted">
        Device data unavailable. Select a zone and device to adjust settings.
      </p>
    );
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <div className="grid gap-1 text-sm text-text-muted">
        <span className="font-semibold text-text">{device.name}</span>
        <span>
          {device.kind} · Status {device.status} · Runtime{' '}
          {formatNumber(device.runtimeHours, { maximumFractionDigits: 0 })} h
        </span>
        <span>
          Condition {formatNumber(device.maintenance.condition * 100, { maximumFractionDigits: 0 })}
          % · Efficiency {formatNumber(device.efficiency * 100, { maximumFractionDigits: 0 })}%
        </span>
      </div>

      {fieldEntries.length ? (
        <div className="grid gap-4">
          {fieldEntries.map(([key, field]) => (
            <label key={key} className="grid gap-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {toLabel(key)}
              </span>
              {field.type === 'number' ? (
                <input
                  type="number"
                  value={field.value}
                  onChange={(event) => handleFieldChange(key, event.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-text focus:outline-none ${
                    fieldErrors[key]
                      ? 'border-red-500 bg-red-50 focus:border-red-500'
                      : 'border-border/60 bg-surface-muted/50 focus:border-primary'
                  }`}
                />
              ) : field.type === 'boolean' ? (
                <select
                  value={field.value}
                  onChange={(event) => handleFieldChange(key, event.target.value)}
                  className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={field.value}
                  onChange={(event) => handleFieldChange(key, event.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-text focus:outline-none ${
                    fieldErrors[key]
                      ? 'border-red-500 bg-red-50 focus:border-red-500'
                      : 'border-border/60 bg-surface-muted/50 focus:border-primary'
                  }`}
                />
              )}
              {fieldErrors[key] ? (
                <span className="text-xs text-red-600">{fieldErrors[key]}</span>
              ) : null}
            </label>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">
          This device does not expose adjustable settings through the facade.
        </p>
      )}

      {warnings.length ? (
        <div className="rounded-lg border border-amber-400/60 bg-amber-50/80 p-3 text-sm text-amber-900">
          <p className="font-semibold">Warnings</p>
          <ul className="list-disc space-y-1 pl-5">
            {warnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {feedback ? <p className="text-sm text-warning">{feedback}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={closeModal} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Applying…' : 'Apply changes'}
        </Button>
      </div>
    </form>
  );
};
