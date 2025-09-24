/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { Structure } from '../../types/domain';
import { getStructureYield } from '../../utils/helpers';
import { InlineEdit } from '../common/InlineEdit';
import { StoreIcon } from '../common/Icons';

interface DashboardViewProps {
  structures: Structure[];
  onNavigate: (level: string, id: string) => void;
  onOpenModal: (type: string, props?: any) => void;
  onRename: (details: { entityType: string; entityId: string; newName: string }) => void;
}

export const DashboardView = ({
  structures,
  onNavigate,
  onOpenModal,
  onRename,
}: DashboardViewProps) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-stone-100">Structures Dashboard</h2>
        <button
          onClick={() => onOpenModal('rentStructure')}
          className="flex items-center space-x-2 bg-lime-600 hover:bg-lime-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
        >
          <StoreIcon />
          <span>Rent New Structure</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {structures.map((structure) => (
          <div
            key={structure.id}
            className="bg-stone-800/30 rounded-lg p-6 flex flex-col justify-between"
          >
            <div>
              <InlineEdit
                value={structure.name}
                onSave={(newName) =>
                  onRename({ entityType: 'structure', entityId: structure.id, newName })
                }
                className="text-xl font-semibold text-stone-100 mb-2 block"
              />
              <div className="space-y-1 text-sm text-stone-400">
                <p>
                  Area:{' '}
                  <span className="font-semibold text-stone-200">
                    {structure.usedArea} / {structure.totalArea} m²
                  </span>
                </p>
                <p>
                  Est. Yield:{' '}
                  <span className="font-semibold text-green-400">
                    {getStructureYield(structure)} g/day
                  </span>
                </p>
                <p>
                  Daily Cost:{' '}
                  <span className="font-semibold text-yellow-400">
                    {structure.dailyCost.toLocaleString()} €
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('structure', structure.id)}
              className="mt-4 w-full bg-lime-600/20 hover:bg-lime-600/40 text-lime-300 py-2 rounded-md transition-colors"
            >
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
