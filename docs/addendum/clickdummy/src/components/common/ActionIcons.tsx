/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { DuplicateIcon, DeleteIcon } from './Icons';

interface ActionIconsProps {
  onDuplicate: (event: React.MouseEvent) => void;
  onDelete: (event: React.MouseEvent) => void;
  className?: string;
}

export const ActionIcons = ({ onDuplicate, onDelete, className = '' }: ActionIconsProps) => (
  <div className={`flex items-center space-x-1 ${className}`}>
    <button
      onClick={onDuplicate}
      className="p-1.5 bg-stone-800/80 hover:bg-blue-600 rounded-md text-stone-300 hover:text-white transition-colors"
      title="Duplicate"
    >
      <DuplicateIcon />
    </button>
    <button
      onClick={onDelete}
      className="p-1.5 bg-stone-800/80 hover:bg-red-600 rounded-md text-stone-300 hover:text-white transition-colors"
      title="Delete"
    >
      <DeleteIcon />
    </button>
  </div>
);
