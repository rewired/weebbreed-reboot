/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { FormSelect, FormInput } from '../common/Form';
import { PrimaryButton } from '../common/Buttons';

interface PlantStrainModalProps {
  onSubmit: (data: { zoneId: string; strain: string; count: number }) => void;
  zoneId: string;
  onClose: () => void;
}

export const PlantStrainModal = ({ onSubmit, zoneId }: PlantStrainModalProps) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit({
      zoneId,
      strain: formData.get('strain') as string,
      count: parseInt(formData.get('count') as string, 10),
    });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormSelect name="strain" label="Strain" defaultValue="OG Kush">
        <option>OG Kush</option>
        <option>White Widow</option>
        <option>Blue Dream</option>
      </FormSelect>
      <FormInput
        name="count"
        label="Number of Plants"
        type="number"
        defaultValue="16"
        min="1"
        max="50"
        required
      />
      <PrimaryButton type="submit">Plant</PrimaryButton>
    </form>
  );
};
