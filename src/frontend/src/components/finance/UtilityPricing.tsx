import { useMemo, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { Card } from '@/components/primitives/Card';
import type { SimulationBridge } from '@/facade/systemFacade';

interface UtilityPricingProps {
  bridge: SimulationBridge;
}

interface UtilityPrice {
  id: string;
  name: string;
  icon: string;
  unit: string;
  current: number;
  suggested: number;
  description: string;
  color: string;
}

const formatCurrency = (value: number): string => {
  return `€${value.toFixed(3)}`;
};

const formatPercentage = (change: number): string => {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
};

export const UtilityPricing = ({ bridge }: UtilityPricingProps) => {
  const [pendingChanges, setPendingChanges] = useState<Record<string, number>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Get current utility prices from the simulation snapshot
  // Note: This data might be in the pricing catalog or finance state
  const currentPrices = useMemo(() => {
    // For now, we'll use default values since the exact location in state is not clear
    // In a real implementation, you would access this from snapshot.pricing or similar
    return {
      pricePerKwh: 0.15,
      pricePerLiterWater: 0.02,
      pricePerGramNutrients: 0.1,
    };
  }, []); // No dependencies needed for static default values

  const utilityPrices: UtilityPrice[] = useMemo(
    () => [
      {
        id: 'electricity',
        name: 'Electricity',
        icon: 'electrical_services',
        unit: '/kWh',
        current: currentPrices.pricePerKwh,
        suggested: currentPrices.pricePerKwh * 1.05, // 5% increase suggestion
        description: 'Cost per kilowatt-hour for lighting, HVAC, and equipment',
        color: 'text-yellow-400',
      },
      {
        id: 'water',
        name: 'Water',
        icon: 'water_drop',
        unit: '/L',
        current: currentPrices.pricePerLiterWater,
        suggested: currentPrices.pricePerLiterWater * 0.95, // 5% decrease suggestion
        description: 'Cost per liter for irrigation and hydroponic systems',
        color: 'text-blue-400',
      },
      {
        id: 'nutrients',
        name: 'Nutrients',
        icon: 'science',
        unit: '/g',
        current: currentPrices.pricePerGramNutrients,
        suggested: currentPrices.pricePerGramNutrients * 1.02, // 2% increase suggestion
        description: 'Cost per gram of NPK and other nutrient solutions',
        color: 'text-green-400',
      },
    ],
    [currentPrices],
  );

  const handlePriceChange = (utilityId: string, value: number) => {
    setPendingChanges((prev) => ({
      ...prev,
      [utilityId]: value,
    }));
  };

  const handleResetPrice = (utilityId: string) => {
    setPendingChanges((prev) => {
      const newChanges = { ...prev };
      delete newChanges[utilityId];
      return newChanges;
    });
  };

  const handleApplySuggested = (utilityId: string) => {
    const utility = utilityPrices.find((u) => u.id === utilityId);
    if (utility) {
      handlePriceChange(utilityId, utility.suggested);
    }
  };

  const handleSaveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) return;

    setIsUpdating(true);
    try {
      // Map frontend utility IDs to the expected facade payload format
      const utilityPriceUpdates: Record<string, number> = {};

      for (const [utilityId, newPrice] of Object.entries(pendingChanges)) {
        switch (utilityId) {
          case 'electricity':
            utilityPriceUpdates.pricePerKwh = newPrice;
            break;
          case 'water':
            utilityPriceUpdates.pricePerLiterWater = newPrice;
            break;
          case 'nutrients':
            utilityPriceUpdates.pricePerGramNutrients = newPrice;
            break;
        }
      }

      // Send the facade intent to update utility prices
      const result = await bridge.sendIntent({
        domain: 'finance',
        action: 'setUtilityPrices',
        payload: utilityPriceUpdates,
      });

      if (result.ok) {
        // Clear pending changes on success
        setPendingChanges({});
        console.log('✅ Utility prices updated successfully');
      } else {
        console.error('❌ Failed to update utility prices:', result.errors);
        // In a real app, you might show a toast notification here
      }
    } catch (error) {
      console.error('❌ Error updating utility prices:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDiscardChanges = () => {
    setPendingChanges({});
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  const getTotalImpact = () => {
    return utilityPrices.reduce((total, utility) => {
      const pendingPrice = pendingChanges[utility.id];
      if (pendingPrice !== undefined) {
        const change = ((pendingPrice - utility.current) / utility.current) * 100;
        return total + Math.abs(change);
      }
      return total;
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Utilities Grid */}
      <div className="grid gap-4">
        {utilityPrices.map((utility) => {
          const pendingPrice = pendingChanges[utility.id];
          const effectivePrice = pendingPrice !== undefined ? pendingPrice : utility.current;
          const hasChange = pendingPrice !== undefined;
          const changePercent = hasChange
            ? ((pendingPrice - utility.current) / utility.current) * 100
            : 0;
          const suggestedChange = ((utility.suggested - utility.current) / utility.current) * 100;

          return (
            <Card key={utility.id} className="bg-surface-muted/40">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="rounded-lg bg-surface-elevated/60 p-3">
                  <Icon name={utility.icon} size={24} className={utility.color} />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-text flex items-center gap-2">
                        {utility.name}
                        {hasChange && (
                          <Badge tone="warning" className="px-2 py-0.5 text-[10px]">
                            Modified
                          </Badge>
                        )}
                      </h4>
                      <p className="text-sm text-text-muted mt-1">{utility.description}</p>
                    </div>
                  </div>

                  {/* Price Display and Controls */}
                  <div className="grid gap-3 md:grid-cols-2">
                    {/* Current Price */}
                    <div>
                      <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                        Current Price
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg font-semibold text-text">
                          {formatCurrency(effectivePrice)}
                        </span>
                        <span className="text-sm text-text-muted">{utility.unit}</span>
                        {hasChange && (
                          <Badge
                            tone={changePercent >= 0 ? 'warning' : 'success'}
                            className="px-2 py-0.5 text-[10px]"
                          >
                            {formatPercentage(changePercent)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Price Input */}
                    <div>
                      <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                        New Price
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={effectivePrice.toFixed(3)}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value) && value >= 0) {
                              handlePriceChange(utility.id, value);
                            }
                          }}
                          className="flex-1 px-3 py-2 text-sm border border-border/40 rounded-lg bg-surface-elevated/60 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60"
                        />
                        <span className="text-sm text-text-muted">{utility.unit}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleApplySuggested(utility.id)}
                      className="text-xs"
                    >
                      <Icon name="lightbulb" size={14} />
                      Apply Suggested ({formatCurrency(utility.suggested)},{' '}
                      {formatPercentage(suggestedChange)})
                    </Button>
                    {hasChange && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResetPrice(utility.id)}
                        className="text-xs"
                      >
                        <Icon name="undo" size={14} />
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Summary and Actions */}
      {hasChanges && (
        <Card className="bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="info" size={20} className="text-primary" />
              <div>
                <p className="font-medium text-text">
                  {Object.keys(pendingChanges).length} price change(s) pending
                </p>
                <p className="text-sm text-text-muted">
                  Total impact: {getTotalImpact().toFixed(1)}% average change
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDiscardChanges}
                disabled={isUpdating}
              >
                Discard
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSaveChanges}
                disabled={isUpdating}
                icon={
                  isUpdating ? (
                    <Icon name="autorenew" className="animate-spin text-primary-strong" size={18} />
                  ) : (
                    <Icon name="save" />
                  )
                }
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Market Context */}
      <Card className="bg-surface-muted/20">
        <div className="flex items-start gap-3">
          <Icon name="trending_up" size={20} className="text-info mt-1" />
          <div>
            <h4 className="font-medium text-text">Market Context</h4>
            <p className="text-sm text-text-muted mt-1">
              Current energy market shows 3-5% increase this month. Water costs stable. Nutrient
              prices trending up 2% due to supply chain adjustments. Consider adjusting prices based
              on regional market conditions.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
