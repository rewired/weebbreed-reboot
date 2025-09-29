import { useEffect, useMemo, useState } from 'react';
import { ActionFooter, Feedback } from '@/components/modals/common';
import type { SimulationBridge } from '@/facade/systemFacade';
import { useSimulationStore } from '@/store/simulation';
import { formatNumber } from '@/utils/formatNumber';
import {
  CultivationSetupSection,
  useCultivationSetup,
} from '@/components/modals/zones/CultivationSetupSection';
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
  const catalogs = useSimulationStore((state) => state.catalogs);

  const readyContainers = catalogs.containers.status === 'ready' ? catalogs.containers.data : [];
  const readySubstrates = catalogs.substrates.status === 'ready' ? catalogs.substrates.data : [];

  const zoneContainer = zone?.cultivation?.container ?? null;
  const zoneSubstrate = zone?.cultivation?.substrate ?? null;

  const [feedback, setFeedback] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const cultivationSetup = useCultivationSetup({
    catalogs,
    availableArea: zone?.area ?? 0,
    initialArea: zone?.area ?? 0.1,
    areaEditable: false,
    minArea: 0.1,
    initialMethodId: zone?.cultivationMethodId ?? null,
    initialContainerId: zoneContainer?.blueprintId ?? null,
    initialSubstrateId: zoneSubstrate?.blueprintId ?? null,
    initialContainerCount: zoneContainer?.count ?? 0,
    existingContainer: zoneContainer
      ? { blueprintId: zoneContainer.blueprintId ?? null, count: zoneContainer.count }
      : null,
    existingSubstrate: zoneSubstrate ? { blueprintId: zoneSubstrate.blueprintId ?? null } : null,
    containerCountMin: 1,
  });

  const {
    methodId,
    selectedMethod,
    selectedContainer,
    selectedSubstrate,
    containerCount,
    maxContainers,
    containerOverCapacity,
    substrateVolumeLiters,
    catalogError,
    isCatalogLoading,
    methodOptions,
    containerOptions,
    substrateOptions,
  } = cultivationSetup;

  useEffect(() => {
    setWarnings([]);
  }, [methodId, cultivationSetup.containerId, cultivationSetup.substrateId, containerCount]);

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

  const methodHint = getCultivationMethodHint(methodId ?? '');

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
      <CultivationSetupSection
        setup={cultivationSetup}
        areaEditable={false}
        showMaxButton={false}
        areaHelperText={`Zone area: ${formatNumber(zone.area, { maximumFractionDigits: 1 })} m²`}
        labels={{
          method: 'New method',
          container: 'Container',
          substrate: 'Substrate',
          area: 'Zone area (m²)',
          containerCount: 'Container count',
        }}
        capacityMessages={{
          positive: ({ maxContainers: max }) =>
            `Max supported: ${formatNumber(max, { maximumFractionDigits: 0 })} containers · Zone area ${formatNumber(
              zone.area,
              { maximumFractionDigits: 1 },
            )} m²`,
          zero: () =>
            `Selected container cannot fit into ${formatNumber(zone.area, { maximumFractionDigits: 1 })} m².`,
        }}
        disabled={busy}
      />
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
      {selectedContainer ? (
        <div className="grid gap-1 text-xs text-text-muted">
          <span>Type: {selectedContainer.type}</span>
          {selectedContainer.footprintArea ? (
            <span>
              Footprint{' '}
              {formatNumber(selectedContainer.footprintArea, { maximumFractionDigits: 2 })} m²
            </span>
          ) : null}
          {selectedContainer.packingDensity ? (
            <span>
              Packing density{' '}
              {formatNumber(selectedContainer.packingDensity, { maximumFractionDigits: 2 })}
            </span>
          ) : null}
          {selectedContainer.volumeInLiters ? (
            <span>
              Volume {formatNumber(selectedContainer.volumeInLiters, { maximumFractionDigits: 1 })}{' '}
              L per unit
            </span>
          ) : null}
        </div>
      ) : null}
      {selectedSubstrate ? (
        <div className="grid gap-1 text-xs text-text-muted">
          <span>Type: {selectedSubstrate.type}</span>
        </div>
      ) : null}
      {substrateVolumeLiters ? (
        <div className="text-xs text-text-muted">
          Estimated substrate volume{' '}
          {formatNumber(substrateVolumeLiters, { maximumFractionDigits: 1 })} L
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
