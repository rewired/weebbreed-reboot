import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { ModalFrame } from '@/components/modals/ModalFrame';
import type {
  DeviceBlueprint,
  StrainBlueprint,
  StructureBlueprint,
  SimulationBridge,
} from '@/facade/systemFacade';
import { HireModal } from '@/components/personnel/HireModal';
import { FireModal } from '@/components/personnel/FireModal';
import { useUIStore } from '@/store/ui';
import type { ModalDescriptor } from '@/store/ui';
import { useSimulationStore } from '@/store/simulation';
import { useNavigationStore } from '@/store/navigation';
import { ModifierInputs } from '../modifiers/ModifierInputs';
import { DifficultyModifiers } from '../../types/difficulty';
import { useDifficultyConfig } from '@/hooks/useDifficultyConfig';
import { formatNumber } from '@/utils/formatNumber';

interface ModalHostProps {
  bridge: SimulationBridge;
}

const Feedback = ({ message }: { message: string }) => (
  <p className="text-sm text-warning">{message}</p>
);

const ActionFooter = ({
  onCancel,
  onConfirm,
  confirmLabel,
  confirmDisabled,
  cancelDisabled,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmDisabled: boolean;
  cancelDisabled: boolean;
}) => (
  <div className="flex justify-end gap-2">
    <Button variant="ghost" onClick={onCancel} disabled={cancelDisabled}>
      Cancel
    </Button>
    <Button variant="primary" onClick={onConfirm} disabled={confirmDisabled}>
      {confirmLabel}
    </Button>
  </div>
);

const CULTIVATION_METHOD_HINTS: Record<
  string,
  { name: string; areaPerPlant: number; description: string }
> = {
  '85cc0916-0e8a-495e-af8f-50291abe6855': {
    name: 'Basic Soil Pot',
    areaPerPlant: 0.5,
    description: 'One plant per soil pot. Reliable but lower density.',
  },
  '41229377-ef2d-4723-931f-72eea87d7a62': {
    name: 'Screen of Green',
    areaPerPlant: 1,
    description: 'Low-density method using horizontal training screens.',
  },
  '659ba4d7-a5fc-482e-98d4-b614341883ac': {
    name: 'Sea of Green',
    areaPerPlant: 0.25,
    description: 'High-density micro canopy with many small plants.',
  },
};

const getCultivationMethodHint = (methodId?: string | null) =>
  methodId ? (CULTIVATION_METHOD_HINTS[methodId] ?? null) : null;

const PlantZoneModal = ({
  bridge,
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const zoneId = typeof context?.zoneId === 'string' ? context.zoneId : null;
  const zone = useSimulationStore((state) =>
    zoneId ? (state.snapshot?.zones.find((item) => item.id === zoneId) ?? null) : null,
  );
  const [strains, setStrains] = useState<StrainBlueprint[]>([]);
  const [selectedStrainId, setSelectedStrainId] = useState('');
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadBlueprints = async () => {
      setLoading(true);
      try {
        const response = await bridge.getStrainBlueprints();
        if (!isMounted) {
          return;
        }
        if (response.ok && response.data) {
          setStrains(response.data);
          if (response.data.length > 0) {
            setSelectedStrainId((previous) => {
              const existing = response.data.find((item) => item.id === previous);
              return existing ? existing.id : response.data[0]!.id;
            });
          }
        } else {
          setFeedback('Failed to load strain catalog from facade.');
        }
      } catch (error) {
        console.error('Failed to load strain catalog', error);
        if (isMounted) {
          setFeedback('Connection error while loading strain catalog.');
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

  const methodHint = getCultivationMethodHint(zone?.cultivationMethodId);
  const capacity = useMemo(() => {
    if (!zone || !methodHint) {
      return null;
    }
    const areaPerPlant = Math.max(methodHint.areaPerPlant, 0.1);
    return Math.max(1, Math.floor(zone.area / areaPerPlant));
  }, [methodHint, zone]);

  const plantedCount = zone?.plants.length ?? 0;
  const remainingCapacity = capacity !== null ? Math.max(0, capacity - plantedCount) : null;
  const selectedStrain = useMemo(
    () => strains.find((strain) => strain.id === selectedStrainId) ?? null,
    [selectedStrainId, strains],
  );

  const affinity = useMemo(() => {
    if (!selectedStrain) {
      return null;
    }
    const methodId = zone?.cultivationMethodId;
    if (!methodId) {
      return null;
    }
    if (typeof selectedStrain.methodAffinity?.[methodId] === 'number') {
      return selectedStrain.methodAffinity[methodId]!;
    }
    return selectedStrain.compatibility.methodAffinity[methodId] ?? null;
  }, [selectedStrain, zone?.cultivationMethodId]);

  const compatibilityLabel = useMemo(() => {
    if (affinity === null) {
      return zone?.cultivationMethodId
        ? 'No affinity data for this cultivation method.'
        : 'Assign a cultivation method to compute capacity hints.';
    }
    const affinityPct = affinity * 100;
    if (affinityPct >= 95) {
      return `Excellent fit (${formatNumber(affinityPct, { maximumFractionDigits: 0 })}% affinity)`;
    }
    if (affinityPct >= 60) {
      return `Good fit (${formatNumber(affinityPct, { maximumFractionDigits: 0 })}% affinity)`;
    }
    if (affinityPct >= 40) {
      return `Fair fit (${formatNumber(affinityPct, { maximumFractionDigits: 0 })}% affinity)`;
    }
    return `Low affinity (${formatNumber(affinityPct, { maximumFractionDigits: 0 })}%). Consider another strain or method.`;
  }, [affinity, zone?.cultivationMethodId]);

  const exceedsCapacity = useMemo(() => {
    if (capacity === null) {
      return false;
    }
    return count + plantedCount > capacity;
  }, [capacity, count, plantedCount]);

  const handlePlanting = async () => {
    if (!zoneId) {
      setFeedback('Zone context missing. Close the modal and retry.');
      return;
    }
    if (!selectedStrainId) {
      setFeedback('Select a strain to continue.');
      return;
    }
    setBusy(true);
    setFeedback(null);
    setWarnings([]);
    try {
      const response = await bridge.plants.addPlanting({
        zoneId,
        strainId: selectedStrainId,
        count,
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Planting intent rejected by facade.');
        return;
      }
      if (response.warnings?.length) {
        setWarnings(response.warnings);
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to plant zone', error);
      setFeedback('Connection error while planting this zone.');
    } finally {
      setBusy(false);
    }
  };

  if (!zone || !zoneId) {
    return (
      <p className="text-sm text-text-muted">Zone context unavailable. Select a zone and retry.</p>
    );
  }

  if (loading) {
    return <p className="text-sm text-text-muted">Loading strain catalog…</p>;
  }

  if (!strains.length) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-text-muted">No strains available from the facade catalog.</p>
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
            {formatNumber(zone.area)} m² · {plantedCount} plants active
            {methodHint
              ? ` · ${methodHint.name} (${formatNumber(methodHint.areaPerPlant, {
                  maximumFractionDigits: 2,
                })} m²/plant)`
              : zone.cultivationMethodId
                ? ` · method ${zone.cultivationMethodId}`
                : ' · no cultivation method configured'}
          </span>
          {capacity !== null ? (
            <span className="mt-1 block">
              Capacity {capacity} plants ({remainingCapacity} slots free)
            </span>
          ) : (
            <span className="mt-1 block">Assign a cultivation method to compute capacity.</span>
          )}
        </div>
        <label className="grid gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Strain
          </span>
          <select
            value={selectedStrainId}
            onChange={(event) => setSelectedStrainId(event.target.value)}
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            {strains.map((strain) => (
              <option key={strain.id} value={strain.id}>
                {strain.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Plant count
          </span>
          <input
            type="number"
            min={1}
            value={count}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setCount(Number.isFinite(nextValue) && nextValue > 0 ? Math.floor(nextValue) : 1);
            }}
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          />
          {exceedsCapacity ? (
            <span className="text-xs text-warning">
              Planting {count} plants now would exceed the estimated capacity by{' '}
              {count + plantedCount - (capacity ?? 0)} plants.
            </span>
          ) : (
            <span className="text-xs text-text-muted">
              Remaining capacity estimate: {remainingCapacity}
            </span>
          )}
        </label>
        <p className="text-xs text-text-muted">{compatibilityLabel}</p>
        {methodHint ? <p className="text-xs text-text-muted">{methodHint.description}</p> : null}
      </div>
      {feedback ? <Feedback message={feedback} /> : null}
      {warnings.map((warning) => (
        <Feedback key={warning} message={warning} />
      ))}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handlePlanting}
        confirmLabel={busy ? 'Planting…' : 'Plant zone'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};

const resolveCoverageArea = (device: DeviceBlueprint | null | undefined) => {
  if (!device) {
    return null;
  }
  if (device.coverage) {
    if (typeof device.coverage.maxArea_m2 === 'number') {
      return device.coverage.maxArea_m2;
    }
    if (typeof device.coverage.coverageArea === 'number') {
      return device.coverage.coverageArea;
    }
  }
  const defaultSettings =
    (device.defaults?.settings as Record<string, unknown> | undefined) ??
    (device.settings as Record<string, unknown> | undefined);
  if (defaultSettings && typeof defaultSettings.coverageArea === 'number') {
    return defaultSettings.coverageArea;
  }
  return null;
};

const InstallDeviceModal = ({
  bridge,
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const targetId = typeof context?.zoneId === 'string' ? context.zoneId : null;
  const zone = useSimulationStore((state) =>
    targetId ? (state.snapshot?.zones.find((item) => item.id === targetId) ?? null) : null,
  );
  const room = useSimulationStore((state) =>
    zone?.roomId ? (state.snapshot?.rooms.find((item) => item.id === zone.roomId) ?? null) : null,
  );
  const [devices, setDevices] = useState<DeviceBlueprint[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [settingsText, setSettingsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

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
          setDevices(response.data);
          if (response.data.length > 0) {
            setSelectedId((previous) => {
              const existing = response.data.find((item) => item.id === previous);
              return existing ? existing.id : response.data[0]!.id;
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

  useEffect(() => {
    if (!selectedDevice) {
      setSettingsText('');
      return;
    }
    const defaults =
      (selectedDevice.defaults?.settings as Record<string, unknown> | undefined) ??
      (selectedDevice.settings as Record<string, unknown> | undefined) ??
      {};
    try {
      setSettingsText(JSON.stringify(defaults, null, 2));
    } catch (error) {
      console.warn('Failed to serialise default device settings', error);
      setSettingsText('{}');
    }
  }, [selectedDevice]);

  const coverageArea = resolveCoverageArea(selectedDevice);
  const coverageWarning = coverageArea !== null && zone ? coverageArea < zone.area : false;
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
    setBusy(true);
    setFeedback(null);
    setSettingsError(null);
    setWarnings([]);
    let parsedSettings: Record<string, unknown> | undefined;
    if (settingsText.trim().length > 0) {
      try {
        const parsed = JSON.parse(settingsText);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          setSettingsError('Settings JSON must represent an object.');
          setBusy(false);
          return;
        }
        parsedSettings = parsed as Record<string, unknown>;
      } catch (error) {
        console.error('Invalid device settings JSON', error);
        setSettingsError('Settings must be valid JSON.');
        setBusy(false);
        return;
      }
    }
    try {
      const response = await bridge.devices.installDevice({
        targetId,
        deviceId: selectedId,
        settings: parsedSettings,
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Device installation rejected by facade.');
        return;
      }
      if (response.warnings?.length) {
        setWarnings(response.warnings);
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
          {coverageArea !== null ? (
            <span className={coverageWarning ? 'mt-1 block text-warning' : 'mt-1 block'}>
              Covers up to {formatNumber(coverageArea, { maximumFractionDigits: 2 })} m² · Zone area{' '}
              {formatNumber(zone.area, { maximumFractionDigits: 2 })} m²
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
            Settings (JSON)
          </span>
          <textarea
            value={settingsText}
            onChange={(event) => setSettingsText(event.target.value)}
            rows={6}
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 font-mono text-xs text-text focus:border-primary focus:outline-none"
            placeholder="Override settings (JSON)"
          />
        </label>
        {settingsError ? <Feedback message={settingsError} /> : null}
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

const RentStructureModal = ({
  bridge,
  closeModal,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
}) => {
  const [blueprints, setBlueprints] = useState<StructureBlueprint[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load structure blueprints from backend
  useEffect(() => {
    let isMounted = true;
    const loadBlueprints = async () => {
      if (isMounted) {
        setLoading(true);
      }
      try {
        const response = await bridge.getStructureBlueprints();
        if (!isMounted) {
          return;
        }
        if (response.ok && response.data) {
          if (isMounted) {
            setBlueprints(response.data);
            if (response.data.length > 0) {
              setSelected(response.data[0].id);
            }
          }
        } else if (isMounted) {
          setFeedback('Failed to load structure blueprints from backend.');
        }
      } catch (error) {
        console.error('Failed to load structure blueprints:', error);
        if (isMounted) {
          setFeedback('Connection error while loading structure blueprints.');
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

  const handleRent = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'rentStructure',
        payload: { structureId: selected },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Unable to rent structure.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to rent structure', error);
      setFeedback('Connection error while dispatching rent intent.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-text-muted">Loading structure blueprints...</p>
      </div>
    );
  }

  if (blueprints.length === 0) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-text-muted">No structure blueprints available.</p>
        {feedback ? <Feedback message={feedback} /> : null}
        <ActionFooter
          onCancel={closeModal}
          onConfirm={() => {}}
          confirmLabel="Close"
          confirmDisabled={true}
          cancelDisabled={false}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Select a deterministic blueprint to rent. The facade validates availability and applies rent
        per tick once the command succeeds.
      </p>
      <div className="grid gap-3">
        {blueprints.map((blueprint) => {
          const area = blueprint.footprint.length * blueprint.footprint.width;
          return (
            <label
              key={blueprint.id}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/50 bg-surface-muted/60 p-4 transition hover:border-primary"
            >
              <input
                type="radio"
                className="mt-1 size-4 shrink-0 accent-primary"
                name="structure-blueprint"
                value={blueprint.id}
                checked={selected === blueprint.id}
                onChange={() => setSelected(blueprint.id)}
              />
              <div className="flex flex-col gap-1 text-left">
                <span className="text-sm font-semibold text-text">{blueprint.name}</span>
                <span className="text-xs text-text-muted">
                  {formatNumber(area)} m² · Upfront €
                  {formatNumber(blueprint.upfrontFee, { maximumFractionDigits: 0 })} · Rent €
                  {formatNumber(blueprint.rentalCostPerSqmPerMonth)}/m²·month
                </span>
                <span className="text-xs text-text-muted/80">
                  {formatNumber(blueprint.footprint.length)}m ×{' '}
                  {formatNumber(blueprint.footprint.width)}m ×{' '}
                  {formatNumber(blueprint.footprint.height)}m
                </span>
              </div>
            </label>
          );
        })}
      </div>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleRent}
        confirmLabel={busy ? 'Renting…' : 'Rent structure'}
        confirmDisabled={busy || !selected}
        cancelDisabled={busy}
      />
    </div>
  );
};

const DuplicateStructureModal = ({
  bridge,
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const structureId = typeof context?.structureId === 'string' ? context.structureId : null;
  const structure = useSimulationStore((state) =>
    structureId
      ? (state.snapshot?.structures.find((item) => item.id === structureId) ?? null)
      : null,
  );
  const rooms = useSimulationStore((state) =>
    structureId
      ? (state.snapshot?.rooms.filter((room) => room.structureId === structureId) ?? [])
      : [],
  );
  const zones = useSimulationStore((state) =>
    structureId
      ? (state.snapshot?.zones.filter((zone) => zone.structureId === structureId) ?? [])
      : [],
  );
  const openStructure = useNavigationStore((state) => state.openStructure);
  const [nameOverride, setNameOverride] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!structure || !structureId) {
    return (
      <p className="text-sm text-text-muted">
        Structure data unavailable. Select a structure before duplicating.
      </p>
    );
  }

  const handleDuplicate = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const payload: Record<string, unknown> = { structureId };
      if (nameOverride.trim()) {
        payload.name = nameOverride.trim();
      }
      const response = await bridge.sendIntent<{ structureId?: string }>({
        domain: 'world',
        action: 'duplicateStructure',
        payload,
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Duplication rejected by facade.');
        return;
      }
      const newId = response.data?.structureId;
      if (newId) {
        openStructure(newId);
      }
      closeModal();
    } catch (error) {
      console.error('Failed to duplicate structure', error);
      setFeedback('Connection error while duplicating structure.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-1 text-sm text-text-muted">
        <span className="font-medium text-text">{structure.name}</span>
        <span>
          {rooms.length} rooms · {zones.length} zones · Rent €
          {formatNumber(structure.rentPerTick, { maximumFractionDigits: 0 })} per tick
        </span>
      </div>
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Duplicate as
        </span>
        <input
          type="text"
          value={nameOverride}
          onChange={(event) => setNameOverride(event.target.value)}
          placeholder="Leave empty to keep generated name"
          className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
        />
      </label>
      <p className="text-xs text-text-muted">
        The facade replicates geometry, rooms, zones, and device placement. Costs are applied on
        commit; no optimistic updates are rendered.
      </p>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleDuplicate}
        confirmLabel={busy ? 'Duplicating…' : 'Duplicate structure'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};

const RenameStructureModal = ({
  bridge,
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const structureId = typeof context?.structureId === 'string' ? context.structureId : null;
  const currentName = typeof context?.currentName === 'string' ? context.currentName : '';
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!structureId) {
    return (
      <p className="text-sm text-text-muted">Select a structure before attempting to rename.</p>
    );
  }

  const handleRename = async () => {
    if (!name.trim()) {
      setFeedback('Name cannot be empty.');
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'renameStructure',
        payload: { structureId, name: name.trim() },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Rename rejected by facade.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to rename structure', error);
      setFeedback('Connection error while renaming structure.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Structure name
        </span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
        />
      </label>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleRename}
        confirmLabel={busy ? 'Renaming…' : 'Rename structure'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};

const DeleteStructureModal = ({
  bridge,
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const structureId = typeof context?.structureId === 'string' ? context.structureId : null;
  const structure = useSimulationStore((state) =>
    structureId
      ? (state.snapshot?.structures.find((item) => item.id === structureId) ?? null)
      : null,
  );
  const goToStructures = useNavigationStore((state) => state.goToStructures);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!structure || !structureId) {
    return (
      <p className="text-sm text-text-muted">
        Structure data unavailable. Select a structure to remove.
      </p>
    );
  }

  const handleDelete = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'deleteStructure',
        payload: { structureId },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Deletion rejected by facade.');
        return;
      }
      goToStructures();
      closeModal();
    } catch (error) {
      console.error('Failed to delete structure', error);
      setFeedback('Connection error while deleting structure.');
    } finally {
      setBusy(false);
    }
  };

  const confirmMatches = confirmation.trim() === structure.name;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Removing <span className="font-semibold text-text">{structure.name}</span> releases all
        rooms and zones. Type the structure name to confirm.
      </p>
      <input
        type="text"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        placeholder={structure.name}
        className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
      />
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleDelete}
        confirmLabel={busy ? 'Removing…' : 'Remove structure'}
        confirmDisabled={!confirmMatches || busy}
        cancelDisabled={busy}
      />
    </div>
  );
};

const CreateRoomModal = ({
  bridge,
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const structureId = typeof context?.structureId === 'string' ? context.structureId : null;
  const structure = useSimulationStore((state) =>
    structureId
      ? (state.snapshot?.structures.find((item) => item.id === structureId) ?? null)
      : null,
  );
  const rooms = useSimulationStore((state) =>
    structureId
      ? (state.snapshot?.rooms.filter((room) => room.structureId === structureId) ?? [])
      : [],
  );
  const [roomName, setRoomName] = useState('');
  const [purpose, setPurpose] = useState('Grow Room');
  const [area, setArea] = useState(50);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!structure || !structureId) {
    return (
      <p className="text-sm text-text-muted">
        Structure data unavailable. Select a structure to add room.
      </p>
    );
  }

  const handleCreate = async () => {
    if (!roomName.trim()) {
      setFeedback('Room name is required.');
      return;
    }
    if (area > availableArea) {
      setFeedback(
        `Room area (${formatNumber(area)} m²) exceeds available space (${formatNumber(availableArea)} m²).`,
      );
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'createRoom',
        payload: {
          structureId,
          room: {
            name: roomName.trim(),
            purpose,
            area,
          },
        },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Room creation rejected by facade.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to create room', error);
      setFeedback('Connection error while creating room.');
    } finally {
      setBusy(false);
    }
  };

  const purposeOptions = [
    { id: 'Grow Room', name: 'Grow Room', description: 'Cultivation and plant management' },
    { id: 'Laboratory', name: 'Laboratory', description: 'Breeding and research activities' },
    { id: 'Break Room', name: 'Break Room', description: 'Staff rest and recovery' },
    { id: 'Sales Room', name: 'Sales Room', description: 'Commercial product sales' },
  ];

  const existingRoomArea = rooms.reduce((sum, room) => sum + room.area, 0);
  const availableArea = Math.max(0, structure.footprint.area - existingRoomArea);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Room name
          </span>
          <input
            type="text"
            value={roomName}
            onChange={(event) => setRoomName(event.target.value)}
            placeholder="Enter room name"
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Purpose
          </span>
          <select
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            {purposeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} - {option.description}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Area (m²)
          </span>
          <input
            type="number"
            value={area}
            onChange={(event) => setArea(Number(event.target.value))}
            min="1"
            max={availableArea}
            step="1"
            className={`w-full rounded-lg border px-3 py-2 text-sm text-text focus:outline-none ${
              area > availableArea
                ? 'border-red-500 bg-red-50 focus:border-red-500'
                : 'border-border/60 bg-surface-muted/50 focus:border-primary'
            }`}
          />
          <span className={`text-xs ${area > availableArea ? 'text-red-600' : 'text-text-muted'}`}>
            Available: {formatNumber(availableArea, { maximumFractionDigits: 0 })} m² (structure
            footprint: {formatNumber(structure.footprint.area)} m²)
          </span>
        </label>
      </div>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleCreate}
        confirmLabel={busy ? 'Creating…' : 'Create room'}
        confirmDisabled={busy || area > availableArea}
        cancelDisabled={busy}
      />
    </div>
  );
};

const DuplicateRoomModal = ({
  bridge,
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const roomId = typeof context?.roomId === 'string' ? context.roomId : null;
  const room = useSimulationStore((state) =>
    roomId ? (state.snapshot?.rooms.find((item) => item.id === roomId) ?? null) : null,
  );
  const zones = useSimulationStore((state) =>
    roomId ? (state.snapshot?.zones.filter((zone) => zone.roomId === roomId) ?? []) : [],
  );
  const openRoom = useNavigationStore((state) => state.openRoom);
  const [nameOverride, setNameOverride] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!room || !roomId) {
    return (
      <p className="text-sm text-text-muted">Room data unavailable. Select a room to duplicate.</p>
    );
  }

  const handleDuplicate = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const payload: Record<string, unknown> = { roomId };
      if (nameOverride.trim()) {
        payload.name = nameOverride.trim();
      }
      const response = await bridge.sendIntent<{ roomId?: string }>({
        domain: 'world',
        action: 'duplicateRoom',
        payload,
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Duplication rejected by facade.');
        return;
      }
      const newRoomId = response.data?.roomId;
      if (newRoomId) {
        openRoom(room.structureId, newRoomId);
      }
      closeModal();
    } catch (error) {
      console.error('Failed to duplicate room', error);
      setFeedback('Connection error while duplicating room.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-1 text-sm text-text-muted">
        <span className="font-medium text-text">{room.name}</span>
        <span>
          {zones.length} zones · {formatNumber(room.area)} m² · Purpose {room.purposeName}
        </span>
      </div>
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Duplicate as
        </span>
        <input
          type="text"
          value={nameOverride}
          onChange={(event) => setNameOverride(event.target.value)}
          placeholder="Leave empty to auto-name"
          className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
        />
      </label>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleDuplicate}
        confirmLabel={busy ? 'Duplicating…' : 'Duplicate room'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};

const RecruitStaffModal = ({
  bridge,
  closeModal,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleRecruit = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'workforce',
        action: 'generateApplicants',
        payload: { count: 5 },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Failed to recruit new staff.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to recruit staff', error);
      setFeedback('Connection error while recruiting staff.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Generate new job applicants for available positions. The workforce engine will create
        candidates with randomized skills, traits, and salary expectations based on current company
        needs.
      </p>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleRecruit}
        confirmLabel={busy ? 'Recruiting…' : 'Generate Applicants'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};

const RejectApplicantModal = ({
  bridge,
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const applicantId = typeof context?.applicantId === 'string' ? context.applicantId : null;
  const applicant = useSimulationStore((state) =>
    applicantId
      ? (state.snapshot?.personnel.applicants.find((item) => item.id === applicantId) ?? null)
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!applicant || !applicantId) {
    return (
      <p className="text-sm text-text-muted">
        Applicant data unavailable. Select an applicant to reject.
      </p>
    );
  }

  const handleReject = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'workforce',
        action: 'rejectApplicant',
        payload: { applicantId },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Rejection failed.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to reject applicant', error);
      setFeedback('Connection error while rejecting applicant.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Reject <span className="font-semibold text-text">{applicant.name}</span>'s application for
        the {applicant.desiredRole} position. They will be removed from the applicant pool.
      </p>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleReject}
        confirmLabel={busy ? 'Rejecting…' : 'Reject Applicant'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};

const EmployeeDetailsModal = ({
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const employeeId = typeof context?.employeeId === 'string' ? context.employeeId : null;
  const employee = useSimulationStore((state) =>
    employeeId
      ? (state.snapshot?.personnel.employees.find((item) => item.id === employeeId) ?? null)
      : null,
  );

  if (!employee || !employeeId) {
    return (
      <p className="text-sm text-text-muted">
        Employee data unavailable. Select an employee to view details.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted">Employee ID</span>
          <span className="font-mono text-xs text-text">{employee.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Role</span>
          <span className="font-medium text-text">{employee.role}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Status</span>
          <span className="font-medium text-text">
            {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Salary</span>
          <span className="font-medium text-text">
            €{formatNumber(employee.salaryPerTick, { maximumFractionDigits: 0 })}/tick
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Morale</span>
          <span className="font-medium text-text">
            {formatNumber(employee.morale * 100, { maximumFractionDigits: 0 })}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Energy</span>
          <span className="font-medium text-text">
            {formatNumber(employee.energy * 100, { maximumFractionDigits: 0 })}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Max Work Time</span>
          <span className="font-medium text-text">
            {formatNumber(employee.maxMinutesPerTick, { maximumFractionDigits: 0 })} min/tick
          </span>
        </div>
        {employee.assignedStructureId && (
          <div className="flex justify-between">
            <span className="text-text-muted">Assigned Structure</span>
            <span className="font-mono text-xs text-text">{employee.assignedStructureId}</span>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button variant="primary" onClick={closeModal}>
          Close
        </Button>
      </div>
    </div>
  );
};

const CreateZoneModal = ({
  bridge,
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const roomId = typeof context?.roomId === 'string' ? context.roomId : null;
  const room = useSimulationStore((state) =>
    roomId ? (state.snapshot?.rooms.find((item) => item.id === roomId) ?? null) : null,
  );
  const zones = useSimulationStore((state) =>
    roomId ? (state.snapshot?.zones.filter((zone) => zone.roomId === roomId) ?? []) : [],
  );
  const [zoneName, setZoneName] = useState('');
  const [methodId, setMethodId] = useState('85cc0916-0e8a-495e-af8f-50291abe6855'); // Default to Basic Soil Pot
  const [area, setArea] = useState(10);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!room || !roomId) {
    return (
      <p className="text-sm text-text-muted">Room data unavailable. Select a room to add zone.</p>
    );
  }

  const handleCreate = async () => {
    if (!zoneName.trim()) {
      setFeedback('Zone name is required.');
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'createZone',
        payload: {
          roomId,
          zone: {
            name: zoneName.trim(),
            area,
            methodId,
          },
        },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Zone creation rejected by facade.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to create zone', error);
      setFeedback('Connection error while creating zone.');
    } finally {
      setBusy(false);
    }
  };

  const cultivationMethods = [
    {
      id: '85cc0916-0e8a-495e-af8f-50291abe6855',
      name: 'Basic Soil Pot',
      description: 'Simple cultivation method: one plant per pot in soil',
    },
    {
      id: '41229377-ef2d-4723-931f-72eea87d7a62',
      name: 'Screen of Green',
      description: 'Low-density method using screens to train plants horizontally',
    },
    {
      id: '659ba4d7-a5fc-482e-98d4-b614341883ac',
      name: 'Sea of Green',
      description: 'High-density method with many small plants close together',
    },
  ];

  const existingArea = zones.reduce((sum, zone) => sum + zone.area, 0);
  const availableArea = Math.max(0, room.area - existingArea);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Zone name
          </span>
          <input
            type="text"
            value={zoneName}
            onChange={(event) => setZoneName(event.target.value)}
            placeholder="Enter zone name"
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Cultivation Method
          </span>
          <select
            value={methodId}
            onChange={(event) => setMethodId(event.target.value)}
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            {cultivationMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name} - {method.description}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Area (m²)
          </span>
          <input
            type="number"
            value={area}
            onChange={(event) => setArea(Number(event.target.value))}
            min="0.1"
            max={availableArea}
            step="0.1"
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          />
          <span className="text-xs text-text-muted">
            Available: {formatNumber(availableArea, { maximumFractionDigits: 1 })} m² (room area:{' '}
            {formatNumber(room.area)} m²)
          </span>
        </label>
      </div>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleCreate}
        confirmLabel={busy ? 'Creating…' : 'Create zone'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};

const NewGameModal = ({
  bridge,
  closeModal,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'normal' | 'hard'>(
    'normal',
  );
  const [customModifiers, setCustomModifiers] = useState<DifficultyModifiers | null>(null);
  const enterDashboard = useNavigationStore((state) => state.enterDashboard);

  const {
    config: difficultyConfig,
    loading: difficultyLoading,
    error: difficultyError,
    refresh: reloadDifficultyConfig,
  } = useDifficultyConfig();

  const difficultyOptions = useMemo(() => {
    if (!difficultyConfig) {
      return [] as Array<{
        id: 'easy' | 'normal' | 'hard';
        name: string;
        description: string;
        initialCapital: string;
        color: string;
      }>;
    }
    return Object.entries(difficultyConfig).map(([key, config]) => ({
      id: key as 'easy' | 'normal' | 'hard',
      name: config.name,
      description: config.description,
      initialCapital: `€${formatNumber(config.modifiers.economics.initialCapital / 1_000_000, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}M`,
      color:
        key === 'easy' ? 'text-green-600' : key === 'normal' ? 'text-yellow-600' : 'text-red-600',
    }));
  }, [difficultyConfig]);

  const selectedPreset = difficultyConfig?.[selectedDifficulty];

  useEffect(() => {
    if (selectedPreset) {
      setCustomModifiers(selectedPreset.modifiers);
    }
  }, [selectedPreset]);

  const handleDifficultyChange = (difficultyId: 'easy' | 'normal' | 'hard') => {
    setSelectedDifficulty(difficultyId);
  };

  const handleCreateNewGame = async () => {
    if (!customModifiers) {
      setFeedback('Difficulty presets are still loading. Please try again shortly.');
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      // Stop the simulation if it's running
      await bridge.sendControl({ action: 'pause' });

      // Send the newGame intent with custom modifiers
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'newGame',
        payload: {
          difficulty: selectedDifficulty,
          modifiers: customModifiers,
        },
      });

      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Failed to create new game.');
        return;
      }

      // Navigate to dashboard and close modal
      enterDashboard();
      closeModal();
    } catch (error) {
      console.error('Failed to create new game', error);
      setFeedback('Connection error while creating new game.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Create a completely empty simulation session with no structures or content. Choose your
        difficulty level to set economic conditions and game balance.
      </p>

      <div className="grid gap-3">
        <h4 className="text-sm font-semibold text-text">Difficulty Level</h4>
        {difficultyError ? (
          <div className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
            <p>Failed to load difficulty presets: {difficultyError}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => reloadDifficultyConfig()}
            >
              Retry
            </Button>
          </div>
        ) : difficultyLoading ? (
          <div className="rounded-lg border border-border/40 bg-surface-muted/40 p-4 text-sm text-text-muted">
            Loading difficulty presets…
          </div>
        ) : difficultyOptions.length === 0 ? (
          <div className="rounded-lg border border-border/40 bg-surface-muted/40 p-4 text-sm text-text-muted">
            Difficulty presets are not available yet. Please retry once the backend responds.
          </div>
        ) : (
          <div className="grid gap-3">
            {difficultyOptions.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/50 bg-surface-muted/60 p-3 transition hover:border-primary"
              >
                <input
                  type="radio"
                  className="mt-1 size-4 shrink-0 accent-primary"
                  name="difficulty"
                  value={option.id}
                  checked={selectedDifficulty === option.id}
                  onChange={() => handleDifficultyChange(option.id)}
                />
                <div className="flex flex-col gap-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${option.color}`}>{option.name}</span>
                    <span className="text-xs text-text-muted">
                      {option.initialCapital} starting capital
                    </span>
                  </div>
                  <span className="text-xs text-text-muted">{option.description}</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-2 rounded-lg border border-border/40 bg-surface-muted/30 p-4">
        <h4 className="text-sm font-semibold text-text">Game Modifiers</h4>
        <p className="text-xs text-text-muted mb-2">
          Adjust the game balance by modifying these values. Each difficulty preset provides a
          starting point.
        </p>
        {customModifiers ? (
          <ModifierInputs modifiers={customModifiers} onChange={setCustomModifiers} />
        ) : (
          <div className="rounded border border-border/40 bg-surface-muted/60 p-4 text-sm text-text-muted">
            Difficulty presets are loading…
          </div>
        )}
      </div>

      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleCreateNewGame}
        confirmLabel={busy ? 'Creating…' : 'Create New Game'}
        confirmDisabled={busy || !customModifiers}
        cancelDisabled={busy}
      />
    </div>
  );
};

const GameMenuModal = ({
  bridge,
  closeModal,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
}) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleResetSession = async () => {
    setBusy('reset');
    setFeedback(null);
    try {
      // Stop the simulation if it's running
      await bridge.sendControl({ action: 'pause' });

      // Send the resetSession intent to the backend
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'resetSession',
        payload: {},
      });

      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Failed to reset session.');
        return;
      }

      // Reset frontend navigation state to return to start screen
      const resetNavigation = useNavigationStore.getState().reset;
      resetNavigation();

      closeModal();
    } catch (error) {
      console.error('Failed to reset session', error);
      setFeedback('Connection error while resetting session.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Game menu actions for the current simulation session.
      </p>
      <div className="grid gap-3">
        {[
          {
            label: 'Save Game',
            icon: 'save',
            disabled: true,
            tooltip: 'Save functionality coming soon',
          },
          {
            label: 'Load Game',
            icon: 'folder_open',
            disabled: true,
            tooltip: 'Load functionality coming soon',
          },
          {
            label: 'Export Save',
            icon: 'ios_share',
            disabled: true,
            tooltip: 'Export functionality coming soon',
          },
          {
            label: 'Reset Session',
            icon: 'restart_alt',
            disabled: busy !== null,
            onClick: handleResetSession,
            tooltip: 'Start a fresh game session',
          },
        ].map((item) => (
          <Button
            key={item.label}
            variant={item.label === 'Reset Session' ? 'primary' : 'secondary'}
            icon={<Icon name={item.icon} />}
            disabled={item.disabled}
            onClick={item.onClick}
            title={item.tooltip}
          >
            {busy === 'reset' && item.label === 'Reset Session' ? 'Resetting…' : item.label}
          </Button>
        ))}
      </div>
      {feedback ? <Feedback message={feedback} /> : null}
    </div>
  );
};

const modalRenderers: Record<
  ModalDescriptor['type'],
  (args: {
    bridge: SimulationBridge;
    closeModal: () => void;
    context?: Record<string, unknown>;
  }) => ReactElement | null
> = {
  gameMenu: ({ bridge, closeModal }) => <GameMenuModal bridge={bridge} closeModal={closeModal} />,
  loadGame: () => (
    <p className="text-sm text-text-muted">
      Load slots will appear once the backend exposes deterministic save headers. Choose a slot to
      dispatch <code>systemFacade.loadSave</code>.
    </p>
  ),
  importGame: () => (
    <p className="text-sm text-text-muted">
      Import a JSON save exported from Weedbreed.AI. Files are validated before{' '}
      <code>sim.restoreSnapshot</code> executes.
    </p>
  ),
  newGame: ({ bridge, closeModal }) => <NewGameModal bridge={bridge} closeModal={closeModal} />,
  notifications: () => (
    <p className="text-sm text-text-muted">
      Notification center groups events from <code>sim.*</code>, <code>world.*</code>, and{' '}
      <code>finance.*</code>. Streaming view arrives with live telemetry.
    </p>
  ),
  rentStructure: ({ bridge, closeModal }) => (
    <RentStructureModal bridge={bridge} closeModal={closeModal} />
  ),
  duplicateStructure: ({ bridge, closeModal, context }) => (
    <DuplicateStructureModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  renameStructure: ({ bridge, closeModal, context }) => (
    <RenameStructureModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  deleteStructure: ({ bridge, closeModal, context }) => (
    <DeleteStructureModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  createRoom: ({ bridge, closeModal, context }) => (
    <CreateRoomModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  duplicateRoom: ({ bridge, closeModal, context }) => (
    <DuplicateRoomModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  deleteRoom: () => (
    <p className="text-sm text-text-muted">
      Room deletion flow is not yet wired. Select a room and confirm via dashboard controls.
    </p>
  ),
  createZone: ({ bridge, closeModal, context }) => (
    <CreateZoneModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  plantZone: ({ bridge, closeModal, context }) => (
    <PlantZoneModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  deleteZone: () => (
    <p className="text-sm text-text-muted">
      Zone deletion flow will be wired once zone intent schemas land in the facade.
    </p>
  ),
  recruitStaff: ({ bridge, closeModal }) => (
    <RecruitStaffModal bridge={bridge} closeModal={closeModal} />
  ),
  hireApplicant: ({ bridge, closeModal, context }) => (
    <HireModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  fireEmployee: ({ bridge, closeModal, context }) => (
    <FireModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  rejectApplicant: ({ bridge, closeModal, context }) => (
    <RejectApplicantModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  employeeDetails: ({ bridge, closeModal, context }) => (
    <EmployeeDetailsModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  installDevice: ({ bridge, closeModal, context }) => (
    <InstallDeviceModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
};

type PauseContext = {
  resumable: boolean;
  speed: number;
  pauseConfirmed: boolean;
};

export const ModalHost = ({ bridge }: ModalHostProps) => {
  const activeModal = useUIStore((state) => state.activeModal);
  const closeModal = useUIStore((state) => state.closeModal);
  const pauseContext = useRef<PauseContext | null>(null);
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [pauseFeedback, setPauseFeedback] = useState<string | null>(null);

  const handleCloseModal = useCallback(() => {
    const context = pauseContext.current;
    if (context?.resumable && context.pauseConfirmed) {
      setPauseFeedback(null);
      setResuming(true);
      void bridge
        .sendControl({ action: 'play', gameSpeed: context.speed })
        .then((response) => {
          if (!response.ok) {
            const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
            setPauseFeedback(
              warning ??
                'Failed to resume simulation after modal actions. Please resume from the toolbar.',
            );
            return;
          }
          pauseContext.current = null;
          closeModal();
        })
        .catch((error) => {
          console.error('Failed to resume simulation after modal close', error);
          setPauseFeedback('Connection error while resuming simulation. Please try again.');
        })
        .finally(() => {
          setResuming(false);
        });
      return;
    }
    pauseContext.current = null;
    closeModal();
  }, [bridge, closeModal]);

  useEffect(() => {
    if (!activeModal) {
      const context = pauseContext.current;
      pauseContext.current = null;
      setPausing(false);
      setResuming(false);
      setPauseFeedback(null);
      if (context?.resumable && context.pauseConfirmed) {
        void bridge.sendControl({ action: 'play', gameSpeed: context.speed }).catch((error) => {
          console.error('Failed to resume simulation after modal close', error);
        });
      }
      return;
    }
    if (pauseContext.current) {
      return;
    }
    setPauseFeedback(null);
    setResuming(false);
    const snapshot = useSimulationStore.getState().snapshot;
    const timeStatus = useSimulationStore.getState().timeStatus;
    const timeStatusPaused = typeof timeStatus?.paused === 'boolean' ? timeStatus.paused : null;
    const snapshotPaused = snapshot ? snapshot.clock.isPaused : null;
    let isPaused = true;

    if (timeStatusPaused !== null && snapshotPaused !== null) {
      isPaused = timeStatusPaused === snapshotPaused ? timeStatusPaused : true;
    } else if (timeStatusPaused !== null) {
      isPaused = timeStatusPaused;
    } else if (snapshotPaused !== null) {
      isPaused = snapshotPaused;
    }

    const resumable = !isPaused;
    const speed = timeStatus?.speed ?? snapshot?.clock.targetTickRate ?? 1;
    const context: PauseContext = { resumable, speed, pauseConfirmed: !resumable };
    pauseContext.current = context;
    if (resumable) {
      setPausing(true);
      void bridge
        .sendControl({ action: 'pause' })
        .then((response) => {
          if (pauseContext.current !== context) {
            return;
          }
          if (!response.ok) {
            const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
            setPauseFeedback(
              warning ??
                'Failed to pause simulation before opening the modal. Simulation will keep running.',
            );
            pauseContext.current = null;
            return;
          }
          pauseContext.current = { ...context, pauseConfirmed: true };
        })
        .catch((error) => {
          if (pauseContext.current !== context) {
            return;
          }
          console.error('Failed to pause simulation for modal', error);
          setPauseFeedback(
            'Connection error while pausing simulation. Simulation will keep running.',
          );
          pauseContext.current = null;
        })
        .finally(() => {
          if (pauseContext.current === context) {
            setPausing(false);
          } else if (!pauseContext.current) {
            setPausing(false);
          }
        });
    }
  }, [activeModal, bridge]);

  const content = useMemo(() => {
    if (!activeModal) {
      return null;
    }
    const renderer = modalRenderers[activeModal.type];
    if (!renderer) {
      return null;
    }
    return renderer({ bridge, closeModal: handleCloseModal, context: activeModal.context });
  }, [activeModal, bridge, handleCloseModal]);

  if (!activeModal || !content) {
    return null;
  }

  const subtitle = pausing
    ? 'Pausing simulation…'
    : resuming
      ? 'Resuming simulation…'
      : activeModal.subtitle;

  return (
    <ModalFrame title={activeModal.title} subtitle={subtitle} onClose={handleCloseModal}>
      {pauseFeedback ? <Feedback message={pauseFeedback} /> : null}
      {content}
    </ModalFrame>
  );
};
