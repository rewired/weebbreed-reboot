import cx from 'clsx';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/primitives/Badge';
import type { BadgeTone, EnvironmentBadgeDescriptor } from './environmentBadges';

const KpiBadge = ({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  tone: BadgeTone;
}) => (
  <Badge
    tone={tone === 'default' ? 'default' : tone}
    className="flex items-center gap-1 px-3 py-1 text-[11px]"
  >
    <Icon name={icon} size={16} className="text-xs text-inherit" />
    <span>{label}</span>
    <span className="normal-case font-semibold tracking-tight text-text">{value}</span>
  </Badge>
);

export const EnvironmentBadgeRow = ({
  badges,
  className,
}: {
  badges: EnvironmentBadgeDescriptor[];
  className?: string;
}) => (
  <div className={cx('flex flex-wrap gap-2', className)}>
    {badges.map((badge) => (
      <KpiBadge
        key={badge.key}
        icon={badge.icon}
        label={badge.label}
        value={badge.value}
        tone={badge.tone}
      />
    ))}
  </div>
);
