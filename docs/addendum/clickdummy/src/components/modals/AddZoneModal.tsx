/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { FormInput, FormSelect } from '../common/Form';
import { PrimaryButton } from '../common/Buttons';

interface AddZoneModalProps {
  onSubmit: (data: { roomId: string; name: string; method: string }) => void;
  roomId: string;
  onClose: () => void;
}

export const AddZoneModal = ({ onSubmit, roomId }: AddZoneModalProps) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit({
      roomId,
      name: formData.get('name') as string,
      method: formData.get('method') as string,
    });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput name="name" label="Zone Name" placeholder="e.g., Zone C1" required />
      <FormSelect name="method" label="Cultivation Method" defaultValue="Sea of Green">
        <option>Sea of Green</option>
        <option>SCROG</option>
        <option>Empty</option>
      </FormSelect>
      <PrimaryButton type="submit">Create Zone</PrimaryButton>
    </form>
  );
};
