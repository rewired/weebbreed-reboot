import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type { EventRow } from '../store/simulationStore';

interface EventLogProps {
  events: EventRow[];
}

const columnHelper = createColumnHelper<EventRow>();

export const EventLog = ({ events }: EventLogProps) => {
  const { t } = useTranslation();

  const columns = useMemo(
    () => [
      columnHelper.accessor('ts', {
        header: t('table.event.time'),
        cell: (info) => new Date(info.getValue()).toLocaleTimeString()
      }),
      columnHelper.accessor('type', {
        header: t('table.event.type')
      }),
      columnHelper.accessor('details', {
        header: t('table.event.details'),
        cell: (info) => info.getValue()
      })
    ],
    [t]
  );

  const table = useReactTable({
    data: events,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="table table--events">
      <h3>{t('metrics.events')}</h3>
      <table>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
