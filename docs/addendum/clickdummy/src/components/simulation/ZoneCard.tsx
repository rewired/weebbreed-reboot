/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { Zone } from '../../types/domain';
import { ActionIcons } from '../common/ActionIcons';
import { getZoneAvgProgress } from '../../utils/helpers';

interface ZoneCardProps {
  zone: Zone;
  onClick: () => void;
  onOpenModal: (type: string, props: any) => void;
}

export const ZoneCard = ({ zone, onClick, onOpenModal }: ZoneCardProps) => {
  const avgProgress = getZoneAvgProgress(zone);

  return (
    <div className="bg-stone-700/50 rounded-lg text-left w-full flex flex-col overflow-hidden">
      <button
        onClick={onClick}
        className="p-4 w-full h-full text-left hover:bg-stone-700/50 transition-colors flex-grow"
      >
        <div className="flex-grow">
          <p className="font-semibold">{zone.name}</p>
          <p className="text-xs text-stone-400">
            {zone.strain} - {zone.phase}
          </p>
          <p className="text-xs text-stone-400">{zone.method}</p>
        </div>
        {avgProgress > 0 && (
          <div className="pt-2 mt-auto">
            <div className="w-full bg-stone-600 rounded-full h-1.5">
              <div
                className="bg-lime-500 h-1.5 rounded-full"
                style={{ width: `${avgProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </button>
      <div className="border-t border-stone-600/50">
        <ActionIcons
          className="p-2 justify-end"
          onDuplicate={(e) => {
            e.stopPropagation();
            onOpenModal('duplicateZone', { zone });
          }}
          onDelete={(e) => {
            e.stopPropagation();
            onOpenModal('delete', { entityType: 'zone', entityId: zone.id, entityName: zone.name });
          }}
        />
      </div>
    </div>
  );
};
