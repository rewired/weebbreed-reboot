import type { ChangeEvent, ReactNode } from 'react';
import FormField from './FormField';

export type NumberInputFieldProps = {
  id?: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  description?: ReactNode;
  formatValue?: (value: number) => string;
  suffix?: ReactNode;
  disabled?: boolean;
  placeholder?: string;
  footer?: ReactNode;
};

const NumberInputField = ({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  description,
  formatValue,
  suffix,
  disabled = false,
  placeholder,
  footer,
}: NumberInputFieldProps) => {
  const formattedValue = formatValue ? formatValue(value) : value.toString();
  const secondaryLabel = unit ? `${formattedValue} ${unit}` : formattedValue;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number(event.target.value);
    if (Number.isNaN(parsed)) {
      return;
    }

    let next = parsed;
    if (min !== undefined) {
      next = Math.max(min, next);
    }
    if (max !== undefined) {
      next = Math.min(max, next);
    }

    onChange(next);
  };

  return (
    <FormField label={label} secondaryLabel={secondaryLabel} description={description}>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-md border border-border/60 bg-surface px-3 py-2 text-sm text-text-primary shadow-inner focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
        />
        {suffix ? <span className="text-sm font-medium text-text-secondary">{suffix}</span> : null}
      </div>
      {footer}
    </FormField>
  );
};

export default NumberInputField;
