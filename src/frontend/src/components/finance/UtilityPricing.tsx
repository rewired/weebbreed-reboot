import { useMemo, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { Card } from '@/components/primitives/Card';
import type { SimulationBridge } from '@/facade/systemFacade';
import { useSimulationStore } from '@/store/simulation';

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
  const [statusMessage, setStatusMessage] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  const financeSnapshot = useSimulationStore((state) => state.snapshot?.finance);

  const currentPrices = useMemo(() => {
    const fallback = {
      pricePerKwh: 0,
      pricePerLiterWater: 0,
      pricePerGramNutrients: 0,
    };
    const prices = financeSnapshot?.utilityPrices;
    const normalise = (value?: number) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
    return {
      pricePerKwh: normalise(prices?.pricePerKwh) ?? fallback.pricePerKwh,
      pricePerLiterWater: normalise(prices?.pricePerLiterWater) ?? fallback.pricePerLiterWater,
      pricePerGramNutrients:
        normalise(prices?.pricePerGramNutrients) ?? fallback.pricePerGramNutrients,
    };
  }, [financeSnapshot]);

  const utilityPrices: UtilityPrice[] = useMemo(() => {
    const electricity = currentPrices.pricePerKwh;
    const water = currentPrices.pricePerLiterWater;
    const nutrients = currentPrices.pricePerGramNutrients;
    const adjusted = <T extends number>(value: T, factor: number) =>
      value > 0 ? value * factor : value;
    return [
      {
        id: 'electricity',
        name: 'Electricity',
        icon: 'electrical_services',
        unit: '/kWh',
        current: electricity,
        suggested: adjusted(electricity, 1.05),
        description: 'Cost per kilowatt-hour for lighting, HVAC, and equipment',
        color: 'text-yellow-400',
      },
      {
        id: 'water',
        name: 'Water',
        icon: 'water_drop',
        unit: '/L',
        current: water,
        suggested: adjusted(water, 0.95),
        description: 'Cost per liter for irrigation and hydroponic systems',
        color: 'text-blue-400',
      },
      {
        id: 'nutrients',
        name: 'Nutrients',
        icon: 'science',
        unit: '/g',
        current: nutrients,
        suggested: adjusted(nutrients, 1.02),
        description: 'Cost per gram of NPK and other nutrient solutions',
        color: 'text-green-400',
      },
    ];
  }, [currentPrices]);

  const handlePriceChange = (utilityId: string, value: number) => {
    setPendingChanges((prev) => ({
      ...prev,
      [utilityId]: value,
    }));
    setStatusMessage(null);
  };

  const handleResetPrice = (utilityId: string) => {
    setPendingChanges((prev) => {
      const newChanges = { ...prev };
      delete newChanges[utilityId];
      return newChanges;
    });
    setStatusMessage(null);
  };

  const handleApplySuggested = (utilityId: string) => {
    const utility = utilityPrices.find((u) => u.id === utilityId);
    if (utility) {
      handlePriceChange(utilityId, utility.suggested);
    }
  };

  const handleSaveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      return;
    }

    setIsUpdating(true);
    try {
      const utilityPriceUpdates: Record<string, number> = {};

      for (const [utilityId, newPrice] of Object.entries(pendingChanges)) {
        if (!Number.isFinite(newPrice) || newPrice < 0) {
          continue;
        }
        switch (utilityId) {
          case 'electricity':
            utilityPriceUpdates.electricityCostPerKWh = newPrice;
            break;
          case 'water':
            utilityPriceUpdates.waterCostPerM3 = newPrice * 1000;
            break;
          case 'nutrients':
            utilityPriceUpdates.nutrientsCostPerKg = newPrice * 1000;
            break;
          default:
            break;
        }
      }

      if (Object.keys(utilityPriceUpdates).length === 0) {
        setIsUpdating(false);
        return;
      }

      const result = await bridge.sendIntent({
        domain: 'finance',
        action: 'setUtilityPrices',
        payload: utilityPriceUpdates,
      });

      if (result.ok) {
        setPendingChanges({});
        const warningMessage = result.warnings?.length ? ` ${result.warnings.join(' ')}` : '';
        setStatusMessage({ tone: 'success', text: `Utility prices updated.${warningMessage}` });
      } else {
        const details =
          result.errors
            ?.map((error) => error.message)
            .filter(Boolean)
            .join(', ') ?? 'Unknown error';
        setStatusMessage({
          tone: 'error',
          text: `Failed to update utility prices: ${details}`,
        });
      }
    } catch (error) {
      setStatusMessage({
        tone: 'error',
        text: `Failed to update utility prices: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDiscardChanges = () => {
    setPendingChanges({});
    setStatusMessage(null);
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  const getTotalImpact = () => {
    return utilityPrices.reduce((total, utility) => {
      const pendingPrice = pendingChanges[utility.id];
      if (pendingPrice !== undefined) {
        const baseline = utility.current;
        const change =
          baseline > 0 ? ((pendingPrice - baseline) / baseline) * 100 : pendingPrice > 0 ? 100 : 0;
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
          const inputId = `${utility.id}-new-price`;
          const pendingPrice = pendingChanges[utility.id];
          const effectivePrice = pendingPrice !== undefined ? pendingPrice : utility.current;
          const hasChange = pendingPrice !== undefined;
          const changePercent = hasChange
            ? utility.current > 0
              ? ((pendingPrice - utility.current) / utility.current) * 100
              : pendingPrice > 0
                ? 100
                : 0
            : 0;
          const suggestedChange =
            utility.current > 0
              ? ((utility.suggested - utility.current) / utility.current) * 100
              : 0;

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
                      <label
                        className="text-xs font-medium text-text-muted uppercase tracking-wide"
                        htmlFor={inputId}
                      >
                        New Price
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          id={inputId}
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

      {statusMessage && (
        <Card
          className={
            statusMessage.tone === 'success'
              ? 'border-success/40 bg-success/5'
              : 'border-danger/40 bg-danger/5'
          }
        >
          <div
            className={
              statusMessage.tone === 'success' ? 'text-success text-sm' : 'text-danger text-sm'
            }
          >
            {statusMessage.text}
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
