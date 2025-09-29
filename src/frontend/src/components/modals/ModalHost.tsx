import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
} from 'react';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { ModalFrame } from '@/components/modals/ModalFrame';
import { ConfirmPlantActionModal } from './ConfirmPlantActionModal';
import type {
  DeviceBlueprint,
  InstallDeviceOptions,
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
import { TuneDeviceModal } from './TuneDeviceModal';

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

export interface StorageHandoffRequest {
  zoneId: string;
  zoneName?: string | null;
  currentMethodId?: string | null;
  nextMethodId: string;
  containerName?: string | null;
  substrateName?: string | null;
}

type StorageHandoffCallback = (request: StorageHandoffRequest) => Promise<boolean>;

const defaultStorageHandoffCallback: StorageHandoffCallback = async (request) => {
  console.info('Storage handoff confirmation stub invoked', request);
  return true;
};

let storageHandoffCallback: StorageHandoffCallback = defaultStorageHandoffCallback;

export const setStorageHandoffHandler = (callback: StorageHandoffCallback | null) => {
  storageHandoffCallback = callback ?? defaultStorageHandoffCallback;
};

const requestStorageHandoff = (request: StorageHandoffRequest) => storageHandoffCallback(request);

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
          const data = response.data;
          setStrains(data);
          if (data.length > 0) {
            setSelectedStrainId((previous) => {
              const existing = data.find((item) => item.id === previous);
              return existing ? existing.id : data[0]!.id;
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

const ChangeZoneMethodModal = ({
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
  const cultivationCatalog = useSimulationStore((state) => state.catalogs.cultivationMethods);
  const containerCatalog = useSimulationStore((state) => state.catalogs.containers);
  const substrateCatalog = useSimulationStore((state) => state.catalogs.substrates);

  const readyMethods = cultivationCatalog.status === 'ready' ? cultivationCatalog.data : [];
  const readyContainers = containerCatalog.status === 'ready' ? containerCatalog.data : [];
  const readySubstrates = substrateCatalog.status === 'ready' ? substrateCatalog.data : [];

  const zoneContainer = zone?.cultivation?.container ?? null;
  const zoneSubstrate = zone?.cultivation?.substrate ?? null;

  const [selectedMethodId, setSelectedMethodId] = useState(() => zone?.cultivationMethodId ?? '');
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(
    () => zoneContainer?.blueprintId ?? null,
  );
  const [selectedSubstrateId, setSelectedSubstrateId] = useState<string | null>(
    () => zoneSubstrate?.blueprintId ?? null,
  );
  const [containerCount, setContainerCount] = useState<number>(() => zoneContainer?.count ?? 0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const methodSelectId = useId();
  const containerSelectId = useId();
  const substrateSelectId = useId();
  const containerCountInputId = useId();
  const containerCountHelperId = `${containerCountInputId}-helper`;
  const containerCountWarningId = `${containerCountInputId}-warning`;

  const methodOptions = useMemo(
    () => [...readyMethods].sort((a, b) => a.name.localeCompare(b.name)),
    [readyMethods],
  );

  useEffect(() => {
    if (!selectedMethodId && methodOptions.length > 0) {
      setSelectedMethodId(methodOptions[0]!.id);
      return;
    }
    if (selectedMethodId && !methodOptions.some((method) => method.id === selectedMethodId)) {
      const fallback =
        methodOptions.find((method) => method.id === zone?.cultivationMethodId) ??
        methodOptions[0] ??
        null;
      setSelectedMethodId(fallback?.id ?? '');
    }
  }, [methodOptions, selectedMethodId, zone?.cultivationMethodId]);

  const selectedMethod = useMemo(() => {
    if (!selectedMethodId) {
      return null;
    }
    return methodOptions.find((method) => method.id === selectedMethodId) ?? null;
  }, [methodOptions, selectedMethodId]);

  const compatibleContainerTypes = selectedMethod?.compatibility?.compatibleContainerTypes;
  const containerOptions = useMemo(() => {
    if (!compatibleContainerTypes || compatibleContainerTypes.length === 0) {
      return readyContainers;
    }
    return readyContainers.filter((entry) => compatibleContainerTypes.includes(entry.type));
  }, [readyContainers, compatibleContainerTypes]);

  useEffect(() => {
    if (containerOptions.length === 0) {
      setSelectedContainerId(null);
      return;
    }
    if (
      !selectedContainerId ||
      !containerOptions.some((entry) => entry.id === selectedContainerId)
    ) {
      const fallbackFromZone =
        zoneContainer && containerOptions.find((entry) => entry.id === zoneContainer.blueprintId);
      setSelectedContainerId((fallbackFromZone ?? containerOptions[0]!).id);
    }
  }, [containerOptions, selectedContainerId, zoneContainer]);

  const selectedContainer = useMemo(
    () => containerOptions.find((entry) => entry.id === selectedContainerId) ?? null,
    [containerOptions, selectedContainerId],
  );

  const compatibleSubstrateTypes = selectedMethod?.compatibility?.compatibleSubstrateTypes;
  const substrateOptions = useMemo(() => {
    if (!compatibleSubstrateTypes || compatibleSubstrateTypes.length === 0) {
      return readySubstrates;
    }
    return readySubstrates.filter((entry) => compatibleSubstrateTypes.includes(entry.type));
  }, [readySubstrates, compatibleSubstrateTypes]);

  useEffect(() => {
    if (substrateOptions.length === 0) {
      setSelectedSubstrateId(null);
      return;
    }
    if (
      !selectedSubstrateId ||
      !substrateOptions.some((entry) => entry.id === selectedSubstrateId)
    ) {
      const fallbackFromZone =
        zoneSubstrate && substrateOptions.find((entry) => entry.id === zoneSubstrate.blueprintId);
      setSelectedSubstrateId((fallbackFromZone ?? substrateOptions[0]!).id);
    }
  }, [substrateOptions, selectedSubstrateId, zoneSubstrate]);

  const selectedSubstrate = useMemo(
    () => substrateOptions.find((entry) => entry.id === selectedSubstrateId) ?? null,
    [substrateOptions, selectedSubstrateId],
  );

  const zoneArea = zone?.area ?? 0;
  const previousContainerRef = useRef<string | null>(null);
  const previousMaxRef = useRef<number>(0);

  const maxContainers = useMemo(() => {
    if (!zone || !selectedContainer) {
      return 0;
    }
    const footprint = selectedContainer.footprintArea;
    if (!footprint || !Number.isFinite(footprint) || footprint <= 0) {
      return 0;
    }
    const densityRaw = selectedContainer.packingDensity;
    const density = densityRaw && Number.isFinite(densityRaw) && densityRaw > 0 ? densityRaw : 1;
    const theoretical = (zone.area / footprint) * density;
    if (!Number.isFinite(theoretical) || theoretical <= 0) {
      return 0;
    }
    return Math.floor(theoretical);
  }, [selectedContainer, zone]);

  useEffect(() => {
    const currentContainerId = selectedContainer?.id ?? null;
    const max = maxContainers;

    if (!selectedContainer || max <= 0) {
      setContainerCount(0);
      previousContainerRef.current = currentContainerId;
      previousMaxRef.current = max;
      return;
    }

    setContainerCount((current) => {
      const containerChanged = previousContainerRef.current !== currentContainerId;
      const maxChanged = previousMaxRef.current !== max;
      if (containerChanged || maxChanged || current <= 0) {
        const existing =
          zoneContainer && zoneContainer.blueprintId === currentContainerId
            ? zoneContainer.count
            : 0;
        if (existing > 0 && existing <= max) {
          return existing;
        }
        return max;
      }
      if (current > max) {
        return max;
      }
      return current;
    });

    previousContainerRef.current = currentContainerId;
    previousMaxRef.current = max;
  }, [selectedContainer, maxContainers, zoneContainer]);

  const handleContainerCountChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const parsed = Number(event.target.value);
      if (Number.isNaN(parsed)) {
        return;
      }
      const max = maxContainers;
      if (max <= 0) {
        setContainerCount(0);
        return;
      }
      const clamped = Math.min(Math.max(Math.floor(parsed), 1), max);
      setContainerCount(clamped);
      setFeedback(null);
    },
    [maxContainers],
  );

  const containerOverCapacity = maxContainers > 0 && containerCount > maxContainers;

  const substrateVolumeLiters = useMemo(() => {
    if (!selectedContainer || containerCount <= 0) {
      return null;
    }
    const volume = selectedContainer.volumeInLiters;
    if (!volume || !Number.isFinite(volume) || volume <= 0) {
      return null;
    }
    return volume * containerCount;
  }, [selectedContainer, containerCount]);

  const methodSetupCost = selectedMethod?.price?.setupCost ?? 0;
  const containerUnitCost = selectedContainer?.price?.costPerUnit ?? 0;
  const containerTotalCost = containerCount > 0 ? containerUnitCost * containerCount : 0;
  const substrateUnitCost = selectedSubstrate?.price?.costPerLiter ?? 0;
  const substrateTotalCost =
    substrateVolumeLiters && substrateVolumeLiters > 0
      ? substrateUnitCost * substrateVolumeLiters
      : 0;
  const estimatedTotalCost = methodSetupCost + containerTotalCost + substrateTotalCost;

  const methodHint = getCultivationMethodHint(selectedMethodId);

  const compatibilitySummary = useMemo(() => {
    if (!selectedMethod) {
      return null;
    }
    const pieces: string[] = [];
    const containerList = selectedMethod.compatibility?.compatibleContainerTypes;
    if (Array.isArray(containerList) && containerList.length > 0) {
      pieces.push(`Supports containers: ${containerList.join(', ')}`);
    }
    const substrateList = selectedMethod.compatibility?.compatibleSubstrateTypes;
    if (Array.isArray(substrateList) && substrateList.length > 0) {
      pieces.push(`Supports substrates: ${substrateList.join(', ')}`);
    }
    return pieces.length ? pieces.join(' · ') : null;
  }, [selectedMethod]);

  const methodStatus = cultivationCatalog.status;
  const containerStatus = containerCatalog.status;
  const substrateStatus = substrateCatalog.status;

  const catalogError =
    (methodStatus === 'error' && cultivationCatalog.error) ||
    (containerStatus === 'error' && containerCatalog.error) ||
    (substrateStatus === 'error' && substrateCatalog.error) ||
    null;

  const isCatalogLoading =
    methodStatus === 'loading' || containerStatus === 'loading' || substrateStatus === 'loading';

  useEffect(() => {
    setWarnings([]);
  }, [selectedMethodId, selectedContainerId, selectedSubstrateId, containerCount]);

  if (!zone || !zoneId) {
    return (
      <p className="text-sm text-text-muted">Zone context unavailable. Select a zone and retry.</p>
    );
  }

  if (catalogError) {
    return <Feedback message={catalogError} />;
  }

  if (isCatalogLoading) {
    return <p className="text-sm text-text-muted">Loading cultivation catalogs…</p>;
  }

  if (!methodOptions.length) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-text-muted">
          No cultivation methods available from the facade catalog.
        </p>
        {feedback ? <Feedback message={feedback} /> : null}
      </div>
    );
  }

  if (containerOptions.length === 0) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-text-muted">
          No containers are compatible with the selected method. Update the catalog or choose a
          different method.
        </p>
        {feedback ? <Feedback message={feedback} /> : null}
      </div>
    );
  }

  if (substrateOptions.length === 0) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-text-muted">
          No substrates are compatible with the selected method. Update the catalog or choose a
          different method.
        </p>
        {feedback ? <Feedback message={feedback} /> : null}
      </div>
    );
  }

  const resolvedContainerName = (() => {
    if (zoneContainer?.name) {
      return zoneContainer.name;
    }
    if (zoneContainer?.slug) {
      const match = readyContainers.find((item) => item.slug === zoneContainer.slug);
      return match?.name ?? zoneContainer.slug;
    }
    return 'Not configured';
  })();

  const resolvedSubstrateName = (() => {
    if (zoneSubstrate?.name) {
      return zoneSubstrate.name;
    }
    if (zoneSubstrate?.slug) {
      const match = readySubstrates.find((item) => item.slug === zoneSubstrate.slug);
      return match?.name ?? zoneSubstrate.slug;
    }
    return 'Not configured';
  })();

  const canSubmit =
    !busy &&
    !containerOverCapacity &&
    selectedMethod &&
    selectedContainer &&
    selectedSubstrate &&
    maxContainers > 0 &&
    containerCount > 0;

  const handleApply = async () => {
    if (!selectedMethod || !selectedContainer || !selectedSubstrate) {
      setFeedback('Select a method, container, and substrate before continuing.');
      return;
    }
    if (maxContainers <= 0) {
      setFeedback('Selected container cannot be packed into this zone area.');
      return;
    }
    if (containerCount <= 0 || containerCount > maxContainers) {
      setFeedback('Container count exceeds the supported capacity.');
      return;
    }

    setFeedback(null);
    setWarnings([]);

    try {
      const confirmed = await requestStorageHandoff({
        zoneId,
        zoneName: zone.name,
        currentMethodId: zone.cultivationMethodId,
        nextMethodId: selectedMethod.id,
        containerName: resolvedContainerName,
        substrateName: resolvedSubstrateName,
      });
      if (!confirmed) {
        setFeedback('Storage handoff must be confirmed before changing the method.');
        return;
      }
    } catch (error) {
      console.error('Storage handoff confirmation failed', error);
      setFeedback('Storage confirmation failed. Please retry.');
      return;
    }

    setBusy(true);
    try {
      const response = await bridge.world.updateZone({
        zoneId,
        methodId: selectedMethod.id,
        container: {
          blueprintId: selectedContainer.id,
          type: selectedContainer.type,
          count: containerCount,
        },
        substrate: {
          blueprintId: selectedSubstrate.id,
          type: selectedSubstrate.type,
          volumeLiters: substrateVolumeLiters ?? undefined,
        },
      });
      if (!response.ok) {
        const message =
          response.errors?.[0]?.message ??
          response.warnings?.[0] ??
          'Cultivation method update was rejected by the facade.';
        setFeedback(message);
        return;
      }
      if (response.warnings?.length) {
        setWarnings(response.warnings);
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to update cultivation method', error);
      setFeedback('Connection error while updating the cultivation method.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 rounded-xl bg-surface-muted/40 p-3 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Current setup
        </span>
        <span className="text-text">Method: {zone.cultivationMethodName ?? 'Not assigned'}</span>
        <span className="text-text-muted">
          Container: {resolvedContainerName}
          {zoneContainer?.count ? ` · ${zoneContainer.count} units` : ''}
        </span>
        <span className="text-text-muted">
          Substrate: {resolvedSubstrateName}
          {zoneSubstrate?.totalVolumeLiters
            ? ` · ${formatNumber(zoneSubstrate.totalVolumeLiters, { maximumFractionDigits: 1 })} L`
            : ''}
        </span>
      </div>
      <div className="grid gap-1">
        <label
          className="text-xs font-semibold uppercase tracking-wide text-text-muted"
          htmlFor={methodSelectId}
        >
          New method
        </label>
        <select
          id={methodSelectId}
          value={selectedMethodId}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => {
            setSelectedMethodId(event.target.value);
            setFeedback(null);
          }}
          className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
        >
          {methodOptions.map((method) => (
            <option key={method.id} value={method.id}>
              {method.name}
            </option>
          ))}
        </select>
      </div>
      {selectedMethod ? (
        <div className="grid gap-1 rounded-xl border border-border/40 bg-surface-muted/20 p-3 text-xs text-text-muted">
          <span className="text-sm font-semibold text-text">{selectedMethod.name}</span>
          <span>
            Area per plant {formatNumber(selectedMethod.areaPerPlant, { maximumFractionDigits: 2 })}{' '}
            m² · Minimum spacing{' '}
            {formatNumber(selectedMethod.minimumSpacing, { maximumFractionDigits: 2 })} m
          </span>
          {methodHint ? <span>{methodHint.description}</span> : null}
          {compatibilitySummary ? <span>{compatibilitySummary}</span> : null}
        </div>
      ) : null}
      <div className="grid gap-3 rounded-xl border border-border/40 bg-surface-muted/20 p-3 text-sm">
        <div className="grid gap-1">
          <label
            className="text-xs font-semibold uppercase tracking-wide text-text-muted"
            htmlFor={containerSelectId}
          >
            Container
          </label>
          <select
            id={containerSelectId}
            value={selectedContainerId ?? ''}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              setSelectedContainerId(event.target.value || null);
              setFeedback(null);
            }}
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            {containerOptions.map((container) => (
              <option key={container.id} value={container.id}>
                {container.name}
              </option>
            ))}
          </select>
        </div>
        {selectedContainer ? (
          <div className="grid gap-1 text-xs text-text-muted">
            <span>Type: {selectedContainer.type}</span>
            {selectedContainer.footprintArea ? (
              <span>
                Footprint:{' '}
                {formatNumber(selectedContainer.footprintArea, { maximumFractionDigits: 2 })} m²
              </span>
            ) : null}
            {selectedContainer.packingDensity ? (
              <span>
                Packing density:{' '}
                {formatNumber(selectedContainer.packingDensity, { maximumFractionDigits: 2 })}
              </span>
            ) : null}
            {selectedContainer.volumeInLiters ? (
              <span>
                Volume:{' '}
                {formatNumber(selectedContainer.volumeInLiters, { maximumFractionDigits: 1 })} L per
                unit
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="grid gap-1">
          <label
            className="text-xs font-semibold uppercase tracking-wide text-text-muted"
            htmlFor={containerCountInputId}
          >
            Container count
          </label>
          <input
            id={containerCountInputId}
            type="number"
            min={1}
            max={maxContainers > 0 ? maxContainers : undefined}
            value={containerCount}
            onChange={handleContainerCountChange}
            disabled={!selectedContainer || maxContainers <= 0}
            aria-describedby={
              maxContainers > 0
                ? containerCountHelperId
                : selectedContainer
                  ? containerCountWarningId
                  : undefined
            }
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
          {maxContainers > 0 ? (
            <span id={containerCountHelperId} className="text-xs text-text-muted">
              Max supported: {formatNumber(maxContainers, { maximumFractionDigits: 0 })} containers
              · Zone area {formatNumber(zoneArea, { maximumFractionDigits: 1 })} m²
            </span>
          ) : (
            <span id={containerCountWarningId} className="text-xs text-warning">
              Selected container cannot fit into{' '}
              {formatNumber(zoneArea, { maximumFractionDigits: 1 })} m².
            </span>
          )}
        </div>
        <div className="grid gap-1">
          <label
            className="text-xs font-semibold uppercase tracking-wide text-text-muted"
            htmlFor={substrateSelectId}
          >
            Substrate
          </label>
          <select
            id={substrateSelectId}
            value={selectedSubstrateId ?? ''}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              setSelectedSubstrateId(event.target.value || null);
              setFeedback(null);
            }}
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            {substrateOptions.map((substrate) => (
              <option key={substrate.id} value={substrate.id}>
                {substrate.name}
              </option>
            ))}
          </select>
        </div>
        {selectedSubstrate ? (
          <div className="grid gap-1 text-xs text-text-muted">
            <span>Type: {selectedSubstrate.type}</span>
          </div>
        ) : null}
        <div className="grid gap-1 text-xs text-text-muted">
          <span>
            Estimated substrate volume:{' '}
            {substrateVolumeLiters
              ? `${formatNumber(substrateVolumeLiters, { maximumFractionDigits: 1 })} L`
              : '—'}
          </span>
          <span>
            Method setup cost: €{formatNumber(methodSetupCost, { maximumFractionDigits: 0 })}
          </span>
          <span>
            Container cost: €{formatNumber(containerTotalCost, { maximumFractionDigits: 0 })}
            {containerUnitCost > 0
              ? ` (${formatNumber(containerUnitCost, { maximumFractionDigits: 0 })} each)`
              : ''}
          </span>
          <span>
            Substrate cost: €{formatNumber(substrateTotalCost, { maximumFractionDigits: 0 })}
            {substrateVolumeLiters
              ? ` (${formatNumber(substrateUnitCost, { maximumFractionDigits: 2 })} €/L)`
              : ''}
          </span>
          <span className="text-text">
            Estimated total: €{formatNumber(estimatedTotalCost, { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
      {feedback ? <Feedback message={feedback} /> : null}
      {warnings.map((warning) => (
        <Feedback key={warning} message={warning} />
      ))}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleApply}
        confirmLabel={busy ? 'Applying…' : 'Apply changes'}
        confirmDisabled={!canSubmit || busy}
        cancelDisabled={busy}
      />
    </div>
  );
};

interface CoverageCapacity {
  area?: { value: number; derived: boolean; referenceHeight?: number };
  volume?: { value: number };
}

const resolveCoverageCapacity = (
  device: DeviceBlueprint | null | undefined,
  context?: { zoneHeight?: number | null; roomHeight?: number | null },
): CoverageCapacity | null => {
  if (!device) {
    return null;
  }

  const asNumber = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

  const coverage = device.coverage ?? {};
  const areaFromCoverage = asNumber((coverage as Record<string, unknown>).maxArea_m2);
  const fallbackCoverageArea = asNumber((coverage as Record<string, unknown>).coverageArea);
  const areaFromDefaults = asNumber(
    (device.defaults?.settings as Record<string, unknown> | undefined)?.coverageArea,
  );
  const areaFromSettings = asNumber(
    (device.settings as Record<string, unknown> | undefined)?.coverageArea,
  );

  const volumeFromCoverage = asNumber((coverage as Record<string, unknown>).maxVolume_m3);

  const capacity: CoverageCapacity = {};

  const resolvedArea =
    areaFromCoverage ?? fallbackCoverageArea ?? areaFromDefaults ?? areaFromSettings ?? null;
  if (resolvedArea !== null) {
    capacity.area = { value: resolvedArea, derived: false };
  }

  if (volumeFromCoverage !== null) {
    capacity.volume = { value: volumeFromCoverage };
  }

  if (!capacity.area && capacity.volume) {
    const height = asNumber(context?.zoneHeight) ?? asNumber(context?.roomHeight);
    if (height && height > 0) {
      const derivedArea = capacity.volume.value / height;
      if (Number.isFinite(derivedArea)) {
        capacity.area = { value: derivedArea, derived: true, referenceHeight: height };
      }
    }
  }

  if (!capacity.area && !capacity.volume) {
    return null;
  }

  return capacity;
};

interface TargetFieldDefinition {
  key: string;
  label: string;
  helper?: string;
  step?: string;
  validate?: (value: number) => string | null;
  defaultValue: number;
}

const MIN_DEVICE_QUANTITY = 1;
const MAX_DEVICE_QUANTITY = 20;

const clampQuantity = (value: number) =>
  Math.min(MAX_DEVICE_QUANTITY, Math.max(MIN_DEVICE_QUANTITY, Math.floor(value)));

const TARGET_FIELD_TEMPLATES: {
  keys: string[];
  label: string;
  helper?: string;
  step?: string;
  validate?: (value: number) => string | null;
}[] = [
  {
    keys: ['targetTemperature', 'temperatureTarget'],
    label: 'Target temperature (°C)',
    step: '0.1',
  },
  {
    keys: ['targetHumidity', 'targetRelativeHumidity', 'humidityTarget'],
    label: 'Target humidity (0–1)',
    step: '0.01',
    validate: (value) => (value < 0 || value > 1 ? 'Enter a value between 0 and 1.' : null),
  },
  {
    keys: ['targetCO2', 'targetCo2', 'co2Target'],
    label: 'Target CO₂ (ppm)',
    validate: (value) => (value < 0 ? 'Value must be non-negative.' : null),
  },
  {
    keys: ['ppfd', 'targetPpfd', 'lightTarget'],
    label: 'Target PPFD (µmol·m⁻²·s⁻¹)',
    validate: (value) => (value < 0 ? 'Value must be non-negative.' : null),
  },
];

const deriveTargetFields = (device: DeviceBlueprint | null): TargetFieldDefinition[] => {
  if (!device) {
    return [];
  }
  const defaults =
    (device.defaults?.settings as Record<string, unknown> | undefined) ??
    (device.settings as Record<string, unknown> | undefined) ??
    {};

  const derived: TargetFieldDefinition[] = [];

  for (const template of TARGET_FIELD_TEMPLATES) {
    const matchedKey = template.keys.find(
      (candidate) =>
        typeof defaults[candidate] === 'number' && Number.isFinite(defaults[candidate]),
    );
    if (!matchedKey) {
      continue;
    }
    derived.push({
      key: matchedKey,
      label: template.label,
      helper: template.helper,
      step: template.step,
      validate: template.validate,
      defaultValue: defaults[matchedKey] as number,
    });
  }

  return derived;
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

const MoveDeviceModal = ({
  bridge,
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const instanceId = typeof context?.deviceId === 'string' ? context.deviceId : null;
  const currentZoneId = typeof context?.zoneId === 'string' ? context.zoneId : null;
  const zones = useSimulationStore((state) => state.snapshot?.zones ?? []);
  const [targetZoneId, setTargetZoneId] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const zoneOptions = useMemo(
    () =>
      zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
      })),
    [zones],
  );

  useEffect(() => {
    if (!zoneOptions.length) {
      setTargetZoneId('');
      return;
    }
    setTargetZoneId((previous) => {
      if (previous && zoneOptions.some((zone) => zone.id === previous)) {
        return previous;
      }
      const fallback =
        zoneOptions.find((zone) => zone.id !== currentZoneId)?.id ?? zoneOptions[0]!.id;
      return fallback;
    });
  }, [zoneOptions, currentZoneId]);

  const deviceContext = useMemo(() => {
    if (!instanceId) {
      return null;
    }
    for (const zone of zones) {
      const device = zone.devices.find((item) => item.id === instanceId);
      if (device) {
        return { device, zone };
      }
    }
    return null;
  }, [instanceId, zones]);

  const hasDestination = zoneOptions.some((zone) => zone.id !== currentZoneId);
  const selectedZoneName = zoneOptions.find((zone) => zone.id === targetZoneId)?.name ?? '';

  const handleMove = async () => {
    if (!instanceId) {
      setFeedback('Device context missing. Close the modal and retry.');
      return;
    }
    if (!targetZoneId) {
      setFeedback('Select a destination zone to continue.');
      return;
    }
    if (targetZoneId === currentZoneId) {
      setFeedback('Select a different zone to move the device.');
      return;
    }
    setBusy(true);
    setFeedback(null);
    setWarnings([]);
    try {
      const response = await bridge.devices.moveDevice({
        instanceId,
        targetZoneId,
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Device move rejected by facade.');
        return;
      }
      if (response.warnings?.length) {
        setWarnings(response.warnings);
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to move device', error);
      setFeedback('Connection error while moving device.');
    } finally {
      setBusy(false);
    }
  };

  if (!instanceId) {
    return <p className="text-sm text-text-muted">Device context unavailable.</p>;
  }

  if (!zones.length) {
    return <p className="text-sm text-text-muted">No zones available. Load simulation data.</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 text-sm">
        <p className="text-text">
          Move <span className="font-semibold">{deviceContext?.device.name ?? 'device'}</span> from{' '}
          {deviceContext?.zone.name ?? 'current zone'}.
        </p>
        <label className="grid gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Destination zone
          </span>
          <select
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
            value={targetZoneId}
            onChange={(event) => setTargetZoneId(event.target.value)}
            disabled={!hasDestination || busy}
          >
            {zoneOptions.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
          {!hasDestination ? (
            <span className="text-xs text-warning">
              No other zones available. Create another zone before moving this device.
            </span>
          ) : null}
          {selectedZoneName && targetZoneId === currentZoneId ? (
            <span className="text-xs text-warning">
              {selectedZoneName} is the current zone. Choose a different destination.
            </span>
          ) : null}
        </label>
      </div>
      {feedback ? <Feedback message={feedback} /> : null}
      {warnings.map((warning) => (
        <Feedback key={warning} message={warning} />
      ))}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleMove}
        confirmLabel={busy ? 'Moving…' : 'Move device'}
        confirmDisabled={busy || !hasDestination || !targetZoneId || targetZoneId === currentZoneId}
        cancelDisabled={busy}
      />
    </div>
  );
};

const RemoveDeviceModal = ({
  bridge,
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const instanceId = typeof context?.deviceId === 'string' ? context.deviceId : null;
  const zones = useSimulationStore((state) => state.snapshot?.zones ?? []);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const deviceContext = useMemo(() => {
    if (!instanceId) {
      return null;
    }
    for (const zone of zones) {
      const device = zone.devices.find((item) => item.id === instanceId);
      if (device) {
        return { device, zone };
      }
    }
    return null;
  }, [instanceId, zones]);

  const handleRemove = async () => {
    if (!instanceId) {
      setFeedback('Device context missing. Close the modal and retry.');
      return;
    }
    setBusy(true);
    setFeedback(null);
    setWarnings([]);
    try {
      const response = await bridge.devices.removeDevice({ instanceId });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Device removal rejected by facade.');
        return;
      }
      if (response.warnings?.length) {
        setWarnings(response.warnings);
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to remove device', error);
      setFeedback('Connection error while removing device.');
    } finally {
      setBusy(false);
    }
  };

  if (!instanceId) {
    return <p className="text-sm text-text-muted">Device context unavailable.</p>;
  }

  return (
    <div className="grid gap-4 text-sm">
      <p className="text-text">
        Remove <span className="font-semibold">{deviceContext?.device.name ?? 'this device'}</span>
        {deviceContext?.zone ? ` from ${deviceContext.zone.name}` : null}? This action cannot be
        undone.
      </p>
      {feedback ? <Feedback message={feedback} /> : null}
      {warnings.map((warning) => (
        <Feedback key={warning} message={warning} />
      ))}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleRemove}
        confirmLabel={busy ? 'Deleting…' : 'Delete device'}
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

const DuplicateZoneModal = ({
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
  const openZone = useNavigationStore((state) => state.openZone);
  const [nameOverride, setNameOverride] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!zone || !zoneId) {
    return (
      <p className="text-sm text-text-muted">Zone data unavailable. Select a zone to clone.</p>
    );
  }

  const handleDuplicate = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const payload: Record<string, unknown> = { zoneId };
      if (nameOverride.trim()) {
        payload.name = nameOverride.trim();
      }
      const response = await bridge.sendIntent<{ zoneId?: string }>({
        domain: 'world',
        action: 'duplicateZone',
        payload,
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Duplication rejected by facade.');
        return;
      }
      const newZoneId = response.data?.zoneId;
      if (newZoneId) {
        openZone(zone.structureId, zone.roomId, newZoneId);
      }
      closeModal();
    } catch (error) {
      console.error('Failed to duplicate zone', error);
      setFeedback('Connection error while duplicating zone.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Duplicate <span className="font-semibold text-text">{zone.name}</span> including devices and
        cultivation setup. Provide a new name if desired.
      </p>
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Zone name
        </span>
        <input
          type="text"
          value={nameOverride}
          onChange={(event) => setNameOverride(event.target.value)}
          placeholder={`${zone.name} Copy`}
          className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
        />
      </label>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleDuplicate}
        confirmLabel={busy ? 'Duplicating…' : 'Duplicate zone'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};

const DeleteZoneModal = ({
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
  const openRoom = useNavigationStore((state) => state.openRoom);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!zone || !zoneId) {
    return (
      <p className="text-sm text-text-muted">Zone data unavailable. Select a zone to remove.</p>
    );
  }

  const handleDelete = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'deleteZone',
        payload: { zoneId },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Deletion rejected by facade.');
        return;
      }
      openRoom(zone.structureId, zone.roomId);
      closeModal();
    } catch (error) {
      console.error('Failed to delete zone', error);
      setFeedback('Connection error while deleting zone.');
    } finally {
      setBusy(false);
    }
  };

  const confirmMatches = confirmation.trim() === zone.name;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Removing <span className="font-semibold text-text">{zone.name}</span> deletes plants,
        devices, and cultivation history. Type the zone name to confirm.
      </p>
      <input
        type="text"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        placeholder={zone.name}
        className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
      />
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleDelete}
        confirmLabel={busy ? 'Removing…' : 'Remove zone'}
        confirmDisabled={!confirmMatches || busy}
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
  const catalogs = useSimulationStore((state) => state.catalogs);
  const [zoneName, setZoneName] = useState('');
  const [methodId, setMethodId] = useState<string | null>(null);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [substrateId, setSubstrateId] = useState<string | null>(null);
  const [area, setArea] = useState(10);
  const [areaInput, setAreaInput] = useState('10');
  const [containerCount, setContainerCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const previousAreaRef = useRef(area);
  const previousMaxContainersRef = useRef(0);
  const previousContainerIdRef = useRef<string | null>(null);
  const containerCountInputId = useId();
  const containerCountHelperId = `${containerCountInputId}-helper`;

  const methodOptions = catalogs.cultivationMethods.data;
  const methodStatus = catalogs.cultivationMethods.status;
  const containerStatus = catalogs.containers.status;
  const substrateStatus = catalogs.substrates.status;
  const containerOptionsAll = catalogs.containers.data;
  const substrateOptionsAll = catalogs.substrates.data;

  const selectedMethod = useMemo(
    () => methodOptions.find((method) => method.id === methodId) ?? null,
    [methodOptions, methodId],
  );

  useEffect(() => {
    if (!methodId && methodOptions.length > 0) {
      setMethodId(methodOptions[0]!.id);
    }
  }, [methodId, methodOptions]);

  const compatibleContainerTypes = selectedMethod?.compatibility?.compatibleContainerTypes;
  const containerOptions = useMemo(() => {
    if (!compatibleContainerTypes || compatibleContainerTypes.length === 0) {
      return containerOptionsAll;
    }
    return containerOptionsAll.filter((entry) => compatibleContainerTypes.includes(entry.type));
  }, [containerOptionsAll, compatibleContainerTypes]);

  useEffect(() => {
    if (containerOptions.length === 0) {
      setContainerId(null);
      return;
    }
    if (!containerId || !containerOptions.some((entry) => entry.id === containerId)) {
      setContainerId(containerOptions[0]!.id);
    }
  }, [containerOptions, containerId]);

  const selectedContainer = useMemo(
    () => containerOptions.find((entry) => entry.id === containerId) ?? null,
    [containerOptions, containerId],
  );

  const compatibleSubstrateTypes = selectedMethod?.compatibility?.compatibleSubstrateTypes;
  const substrateOptions = useMemo(() => {
    if (!compatibleSubstrateTypes || compatibleSubstrateTypes.length === 0) {
      return substrateOptionsAll;
    }
    return substrateOptionsAll.filter((entry) => compatibleSubstrateTypes.includes(entry.type));
  }, [substrateOptionsAll, compatibleSubstrateTypes]);

  useEffect(() => {
    if (substrateOptions.length === 0) {
      setSubstrateId(null);
      return;
    }
    if (!substrateId || !substrateOptions.some((entry) => entry.id === substrateId)) {
      setSubstrateId(substrateOptions[0]!.id);
    }
  }, [substrateOptions, substrateId]);

  const selectedSubstrate = useMemo(
    () => substrateOptions.find((entry) => entry.id === substrateId) ?? null,
    [substrateOptions, substrateId],
  );

  const handleCreate = async () => {
    if (!zoneName.trim()) {
      setFeedback('Zone name is required.');
      return;
    }
    if (!selectedMethod || !selectedContainer || !selectedSubstrate) {
      setFeedback('Catalog data unavailable. Please try again.');
      return;
    }
    if (maxContainers <= 0) {
      setFeedback('Selected container cannot be packed into this area.');
      return;
    }
    if (containerCount <= 0 || containerCount > maxContainers) {
      setFeedback('Container count exceeds the supported capacity.');
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
            methodId: selectedMethod.id,
            container: {
              blueprintId: selectedContainer.id,
              type: selectedContainer.type,
              count: containerCount,
            },
            substrate: {
              blueprintId: selectedSubstrate.id,
              type: selectedSubstrate.type,
              ...(substrateVolumeLiters && substrateVolumeLiters > 0
                ? { volumeLiters: substrateVolumeLiters }
                : {}),
            },
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

  const existingArea = zones.reduce((sum, zone) => sum + zone.area, 0);
  const availableArea = Math.max(0, (room?.area ?? 0) - existingArea);

  const maxContainers = useMemo(() => {
    if (!selectedContainer || !selectedContainer.footprintArea) {
      return 0;
    }
    const footprint = selectedContainer.footprintArea;
    const density = selectedContainer.packingDensity ?? 1;
    if (
      !Number.isFinite(footprint) ||
      footprint <= 0 ||
      !Number.isFinite(density) ||
      density <= 0
    ) {
      return 0;
    }
    const rawCapacity = (area / footprint) * density;
    if (!Number.isFinite(rawCapacity)) {
      return 0;
    }
    return Math.max(Math.floor(rawCapacity), 0);
  }, [selectedContainer, area]);

  const updateArea = useCallback(
    (value: number) => {
      if (!Number.isFinite(value)) {
        return;
      }
      const minArea = 0.1;
      const maxAreaBound = Math.max(availableArea, minArea);
      const clamped = Math.min(Math.max(value, minArea), maxAreaBound);
      const normalized = Number(clamped.toFixed(2));
      setArea(normalized);
      setAreaInput(normalized.toString());
    },
    [availableArea],
  );

  const handleAreaInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setAreaInput(value);
      if (value === '') {
        setArea(0);
        return;
      }
      const parsedValue = Number(value);
      if (Number.isNaN(parsedValue)) {
        return;
      }
      updateArea(parsedValue);
    },
    [updateArea],
  );

  const handleApplyMaxArea = useCallback(() => {
    const target = Math.max(availableArea, 0.1);
    updateArea(target);
  }, [availableArea, updateArea]);

  const handleContainerCountInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const parsedValue = Number(event.target.value);
      if (Number.isNaN(parsedValue)) {
        return;
      }
      const minCount = 0;
      const maxCount = Math.max(maxContainers, 0);
      const clamped = Math.min(Math.max(parsedValue, minCount), maxCount);
      setContainerCount(Math.floor(clamped));
    },
    [maxContainers],
  );

  useEffect(() => {
    const currentContainerId = selectedContainer?.id ?? null;

    if (!selectedContainer || maxContainers <= 0) {
      setContainerCount(0);
      previousAreaRef.current = area;
      previousMaxContainersRef.current = maxContainers;
      previousContainerIdRef.current = currentContainerId;
      return;
    }

    const areaChanged = previousAreaRef.current !== area;
    const maxChanged = previousMaxContainersRef.current !== maxContainers;
    const containerChanged = previousContainerIdRef.current !== currentContainerId;

    setContainerCount((current) => {
      if (
        containerChanged ||
        areaChanged ||
        maxChanged ||
        current <= 0 ||
        current > maxContainers
      ) {
        return maxContainers;
      }
      return current;
    });

    previousAreaRef.current = area;
    previousMaxContainersRef.current = maxContainers;
    previousContainerIdRef.current = currentContainerId;
  }, [area, maxContainers, selectedContainer]);

  const containerOverfill = maxContainers > 0 && containerCount > maxContainers;
  const substrateVolumeLiters = selectedContainer?.volumeInLiters
    ? selectedContainer.volumeInLiters * containerCount
    : undefined;

  const methodSetupCost = selectedMethod?.price?.setupCost ?? 0;
  const containerUnitCost = selectedContainer?.price?.costPerUnit ?? 0;
  const containerTotalCost = containerUnitCost * containerCount;
  const substrateUnitCost = selectedSubstrate?.price?.costPerLiter ?? 0;
  const substrateTotalCost = substrateVolumeLiters ? substrateUnitCost * substrateVolumeLiters : 0;
  const totalCost = methodSetupCost + containerTotalCost + substrateTotalCost;

  const catalogError =
    (methodStatus === 'error' && catalogs.cultivationMethods.error) ||
    (containerStatus === 'error' && catalogs.containers.error) ||
    (substrateStatus === 'error' && catalogs.substrates.error) ||
    null;
  const isCatalogLoading =
    methodStatus === 'loading' || containerStatus === 'loading' || substrateStatus === 'loading';

  const canSubmit = Boolean(
    !busy &&
      !catalogError &&
      !containerOverfill &&
      selectedMethod &&
      selectedContainer &&
      selectedSubstrate &&
      maxContainers > 0 &&
      containerCount > 0 &&
      zoneName.trim() &&
      area > 0,
  );

  if (!room || !roomId) {
    return (
      <p className="text-sm text-text-muted">Room data unavailable. Select a room to add zone.</p>
    );
  }

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
            value={methodId ?? ''}
            onChange={(event) => setMethodId(event.target.value || null)}
            disabled={isCatalogLoading || methodOptions.length === 0}
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            {methodOptions.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
          {selectedMethod?.metadata?.description ? (
            <span className="text-xs text-text-muted">{selectedMethod.metadata.description}</span>
          ) : null}
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Container Blueprint
          </span>
          <select
            value={containerId ?? ''}
            onChange={(event) => setContainerId(event.target.value || null)}
            disabled={isCatalogLoading || containerOptions.length === 0}
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            {containerOptions.map((container) => (
              <option key={container.id} value={container.id}>
                {container.name} · {container.type}
                {container.footprintArea
                  ? ` · ${formatNumber(container.footprintArea, { maximumFractionDigits: 2 })} m²`
                  : ''}
              </option>
            ))}
          </select>
          {selectedContainer?.metadata?.description ? (
            <span className="text-xs text-text-muted">
              {selectedContainer.metadata.description}
            </span>
          ) : null}
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Substrate Blueprint
          </span>
          <select
            value={substrateId ?? ''}
            onChange={(event) => setSubstrateId(event.target.value || null)}
            disabled={isCatalogLoading || substrateOptions.length === 0}
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            {substrateOptions.map((substrate) => (
              <option key={substrate.id} value={substrate.id}>
                {substrate.name} · {substrate.type}
              </option>
            ))}
          </select>
          {selectedSubstrate?.metadata?.description ? (
            <span className="text-xs text-text-muted">
              {selectedSubstrate.metadata.description}
            </span>
          ) : null}
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Area (m²)
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={areaInput}
              onChange={handleAreaInputChange}
              min={0.1}
              max={Math.max(availableArea, 0.1)}
              step="0.1"
              className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
            />
            <Button type="button" variant="secondary" onClick={handleApplyMaxArea}>
              Max
            </Button>
          </div>
          <span className="text-xs text-text-muted">
            Available: {formatNumber(availableArea, { maximumFractionDigits: 1 })} m² (room area{' '}
            {formatNumber(room.area)} m²)
          </span>
        </label>
        <div className="grid gap-1 text-sm">
          <label
            className="text-xs font-semibold uppercase tracking-wide text-text-muted"
            htmlFor={containerCountInputId}
          >
            Container count
          </label>
          <input
            id={containerCountInputId}
            type="number"
            value={containerCount}
            onChange={handleContainerCountInputChange}
            min={0}
            max={maxContainers > 0 ? maxContainers : undefined}
            disabled={!selectedContainer || maxContainers <= 0}
            aria-describedby={containerCountHelperId}
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          />
          <span id={containerCountHelperId} className="text-xs text-text-muted">
            {maxContainers > 0
              ? `Maximum supported: ${formatNumber(maxContainers, { maximumFractionDigits: 0 })} containers`
              : 'Container footprint metadata required to compute capacity.'}
          </span>
        </div>
      </div>
      {catalogError ? <Feedback message={catalogError} /> : null}
      {containerOverfill ? (
        <Feedback message="Container count exceeds the supported capacity for this area." />
      ) : null}
      {feedback ? <Feedback message={feedback} /> : null}
      <div className="space-y-2 rounded-lg border border-border/60 bg-surface-muted/40 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Method setup</span>
          <span className="font-medium text-text">
            €{formatNumber(methodSetupCost, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Containers ({containerCount})</span>
          <span className="font-medium text-text">
            €{formatNumber(containerTotalCost, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-muted">
            Substrate
            {substrateVolumeLiters && substrateVolumeLiters > 0
              ? ` (${formatNumber(substrateVolumeLiters, { maximumFractionDigits: 1 })} L)`
              : ''}
          </span>
          <span className="font-medium text-text">
            €{formatNumber(substrateTotalCost, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-border/60 pt-2 text-base font-semibold">
          <span>Total estimate</span>
          <span>€{formatNumber(totalCost, { maximumFractionDigits: 0 })}</span>
        </div>
      </div>
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleCreate}
        confirmLabel={busy ? 'Creating…' : 'Create zone'}
        confirmDisabled={!canSubmit}
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
  duplicateZone: ({ bridge, closeModal, context }) => (
    <DuplicateZoneModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  plantZone: ({ bridge, closeModal, context }) => (
    <PlantZoneModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  deleteZone: ({ bridge, closeModal, context }) => (
    <DeleteZoneModal bridge={bridge} closeModal={closeModal} context={context} />
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
  moveDevice: ({ bridge, closeModal, context }) => (
    <MoveDeviceModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  removeDevice: ({ bridge, closeModal, context }) => (
    <RemoveDeviceModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  tuneDevice: ({ bridge, closeModal, context }) => (
    <TuneDeviceModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  confirmPlantAction: ({ bridge, closeModal, context }) => (
    <ConfirmPlantActionModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  changeZoneMethod: ({ bridge, closeModal, context }) => (
    <ChangeZoneMethodModal bridge={bridge} closeModal={closeModal} context={context} />
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
