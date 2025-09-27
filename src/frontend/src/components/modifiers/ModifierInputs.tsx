//import { useState } from 'react';
import { DifficultyModifiers, getModifierRange } from '../../types/difficulty';

interface ModifierInputsProps {
  modifiers: DifficultyModifiers;
  onChange: (modifiers: DifficultyModifiers) => void;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `€${(value / 1000).toFixed(0)}K`;
  } else {
    return `€${value}`;
  }
};

const formatMultiplier = (value: number): string => {
  return `${value.toFixed(2)}x`;
};

const formatRent = (value: number): string => {
  return `€${value.toFixed(2)}/m²/tick`;
};

export const ModifierInputs = ({ modifiers, onChange }: ModifierInputsProps) => {
  const updateModifier = <
    T extends keyof DifficultyModifiers,
    K extends keyof DifficultyModifiers[T],
  >(
    category: T,
    key: K,
    value: DifficultyModifiers[T][K],
  ) => {
    const updatedModifiers = {
      ...modifiers,
      [category]: {
        ...modifiers[category],
        [key]: value,
      },
    };
    onChange(updatedModifiers);
  };

  const renderRangeInput = <
    T extends keyof DifficultyModifiers,
    K extends keyof DifficultyModifiers[T],
  >(
    category: T,
    key: K,
    label: string,
    formatter: (value: number) => string,
    step: number = 0.01,
  ) => {
    const value = modifiers[category][key] as number;
    const [min, max] = getModifierRange(category, key);

    return (
      <div className="grid gap-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) =>
              updateModifier(category, key, Number(e.target.value) as DifficultyModifiers[T][K])
            }
            className="flex-1 accent-primary"
          />
          <span className="text-xs font-mono text-text-muted min-w-16 text-right">
            {formatter(value)}
          </span>
        </div>
        <div className="flex justify-between text-xs text-text-muted/70">
          <span>{formatter(min)}</span>
          <span>{formatter(max)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-4">
      {/* Plant Stress Section */}
      <div className="grid gap-3 rounded-lg border border-border/40 bg-surface-muted/30 p-3">
        <h5 className="text-sm font-semibold text-text">Plant Stress</h5>
        <div className="grid gap-3">
          {renderRangeInput(
            'plantStress',
            'optimalRangeMultiplier',
            'Optimal Range Multiplier',
            formatMultiplier,
          )}
          {renderRangeInput(
            'plantStress',
            'stressAccumulationMultiplier',
            'Stress Accumulation Multiplier',
            formatMultiplier,
          )}
        </div>
      </div>

      {/* Device Failure Section */}
      <div className="grid gap-3 rounded-lg border border-border/40 bg-surface-muted/30 p-3">
        <h5 className="text-sm font-semibold text-text">Device Failure</h5>
        <div className="grid gap-3">
          {renderRangeInput('deviceFailure', 'mtbfMultiplier', 'MTBF Multiplier', formatMultiplier)}
        </div>
      </div>

      {/* Economics Section */}
      <div className="grid gap-3 rounded-lg border border-border/40 bg-surface-muted/30 p-3">
        <h5 className="text-sm font-semibold text-text">Economics</h5>
        <div className="grid gap-3">
          {renderRangeInput(
            'economics',
            'initialCapital',
            'Initial Capital',
            formatCurrency,
            50000,
          )}
          {renderRangeInput(
            'economics',
            'itemPriceMultiplier',
            'Item Price Multiplier',
            formatMultiplier,
          )}
          {renderRangeInput(
            'economics',
            'harvestPriceMultiplier',
            'Harvest Price Multiplier',
            formatMultiplier,
          )}
          {renderRangeInput(
            'economics',
            'rentPerSqmStructurePerTick',
            'Structure Rent',
            formatRent,
          )}
          {renderRangeInput('economics', 'rentPerSqmRoomPerTick', 'Room Rent', formatRent)}
        </div>
      </div>
    </div>
  );
};
