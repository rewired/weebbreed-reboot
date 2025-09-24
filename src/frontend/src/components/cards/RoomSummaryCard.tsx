import Card from '@/components/Card';
import type { RoomSnapshot } from '@/types/simulation';

type RoomSummaryCardProps = {
  room: RoomSnapshot;
  subtitle?: string;
  averageTemperature?: number;
  averageHumidity?: number;
  averageCo2?: number;
  averagePpfd?: number;
  averageStress?: number;
  plantCount?: number;
  zoneCount: number;
  isSelected?: boolean;
  onSelect?: (roomId: string) => void;
  className?: string;
};

const decimalFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

const percentageFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
});

const RoomSummaryCard = ({
  room,
  subtitle,
  averageTemperature,
  averageHumidity,
  averageCo2,
  averagePpfd,
  averageStress,
  plantCount = 0,
  zoneCount,
  isSelected = false,
  onSelect,
  className,
}: RoomSummaryCardProps) => {
  const metadata = [
    { label: 'Area', value: `${decimalFormatter.format(room.area)} m²` },
    { label: 'Volume', value: `${decimalFormatter.format(room.volume)} m³` },
    {
      label: 'Cleanliness',
      value: percentageFormatter.format(Math.max(0, Math.min(room.cleanliness, 1))),
    },
    {
      label: 'Maintenance',
      value: percentageFormatter.format(Math.max(0, Math.min(room.maintenanceLevel, 1))),
    },
  ];

  const handleClick = () => {
    if (onSelect) {
      onSelect(room.id);
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
      title={room.name}
      subtitle={
        subtitle ??
        `${room.structureName} • ${room.purposeName} • ${zoneCount.toLocaleString()} zones`
      }
      metadata={metadata}
      interactive={Boolean(onSelect)}
      onClick={onSelect ? handleClick : undefined}
      className={cardClasses}
    >
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
          <span>Purpose</span>
          <span className="rounded-full border border-border/50 bg-surfaceAlt/70 px-2 py-0.5 text-[0.65rem] font-semibold text-text-secondary">
            {room.purposeKind}
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
            <p className="text-xs uppercase tracking-wide text-text-muted">Plants</p>
            <p className="text-base font-medium text-text-primary">{plantCount.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RoomSummaryCard;
