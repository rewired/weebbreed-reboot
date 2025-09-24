/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { Candidate, Structure } from '../../types/domain';
import { FormSelect } from '../common/Form';
import { PrimaryButton } from '../common/Buttons';

interface HireEmployeeModalProps {
  onSubmit: (data: { candidate: Candidate; structureId: string }) => void;
  candidate: Candidate;
  structures: Structure[];
  onClose: () => void;
}

export const HireEmployeeModal = ({ onSubmit, candidate, structures }: HireEmployeeModalProps) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const structureId = formData.get('assignment') as string;
    onSubmit({ candidate, structureId });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p>
        Hiring <span className="font-semibold text-stone-100">{candidate.name}</span> as a{' '}
        <span className="font-semibold text-lime-400">{candidate.desiredRole}</span>.
      </p>
      <FormSelect
        name="assignment"
        label="Assign to Structure"
        defaultValue={structures[0]?.id || ''}
      >
        {structures.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </FormSelect>
      <PrimaryButton type="submit">Confirm Hire</PrimaryButton>
    </form>
  );
};
