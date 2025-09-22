import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { useAppStore } from '../store';
import styles from './TelemetryTable.module.css';

interface TelemetryRow {
  zoneId: string;
  temperature: number;
  humidity: number;
  co2: number;
  ppfd: number;
  vpd?: number;
}

export const TelemetryTable = () => {
  const { t } = useTranslation('simulation');
  const zones = useAppStore((state) => state.zones);

  const data = useMemo<TelemetryRow[]>(
    () =>
      Object.values(zones).map((zone) => ({
        zoneId: zone.zoneId,
        temperature: zone.temperature,
        humidity: zone.humidity,
        co2: zone.co2,
        ppfd: zone.ppfd,
        vpd: zone.vpd,
      })),
    [zones],
  );

  const columns = useMemo<ColumnDef<TelemetryRow, unknown>[]>(
    () => [
      {
        accessorKey: 'zoneId',
        header: t('telemetry.columns.zone'),
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: 'temperature',
        header: t('telemetry.columns.temperature'),
        cell: (info) => `${info.getValue<number>().toFixed(1)} °C`,
      },
      {
        accessorKey: 'humidity',
        header: t('telemetry.columns.humidity'),
        cell: (info) => `${(info.getValue<number>() * 100).toFixed(0)}%`,
      },
      {
        accessorKey: 'co2',
        header: t('telemetry.columns.co2'),
        cell: (info) => `${info.getValue<number>().toLocaleString()} ppm`,
      },
      {
        accessorKey: 'ppfd',
        header: t('telemetry.columns.ppfd'),
        cell: (info) => `${info.getValue<number>().toFixed(0)} µmol·m⁻²·s⁻¹`,
      },
      {
        accessorKey: 'vpd',
        header: t('telemetry.columns.vpd'),
        cell: (info) => {
          const value = info.getValue<number | undefined>();
          return typeof value === 'number' ? `${value.toFixed(2)} kPa` : '—';
        },
      },
    ],
    [t],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className={styles.tableCard}>
      <header className={styles.header}>
        <h2>{t('telemetry.title')}</h2>
        <span className={styles.caption}>{t('telemetry.totalZones', { count: data.length })}</span>
      </header>
      {data.length === 0 ? (
        <p className={styles.placeholder}>{t('telemetry.empty')}</p>
      ) : (
        <div className={styles.tableContainer} role="region" aria-live="polite">
          <table>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} scope="col">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
