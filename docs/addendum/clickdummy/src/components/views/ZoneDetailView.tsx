/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { Zone } from '../../types/domain';
import { InlineEdit } from '../common/InlineEdit';
import { ActionIcons } from '../common/ActionIcons';
import { EnvironmentPanel } from '../simulation/EnvironmentPanel';
import { ZonePlantPanel } from '../simulation/ZonePlantPanel';
import { ZoneDeviceList } from '../simulation/ZoneDeviceList';

interface ZoneDetailViewProps {
  zone: Zone;
  onControlsChange: (
    zoneId: string,
    controlName: string,
    newValue: number | string | boolean,
  ) => void;
  onOpenModal: (type: string, props: any) => void;
  onRename: (details: { entityType: string; entityId: string; newName: string }) => void;
  onBatchAction: (
    zoneId: string,
    plantIds: string[],
    action: 'harvest' | 'trash' | 'treat',
  ) => void;
}

export const ZoneDetailView = ({
  zone,
  onControlsChange,
  onOpenModal,
  onRename,
  onBatchAction,
}: ZoneDetailViewProps) => {
  const hasDetailedView = zone.controls && zone.plants;
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex-grow">
          <InlineEdit
            value={zone.name}
            onSave={(newName) => onRename({ entityType: 'zone', entityId: zone.id, newName })}
            className="text-3xl font-bold text-stone-100"
          />
          <div className="flex items-center space-x-4 text-stone-400 mt-1">
            <span>{zone.method}</span>
            <span className="text-stone-600">|</span>
            <span>{zone.area} m²</span>
            <span className="text-stone-600">|</span>
            <span>
              {zone.plants.length} / {zone.maxPlants || 'N/A'} Plants
            </span>
          </div>
        </div>
        <ActionIcons
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

      {!hasDetailedView ? (
        <div className="flex flex-col flex-1 items-center justify-center bg-stone-800/20 rounded-lg p-6 h-96">
          <p className="text-stone-500">No detailed data available for this zone.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <EnvironmentPanel zone={zone} onUpdate={onControlsChange} />
              <ZonePlantPanel zone={zone} onOpenModal={onOpenModal} onBatchAction={onBatchAction} />
            </div>
            <ZoneDeviceList devices={zone.devices} onOpenModal={onOpenModal} zoneId={zone.id} />
          </div>
        </>
      )}
    </div>
  );
};
