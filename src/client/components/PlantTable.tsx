import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type { PlantRow } from '../store/simulationStore';

interface PlantTableProps {
  plants: PlantRow[];
}

const columnHelper = createColumnHelper<PlantRow>();

export const PlantTable = ({ plants }: PlantTableProps) => {
  const { t } = useTranslation();

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: t('table.plant.id')
      }),
      columnHelper.accessor('stage', {
        header: t('table.plant.stage')
      }),
      columnHelper.accessor('biomass', {
        header: t('table.plant.biomass'),
        cell: (info) => info.getValue().toFixed(2)
      }),
      columnHelper.accessor('health', {
        header: t('table.plant.health'),
        cell: (info) => (info.getValue() * 100).toFixed(1)
      }),
      columnHelper.accessor('stress', {
        header: t('table.plant.stress'),
        cell: (info) => (info.getValue() * 100).toFixed(1)
      })
    ],
    [t]
  );

  const table = useReactTable({
    data: plants,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="table">
      <h3>{t('metrics.plants')}</h3>
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
