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
import type { PlantSnapshot } from '@/types/simulation';
import type { ZoneHistoryPoint } from '@/store/simulation';

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
    cell: (info) => `${Math.round(info.getValue() * 100)}%`,
  }),
  columnHelper.accessor('stress', {
    header: 'Stress',
    cell: (info) => `${Math.round(info.getValue() * 100)}%`,
  }),
  columnHelper.accessor('biomassDryGrams', {
    header: 'Biomass (g)',
    cell: (info) => info.getValue().toFixed(1),
  }),
];

export const ZoneView = () => {
  const snapshot = useSimulationStore((state) => state.snapshot);
  const zoneHistoryMap = useSimulationStore((state) => state.zoneHistory);
  const { selectedZoneId, selectedRoomId, selectedStructureId } = useNavigationStore((state) => ({
    selectedZoneId: state.selectedZoneId,
    selectedRoomId: state.selectedRoomId,
    selectedStructureId: state.selectedStructureId,
  }));
  const openModal = useUIStore((state) => state.openModal);

  const zone = snapshot?.zones.find((item) => item.id === selectedZoneId);

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
      <header className="flex flex-col gap-2 rounded-3xl border border-border/40 bg-surface-elevated/80 p-6">
        <span className="text-xs uppercase tracking-wide text-text-muted">Zone</span>
        <h2 className="text-2xl font-semibold text-text">{zone.name}</h2>
        <p className="text-sm text-text-muted">
          {zone.area} m² · volume {zone.volume} m³ · cultivation method{' '}
          {zone.cultivationMethodId ?? '—'}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge tone="success">VPD {zone.environment.vpd.toFixed(2)}</Badge>
          <Badge tone="default">PPFD {zone.environment.ppfd} µmol</Badge>
          <Badge tone="default">CO₂ {zone.environment.co2} ppm</Badge>
        </div>
      </header>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="grid gap-6">
          <Card title="Environment" subtitle="Telemetry snapshot vs. historical trend">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex flex-col gap-1 text-sm text-text-muted">
                <span className="text-xs uppercase text-text-muted">Temperature</span>
                <span className="text-lg font-semibold text-text">
                  {zone.environment.temperature.toFixed(1)}°C
                </span>
              </div>
              <div className="flex flex-col gap-1 text-sm text-text-muted">
                <span className="text-xs uppercase text-text-muted">Relative Humidity</span>
                <span className="text-lg font-semibold text-text">
                  {(zone.environment.relativeHumidity * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex flex-col gap-1 text-sm text-text-muted">
                <span className="text-xs uppercase text-text-muted">Transpiration</span>
                <span className="text-lg font-semibold text-text">
                  {zone.resources.lastTranspirationLiters} L
                </span>
              </div>
              <div className="flex flex-col gap-1 text-sm text-text-muted">
                <span className="text-xs uppercase text-text-muted">Stress</span>
                <span className="text-lg font-semibold text-text">
                  {Math.round(zone.metrics.stressLevel * 100)}%
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
          <Card title="Devices" subtitle="Operations & maintenance">
            <div className="grid gap-3">
              {zone.devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between rounded-xl border border-border/40 bg-surface-muted/40 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Icon name="precision_manufacturing" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-text">{device.name}</span>
                      <span className="text-xs text-text-muted">
                        Runtime {device.runtimeHours} h · Condition{' '}
                        {Math.round(device.maintenance.condition * 100)}%
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Icon name="tune" />}
                    onClick={() =>
                      openModal({
                        id: `device-${device.id}`,
                        type: 'duplicateRoom',
                        title: `Tune ${device.name}`,
                        subtitle: 'Dispatch devices.adjustSettings intent',
                      })
                    }
                  >
                    Adjust
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </section>
        <section className="grid gap-6">
          <Card title="Resources" subtitle="Reservoirs & supplies">
            <div className="grid gap-3 text-sm text-text-muted">
              <div className="flex items-center justify-between">
                <span>Water reserve</span>
                <Badge tone="default">{zone.resources.waterLiters.toLocaleString()} L</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Nutrient solution</span>
                <Badge tone="default">
                  {zone.resources.nutrientSolutionLiters.toLocaleString()} L
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Nutrient strength</span>
                <Badge tone="default">{zone.resources.nutrientStrength.toFixed(2)} EC</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Daily consumption</span>
                <Badge tone="default">
                  {zone.supplyStatus?.dailyWaterConsumptionLiters ?? 0} L /{' '}
                  {zone.supplyStatus?.dailyNutrientConsumptionLiters ?? 0} L
                </Badge>
              </div>
            </div>
          </Card>
          <Card title="Plants" subtitle="Batch overview">
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
              <p className="mt-3 text-sm text-text-muted">No plants assigned to this zone yet.</p>
            ) : null}
          </Card>
          <Card title="Health" subtitle="Disease & treatment overview">
            <div className="grid gap-2 text-sm text-text-muted">
              <div className="flex items-center justify-between">
                <span>Diseases</span>
                <Badge tone={zone.health.diseases ? 'warning' : 'success'}>
                  {zone.health.diseases}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Pests</span>
                <Badge tone={zone.health.pests ? 'warning' : 'success'}>{zone.health.pests}</Badge>
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
          </Card>
        </section>
      </div>
    </div>
  );
};
