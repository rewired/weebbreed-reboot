import type { ChangeEvent, ReactNode } from 'react';
import { RangeInput } from '@/components/inputs';
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
      <RangeInput
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        disabled={disabled}
      />
      {footer}
    </FormField>
  );
};

export default RangeField;
