import Card from '@/components/Card';
import type { StructureSnapshot } from '@/types/simulation';

type StructureSummaryCardProps = {
  structure: StructureSnapshot;
  roomCount: number;
  zoneCount: number;
  plantCount?: number;
  averageTemperature?: number;
  averageHumidity?: number;
  averageCo2?: number;
  averagePpfd?: number;
  averageStress?: number;
  averageLightingCoverage?: number;
  isSelected?: boolean;
  onSelect?: (structureId: string) => void;
  className?: string;
};

const decimalFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

const percentageFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
});

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const STATUS_LABEL: Record<StructureSnapshot['status'], string> = {
  active: 'Active',
  underConstruction: 'Under construction',
  decommissioned: 'Decommissioned',
};

const StructureSummaryCard = ({
  structure,
  roomCount,
  zoneCount,
  plantCount = 0,
  averageTemperature,
  averageHumidity,
  averageCo2,
  averagePpfd,
  averageStress,
  averageLightingCoverage,
  isSelected = false,
  onSelect,
  className,
}: StructureSummaryCardProps) => {
  const metadata = [
    { label: 'Footprint area', value: `${decimalFormatter.format(structure.footprint.area)} m²` },
    {
      label: 'Footprint volume',
      value: `${decimalFormatter.format(structure.footprint.volume)} m³`,
    },
  ];

  if (structure.rentPerTick > 0) {
    metadata.push({
      label: 'Rent per tick',
      value: currencyFormatter.format(structure.rentPerTick),
    });
  }

  metadata.push({ label: 'Plants', value: plantCount.toLocaleString() });

  const handleClick = () => {
    if (onSelect) {
      onSelect(structure.id);
    }
  };

  const cardClasses = [
    className,
    onSelect ? 'cursor-pointer' : undefined,
    isSelected ? 'border-accent shadow-strong ring-1 ring-accent/40' : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Card
      title={structure.name}
      subtitle={`${roomCount.toLocaleString()} rooms • ${zoneCount.toLocaleString()} zones`}
      metadata={metadata}
      interactive={Boolean(onSelect)}
      onClick={onSelect ? handleClick : undefined}
      className={cardClasses}
    >
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
          <span>Status</span>
          <span className="rounded-full border border-border/50 bg-surfaceAlt/70 px-2 py-0.5 text-[0.65rem] font-semibold text-text-secondary">
            {STATUS_LABEL[structure.status] ?? structure.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Avg temperature</p>
            <p className="text-base font-medium text-text-primary">
              {averageTemperature !== undefined ? `${averageTemperature.toFixed(1)} °C` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Avg humidity</p>
            <p className="text-base font-medium text-text-primary">
              {averageHumidity !== undefined ? `${(averageHumidity * 100).toFixed(0)}%` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Avg CO₂</p>
            <p className="text-base font-medium text-text-primary">
              {averageCo2 !== undefined ? `${averageCo2.toFixed(0)} ppm` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Avg PPFD</p>
            <p className="text-base font-medium text-text-primary">
              {averagePpfd !== undefined ? `${averagePpfd.toFixed(0)} μmol·m⁻²·s⁻¹` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Avg stress</p>
            <p className="text-base font-medium text-text-primary">
              {averageStress !== undefined
                ? percentageFormatter.format(Math.max(0, Math.min(averageStress, 1)))
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Lighting coverage</p>
            <p className="text-base font-medium text-text-primary">
              {averageLightingCoverage !== undefined
                ? percentageFormatter.format(Math.max(0, Math.min(averageLightingCoverage, 1)))
                : '—'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StructureSummaryCard;
