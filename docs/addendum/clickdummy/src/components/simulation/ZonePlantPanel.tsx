/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo } from 'react';
import { Zone } from '../../types/domain';
import { FormSelect } from '../common/Form';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  BugIcon,
  SickIcon,
  HealingIcon,
  HarvestIcon,
  CheckIcon,
} from '../common/Icons';

// --- SUB-COMPONENTS ---
const PlantStatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'pest':
      return (
        <div className="absolute top-1 right-1 text-red-500" title="Pest">
          <BugIcon />
        </div>
      );
    case 'disease':
      return (
        <div className="absolute top-1 right-1 text-purple-500" title="Disease">
          <SickIcon />
        </div>
      );
    case 'treatment':
      return (
        <div className="absolute top-1 right-1 text-blue-500" title="Treatment">
          <HealingIcon />
        </div>
      );
    default:
      return null;
  }
};

const BatchActionBar = ({
  selectedCount,
  onHarvest,
  onTrash,
  onTreat,
}: {
  selectedCount: number;
  onHarvest: () => void;
  onTrash: () => void;
  onTreat: () => void;
}) => (
  <div className="bg-stone-700/50 p-2 rounded-md mb-4 flex justify-between items-center">
    <p className="text-sm font-semibold">
      {selectedCount} plant{selectedCount > 1 ? 's' : ''} selected
    </p>
    <div className="space-x-2">
      <button
        onClick={onHarvest}
        className="text-xs bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-2 rounded-md transition-colors"
      >
        Harvest
      </button>
      <button
        onClick={onTrash}
        className="text-xs bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-2 rounded-md transition-colors"
      >
        Trash
      </button>
      <button
        onClick={onTreat}
        className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-2 rounded-md transition-colors"
      >
        Treat
      </button>
    </div>
  </div>
);

// --- MAIN COMPONENT ---
interface ZonePlantPanelProps {
  zone: Zone;
  onOpenModal: (type: string, props: any) => void;
  onBatchAction: (
    zoneId: string,
    plantIds: string[],
    action: 'harvest' | 'trash' | 'treat',
  ) => void;
}

export const ZonePlantPanel = ({ zone, onOpenModal, onBatchAction }: ZonePlantPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPlantIds, setSelectedPlantIds] = useState<Set<string>>(new Set());

  const strainSummary = useMemo(() => {
    if (!zone.plants || zone.plants.length === 0) return null;
    const counts = zone.plants.reduce(
      (acc, plant) => {
        acc[plant.name] = (acc[plant.name] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    return Object.entries(counts)
      .map(([name, count]) => `${name} (${count})`)
      .join(', ');
  }, [zone.plants]);

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedPlantIds(new Set());
  };

  const handleTogglePlantSelection = (plantId: string) => {
    setSelectedPlantIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(plantId)) {
        newSet.delete(plantId);
      } else {
        newSet.add(plantId);
      }
      return newSet;
    });
  };

  const handleBatchActionAndExit = (action: 'harvest' | 'trash' | 'treat') => {
    onBatchAction(zone.id, Array.from(selectedPlantIds), action);
    handleToggleSelectionMode();
  };

  return (
    <div className="bg-stone-800/30 rounded-lg">
      <button
        onClick={() => setIsExpanded((p) => !p)}
        className="w-full flex justify-between items-center p-6 text-left"
      >
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-semibold">Plants ({zone.plants.length})</h3>
        </div>
        {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
      </button>
      {isExpanded && (
        <div className="px-6 pb-6 pt-0">
          <div className="border-b border-stone-700 pb-4 mb-4">
            {strainSummary && (
              <div className="text-sm text-stone-400 mb-4">
                <span className="font-semibold text-stone-300">Strains:</span> {strainSummary}
              </div>
            )}
            <div className="flex justify-between items-end">
              <div className="flex items-end space-x-4">
                <FormSelect label="Sort by">
                  <option>Health</option>
                  <option>Progress</option>
                  <option>Stress</option>
                </FormSelect>
                <FormSelect label="Filter by">
                  <option>All</option>
                  <option>Harvestable</option>
                  <option>Sick</option>
                  <option>Stressed</option>
                </FormSelect>
              </div>
              <div className="space-x-2">
                <button
                  onClick={handleToggleSelectionMode}
                  className="bg-blue-600/50 hover:bg-blue-600 text-white text-sm font-semibold py-2 px-3 rounded-md transition-colors"
                >
                  {isSelectionMode ? 'Cancel Selection' : 'Select Plants'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenModal('plantStrain', { zoneId: zone.id });
                  }}
                  className="bg-green-600/50 hover:bg-green-600 text-white text-sm font-semibold py-2 px-3 rounded-md transition-colors"
                >
                  Plant New
                </button>
              </div>
            </div>
          </div>

          {isSelectionMode && selectedPlantIds.size > 0 && (
            <BatchActionBar
              selectedCount={selectedPlantIds.size}
              onHarvest={() => handleBatchActionAndExit('harvest')}
              onTrash={() => handleBatchActionAndExit('trash')}
              onTreat={() => handleBatchActionAndExit('treat')}
            />
          )}

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-16 gap-3">
            {zone.plants.map((plant, index) => {
              const isSelected = selectedPlantIds.has(plant.id);
              return (
                <div
                  key={plant.id}
                  className={`relative aspect-square flex items-center justify-center bg-stone-700/50 rounded-md group cursor-pointer transition-all
                                        ${isSelected ? 'border-2 border-green-500' : ''}
                                        ${isSelectionMode ? 'hover:bg-stone-700' : ''}
                                    `}
                  title={`Plant ${index + 1} | ${plant.name} | Health: ${plant.health}% | Status: ${plant.status}`}
                  onClick={() =>
                    isSelectionMode
                      ? handleTogglePlantSelection(plant.id)
                      : onOpenModal('plantDetail', { plant: plant, zoneId: zone.id })
                  }
                >
                  {!isSelectionMode && (
                    <div className="absolute inset-0 bg-lime-500/30 rounded-md transition-opacity opacity-0 group-hover:opacity-100"></div>
                  )}
                  <span className="material-icons-outlined text-lime-500 text-4xl">eco</span>
                  <PlantStatusIcon status={plant.status} />
                  {plant.harvestable && (
                    <div className="absolute bottom-1 left-1 text-green-400" title="Harvestable">
                      <HarvestIcon className="text-base" />
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 bg-green-900/50 flex items-center justify-center rounded-md">
                      <span className="text-green-400">
                        <CheckIcon />
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
