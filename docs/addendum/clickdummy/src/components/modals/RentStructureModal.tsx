/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { FormInput, FormSelect } from '../common/Form';
import { PrimaryButton } from '../common/Buttons';

interface AvailableStructure {
  id: string;
  name: string;
  totalArea: number;
  cost: number;
}

interface RentStructureModalProps {
  onSubmit: (data: { structure: AvailableStructure; name: string }) => void;
  availableStructures: AvailableStructure[];
  balance: number;
  onClose: () => void;
}

export const RentStructureModal = ({
  onSubmit,
  availableStructures,
  balance,
}: RentStructureModalProps) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const structureId = formData.get('structure') as string;
    const selected = availableStructures.find((s) => s.id === structureId);
    if (selected) {
      onSubmit({ structure: selected, name: formData.get('name') as string });
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput name="name" label="Structure Name" placeholder="e.g., Main Facility" required />
      <FormSelect name="structure" label="Available Structures">
        {availableStructures.map((s) => (
          <option key={s.id} value={s.id} disabled={s.cost > balance}>
            {s.name} - {s.totalArea} m² ({s.cost.toLocaleString()} €)
          </option>
        ))}
      </FormSelect>
      <PrimaryButton type="submit">Rent Structure</PrimaryButton>
    </form>
  );
};
