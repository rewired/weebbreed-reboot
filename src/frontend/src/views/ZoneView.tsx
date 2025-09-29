import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import cx from 'clsx';
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import type { ColumnFiltersState, FilterFn, RowData, SortingState } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/primitives/Badge';
import { useSimulationStore } from '@/store/simulation';
import { useNavigationStore } from '@/store/navigation';
import { useUIStore } from '@/store/ui';
import type { DeviceSnapshot, PlantSnapshot } from '@/types/simulation';
import { formatNumber } from '@/utils/formatNumber';
import type { SimulationBridge } from '@/facade/systemFacade';
import { EnvironmentPanel } from '@/components/zone/EnvironmentPanel';
import { EnvironmentBadgeRow } from '@/components/zone/EnvironmentBadgeRow';
import { buildEnvironmentBadgeDescriptors } from '@/components/zone/environmentBadges';
import type { ConfirmPlantActionContext } from '@/components/modals/ConfirmPlantActionModal';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    headerLabel?: string;
  }
}

const columnHelper = createColumnHelper<PlantSnapshot>();

const PlantStatusHeader = ({ icon, label }: { icon: string; label: string }) => (
  <span className="flex justify-center" title={label}>
    <Icon name={icon} size={18} className="text-text-muted" />
    <span className="sr-only">{label}</span>
  </span>
);

const PlantStatusIndicator = ({
  isActive,
  icon,
  label,
  tone,
  background,
}: {
  isActive: boolean;
  icon: string;
  label: string;
  tone: string;
  background: string;
}) => {
  if (!isActive) {
    return (
      <span className="flex justify-center">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent"
          aria-hidden
        />
      </span>
    );
  }

  return (
    <span className="flex justify-center">
      <span
        role="img"
        aria-label={label}
        title={label}
        className={cx(
          'inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm shadow-sm',
          background,
        )}
      >
        <Icon name={icon} size={18} className={tone} />
      </span>
    </span>
  );
};

const diseaseFlagFilter: FilterFn<PlantSnapshot> = (row, columnId, filterValue) => {
  if (filterValue !== 'flagged') {
    return true;
  }
  return Boolean(row.getValue<boolean>(columnId));
};

const stageFilter: FilterFn<PlantSnapshot> = (row, columnId, filterValue) => {
  if (!filterValue || filterValue === 'all') {
    return true;
  }

  return row.getValue<string>(columnId) === filterValue;
};

const stressFilter: FilterFn<PlantSnapshot> = (row, columnId, filterValue) => {
  if (!filterValue || filterValue === 'all') {
    return true;
  }

  const value = row.getValue<number>(columnId);

  switch (filterValue) {
    case 'low':
      return value < 0.33;
    case 'medium':
      return value >= 0.33 && value < 0.66;
    case 'high':
      return value >= 0.66;
    default:
      return true;
  }
};

const STRESS_FILTER_OPTIONS = [
  { value: 'all', label: 'All stress levels' },
  { value: 'low', label: 'Low (< 33%)' },
  { value: 'medium', label: 'Medium (33–65%)' },
  { value: 'high', label: 'High (≥ 66%)' },
];

type ActionStatusTone = 'success' | 'warning' | 'error';

interface ActionStatus {
  tone: ActionStatusTone;
  message: string;
}

const ACTION_STATUS_STYLES: Record<
  ActionStatusTone,
  { container: string; icon: string; iconName: string }
> = {
  success: {
    container: 'border-success/50 bg-success/10 text-success',
    icon: 'text-success',
    iconName: 'check_circle',
  },
  warning: {
    container: 'border-warning/50 bg-warning/10 text-warning',
    icon: 'text-warning',
    iconName: 'report',
  },
  error: {
    container: 'border-danger/60 bg-danger/10 text-danger',
    icon: 'text-danger',
    iconName: 'error',
  },
};

const plantColumns = [
  columnHelper.accessor('strainName', {
    header: 'Strain',
    cell: (info) => info.getValue() ?? info.row.original.strainId,
    meta: { headerLabel: 'Strain' },
  }),
  columnHelper.accessor('stage', {
    header: 'Stage',
    cell: (info) => <Badge tone="default">{info.getValue()}</Badge>,
    filterFn: stageFilter,
    meta: { headerLabel: 'Stage' },
  }),
  columnHelper.accessor('hasDiseases', {
    header: () => <PlantStatusHeader icon="coronavirus" label="Diseases" />,
    enableSorting: false,
    cell: (info) => (
      <PlantStatusIndicator
        isActive={info.getValue()}
        icon="coronavirus"
        label="Diseases detected"
        tone="text-danger"
        background="border-danger/40 bg-danger/10"
      />
    ),
    size: 64,
    minSize: 56,
    maxSize: 72,
    filterFn: diseaseFlagFilter,
    meta: { headerLabel: 'Diseases' },
  }),
  columnHelper.accessor('hasPests', {
    header: () => <PlantStatusHeader icon="bug_report" label="Pests" />,
    enableSorting: false,
    cell: (info) => (
      <PlantStatusIndicator
        isActive={info.getValue()}
        icon="bug_report"
        label="Pests detected"
        tone="text-warning"
        background="border-warning/40 bg-warning/10"
      />
    ),
    size: 64,
    minSize: 56,
    maxSize: 72,
    filterFn: diseaseFlagFilter,
    meta: { headerLabel: 'Pests' },
  }),
  columnHelper.accessor('hasPendingTreatments', {
    header: () => <PlantStatusHeader icon="healing" label="Pending treatments" />,
    enableSorting: false,
    cell: (info) => (
      <PlantStatusIndicator
        isActive={info.getValue()}
        icon="healing"
        label="Treatment scheduled"
        tone="text-primary"
        background="border-primary/30 bg-primary/10"
      />
    ),
    size: 80,
    minSize: 56,
    maxSize: 88,
    meta: { headerLabel: 'Pending treatments' },
  }),
  columnHelper.accessor('health', {
    header: 'Health',
    cell: (info) => `${formatNumber(info.getValue() * 100, { maximumFractionDigits: 0 })}%`,
    meta: { headerLabel: 'Health' },
  }),
  columnHelper.accessor('stress', {
    header: 'Stress',
    cell: (info) => `${formatNumber(info.getValue() * 100, { maximumFractionDigits: 0 })}%`,
    filterFn: stressFilter,
    meta: { headerLabel: 'Stress' },
  }),
  columnHelper.accessor('yieldDryGrams', {
    header: () => <span title="Estimated dry harvest yield in grams">Est. yield</span>,
    cell: (info) =>
      `${formatNumber(info.getValue(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} g`,
    meta: { headerLabel: 'Estimated yield' },
  }),
];

export const ZoneView = ({ bridge }: { bridge: SimulationBridge }) => {
  const snapshot = useSimulationStore((state) => state.snapshot);
  const zoneSetpoints = useSimulationStore((state) => state.zoneSetpoints);
  const { selectedZoneId, selectedRoomId, selectedStructureId } = useNavigationStore((state) => ({
    selectedZoneId: state.selectedZoneId,
    selectedRoomId: state.selectedRoomId,
    selectedStructureId: state.selectedStructureId,
  }));
  const openModal = useUIStore((state) => state.openModal);
  const pushToast = useUIStore((state) => state.pushToast);

  const zone = snapshot?.zones.find((item) => item.id === selectedZoneId);
  const setpoints = zone ? zoneSetpoints[zone.id] : undefined;
  const environmentBadges = useMemo(() => {
    if (!zone) {
      return [];
    }
    return buildEnvironmentBadgeDescriptors(zone, setpoints);
  }, [zone, setpoints]);

  const methodName = zone?.cultivationMethodName ?? 'Not assigned';
  const containerName =
    zone?.cultivation?.container?.name ??
    zone?.cultivation?.container?.slug ??
    zone?.cultivation?.container?.type ??
    'Not configured';
  const substrateName =
    zone?.cultivation?.substrate?.name ??
    zone?.cultivation?.substrate?.slug ??
    zone?.cultivation?.substrate?.type ??
    'Not configured';

  const zoneIdForModal = zone?.id ?? null;

  const handleOpenChangeMethod = useCallback(() => {
    if (!zoneIdForModal) {
      return;
    }
    openModal({
      id: `change-method-${zoneIdForModal}`,
      type: 'changeZoneMethod',
      title: 'Change cultivation method',
      subtitle: 'Select a compatible method for this zone.',
      context: { zoneId: zoneIdForModal },
    });
  }, [openModal, zoneIdForModal]);

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showHarvestableOnly, setShowHarvestableOnly] = useState(false);
  const [pendingPlantActions, setPendingPlantActions] = useState<
    Record<string, 'harvest' | 'cull' | undefined>
  >({});
  const [lastActionStatus, setLastActionStatus] = useState<ActionStatus | null>(null);
  const [harvestAllBusy, setHarvestAllBusy] = useState(false);

  useEffect(() => {
    setColumnFilters([]);
    setSorting([]);
    setShowHarvestableOnly(false);
    setPendingPlantActions({});
    setHarvestAllBusy(false);
    setLastActionStatus(null);
  }, [zone?.id]);

  const stageOptions = useMemo(() => {
    if (!zone) {
      return [] as string[];
    }

    const uniqueStages = new Set<string>();
    for (const plant of zone.plants) {
      if (plant.stage) {
        uniqueStages.add(plant.stage);
      }
    }

    return Array.from(uniqueStages).sort((a, b) => a.localeCompare(b));
  }, [zone]);

  const handleColumnFilterChange = (columnId: string, value: string | undefined) => {
    setColumnFilters((previous) => {
      const withoutColumn = previous.filter((filter) => filter.id !== columnId);
      if (!value || value === 'all') {
        return withoutColumn;
      }
      return [...withoutColumn, { id: columnId, value }];
    });
  };

  const toggleFlagFilter = (columnId: 'hasDiseases' | 'hasPests') => {
    const isActive = columnFilters.some(
      (filter) => filter.id === columnId && filter.value === 'flagged',
    );
    handleColumnFilterChange(columnId, isActive ? 'all' : 'flagged');
  };

  const stageFilterValue =
    (columnFilters.find((filter) => filter.id === 'stage')?.value as string | undefined) ?? 'all';
  const stressFilterValue =
    (columnFilters.find((filter) => filter.id === 'stress')?.value as string | undefined) ?? 'all';
  const diseaseFilterActive = columnFilters.some(
    (filter) => filter.id === 'hasDiseases' && filter.value === 'flagged',
  );
  const pestFilterActive = columnFilters.some(
    (filter) => filter.id === 'hasPests' && filter.value === 'flagged',
  );

  const harvestablePlantIds = useMemo(() => {
    if (!zone) {
      return [] as string[];
    }
    return zone.plants.filter((plant) => plant.isHarvestable).map((plant) => plant.id);
  }, [zone]);

  const tableData = useMemo(() => {
    if (!zone) {
      return [] as PlantSnapshot[];
    }
    if (!showHarvestableOnly) {
      return zone.plants;
    }
    return zone.plants.filter((plant) => plant.isHarvestable);
  }, [zone, showHarvestableOnly]);
  const getPlantDetails = useCallback(
    (plantId: string): { plant: PlantSnapshot; zoneName: string } | null => {
      const snapshotState = useSimulationStore.getState().snapshot;
      if (!snapshotState) {
        return null;
      }
      for (const zoneSnapshot of snapshotState.zones) {
        const match = zoneSnapshot.plants.find((entry) => entry.id === plantId);
        if (match) {
          return { plant: match, zoneName: zoneSnapshot.name };
        }
      }
      return null;
    },
    [],
  );

  const handleHarvest = useCallback(
    async (plantId: string) => {
      if (!plantId) {
        return false;
      }
      setPendingPlantActions((previous) => ({ ...previous, [plantId]: 'harvest' }));
      try {
        const response = await bridge.plants.harvestPlant({ plantId });
        if (!response.ok) {
          const message =
            response.errors?.[0]?.message ??
            response.warnings?.[0] ??
            'Harvest command was rejected.';
          setLastActionStatus({ tone: 'error', message: `Harvest failed — ${message}` });
          pushToast({
            tone: 'error',
            title: 'Harvest failed',
            description: message,
          });
          return false;
        }
        const details = getPlantDetails(plantId);
        const label = details?.plant.strainName || details?.plant.id || plantId;
        const successMessage = label
          ? `Harvest command accepted — Queued harvest for ${label}.`
          : 'Harvest command accepted.';
        setLastActionStatus({ tone: 'success', message: successMessage });
        pushToast({
          tone: 'success',
          title: 'Harvest command accepted',
          description: label ? `Queued harvest for ${label}.` : undefined,
        });
        if (response.warnings?.length) {
          const warningMessage = response.warnings.join(' ');
          setLastActionStatus({
            tone: 'warning',
            message: `Harvest accepted with warnings — ${warningMessage}`,
          });
          pushToast({
            tone: 'warning',
            title: 'Harvest warnings',
            description: warningMessage,
            durationMs: 8000,
          });
        }
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Connection error while harvesting this plant.';
        setLastActionStatus({ tone: 'error', message: `Harvest failed — ${message}` });
        pushToast({
          tone: 'error',
          title: 'Harvest failed',
          description: message,
        });
        return false;
      } finally {
        setPendingPlantActions((previous) => {
          const next = { ...previous };
          delete next[plantId];
          return next;
        });
      }
    },
    [bridge.plants, getPlantDetails, pushToast],
  );

  const handleCull = useCallback(
    async (plantId: string) => {
      if (!plantId) {
        return false;
      }
      setPendingPlantActions((previous) => ({ ...previous, [plantId]: 'cull' }));
      try {
        const response = await bridge.plants.cullPlant({ plantId });
        if (!response.ok) {
          const message =
            response.errors?.[0]?.message ??
            response.warnings?.[0] ??
            'Trash command was rejected.';
          setLastActionStatus({ tone: 'error', message: `Trash failed — ${message}` });
          pushToast({
            tone: 'error',
            title: 'Trash failed',
            description: message,
          });
          return false;
        }
        const details = getPlantDetails(plantId);
        const label = details?.plant.strainName || details?.plant.id || plantId;
        const successMessage = label
          ? `Plant trashed — Removed ${label} from the zone.`
          : 'Plant trashed — Command accepted.';
        setLastActionStatus({ tone: 'success', message: successMessage });
        pushToast({
          tone: 'success',
          title: 'Plant trashed',
          description: label ? `Removed ${label} from the zone.` : undefined,
        });
        if (response.warnings?.length) {
          const warningMessage = response.warnings.join(' ');
          setLastActionStatus({
            tone: 'warning',
            message: `Trash accepted with warnings — ${warningMessage}`,
          });
          pushToast({
            tone: 'warning',
            title: 'Cull warnings',
            description: warningMessage,
            durationMs: 8000,
          });
        }
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Connection error while removing this plant.';
        setLastActionStatus({ tone: 'error', message: `Trash failed — ${message}` });
        pushToast({
          tone: 'error',
          title: 'Trash failed',
          description: message,
        });
        return false;
      } finally {
        setPendingPlantActions((previous) => {
          const next = { ...previous };
          delete next[plantId];
          return next;
        });
      }
    },
    [bridge.plants, getPlantDetails, pushToast],
  );

  const handleHarvestAll = useCallback(
    async (plantIds: string[]) => {
      if (!plantIds.length) {
        return false;
      }
      setHarvestAllBusy(true);
      const succeeded: string[] = [];
      const warnings = new Set<string>();
      const failures: { id: string; message: string }[] = [];
      try {
        for (const plantId of plantIds) {
          setPendingPlantActions((previous) => ({ ...previous, [plantId]: 'harvest' }));
          try {
            const response = await bridge.plants.harvestPlant({ plantId });
            if (!response.ok) {
              const message =
                response.errors?.[0]?.message ??
                response.warnings?.[0] ??
                'Harvest command was rejected.';
              failures.push({ id: plantId, message });
              continue;
            }
            succeeded.push(plantId);
            if (response.warnings?.length) {
              for (const warning of response.warnings) {
                warnings.add(warning);
              }
            }
          } catch (error) {
            failures.push({
              id: plantId,
              message:
                error instanceof Error
                  ? error.message
                  : 'Connection error while harvesting this plant.',
            });
          } finally {
            setPendingPlantActions((previous) => {
              const next = { ...previous };
              delete next[plantId];
              return next;
            });
          }
        }
      } finally {
        setHarvestAllBusy(false);
      }

      if (succeeded.length) {
        const quantityLabel = succeeded.length === 1 ? '1 plant' : `${succeeded.length} plants`;
        const description = `Queued harvest for ${quantityLabel}.`;
        setLastActionStatus({
          tone: 'success',
          message: `Harvest command accepted — ${description}`,
        });
        pushToast({
          tone: 'success',
          title: 'Harvest command accepted',
          description,
        });
      }
      if (warnings.size) {
        const warningMessage = Array.from(warnings).join(' ');
        setLastActionStatus({
          tone: 'warning',
          message: `Harvest accepted with warnings — ${warningMessage}`,
        });
        pushToast({
          tone: 'warning',
          title: 'Harvest warnings',
          description: warningMessage,
          durationMs: 8000,
        });
      }
      if (failures.length) {
        const summary = failures.slice(0, 3).map((entry) => {
          const details = getPlantDetails(entry.id);
          const label = details?.plant.strainName || entry.id;
          return `${label}: ${entry.message}`;
        });
        const summaryText = summary.join(' ');
        setLastActionStatus({
          tone: 'error',
          message: `Harvest failed — ${summaryText}`,
        });
        pushToast({
          tone: 'error',
          title: failures.length === 1 ? '1 harvest failed' : `${failures.length} harvests failed`,
          description: summaryText,
          durationMs: 8000,
        });
      }

      return failures.length === 0;
    },
    [bridge.plants, getPlantDetails, pushToast],
  );

  const tableColumns = useMemo(() => {
    const currentTick = snapshot?.tick ?? snapshot?.clock.tick ?? 0;
    const reentryRestrictedUntil = zone?.health.reentryRestrictedUntilTick;
    const preHarvestRestrictedUntil = zone?.health.preHarvestRestrictedUntilTick;
    const reentryRestricted =
      typeof reentryRestrictedUntil === 'number' && reentryRestrictedUntil > currentTick;
    const preHarvestRestricted =
      typeof preHarvestRestrictedUntil === 'number' && preHarvestRestrictedUntil > currentTick;
    const zoneRestricted = reentryRestricted || preHarvestRestricted;

    return [
      ...plantColumns,
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        meta: { headerLabel: 'Actions' },
        size: 220,
        minSize: 200,
        maxSize: 260,
        cell: (info) => {
          const plant = info.row.original;
          const pending = pendingPlantActions[plant.id];
          const harvestDisabled =
            !plant.isHarvestable || zoneRestricted || pending === 'cull' || harvestAllBusy;
          const cullDisabled = zoneRestricted || pending === 'harvest' || harvestAllBusy;
          const harvestTitle = !plant.isHarvestable
            ? 'This plant is not ready for harvest.'
            : zoneRestricted
              ? 'Zone safety restrictions prevent harvesting right now.'
              : undefined;
          const cullTitle = zoneRestricted
            ? 'Zone safety restrictions prevent culling right now.'
            : undefined;
          const plantLabel = plant.strainName ?? plant.strainId ?? plant.id;
          const harvestAriaLabel = `Harvest ${plantLabel}`;
          const cullAriaLabel = `Trash ${plantLabel}`;

          return (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                data-testid={`plant-action-harvest-${plant.id}`}
                icon={<Icon name="grass" size={16} />}
                aria-label={harvestAriaLabel}
                disabled={harvestDisabled}
                title={harvestTitle}
                onClick={() => {
                  const context: ConfirmPlantActionContext = {
                    action: 'harvest',
                    plantIds: [plant.id],
                    zoneId: zone?.id,
                    onConfirm: () => handleHarvest(plant.id),
                  };
                  openModal({
                    id: `confirm-harvest-${plant.id}`,
                    type: 'confirmPlantAction',
                    title: 'Confirm harvest',
                    context,
                  });
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                data-testid={`plant-action-cull-${plant.id}`}
                icon={<Icon name="delete" size={16} />}
                aria-label={cullAriaLabel}
                disabled={cullDisabled}
                title={cullTitle}
                onClick={() => {
                  const context: ConfirmPlantActionContext = {
                    action: 'cull',
                    plantIds: [plant.id],
                    zoneId: zone?.id,
                    onConfirm: () => handleCull(plant.id),
                  };
                  openModal({
                    id: `confirm-cull-${plant.id}`,
                    type: 'confirmPlantAction',
                    title: 'Confirm trash',
                    context,
                  });
                }}
              />
            </div>
          );
        },
      }),
    ];
  }, [
    handleCull,
    handleHarvest,
    harvestAllBusy,
    pendingPlantActions,
    snapshot?.clock.tick,
    snapshot?.tick,
    zone?.health,
  ]);

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    state: { columnFilters, sorting },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const shouldVirtualize = rows.length > 100;
  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? rows.length : 0,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 44,
    overscan: 8,
  });

  const totalPlantCount = zone?.plants.length ?? 0;
  const hasPlants = totalPlantCount > 0;
  const harvestableCount = harvestablePlantIds.length;
  const currentTick = snapshot?.tick ?? snapshot?.clock.tick ?? 0;
  const preHarvestRestricted = Boolean(
    zone?.health.preHarvestRestrictedUntilTick !== undefined &&
      zone.health.preHarvestRestrictedUntilTick !== null &&
      zone.health.preHarvestRestrictedUntilTick > currentTick,
  );
  const reentryRestricted = Boolean(
    zone?.health.reentryRestrictedUntilTick !== undefined &&
      zone.health.reentryRestrictedUntilTick !== null &&
      zone.health.reentryRestrictedUntilTick > currentTick,
  );
  const zoneRestricted = preHarvestRestricted || reentryRestricted;
  const stageSelectId = `zone-${zone?.id ?? 'unknown'}-stage-filter`;
  const stressSelectId = `zone-${zone?.id ?? 'unknown'}-stress-filter`;
  const harvestFilterActive = showHarvestableOnly;
  const harvestAllDisabled = harvestAllBusy || zoneRestricted || harvestableCount === 0;
  const harvestAllTitle = harvestAllBusy
    ? 'Harvest commands are currently running.'
    : zoneRestricted
      ? 'Zone safety restrictions prevent harvesting right now.'
      : harvestableCount === 0
        ? 'No harvestable plants available.'
        : null;

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const deviceGroups = useMemo(() => {
    if (!zone) {
      return [] as {
        id: string;
        label: string;
        kind: string;
        devices: DeviceSnapshot[];
        metrics: {
          deviceCount: number;
          averageRuntimeHours: number;
          averageCondition: number;
          statusLabel: string;
        };
      }[];
    }

    const formatLabel = (value: string) =>
      value.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

    const computeMetrics = (devices: DeviceSnapshot[]) => {
      if (!devices.length) {
        return {
          deviceCount: 0,
          averageRuntimeHours: 0,
          averageCondition: 0,
          statusLabel: '—',
        };
      }

      const totals = devices.reduce(
        (acc, device) => {
          acc.runtime += device.runtimeHours;
          acc.condition += device.maintenance.condition;
          const count = acc.statusCounts.get(device.status) ?? 0;
          acc.statusCounts.set(device.status, count + 1);
          return acc;
        },
        {
          runtime: 0,
          condition: 0,
          statusCounts: new Map<string, number>(),
        },
      );

      const averageRuntimeHours = totals.runtime / devices.length;
      const averageCondition = totals.condition / devices.length;
      const statusEntries = [...totals.statusCounts.entries()];
      const statusLabel = statusEntries.length === 1 ? formatLabel(statusEntries[0]![0]) : 'Mixed';

      return {
        deviceCount: devices.length,
        averageRuntimeHours,
        averageCondition,
        statusLabel,
      };
    };

    const devicesById = new Map(zone.devices.map((device) => [device.id, device]));
    const assignedDeviceIds = new Set<string>();
    const groups: {
      id: string;
      label: string;
      kind: string;
      devices: DeviceSnapshot[];
      metrics: {
        deviceCount: number;
        averageRuntimeHours: number;
        averageCondition: number;
        statusLabel: string;
      };
    }[] = [];

    for (const group of zone.deviceGroups ?? []) {
      const devices = group.deviceIds
        .map((deviceId) => devicesById.get(deviceId))
        .filter((device): device is DeviceSnapshot => Boolean(device));

      devices.forEach((device) => assignedDeviceIds.add(device.id));

      if (!devices.length) {
        continue;
      }

      groups.push({
        id: group.id,
        label: group.label ?? formatLabel(group.kind),
        kind: group.kind,
        devices,
        metrics: computeMetrics(devices),
      });
    }

    const ungroupedByKind = new Map<string, DeviceSnapshot[]>();
    for (const device of zone.devices) {
      if (assignedDeviceIds.has(device.id)) {
        continue;
      }
      const bucket = ungroupedByKind.get(device.kind);
      if (bucket) {
        bucket.push(device);
      } else {
        ungroupedByKind.set(device.kind, [device]);
      }
    }

    for (const [kind, devices] of ungroupedByKind.entries()) {
      if (!devices.length) {
        continue;
      }
      groups.push({
        id: `kind-${kind}`,
        label: formatLabel(kind),
        kind,
        devices,
        metrics: computeMetrics(devices),
      });
    }

    return groups;
  }, [zone]);

  useEffect(() => {
    setCollapsedGroups((previous) => {
      const nextEntries = deviceGroups.map(
        (group) =>
          [group.id, typeof previous[group.id] === 'boolean' ? previous[group.id]! : true] as const,
      );

      const next = Object.fromEntries(nextEntries) as Record<string, boolean>;

      if (Object.keys(previous).length !== nextEntries.length) {
        return next;
      }

      for (const [id, value] of nextEntries) {
        if (previous[id] !== value) {
          return next;
        }
      }

      return previous;
    });
  }, [deviceGroups]);

  if (!snapshot || !selectedZoneId || !selectedRoomId || !selectedStructureId || !zone) {
    return null;
  }

  const virtualRows = shouldVirtualize ? rowVirtualizer.getVirtualItems() : [];

  return (
    <div className="grid gap-6">
      <header
        className="grid gap-6 rounded-3xl border border-border/40 bg-surface-elevated/80 p-6"
        data-testid="zone-view-header"
      >
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-text-muted">Zone</span>
            <h2 className="text-2xl font-semibold text-text">{zone.name}</h2>
            <p className="text-sm text-text-muted">
              {formatNumber(zone.area)} m² · volume {formatNumber(zone.volume)} m³
            </p>
            <p className="text-sm text-text-muted">
              Method: {methodName} · Container: {containerName} · Substrate: {substrateName}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <EnvironmentBadgeRow badges={environmentBadges} className="md:justify-end" />
            <Button type="button" size="sm" variant="secondary" onClick={handleOpenChangeMethod}>
              Change method
            </Button>
          </div>
        </div>
        <div
          className="grid gap-4 md:grid-cols-2 md:items-start"
          data-testid="zone-header-grid-row"
        >
          <section
            className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-surface-muted/30 p-5 md:h-full"
            aria-labelledby="zone-resources-heading"
            data-testid="zone-resources-summary"
          >
            <div className="flex flex-col gap-1">
              <h3
                id="zone-resources-heading"
                className="text-sm font-semibold tracking-tight text-text"
              >
                Resources
              </h3>
            </div>
            <dl className="grid gap-3 text-sm text-text-muted">
              <div className="flex items-center justify-between">
                <dt>Water reserve</dt>
                <dd>
                  <Badge tone="default">{formatNumber(zone.resources.waterLiters)} L</Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Nutrient solution</dt>
                <dd>
                  <Badge tone="default">
                    {formatNumber(zone.resources.nutrientSolutionLiters)} L
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Nutrient strength</dt>
                <dd>
                  <Badge tone="default">
                    {formatNumber(zone.resources.nutrientStrength, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    EC
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Daily consumption</dt>
                <dd>
                  <Badge tone="default">
                    {formatNumber(zone.supplyStatus?.dailyWaterConsumptionLiters ?? 0)} L /{' '}
                    {formatNumber(zone.supplyStatus?.dailyNutrientConsumptionLiters ?? 0)} L
                  </Badge>
                </dd>
              </div>
            </dl>
          </section>
          <EnvironmentPanel
            zone={zone}
            setpoints={setpoints}
            bridge={bridge}
            defaultExpanded
            variant="embedded"
            renderBadges={() => null}
            className="md:h-full"
          />
        </div>
      </header>
      <section className="grid gap-6">
        <div
          className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1.15fr_0.85fr]"
          data-testid="zone-plants-devices-row"
        >
          <Card
            title="Plants"
            subtitle="Batch overview"
            action={
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Icon name="local_florist" />}
                  onClick={() =>
                    openModal({
                      id: `plant-${zone.id}`,
                      type: 'plantZone',
                      title: `Plant ${zone.name}`,
                      context: { zoneId: zone.id },
                    })
                  }
                >
                  Plant zone
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Icon name="agriculture" />}
                  data-testid="plant-harvest-all"
                  disabled={harvestAllDisabled}
                  title={harvestAllTitle ?? undefined}
                  onClick={() => {
                    const context: ConfirmPlantActionContext = {
                      action: 'harvest',
                      plantIds: harvestablePlantIds,
                      zoneId: zone?.id,
                      onConfirm: () => handleHarvestAll(harvestablePlantIds),
                    };
                    openModal({
                      id: `confirm-harvest-all-${zone?.id ?? 'unknown'}`,
                      type: 'confirmPlantAction',
                      title: 'Confirm harvest all',
                      context,
                    });
                  }}
                >
                  Harvest all
                </Button>
              </div>
            }
            data-testid="zone-plants-card"
          >
            {lastActionStatus ? (
              <div
                className={cx(
                  'mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm',
                  ACTION_STATUS_STYLES[lastActionStatus.tone].container,
                )}
                data-testid="zone-plants-action-status"
                role="status"
              >
                <Icon
                  name={ACTION_STATUS_STYLES[lastActionStatus.tone].iconName}
                  size={18}
                  className={ACTION_STATUS_STYLES[lastActionStatus.tone].icon}
                />
                <span className="text-sm font-medium">{lastActionStatus.message}</span>
              </div>
            ) : null}
            <div
              className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border/30 bg-surface-muted/60 px-4 py-3"
              data-testid="zone-plants-filters"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Filters
              </span>
              <label
                htmlFor={stageSelectId}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                Stage
                <select
                  id={stageSelectId}
                  data-testid="plant-filter-stage"
                  className="rounded-lg border border-border/30 bg-surface-elevated px-2 py-1 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                  value={stageFilterValue}
                  onChange={(event) => handleColumnFilterChange('stage', event.target.value)}
                  disabled={!hasPlants || stageOptions.length === 0}
                >
                  <option value="all">All stages</option>
                  {stageOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label
                htmlFor={stressSelectId}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                Stress
                <select
                  id={stressSelectId}
                  data-testid="plant-filter-stress"
                  className="rounded-lg border border-border/30 bg-surface-elevated px-2 py-1 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                  value={stressFilterValue}
                  onChange={(event) => handleColumnFilterChange('stress', event.target.value)}
                  disabled={!hasPlants}
                >
                  {STRESS_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                data-testid="plant-filter-harvestable"
                icon={<Icon name="agriculture" size={16} />}
                className={cx(
                  'border border-border/30 text-xs font-semibold uppercase tracking-wide text-text-muted hover:text-text',
                  harvestFilterActive && 'border-primary/40 bg-primary/10 text-primary',
                )}
                aria-pressed={harvestFilterActive}
                onClick={() => setShowHarvestableOnly((value) => !value)}
                disabled={!hasPlants}
              >
                Harvestable only
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                data-testid="plant-filter-diseases"
                icon={<Icon name="coronavirus" size={16} />}
                className={cx(
                  'border border-border/30 text-xs font-semibold uppercase tracking-wide text-text-muted hover:text-text',
                  diseaseFilterActive && 'border-danger/40 bg-danger/10 text-danger',
                )}
                aria-pressed={diseaseFilterActive}
                onClick={() => toggleFlagFilter('hasDiseases')}
                disabled={!hasPlants}
              >
                Diseased plants only
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                data-testid="plant-filter-pests"
                icon={<Icon name="bug_report" size={16} />}
                className={cx(
                  'border border-border/30 text-xs font-semibold uppercase tracking-wide text-text-muted hover:text-text',
                  pestFilterActive && 'border-warning/40 bg-warning/10 text-warning',
                )}
                aria-pressed={pestFilterActive}
                onClick={() => toggleFlagFilter('hasPests')}
                disabled={!hasPlants}
              >
                Pest-affected plants only
              </Button>
            </div>
            <div
              ref={tableContainerRef}
              className="max-h-96 overflow-auto rounded-2xl border border-border/30"
            >
              <table className="min-w-[820px] divide-y divide-border/30 text-sm">
                <thead className="sticky top-0 z-10 bg-surface-muted/80 text-xs uppercase tracking-wide text-text-muted">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        if (header.isPlaceholder) {
                          return <th key={header.id} className="px-4 py-3 text-left" />;
                        }

                        const canSort = header.column.getCanSort();
                        const sortState = header.column.getIsSorted();
                        const ariaSort = canSort
                          ? sortState === 'asc'
                            ? 'ascending'
                            : sortState === 'desc'
                              ? 'descending'
                              : 'none'
                          : undefined;
                        const headerLabel =
                          header.column.columnDef.meta?.headerLabel ?? header.column.id;

                        return (
                          <th key={header.id} className="px-4 py-3 text-left" aria-sort={ariaSort}>
                            {canSort ? (
                              <button
                                type="button"
                                data-testid={`plant-table-sort-${header.column.id}`}
                                onClick={header.column.getToggleSortingHandler()}
                                className={cx(
                                  'flex items-center gap-2 text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                                  sortState ? 'text-text' : 'text-text-muted',
                                )}
                                aria-label={`Sort by ${headerLabel}`}
                              >
                                <span className="whitespace-nowrap">
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                </span>
                                <Icon
                                  name={
                                    sortState === 'asc'
                                      ? 'arrow_upward'
                                      : sortState === 'desc'
                                        ? 'arrow_downward'
                                        : 'unfold_more'
                                  }
                                  size={16}
                                  className={cx(
                                    'transition-colors',
                                    sortState ? 'text-text' : 'text-text-muted',
                                  )}
                                />
                              </button>
                            ) : (
                              flexRender(header.column.columnDef.header, header.getContext())
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody
                  className="relative bg-surface-elevated/40"
                  style={
                    shouldVirtualize ? { height: `${rowVirtualizer.getTotalSize()}px` } : undefined
                  }
                >
                  {shouldVirtualize
                    ? virtualRows.map((virtualRow) => {
                        const row = rows[virtualRow.index];
                        return (
                          <tr
                            key={row.id}
                            data-plant-id={row.original.id}
                            className="divide-x divide-border/10"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td key={cell.id} className="px-4 py-3">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        );
                      })
                    : rows.map((row) => (
                        <tr
                          key={row.id}
                          data-plant-id={row.original.id}
                          className="divide-x divide-border/10"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-4 py-3">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
            {zone.plants.length === 0 ? (
              <p className="mt-3 text-sm text-text-muted">
                No plants assigned to this zone yet. Use "Plant zone" to schedule a new batch.
              </p>
            ) : null}
          </Card>
          <Card
            title="Devices"
            subtitle="Operations & maintenance"
            action={
              <Button
                size="sm"
                variant="secondary"
                icon={<Icon name="precision_manufacturing" />}
                onClick={() =>
                  openModal({
                    id: `install-${zone.id}`,
                    type: 'installDevice',
                    title: `Install device in ${zone.name}`,
                    context: { zoneId: zone.id },
                  })
                }
              >
                Install device
              </Button>
            }
          >
            <div className="grid gap-3">
              {deviceGroups.map((group) => {
                const isCollapsed = collapsedGroups[group.id] ?? true;
                const contentId = `device-group-${group.id}`;
                return (
                  <div
                    key={group.id}
                    data-testid="zone-device-group"
                    className="rounded-2xl border border-border/40 bg-surface-muted/40 p-4"
                  >
                    <button
                      type="button"
                      className="flex w-full flex-col gap-3 border-border/40 pb-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 md:flex-row md:items-start md:justify-between md:gap-4 md:border-b"
                      data-testid="device-group-header"
                      aria-expanded={!isCollapsed}
                      aria-controls={!isCollapsed ? contentId : undefined}
                      onClick={() =>
                        setCollapsedGroups((previous) => ({
                          ...previous,
                          [group.id]: !isCollapsed,
                        }))
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          name={isCollapsed ? 'chevron_right' : 'expand_more'}
                          className="rounded-full bg-surface/50 p-1 text-text-muted"
                          size={20}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs uppercase tracking-wide text-text-muted">
                            {group.kind}
                          </span>
                          <span className="text-sm font-semibold text-text">{group.label}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-muted">
                        <span>
                          <span className="font-semibold text-text">
                            {group.metrics.deviceCount}
                          </span>{' '}
                          devices
                        </span>
                        <span>
                          Avg runtime{' '}
                          <span className="font-semibold text-text">
                            {formatNumber(group.metrics.averageRuntimeHours, {
                              maximumFractionDigits: 0,
                            })}
                          </span>{' '}
                          h
                        </span>
                        <span>
                          Avg condition{' '}
                          <span className="font-semibold text-text">
                            {formatNumber(group.metrics.averageCondition * 100, {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                          %
                        </span>
                        <span>
                          Status{' '}
                          <span className="font-semibold text-text">
                            {group.metrics.statusLabel}
                          </span>
                        </span>
                      </div>
                    </button>
                    {!isCollapsed ? (
                      <div
                        id={contentId}
                        data-testid="device-group-devices"
                        className="mt-3 grid gap-3"
                      >
                        {group.devices.map((device) => (
                          <div
                            key={device.id}
                            className="flex items-center justify-between rounded-xl border border-border/40 bg-surface/40 px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <Icon name="precision_manufacturing" />
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-text">
                                  {device.name}
                                </span>
                                <span className="text-xs text-text-muted">
                                  Runtime{' '}
                                  {formatNumber(device.runtimeHours, { maximumFractionDigits: 0 })}{' '}
                                  h · Condition{' '}
                                  {formatNumber(device.maintenance.condition * 100, {
                                    maximumFractionDigits: 0,
                                  })}
                                  %
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={<Icon name="drive_file_move" />}
                                onClick={() =>
                                  openModal({
                                    id: `move-device-${device.id}`,
                                    type: 'moveDevice',
                                    title: `Move ${device.name}`,
                                    subtitle: 'Relocate the device to a different zone.',
                                    context: { zoneId: zone.id, deviceId: device.id },
                                  })
                                }
                              >
                                Move
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                icon={<Icon name="delete" />}
                                onClick={() =>
                                  openModal({
                                    id: `remove-device-${device.id}`,
                                    type: 'removeDevice',
                                    title: `Delete ${device.name}`,
                                    subtitle: 'Remove the device from this zone.',
                                    context: { zoneId: zone.id, deviceId: device.id },
                                  })
                                }
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};
