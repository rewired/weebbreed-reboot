import Card from '@/components/Card';
import type { ZoneSnapshot } from '@/types/simulation';

type ZoneSummaryCardProps = {
  zone: ZoneSnapshot;
  subtitle?: string;
  isSelected?: boolean;
  onSelect?: (zoneId: string) => void;
  className?: string;
};

const decimalFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

const percentageFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
});

const ZoneSummaryCard = ({
  zone,
  subtitle,
  isSelected = false,
  onSelect,
  className,
}: ZoneSummaryCardProps) => {
  const lightingCoverage = zone.lighting?.coverageRatio;
  const stressLevel = Math.max(0, Math.min(zone.metrics.stressLevel ?? 0, 1));

  const metadata = [
    { label: 'Area', value: `${decimalFormatter.format(zone.area)} m²` },
    { label: 'Volume', value: `${decimalFormatter.format(zone.volume)} m³` },
    { label: 'Plants', value: zone.plants.length.toLocaleString() },
  ];

  if (lightingCoverage !== undefined) {
    metadata.push({
      label: 'Lighting coverage',
      value: percentageFormatter.format(Math.max(0, Math.min(lightingCoverage, 1))),
    });
  }

  const handleClick = () => {
    if (onSelect) {
      onSelect(zone.id);
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
      title={zone.name}
      subtitle={subtitle ?? `${zone.structureName} • ${zone.roomName}`}
      metadata={metadata}
      footer={`Last update: tick ${zone.metrics.lastUpdatedTick.toLocaleString()}`}
      interactive={Boolean(onSelect)}
      onClick={onSelect ? handleClick : undefined}
      className={cardClasses}
    >
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Temperature</p>
          <p className="text-base font-medium text-text-primary">
            {zone.environment.temperature.toFixed(1)} °C
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Humidity</p>
          <p className="text-base font-medium text-text-primary">
            {(zone.environment.relativeHumidity * 100).toFixed(0)}%
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">CO₂</p>
          <p className="text-base font-medium text-text-primary">
            {zone.environment.co2.toLocaleString()} ppm
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">PPFD</p>
          <p className="text-base font-medium text-text-primary">
            {zone.environment.ppfd.toFixed(0)} μmol·m⁻²·s⁻¹
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">VPD proxy</p>
          <p className="text-base font-medium text-text-primary">
            {zone.environment.vpd.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Stress level</p>
          <p className="text-base font-medium text-text-primary">
            {percentageFormatter.format(stressLevel)}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default ZoneSummaryCard;
