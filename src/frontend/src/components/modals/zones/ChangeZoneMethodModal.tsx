import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ActionFooter, Feedback } from '@/components/modals/common';
import type { SimulationBridge } from '@/facade/systemFacade';
import { useSimulationStore } from '@/store/simulation';
import { formatNumber } from '@/utils/formatNumber';
import { getCultivationMethodHint } from './cultivationHints';
import { requestStorageHandoff } from './storageHandoff';

export interface ChangeZoneMethodModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}

export const ChangeZoneMethodModal = ({
  bridge,
  closeModal,
  context,
}: ChangeZoneMethodModalProps) => {
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
              : 'Not available'}
          </span>
          {selectedSubstrate?.price?.costPerLiter ? (
            <span>
              Substrate unit cost{' '}
              {formatNumber(selectedSubstrate.price.costPerLiter, {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
              })}
              {substrateTotalCost > 0
                ? ` · Total ${formatNumber(substrateTotalCost, {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0,
                  })}`
                : ''}
            </span>
          ) : null}
          {selectedContainer?.price?.costPerUnit ? (
            <span>
              Container unit cost{' '}
              {formatNumber(selectedContainer.price.costPerUnit, {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
              })}
              {containerTotalCost > 0
                ? ` · Total ${formatNumber(containerTotalCost, {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0,
                  })}`
                : ''}
            </span>
          ) : null}
        </div>
      </div>
      {methodSetupCost > 0 || containerTotalCost > 0 || substrateTotalCost > 0 ? (
        <div className="grid gap-1 rounded-xl border border-border/40 bg-surface-muted/20 p-3 text-xs text-text-muted">
          <span className="text-sm font-semibold text-text">Estimated costs</span>
          {methodSetupCost > 0 ? (
            <span>
              Method setup{' '}
              {formatNumber(methodSetupCost, {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
              })}
            </span>
          ) : null}
          {containerTotalCost > 0 ? (
            <span>
              Containers{' '}
              {formatNumber(containerTotalCost, {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
              })}
            </span>
          ) : null}
          {substrateTotalCost > 0 ? (
            <span>
              Substrate{' '}
              {formatNumber(substrateTotalCost, {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
              })}
            </span>
          ) : null}
          <span>
            Total{' '}
            {formatNumber(estimatedTotalCost, {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
      ) : null}
      {warnings.length ? (
        <div className="grid gap-1 text-xs text-warning">
          {warnings.map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </div>
      ) : null}
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleApply}
        confirmLabel="Apply changes"
        confirmDisabled={!canSubmit || busy}
        cancelDisabled={busy}
      />
    </div>
  );
};
