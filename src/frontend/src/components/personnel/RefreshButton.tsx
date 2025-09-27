import { useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import type { SimulationBridge } from '@/facade/systemFacade';

interface RefreshButtonProps {
  bridge: SimulationBridge;
  onRefreshComplete?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
}

export const RefreshButton = ({
  bridge,
  onRefreshComplete,
  className,
  variant = 'primary',
  size = 'md',
}: RefreshButtonProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      const response = await bridge.sendIntent({
        domain: 'workforce',
        action: 'refreshCandidates',
        payload: {},
      });

      if (response.ok) {
        setLastRefreshTime(new Date());
        onRefreshComplete?.();
      } else {
        console.warn('Failed to refresh candidate pool:', response.warnings);
      }
    } catch (error) {
      console.error('Error refreshing candidate pool:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getRefreshIcon = () => {
    if (isRefreshing) {
      return <Icon name="sync" className="animate-spin" />;
    }
    return <Icon name="refresh" />;
  };

  const getButtonText = () => {
    if (isRefreshing) {
      return 'Refreshing...';
    }
    if (lastRefreshTime) {
      const timeDiff = Math.floor((Date.now() - lastRefreshTime.getTime()) / 1000);
      if (timeDiff < 60) {
        return `Refreshed ${timeDiff}s ago`;
      } else if (timeDiff < 3600) {
        return `Refreshed ${Math.floor(timeDiff / 60)}m ago`;
      }
    }
    return 'Refresh Pool';
  };

  return (
    <Button
      variant={variant}
      size={size}
      icon={getRefreshIcon()}
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={className}
      title={
        lastRefreshTime
          ? `Last refreshed: ${lastRefreshTime.toLocaleTimeString()}`
          : 'Generate new job candidates'
      }
    >
      {getButtonText()}
    </Button>
  );
};
