import type { ChangeEvent, ReactNode } from 'react';
import FormField from './FormField';

export type RangeFieldProps = {
  id?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  description?: ReactNode;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  onChange: (value: number) => void;
  footer?: ReactNode;
};

const RangeField = ({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  description,
  formatValue,
  disabled = false,
  onChange,
  footer,
}: RangeFieldProps) => {
  const formattedValue = formatValue ? formatValue(value) : value.toString();
  const secondaryLabel = unit ? `${formattedValue} ${unit}` : formattedValue;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    if (Number.isNaN(next)) {
      return;
    }
    onChange(next);
  };

  return (
    <FormField label={label} secondaryLabel={secondaryLabel} description={description}>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border/60 accent-accent/70 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {footer}
    </FormField>
  );
};

export default RangeField;
