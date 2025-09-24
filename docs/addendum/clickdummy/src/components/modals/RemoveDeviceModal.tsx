/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { FormInput } from '../common/Form';
import { PrimaryButton } from '../common/Buttons';

interface RemoveDeviceModalProps {
  onSubmit: (data: { zoneId: string; device: any; quantity: number }) => void;
  zoneId: string;
  device: { name: string; count: number };
  onClose: () => void;
}

export const RemoveDeviceModal = ({ onSubmit, zoneId, device }: RemoveDeviceModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ zoneId, device, quantity: Number(quantity) });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p>
        Removing: <span className="font-semibold text-stone-100">{device.name}</span>
      </p>
      <FormInput
        name="quantity"
        label={`Quantity (Max: ${device.count})`}
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        min="1"
        max={device.count}
        required
      />
      <div className="flex space-x-2">
        <PrimaryButton type="submit">Remove</PrimaryButton>
        <button
          type="button"
          onClick={() => onSubmit({ zoneId, device, quantity: device.count })}
          className="w-full bg-red-600/80 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
        >
          Remove All ({device.count})
        </button>
      </div>
    </form>
  );
};
