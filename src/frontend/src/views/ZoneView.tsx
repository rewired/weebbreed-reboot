import { useMemo, useRef } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/primitives/Badge';
import { useSimulationStore } from '@/store/simulation';
import { useNavigationStore } from '@/store/navigation';
import { useUIStore } from '@/store/ui';
import type { DeviceSnapshot, PlantSnapshot } from '@/types/simulation';
import type { ZoneHistoryPoint } from '@/store/simulation';
import { formatNumber } from '@/utils/formatNumber';
import type { SimulationBridge } from '@/facade/systemFacade';
import { EnvironmentPanel } from '@/components/zone/EnvironmentPanel';
import { EnvironmentBadgeRow } from '@/components/zone/EnvironmentBadgeRow';
import { buildEnvironmentBadgeDescriptors } from '@/components/zone/environmentBadges';

const columnHelper = createColumnHelper<PlantSnapshot>();

const plantColumns = [
  columnHelper.accessor('id', {
    header: 'Plant ID',
    cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
  }),
  columnHelper.accessor('strainId', {
    header: 'Strain',
  }),
  columnHelper.accessor('stage', {
    header: 'Stage',
    cell: (info) => <Badge tone="default">{info.getValue()}</Badge>,
  }),
  columnHelper.accessor('health', {
    header: 'Health',
    cell: (info) => `${formatNumber(info.getValue() * 100, { maximumFractionDigits: 0 })}%`,
  }),
  columnHelper.accessor('stress', {
    header: 'Stress',
    cell: (info) => `${formatNumber(info.getValue() * 100, { maximumFractionDigits: 0 })}%`,
  }),
  columnHelper.accessor('biomassDryGrams', {
    header: 'Biomass (g)',
    cell: (info) =>
      formatNumber(info.getValue(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  }),
];

export const ZoneView = ({ bridge }: { bridge: SimulationBridge }) => {
  const snapshot = useSimulationStore((state) => state.snapshot);
  const zoneHistoryMap = useSimulationStore((state) => state.zoneHistory);
  const zoneSetpoints = useSimulationStore((state) => state.zoneSetpoints);
  const { selectedZoneId, selectedRoomId, selectedStructureId } = useNavigationStore((state) => ({
    selectedZoneId: state.selectedZoneId,
    selectedRoomId: state.selectedRoomId,
    selectedStructureId: state.selectedStructureId,
  }));
  const openModal = useUIStore((state) => state.openModal);

  const zone = snapshot?.zones.find((item) => item.id === selectedZoneId);
  const setpoints = zone ? zoneSetpoints[zone.id] : undefined;
  const environmentBadges = useMemo(() => {
    if (!zone) {
      return [];
    }
    return buildEnvironmentBadgeDescriptors(zone, setpoints);
  }, [zone, setpoints]);

  const table = useReactTable({
    data: zone?.plants ?? [],
    columns: plantColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const history = useMemo(() => {
    if (!zone) {
      return [] as ZoneHistoryPoint[];
    }
    return zoneHistoryMap[zone.id] ?? [];
  }, [zone, zoneHistoryMap]);

  const aggregateHistory = useMemo(() => {
    if (!history.length) {
      return [] as {
        tick: number;
        temperature: number;
        humidity: number;
        ppfd: number;
        vpd: number;
      }[];
    }
    const MAX_POINTS = 5000;
    if (history.length <= MAX_POINTS) {
      return history.map((point) => ({
        tick: point.tick,
        temperature: point.temperature,
        humidity: point.relativeHumidity * 100,
        ppfd: point.ppfd,
        vpd: point.vpd,
      }));
    }
    const bucketSize = Math.ceil(history.length / MAX_POINTS);
    const aggregated: {
      tick: number;
      temperature: number;
      humidity: number;
      ppfd: number;
      vpd: number;
    }[] = [];
    for (let index = 0; index < history.length; index += bucketSize) {
      const slice = history.slice(index, index + bucketSize);
      if (!slice.length) {
        continue;
      }
      const totals = slice.reduce(
        (acc, point) => {
          acc.temperature += point.temperature;
          acc.humidity += point.relativeHumidity;
          acc.ppfd += point.ppfd;
          acc.vpd += point.vpd;
          return acc;
        },
        { temperature: 0, humidity: 0, ppfd: 0, vpd: 0 },
      );
      const count = slice.length;
      const midpoint = slice[Math.floor(count / 2)];
      aggregated.push({
        tick: midpoint.tick,
        temperature: totals.temperature / count,
        humidity: (totals.humidity / count) * 100,
        ppfd: totals.ppfd / count,
        vpd: totals.vpd / count,
      });
    }
    return aggregated;
  }, [history]);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const plantRowCount = zone?.plants.length ?? 0;
  const shouldVirtualize = plantRowCount > 100;
  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? plantRowCount : 0,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 44,
    overscan: 8,
  });

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

  if (!snapshot || !selectedZoneId || !selectedRoomId || !selectedStructureId || !zone) {
    return null;
  }

  const chartData = aggregateHistory.length
    ? aggregateHistory
    : [
        {
          tick: snapshot.clock.tick,
          temperature: zone.environment.temperature,
          humidity: zone.environment.relativeHumidity * 100,
          ppfd: zone.environment.ppfd,
          vpd: zone.environment.vpd,
        },
      ];

  const rows = table.getRowModel().rows;
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
              {formatNumber(zone.area)} m² · volume {formatNumber(zone.volume)} m³ · cultivation
              method {zone.cultivationMethodId ?? '—'}
            </p>
          </div>
          <EnvironmentBadgeRow badges={environmentBadges} className="md:justify-end" />
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
              <span className="text-xs text-text-muted">Reservoirs &amp; supplies</span>
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
        <Card title="Environment" subtitle="Telemetry snapshot vs. historical trend">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-1 text-sm text-text-muted">
              <span className="text-xs uppercase text-text-muted">Temperature</span>
              <span className="text-lg font-semibold text-text">
                {formatNumber(zone.environment.temperature, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
                °C
              </span>
            </div>
            <div className="flex flex-col gap-1 text-sm text-text-muted">
              <span className="text-xs uppercase text-text-muted">Relative Humidity</span>
              <span className="text-lg font-semibold text-text">
                {formatNumber(zone.environment.relativeHumidity * 100, {
                  maximumFractionDigits: 0,
                })}
                %
              </span>
            </div>
            <div className="flex flex-col gap-1 text-sm text-text-muted">
              <span className="text-xs uppercase text-text-muted">Transpiration</span>
              <span className="text-lg font-semibold text-text">
                {formatNumber(zone.resources.lastTranspirationLiters)} L
              </span>
            </div>
            <div className="flex flex-col gap-1 text-sm text-text-muted">
              <span className="text-xs uppercase text-text-muted">Stress</span>
              <span className="text-lg font-semibold text-text">
                {formatNumber(zone.metrics.stressLevel * 100, { maximumFractionDigits: 0 })}%
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="tick" stroke="rgba(148, 163, 184, 0.6)" fontSize={12} />
                <YAxis yAxisId="left" stroke="rgba(148, 163, 184, 0.6)" fontSize={12} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="rgba(148, 163, 184, 0.4)"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    borderRadius: 12,
                    border: '1px solid rgba(148,163,184,0.2)',
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperature"
                  stroke="rgb(132,204,22)"
                  strokeWidth={2}
                  dot={false}
                  name="Temp °C"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="humidity"
                  stroke="rgb(14,165,233)"
                  strokeWidth={2}
                  dot={false}
                  name="RH %"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ppfd"
                  stroke="rgb(251,191,36)"
                  strokeWidth={2}
                  dot={false}
                  name="PPFD"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="vpd"
                  stroke="rgb(248,113,113)"
                  strokeWidth={2}
                  dot={false}
                  name="VPD"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <div
          className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1.15fr_0.85fr]"
          data-testid="zone-plants-devices-row"
        >
          <Card
            title="Plants"
            subtitle="Batch overview"
            action={
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
            }
            data-testid="zone-plants-card"
          >
            <div
              ref={tableContainerRef}
              className="max-h-96 overflow-y-auto rounded-2xl border border-border/30"
            >
              <table className="min-w-full divide-y divide-border/30 text-sm">
                <thead className="sticky top-0 z-10 bg-surface-muted/80 text-xs uppercase tracking-wide text-text-muted">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="px-4 py-3 text-left">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
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
                        <tr key={row.id} className="divide-x divide-border/10">
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
            <div
              className="mt-4 grid gap-3 rounded-2xl border border-border/30 bg-surface-muted/40 p-4"
              data-testid="zone-health-summary"
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wide text-text-muted">Health</span>
                  <span className="text-sm font-semibold text-text">
                    Disease &amp; treatment overview
                  </span>
                </div>
              </div>
              <div className="grid gap-2 text-sm text-text-muted">
                <div className="flex items-center justify-between">
                  <span>Diseases</span>
                  <Badge tone={zone.health.diseases ? 'warning' : 'success'}>
                    {zone.health.diseases}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pests</span>
                  <Badge tone={zone.health.pests ? 'warning' : 'success'}>
                    {zone.health.pests}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pending treatments</span>
                  <Badge tone={zone.health.pendingTreatments ? 'warning' : 'default'}>
                    {zone.health.pendingTreatments}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Applied treatments</span>
                  <Badge tone="default">{zone.health.appliedTreatments}</Badge>
                </div>
              </div>
            </div>
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
              {deviceGroups.map((group) => (
                <div
                  key={group.id}
                  data-testid="zone-device-group"
                  className="rounded-2xl border border-border/40 bg-surface-muted/40 p-4"
                >
                  <div
                    className="flex flex-col gap-3 border-border/40 pb-3 md:flex-row md:items-start md:justify-between md:gap-4 md:border-b"
                    data-testid="device-group-header"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wide text-text-muted">
                        {group.kind}
                      </span>
                      <span className="text-sm font-semibold text-text">{group.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-muted">
                      <span>
                        <span className="font-semibold text-text">{group.metrics.deviceCount}</span>{' '}
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
                        <span className="font-semibold text-text">{group.metrics.statusLabel}</span>
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3">
                    {group.devices.map((device) => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between rounded-xl border border-border/40 bg-surface/40 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <Icon name="precision_manufacturing" />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-text">{device.name}</span>
                            <span className="text-xs text-text-muted">
                              Runtime{' '}
                              {formatNumber(device.runtimeHours, { maximumFractionDigits: 0 })} h ·
                              Condition{' '}
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
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};
