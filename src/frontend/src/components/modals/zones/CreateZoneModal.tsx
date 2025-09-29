import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ActionFooter, Feedback } from '@/components/modals/common';
import { Button } from '@/components/primitives/Button';
import type { SimulationBridge } from '@/facade/systemFacade';
import { useSimulationStore } from '@/store/simulation';
import { formatNumber } from '@/utils/formatNumber';

export interface CreateZoneModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}

export const CreateZoneModal = ({ bridge, closeModal, context }: CreateZoneModalProps) => {
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
