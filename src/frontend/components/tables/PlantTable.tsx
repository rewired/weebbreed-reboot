import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef
} from '@tanstack/react-table';
import type { ZoneState } from '../../../shared/domain.js';

interface PlantTableProps {
  zones: ZoneState[];
}

interface PlantRow {
  plantId: string;
  zone: string;
  stage: string;
  biomass: number;
  health: number;
  stress: number;
}

export function PlantTable({ zones }: PlantTableProps): JSX.Element {
  const { t } = useTranslation();
  const data = useMemo<PlantRow[]>(
    () =>
      zones.flatMap((zone) =>
        zone.plants.map((plant) => ({
          plantId: plant.id,
          zone: zone.name,
          stage: plant.stage,
          biomass: Number(plant.biomassDryGrams.toFixed(2)),
          health: Number((plant.health * 100).toFixed(1)),
          stress: Number((plant.stress * 100).toFixed(1))
        }))
      ),
    [zones]
  );

  const columns = useMemo<ColumnDef<PlantRow>[]>(
    () => [
      { header: t('table.plantId'), accessorKey: 'plantId' },
      { header: 'Zone', accessorKey: 'zone' },
      { header: t('table.stage'), accessorKey: 'stage' },
      { header: t('table.biomass'), accessorKey: 'biomass' },
      { header: t('table.health'), accessorKey: 'health' },
      { header: t('table.stress'), accessorKey: 'stress' }
    ],
    [t]
  );

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id} style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #1e293b' }}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} style={{ padding: '0.5rem', borderBottom: '1px solid #1e293b' }}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
