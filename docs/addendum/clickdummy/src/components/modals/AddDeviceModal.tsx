/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { FormSelect, FormInput } from '../common/Form';
import { PrimaryButton } from '../common/Buttons';

interface AddDeviceModalProps {
  onSubmit: (data: { zoneId: string; name: string; type: string; count: number }) => void;
  zoneId: string;
  onClose: () => void;
}

export const AddDeviceModal = ({ onSubmit, zoneId }: AddDeviceModalProps) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const [name, type] = (formData.get('device') as string).split('|');
    const count = parseInt(formData.get('count') as string, 10) || 1;
    onSubmit({ zoneId, name, type, count });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormSelect name="device" label="Device Model" defaultValue="Sunstream Pro LED|Lighting">
        <option value="Sunstream Pro LED|Lighting">Sunstream Pro LED (Lighting)</option>
        <option value="ClimateKing 5000|HVAC">ClimateKing 5000 (HVAC)</option>
        <option value="CO₂ Injector v2|Climate">CO₂ Injector v2 (Climate)</option>
        <option value="HydroFlow Irrigator|Irrigation">HydroFlow Irrigator (Irrigation)</option>
      </FormSelect>
      <FormInput
        name="count"
        label="Quantity"
        type="number"
        defaultValue="1"
        min="1"
        max="10"
        required
      />
      <PrimaryButton type="submit">Install Device</PrimaryButton>
    </form>
  );
};
