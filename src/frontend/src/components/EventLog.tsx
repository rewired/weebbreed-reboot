import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { useAppStore } from '@/store';
import type { SimulationEvent } from '@/types/simulation';
import styles from './EventLog.module.css';

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) {
    return '—';
  }

  return new Date(timestamp).toLocaleTimeString();
};

const severityToClass: Record<NonNullable<SimulationEvent['severity']>, string> = {
  debug: styles.debug,
  info: styles.info,
  warning: styles.warning,
  error: styles.error,
};

export const EventLog = () => {
  const { t } = useTranslation('simulation');
  const events = useAppStore((state) => state.events);

  const columns = useMemo<ColumnDef<SimulationEvent, unknown>[]>(
    () => [
      {
        accessorKey: 'severity',
        header: t('events.columns.severity'),
        cell: (info) => {
          const severity = info.getValue<SimulationEvent['severity']>() ?? 'info';
          return (
            <span className={`${styles.severity} ${severityToClass[severity]}`}>
              {t(`events.severity.${severity}`)}
            </span>
          );
        },
      },
      {
        accessorKey: 'type',
        header: t('events.columns.type'),
        cell: (info) => <span className={styles.typeCell}>{info.getValue<string>()}</span>,
      },
      {
        accessorKey: 'message',
        header: t('events.columns.message'),
        cell: (info) => {
          const message = info.getValue<string | undefined>();
          return message ? (
            <span className={styles.message}>{message}</span>
          ) : (
            <span className={styles.placeholder}>—</span>
          );
        },
      },
      {
        accessorKey: 'tick',
        header: t('events.columns.tick'),
        cell: (info) => {
          const value = info.getValue<number | undefined>();
          return value !== undefined ? `#${value.toLocaleString()}` : '—';
        },
      },
      {
        accessorKey: 'ts',
        header: t('events.columns.timestamp'),
        cell: (info) => formatTimestamp(info.getValue<number | undefined>()),
      },
    ],
    [t],
  );

  const table = useReactTable({
    data: [...events].reverse(),
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <h2>{t('labels.eventLog')}</h2>
        <span className={styles.count}>{t('labels.totalEvents', { count: events.length })}</span>
      </header>
      {events.length === 0 ? (
        <p className={styles.empty}>{t('events.empty')}</p>
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
