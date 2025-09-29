import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/primitives/Button';
import { formatNumber } from '@/utils/formatNumber';
import type {
  ContainerCatalogEntry,
  CultivationMethodCatalogEntry,
  SubstrateCatalogEntry,
} from '@/types/blueprints';
import { useSimulationStore } from '@/store/simulation';

type CatalogState = ReturnType<typeof useSimulationStore.getState>['catalogs'];

type CatalogSlice<T> = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: T[];
  error: string | null;
};

interface ExistingSelection {
  blueprintId: string | null;
  count?: number;
}

export interface CultivationSetupOptions {
  catalogs: CatalogState;
  availableArea: number;
  initialArea: number;
  areaEditable: boolean;
  minArea?: number;
  initialMethodId?: string | null;
  initialContainerId?: string | null;
  initialSubstrateId?: string | null;
  initialContainerCount?: number;
  existingContainer?: ExistingSelection | null;
  existingSubstrate?: ExistingSelection | null;
  containerCountMin?: number;
}

export interface CultivationSetupState {
  methodId: string | null;
  setMethodId: (value: string | null) => void;
  methodOptions: CultivationMethodCatalogEntry[];
  selectedMethod: CultivationMethodCatalogEntry | null;
  containerId: string | null;
  setContainerId: (value: string | null) => void;
  containerOptions: ContainerCatalogEntry[];
  selectedContainer: ContainerCatalogEntry | null;
  substrateId: string | null;
  setSubstrateId: (value: string | null) => void;
  substrateOptions: SubstrateCatalogEntry[];
  selectedSubstrate: SubstrateCatalogEntry | null;
  area: number;
  areaInput: string;
  handleAreaInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleApplyMaxArea: () => void;
  containerCount: number;
  handleContainerCountChange: (event: ChangeEvent<HTMLInputElement>) => void;
  maxContainers: number;
  containerOverCapacity: boolean;
  substrateVolumeLiters: number | null;
  methodSetupCost: number;
  containerUnitCost: number;
  containerTotalCost: number;
  substrateUnitCost: number;
  substrateTotalCost: number;
  totalCost: number;
  catalogError: string | null;
  isCatalogLoading: boolean;
  containerCountMin: number;
}

const getReadyEntries = <T,>(slice: CatalogSlice<T>): T[] => {
  return slice.status === 'ready' ? slice.data : [];
};

export const useCultivationSetup = ({
  catalogs,
  availableArea,
  initialArea,
  areaEditable,
  minArea = 0.1,
  initialMethodId = null,
  initialContainerId = null,
  initialSubstrateId = null,
  initialContainerCount = 0,
  existingContainer,
  existingSubstrate,
  containerCountMin = 0,
}: CultivationSetupOptions): CultivationSetupState => {
  const methodStatus = catalogs.cultivationMethods.status;
  const containerStatus = catalogs.containers.status;
  const substrateStatus = catalogs.substrates.status;

  const readyMethods = useMemo(
    () => getReadyEntries<CultivationMethodCatalogEntry>(catalogs.cultivationMethods),
    [catalogs.cultivationMethods],
  );
  const readyContainers = useMemo(
    () => getReadyEntries<ContainerCatalogEntry>(catalogs.containers),
    [catalogs.containers],
  );
  const readySubstrates = useMemo(
    () => getReadyEntries<SubstrateCatalogEntry>(catalogs.substrates),
    [catalogs.substrates],
  );

  const computeClampedArea = useCallback(
    (value: number) => {
      if (!Number.isFinite(value)) {
        return 0;
      }
      const maxArea = Math.max(availableArea, minArea);
      const clamped = Math.min(Math.max(value, minArea), maxArea);
      return Number(clamped.toFixed(2));
    },
    [availableArea, minArea],
  );

  const [area, setArea] = useState(() => computeClampedArea(initialArea));
  const [areaInput, setAreaInput] = useState(() => computeClampedArea(initialArea).toString());

  useEffect(() => {
    setArea((current) => {
      const normalized = computeClampedArea(current);
      setAreaInput(normalized.toString());
      return normalized;
    });
  }, [availableArea, computeClampedArea]);

  const updateArea = useCallback(
    (value: number) => {
      const normalized = computeClampedArea(value);
      setArea(normalized);
      setAreaInput(normalized.toString());
    },
    [computeClampedArea],
  );

  const handleAreaInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!areaEditable) {
        return;
      }
      const { value } = event.target;
      setAreaInput(value);
      if (value === '') {
        setArea(0);
        return;
      }
      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        return;
      }
      updateArea(parsed);
    },
    [areaEditable, updateArea],
  );

  const handleApplyMaxArea = useCallback(() => {
    if (!areaEditable) {
      return;
    }
    const maxArea = Math.max(availableArea, minArea);
    updateArea(maxArea);
  }, [areaEditable, availableArea, minArea, updateArea]);

  const [methodId, setMethodId] = useState<string | null>(() => initialMethodId);
  const [containerId, setContainerId] = useState<string | null>(() => initialContainerId);
  const [substrateId, setSubstrateId] = useState<string | null>(() => initialSubstrateId);
  const [containerCount, setContainerCount] = useState(() => initialContainerCount);

  useEffect(() => {
    if (!readyMethods.length) {
      setMethodId(null);
      return;
    }
    if (methodId && readyMethods.some((method) => method.id === methodId)) {
      return;
    }
    const fallback =
      (initialMethodId && readyMethods.find((method) => method.id === initialMethodId)) ||
      readyMethods[0]!;
    setMethodId(fallback.id);
  }, [readyMethods, methodId, initialMethodId]);

  const selectedMethod = useMemo(() => {
    if (!methodId) {
      return null;
    }
    return readyMethods.find((method) => method.id === methodId) ?? null;
  }, [methodId, readyMethods]);

  const compatibleContainerTypes = selectedMethod?.compatibility?.compatibleContainerTypes;
  const containerOptions = useMemo(() => {
    if (!compatibleContainerTypes || compatibleContainerTypes.length === 0) {
      return readyContainers;
    }
    return readyContainers.filter((entry) => compatibleContainerTypes.includes(entry.type));
  }, [readyContainers, compatibleContainerTypes]);

  useEffect(() => {
    if (containerOptions.length === 0) {
      setContainerId(null);
      return;
    }
    if (containerId && containerOptions.some((entry) => entry.id === containerId)) {
      return;
    }
    const fallbackFromInitial =
      (initialContainerId && containerOptions.find((entry) => entry.id === initialContainerId)) ||
      null;
    const fallbackFromExisting =
      (existingContainer?.blueprintId &&
        containerOptions.find((entry) => entry.id === existingContainer.blueprintId)) ||
      null;
    const fallback = fallbackFromInitial ?? fallbackFromExisting ?? containerOptions[0]!;
    setContainerId(fallback.id);
  }, [containerOptions, containerId, initialContainerId, existingContainer?.blueprintId]);

  const selectedContainer = useMemo(() => {
    if (!containerId) {
      return null;
    }
    return containerOptions.find((entry) => entry.id === containerId) ?? null;
  }, [containerId, containerOptions]);

  const compatibleSubstrateTypes = selectedMethod?.compatibility?.compatibleSubstrateTypes;
  const substrateOptions = useMemo(() => {
    if (!compatibleSubstrateTypes || compatibleSubstrateTypes.length === 0) {
      return readySubstrates;
    }
    return readySubstrates.filter((entry) => compatibleSubstrateTypes.includes(entry.type));
  }, [readySubstrates, compatibleSubstrateTypes]);

  useEffect(() => {
    if (substrateOptions.length === 0) {
      setSubstrateId(null);
      return;
    }
    if (substrateId && substrateOptions.some((entry) => entry.id === substrateId)) {
      return;
    }
    const fallbackFromInitial =
      (initialSubstrateId && substrateOptions.find((entry) => entry.id === initialSubstrateId)) ||
      null;
    const fallbackFromExisting =
      (existingSubstrate?.blueprintId &&
        substrateOptions.find((entry) => entry.id === existingSubstrate.blueprintId)) ||
      null;
    const fallback = fallbackFromInitial ?? fallbackFromExisting ?? substrateOptions[0]!;
    setSubstrateId(fallback.id);
  }, [substrateOptions, substrateId, initialSubstrateId, existingSubstrate?.blueprintId]);

  const selectedSubstrate = useMemo(() => {
    if (!substrateId) {
      return null;
    }
    return substrateOptions.find((entry) => entry.id === substrateId) ?? null;
  }, [substrateId, substrateOptions]);

  const previousAreaRef = useRef(area);
  const previousMaxContainersRef = useRef(0);
  const previousContainerIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    const currentContainerId = selectedContainer?.id ?? null;

    if (!selectedContainer || maxContainers <= 0) {
      setContainerCount(containerCountMin);
      previousAreaRef.current = area;
      previousMaxContainersRef.current = maxContainers;
      previousContainerIdRef.current = currentContainerId;
      return;
    }

    setContainerCount((current) => {
      const containerChanged = previousContainerIdRef.current !== currentContainerId;
      const maxChanged = previousMaxContainersRef.current !== maxContainers;
      const areaChanged = previousAreaRef.current !== area;

      if (
        containerChanged ||
        maxChanged ||
        (areaEditable && areaChanged) ||
        current < containerCountMin ||
        current > maxContainers
      ) {
        const existingMatch =
          existingContainer && existingContainer.blueprintId === currentContainerId
            ? (existingContainer.count ?? 0)
            : 0;
        if (
          existingMatch &&
          Number.isFinite(existingMatch) &&
          existingMatch >= containerCountMin &&
          existingMatch <= maxContainers
        ) {
          return existingMatch;
        }
        return Math.max(maxContainers, containerCountMin);
      }

      return current;
    });

    previousAreaRef.current = area;
    previousMaxContainersRef.current = maxContainers;
    previousContainerIdRef.current = currentContainerId;
  }, [
    selectedContainer,
    maxContainers,
    area,
    areaEditable,
    containerCountMin,
    existingContainer?.blueprintId,
    existingContainer?.count,
  ]);

  const handleContainerCountChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const parsed = Number(event.target.value);
      if (Number.isNaN(parsed)) {
        return;
      }
      const max = maxContainers;
      if (max <= 0) {
        setContainerCount(containerCountMin);
        return;
      }
      const clamped = Math.min(Math.max(Math.floor(parsed), containerCountMin), max);
      setContainerCount(clamped);
    },
    [maxContainers, containerCountMin],
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
  const totalCost = methodSetupCost + containerTotalCost + substrateTotalCost;

  const catalogError =
    (methodStatus === 'error' && catalogs.cultivationMethods.error) ||
    (containerStatus === 'error' && catalogs.containers.error) ||
    (substrateStatus === 'error' && catalogs.substrates.error) ||
    null;

  const isCatalogLoading =
    methodStatus === 'loading' || containerStatus === 'loading' || substrateStatus === 'loading';

  return {
    methodId,
    setMethodId,
    methodOptions: readyMethods,
    selectedMethod,
    containerId,
    setContainerId,
    containerOptions,
    selectedContainer,
    substrateId,
    setSubstrateId,
    substrateOptions,
    selectedSubstrate,
    area,
    areaInput,
    handleAreaInputChange,
    handleApplyMaxArea,
    containerCount,
    handleContainerCountChange,
    maxContainers,
    containerOverCapacity,
    substrateVolumeLiters,
    methodSetupCost,
    containerUnitCost,
    containerTotalCost,
    substrateUnitCost,
    substrateTotalCost,
    totalCost,
    catalogError,
    isCatalogLoading,
    containerCountMin,
  };
};

interface CultivationSetupSectionProps {
  setup: CultivationSetupState;
  areaEditable: boolean;
  areaHelperText?: string | null;
  labels?: {
    method?: string;
    container?: string;
    substrate?: string;
    area?: string;
    containerCount?: string;
  };
  showMaxButton?: boolean;
  capacityMessages?: {
    positive?: (context: { maxContainers: number; area: number }) => string;
    zero?: (context: { area: number }) => string;
  };
  disabled?: boolean;
}

export const CultivationSetupSection = ({
  setup,
  areaEditable,
  areaHelperText,
  labels,
  showMaxButton = areaEditable,
  capacityMessages,
  disabled = false,
}: CultivationSetupSectionProps) => {
  const containerCountInputId = useId();
  const containerCountHelperId = `${containerCountInputId}-helper`;
  const containerCountWarningId = `${containerCountInputId}-warning`;

  const methodLabel = labels?.method ?? 'Cultivation Method';
  const containerLabel = labels?.container ?? 'Container Blueprint';
  const substrateLabel = labels?.substrate ?? 'Substrate Blueprint';
  const areaLabel = labels?.area ?? 'Area (m²)';
  const containerCountLabel = labels?.containerCount ?? 'Container count';

  const positiveCapacityMessage =
    capacityMessages?.positive?.({
      maxContainers: setup.maxContainers,
      area: setup.area,
    }) ??
    `Maximum supported: ${formatNumber(setup.maxContainers, { maximumFractionDigits: 0 })} containers`;

  const zeroCapacityMessage =
    capacityMessages?.zero?.({ area: setup.area }) ??
    'Container footprint metadata required to compute capacity.';

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {methodLabel}
        </span>
        <select
          value={setup.methodId ?? ''}
          onChange={(event) => setup.setMethodId(event.target.value || null)}
          disabled={disabled || setup.isCatalogLoading || setup.methodOptions.length === 0}
          className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {setup.methodOptions.map((method) => (
            <option key={method.id} value={method.id}>
              {method.name}
            </option>
          ))}
        </select>
        {setup.selectedMethod?.metadata?.description ? (
          <span className="text-xs text-text-muted">
            {setup.selectedMethod.metadata.description as string}
          </span>
        ) : null}
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {containerLabel}
        </span>
        <select
          value={setup.containerId ?? ''}
          onChange={(event) => setup.setContainerId(event.target.value || null)}
          disabled={disabled || setup.isCatalogLoading || setup.containerOptions.length === 0}
          className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {setup.containerOptions.map((container) => (
            <option key={container.id} value={container.id}>
              {container.name} · {container.type}
              {container.footprintArea
                ? ` · ${formatNumber(container.footprintArea, { maximumFractionDigits: 2 })} m²`
                : ''}
            </option>
          ))}
        </select>
        {setup.selectedContainer?.metadata?.description ? (
          <span className="text-xs text-text-muted">
            {setup.selectedContainer.metadata.description as string}
          </span>
        ) : null}
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {substrateLabel}
        </span>
        <select
          value={setup.substrateId ?? ''}
          onChange={(event) => setup.setSubstrateId(event.target.value || null)}
          disabled={disabled || setup.isCatalogLoading || setup.substrateOptions.length === 0}
          className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {setup.substrateOptions.map((substrate) => (
            <option key={substrate.id} value={substrate.id}>
              {substrate.name} · {substrate.type}
            </option>
          ))}
        </select>
        {setup.selectedSubstrate?.metadata?.description ? (
          <span className="text-xs text-text-muted">
            {setup.selectedSubstrate.metadata.description as string}
          </span>
        ) : null}
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {areaLabel}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={setup.areaInput}
            onChange={setup.handleAreaInputChange}
            min={0.1}
            step="0.1"
            disabled={!areaEditable || disabled}
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
          {showMaxButton ? (
            <Button
              type="button"
              variant="secondary"
              onClick={setup.handleApplyMaxArea}
              disabled={!areaEditable || disabled}
            >
              Max
            </Button>
          ) : null}
        </div>
        {areaHelperText ? <span className="text-xs text-text-muted">{areaHelperText}</span> : null}
      </label>
      <div className="grid gap-1 text-sm">
        <label
          className="text-xs font-semibold uppercase tracking-wide text-text-muted"
          htmlFor={containerCountInputId}
        >
          {containerCountLabel}
        </label>
        <input
          id={containerCountInputId}
          type="number"
          min={setup.containerCountMin}
          max={setup.maxContainers > 0 ? setup.maxContainers : undefined}
          value={setup.containerCount}
          onChange={setup.handleContainerCountChange}
          disabled={disabled || !setup.selectedContainer || setup.maxContainers <= 0}
          aria-describedby={
            setup.maxContainers > 0
              ? containerCountHelperId
              : setup.selectedContainer
                ? containerCountWarningId
                : undefined
          }
          className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        {setup.maxContainers > 0 ? (
          <span id={containerCountHelperId} className="text-xs text-text-muted">
            {positiveCapacityMessage}
          </span>
        ) : (
          <span id={containerCountWarningId} className="text-xs text-warning">
            {zeroCapacityMessage}
          </span>
        )}
      </div>
      <div className="space-y-2 rounded-lg border border-border/60 bg-surface-muted/40 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Method setup</span>
          <span className="font-medium text-text">
            €{formatNumber(setup.methodSetupCost, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Containers ({setup.containerCount})</span>
          <span className="font-medium text-text">
            €{formatNumber(setup.containerTotalCost, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-muted">
            Substrate
            {setup.substrateVolumeLiters && setup.substrateVolumeLiters > 0
              ? ` (${formatNumber(setup.substrateVolumeLiters, { maximumFractionDigits: 1 })} L)`
              : ''}
          </span>
          <span className="font-medium text-text">
            €{formatNumber(setup.substrateTotalCost, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-border/60 pt-2 text-base font-semibold">
          <span>Total estimate</span>
          <span>€{formatNumber(setup.totalCost, { maximumFractionDigits: 0 })}</span>
        </div>
      </div>
    </div>
  );
};
