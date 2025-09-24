/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { DangerButton } from '../common/Buttons';

interface DeleteConfirmationModalProps {
  entityType: string;
  entityName: string;
  onConfirm: () => void;
}

export const DeleteConfirmationModal = ({
  entityType,
  entityName,
  onConfirm,
}: DeleteConfirmationModalProps) => (
  <div className="space-y-4">
    <p className="text-stone-300">
      Are you sure you want to delete the {entityType}{' '}
      <span className="font-semibold text-stone-100">{entityName}</span>?
    </p>
    <p className="text-sm text-yellow-400">This action cannot be undone.</p>
    <DangerButton onClick={onConfirm}>Confirm Deletion</DangerButton>
  </div>
);
