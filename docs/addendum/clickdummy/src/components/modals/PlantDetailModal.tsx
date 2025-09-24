/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { Plant } from '../../types/domain';
import { HarvestIcon, TrashIcon } from '../common/Icons';

interface PlantDetailModalProps {
  plant: Plant;
  onHarvest: () => void;
  onTrash: () => void;
}

export const PlantDetailModal = ({ plant, onHarvest, onTrash }: PlantDetailModalProps) => {
  return (
    <div className="text-stone-300 space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-semibold text-stone-400">Strain:</span> {plant.name}
        </div>
        <div>
          <span className="font-semibold text-stone-400">Health:</span>{' '}
          <span className={plant.health > 80 ? 'text-green-400' : 'text-yellow-400'}>
            {plant.health}%
          </span>
        </div>
        <div>
          <span className="font-semibold text-stone-400">Progress:</span> {plant.progress}%
        </div>
        <div>
          <span className="font-semibold text-stone-400">Stress:</span> {plant.stress}%
        </div>
        <div>
          <span className="font-semibold text-stone-400">Status:</span>{' '}
          <span className="font-semibold capitalize">{plant.status}</span>
        </div>
        <div>
          <span className="font-semibold text-stone-400">Harvestable:</span>{' '}
          {plant.harvestable ? <span className="text-green-400">Yes</span> : 'No'}
        </div>
      </div>
      <div className="flex space-x-2 pt-4 border-t border-stone-700">
        <button
          onClick={onHarvest}
          disabled={!plant.harvestable}
          className="flex-1 flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:bg-stone-600 disabled:cursor-not-allowed"
        >
          <HarvestIcon /> <span>Harvest</span>
        </button>
        <button
          onClick={onTrash}
          className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
        >
          <TrashIcon /> <span>Trash</span>
        </button>
      </div>
    </div>
  );
};
