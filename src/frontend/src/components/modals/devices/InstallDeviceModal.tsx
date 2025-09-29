import { useEffect, useMemo, useState } from 'react';
import { ActionFooter, Feedback } from '@/components/modals/common';
import type {
  DeviceBlueprint,
  InstallDeviceOptions,
  SimulationBridge,
} from '@/facade/systemFacade';
import { useSimulationStore } from '@/store/simulation';
import { formatNumber } from '@/utils/formatNumber';
import {
  MIN_DEVICE_QUANTITY,
  MAX_DEVICE_QUANTITY,
  clampQuantity,
  deriveTargetFields,
  resolveCoverageCapacity,
} from './deviceUtils';

export interface InstallDeviceModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}

export const InstallDeviceModal = ({ bridge, closeModal, context }: InstallDeviceModalProps) => {
  const targetId = typeof context?.zoneId === 'string' ? context.zoneId : null;
  const zone = useSimulationStore((state) =>
    targetId ? (state.snapshot?.zones.find((item) => item.id === targetId) ?? null) : null,
  );
  const room = useSimulationStore((state) =>
    zone?.roomId ? (state.snapshot?.rooms.find((item) => item.id === zone.roomId) ?? null) : null,
  );
  const [devices, setDevices] = useState<DeviceBlueprint[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(MIN_DEVICE_QUANTITY);

  useEffect(() => {
    let isMounted = true;
    const loadBlueprints = async () => {
      setLoading(true);
      try {
        const response = await bridge.getDeviceBlueprints();
        if (!isMounted) {
          return;
        }
        if (response.ok && response.data) {
          const data = response.data;
          setDevices(data);
          if (data.length > 0) {
            setSelectedId((previous) => {
              const existing = data.find((item) => item.id === previous);
              return existing ? existing.id : data[0]!.id;
            });
          }
        } else {
          setFeedback('Failed to load device catalog from facade.');
        }
      } catch (error) {
        console.error('Failed to load device catalog', error);
        if (isMounted) {
          setFeedback('Connection error while loading device catalog.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadBlueprints();
    return () => {
      isMounted = false;
    };
  }, [bridge]);

  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedId) ?? null,
    [devices, selectedId],
  );

  const targetFields = useMemo(() => deriveTargetFields(selectedDevice), [selectedDevice]);

  useEffect(() => {
    if (!selectedDevice) {
      setFieldValues({});
      setFieldErrors({});
      return;
    }
    const initial: Record<string, string> = {};
    for (const field of targetFields) {
      initial[field.key] = String(field.defaultValue);
    }
    setFieldValues(initial);
    setFieldErrors({});
  }, [selectedDevice, targetFields]);

  const coverage = resolveCoverageCapacity(selectedDevice, {
    zoneHeight: zone?.ceilingHeight,
    roomHeight: room?.height,
  });
  const coverageAreaLimit = typeof coverage?.area?.value === 'number' ? coverage.area.value : null;
  const coverageVolumeLimit =
    typeof coverage?.volume?.value === 'number' ? coverage.volume.value : null;
  const coverageWarning =
    !!zone &&
    ((coverageAreaLimit !== null && coverageAreaLimit < zone.area) ||
      (coverageVolumeLimit !== null && coverageVolumeLimit < zone.volume));
  const coverageSummaryParts: string[] = [];
  if (coverage?.area) {
    const areaValue = formatNumber(coverage.area.value, { maximumFractionDigits: 2 });
    if (coverage.area.derived && coverage.area.referenceHeight) {
      const heightValue = formatNumber(coverage.area.referenceHeight, { maximumFractionDigits: 2 });
      coverageSummaryParts.push(`${areaValue} m² (≈ derived from ${heightValue} m height)`);
    } else {
      coverageSummaryParts.push(`${areaValue} m²`);
    }
  }
  if (coverage?.volume) {
    coverageSummaryParts.push(
      `${formatNumber(coverage.volume.value, { maximumFractionDigits: 2 })} m³`,
    );
  }

  const zoneSummaryParts: string[] = [];
  if (coverage?.area && zone) {
    zoneSummaryParts.push(`Zone area ${formatNumber(zone.area, { maximumFractionDigits: 2 })} m²`);
  }
  if (coverage?.volume && zone) {
    zoneSummaryParts.push(
      `Zone volume ${formatNumber(zone.volume, { maximumFractionDigits: 2 })} m³`,
    );
  }

  const coverageDescription =
    coverage && coverageSummaryParts.length
      ? `Covers up to ${[...coverageSummaryParts, ...zoneSummaryParts].join(' · ')}`
      : null;
  const allowedPurposes =
    selectedDevice?.roomPurposes ?? selectedDevice?.compatibility?.roomPurposes ?? [];
  const roomPurpose = room?.purposeKind ?? room?.purposeId ?? 'unknown';
  const purposeAllowed = allowedPurposes.length === 0 || allowedPurposes.includes(roomPurpose);

  const handleInstall = async () => {
    if (!targetId) {
      setFeedback('Zone context missing. Close the modal and retry.');
      return;
    }
    if (!selectedId) {
      setFeedback('Select a device blueprint to continue.');
      return;
    }
    if (quantity < MIN_DEVICE_QUANTITY || quantity > MAX_DEVICE_QUANTITY) {
      setFeedback(`Enter a quantity between ${MIN_DEVICE_QUANTITY} and ${MAX_DEVICE_QUANTITY}.`);
      return;
    }
    setBusy(true);
    setFeedback(null);
    setWarnings([]);
    const overrides: Record<string, number> = {};
    const nextErrors: Record<string, string> = {};
    let invalid = false;

    for (const field of targetFields) {
      const rawValue = fieldValues[field.key] ?? '';
      const trimmed = rawValue.trim();
      if (!trimmed.length) {
        nextErrors[field.key] = 'Value is required.';
        invalid = true;
        continue;
      }
      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric)) {
        nextErrors[field.key] = 'Enter a valid number.';
        invalid = true;
        continue;
      }
      const validationError = field.validate ? field.validate(numeric) : null;
      if (validationError) {
        nextErrors[field.key] = validationError;
        invalid = true;
        continue;
      }
      if (numeric === field.defaultValue) {
        continue;
      }
      overrides[field.key] = numeric;
    }

    setFieldErrors(nextErrors);

    if (invalid) {
      setBusy(false);
      setFeedback('Resolve the highlighted errors and try again.');
      return;
    }

    try {
      const options: InstallDeviceOptions = {
        targetId,
        deviceId: selectedId,
      };
      if (Object.keys(overrides).length) {
        options.settings = overrides;
      }
      const aggregatedWarnings: string[] = [];
      let installedCount = 0;
      for (let index = 0; index < quantity; index += 1) {
        const response = await bridge.devices.installDevice(options);
        if (!response.ok) {
          const warning =
            response.errors?.[0]?.message ??
            response.warnings?.[0] ??
            'Device installation rejected by facade.';
          const prefix =
            installedCount > 0 ? `Installed ${installedCount} of ${quantity} devices. ` : '';
          setFeedback(`${prefix}${warning}`);
          if (aggregatedWarnings.length) {
            setWarnings([...new Set(aggregatedWarnings)]);
          }
          return;
        }
        installedCount += 1;
        if (response.warnings?.length) {
          aggregatedWarnings.push(...response.warnings);
        }
      }
      if (aggregatedWarnings.length) {
        setWarnings([...new Set(aggregatedWarnings)]);
        setFeedback(
          `Installed ${installedCount} device${installedCount === 1 ? '' : 's'} with warnings.`,
        );
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to install device', error);
      setFeedback('Connection error while installing device.');
    } finally {
      setBusy(false);
    }
  };

  if (!zone || !targetId) {
    return (
      <p className="text-sm text-text-muted">Zone context unavailable. Select a zone and retry.</p>
    );
  }

  if (loading) {
    return <p className="text-sm text-text-muted">Loading device catalog…</p>;
  }

  if (!devices.length) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-text-muted">No device blueprints available from the facade.</p>
        {feedback ? <Feedback message={feedback} /> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 text-sm">
        <div className="rounded-xl bg-surface-muted/50 p-3 text-xs text-text-muted">
          <span className="block text-text font-semibold">{zone.name}</span>
          <span>
            Room purpose: {roomPurpose}
            {allowedPurposes.length
              ? ` · Allowed: ${allowedPurposes.join(', ')}`
              : ' · All room purposes supported'}
          </span>
          {coverageDescription ? (
            <span className={coverageWarning ? 'mt-1 block text-warning' : 'mt-1 block'}>
              {coverageDescription}
            </span>
          ) : (
            <span className="mt-1 block">No coverage metadata provided for this blueprint.</span>
          )}
          {!purposeAllowed ? (
            <span className="mt-1 block text-warning">
              Blueprint is not marked for {roomPurpose} rooms. Installation may be rejected.
            </span>
          ) : null}
        </div>
        <label className="grid gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Device blueprint
          </span>
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} · {device.kind}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Device quantity
          </span>
          <input
            type="number"
            min={MIN_DEVICE_QUANTITY}
            max={MAX_DEVICE_QUANTITY}
            value={quantity}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setQuantity(
                Number.isFinite(nextValue) ? clampQuantity(nextValue) : MIN_DEVICE_QUANTITY,
              );
              setFeedback(null);
              setWarnings([]);
            }}
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          />
          <span className="text-xs text-text-muted">
            Install between {MIN_DEVICE_QUANTITY} and {MAX_DEVICE_QUANTITY} identical devices.
          </span>
        </label>
        {targetFields.length ? (
          <div className="grid gap-3">
            {targetFields.map((field) => (
              <label key={field.key} className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {field.label}
                </span>
                <input
                  type="number"
                  value={fieldValues[field.key] ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    setFieldValues((previous) => ({ ...previous, [field.key]: value }));
                    setFieldErrors((previous) => {
                      if (!previous[field.key]) {
                        return previous;
                      }
                      const next = { ...previous };
                      delete next[field.key];
                      return next;
                    });
                    setFeedback(null);
                    setWarnings([]);
                  }}
                  step={field.step}
                  className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                  placeholder="Enter a value"
                  inputMode="decimal"
                />
                {field.helper ? (
                  <span className="text-xs text-text-muted">{field.helper}</span>
                ) : null}
                {fieldErrors[field.key] ? (
                  <span className="text-xs text-warning">{fieldErrors[field.key]}</span>
                ) : null}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted">
            This blueprint does not expose adjustable target settings. Defaults will be used on
            install.
          </p>
        )}
      </div>
      {feedback ? <Feedback message={feedback} /> : null}
      {warnings.map((warning) => (
        <Feedback key={warning} message={warning} />
      ))}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleInstall}
        confirmLabel={busy ? 'Installing…' : 'Install device'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};
