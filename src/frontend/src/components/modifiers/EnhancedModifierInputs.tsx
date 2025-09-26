import { DifficultyModifiers, MODIFIER_RANGES } from '../../types/difficulty';

interface EnhancedModifierInputsProps {
  modifiers: DifficultyModifiers;
  onChange: (modifiers: DifficultyModifiers) => void;
}

export const EnhancedModifierInputs = ({ modifiers, onChange }: EnhancedModifierInputsProps) => {
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

  const renderFloatInput = <
    T extends keyof DifficultyModifiers,
    K extends keyof DifficultyModifiers[T],
  >(
    category: T,
    key: K,
    label: string,
  ) => {
    const value = modifiers[category][key] as number;
    const [min, max] = MODIFIER_RANGES[category][key] as [number, number];

    const handleChange = (input: string) => {
      const parsed = parseFloat(input);
      if (!isNaN(parsed)) {
        const clamped = Math.max(min, Math.min(max, parsed));
        updateModifier(category, key, clamped);
      }
    };

    // Format with 2 decimal places
    const formattedValue = value.toLocaleString(navigator.language, {
      useGrouping: false, // No thousands separators for small floats
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return (
      <div className="grid gap-2">
        <input
          type="text"
          value={formattedValue}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
        />
        <div className="flex justify-between items-center text-xs text-text-muted/70">
          <span>
            {min.toLocaleString(navigator.language, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <label className="font-semibold uppercase tracking-wide text-text-muted">{label}</label>
          <span>
            {max.toLocaleString(navigator.language, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
    );
  };

  const renderCurrencyInput = <
    T extends keyof DifficultyModifiers,
    K extends keyof DifficultyModifiers[T],
  >(
    category: T,
    key: K,
    label: string,
  ) => {
    const value = modifiers[category][key] as number;
    const [min, max] = MODIFIER_RANGES[category][key] as [number, number];

    const handleChange = (input: string) => {
      // Remove commas and parse
      const cleanInput = input.replace(/,/g, '');
      const parsed = parseFloat(cleanInput);
      if (!isNaN(parsed)) {
        const clamped = Math.max(min, Math.min(max, parsed));
        updateModifier(category, key, clamped);
      }
    };

    // Format with grouping (thousands separators)
    const formattedValue = value.toLocaleString(navigator.language, {
      useGrouping: true,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Format max value as "1000M" for initial capital
    const formatMaxValue = (value: number) => {
      if (value >= 1000000000) {
        return `${(value / 1000000000).toLocaleString(navigator.language, { maximumFractionDigits: 0 })}B`;
      } else if (value >= 1000000) {
        return `${(value / 1000000).toLocaleString(navigator.language, { maximumFractionDigits: 0 })}M`;
      }
      return value.toLocaleString(navigator.language, { useGrouping: true });
    };

    return (
      <div className="grid gap-2">
        <input
          type="text"
          value={formattedValue}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
        />
        <div className="flex justify-between items-center text-xs text-text-muted/70">
          <span>{min.toLocaleString(navigator.language, { useGrouping: true })}</span>
          <label className="font-semibold uppercase tracking-wide text-text-muted">{label}</label>
          <span>{formatMaxValue(max)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-4">
      {/* Plant Stress Section */}
      <div className="grid gap-3 rounded-lg border border-border/40 bg-surface-muted/20 p-3">
        <h5 className="text-sm font-semibold text-text">Plant Stress</h5>
        <div className="grid gap-3 sm:grid-cols-2">
          {renderFloatInput('plantStress', 'optimalRangeMultiplier', 'Optimal Range Multiplier')}
          {renderFloatInput(
            'plantStress',
            'stressAccumulationMultiplier',
            'Stress Accumulation Multiplier',
          )}
        </div>
      </div>

      {/* Device Failure Section */}
      <div className="grid gap-3 rounded-lg border border-border/40 bg-surface-muted/20 p-3">
        <h5 className="text-sm font-semibold text-text">Device Failure</h5>
        <div className="grid gap-3 sm:grid-cols-2">
          {renderFloatInput('deviceFailure', 'mtbfMultiplier', 'MTBF Multiplier')}
          <div></div> {/* Empty space for alignment */}
        </div>
      </div>

      {/* Economics Section */}
      <div className="grid gap-3 rounded-lg border border-border/40 bg-surface-muted/20 p-3">
        <h5 className="text-sm font-semibold text-text">Economics</h5>
        <div className="grid gap-3 sm:grid-cols-2">
          {renderCurrencyInput('economics', 'initialCapital', 'Initial Capital')}
          {renderFloatInput('economics', 'itemPriceMultiplier', 'Item Price Multiplier')}
          {renderFloatInput('economics', 'harvestPriceMultiplier', 'Harvest Price Multiplier')}
          {renderFloatInput('economics', 'rentPerSqmStructurePerTick', 'Structure Rent')}
          {renderFloatInput('economics', 'rentPerSqmRoomPerTick', 'Room Rent')}
        </div>
      </div>
    </div>
  );
};
