/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { Structure } from '../../types/domain';
import { FormInput, FormSelect } from '../common/Form';
import { PrimaryButton } from '../common/Buttons';

interface AddRoomModalProps {
  onSubmit: (data: { structureId: string; name: string; purpose: string; area: number }) => void;
  structure: Structure;
  onClose: () => void;
}

export const AddRoomModal = ({ onSubmit, structure }: AddRoomModalProps) => {
  const [area, setArea] = useState(100);
  const availableArea = structure.totalArea - structure.usedArea;
  const isAreaValid = area > 0 && area <= availableArea;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit({
      structureId: structure.id,
      name: formData.get('name') as string,
      purpose: formData.get('purpose') as string,
      area: parseInt(formData.get('area') as string, 10),
    });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput name="name" label="Room Name" placeholder="e.g., Grow Room C" required />
      <FormSelect name="purpose" label="Room Purpose" defaultValue="growroom">
        <option value="growroom">Grow Room</option>
        <option value="processing">Processing</option>
        <option value="drying">Drying</option>
        <option value="storage">Storage</option>
        <option value="breakroom">Break Room</option>
      </FormSelect>
      <FormInput
        name="area"
        label={`Area (m²)`}
        type="number"
        value={area}
        onChange={(e) => setArea(parseInt(e.target.value, 10) || 0)}
        min="1"
        max={availableArea}
        required
      />
      <p className={`text-sm ${isAreaValid ? 'text-stone-400' : 'text-red-400'}`}>
        Available: {availableArea} m²
      </p>
      <PrimaryButton type="submit" disabled={!isAreaValid}>
        Create Room
      </PrimaryButton>
    </form>
  );
};
