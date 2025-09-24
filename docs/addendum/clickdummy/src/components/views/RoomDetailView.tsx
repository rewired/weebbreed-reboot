/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { Room, Structure } from '../../types/domain';
import { InlineEdit } from '../common/InlineEdit';
import { ActionIcons } from '../common/ActionIcons';
import { ZoneCard } from '../simulation/ZoneCard';

interface RoomDetailViewProps {
  room: Room;
  structure: Structure;
  onNavigate: (
    level: string,
    id: string,
    parentId?: string | null,
    grandParentId?: string | null,
  ) => void;
  onRename: (details: { entityType: string; entityId: string; newName: string }) => void;
  onOpenModal: (type: string, props: any) => void;
}

export const RoomDetailView = ({
  room,
  structure,
  onNavigate,
  onRename,
  onOpenModal,
}: RoomDetailViewProps) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex-grow">
          <InlineEdit
            value={room.name}
            onSave={(newName) => onRename({ entityType: 'room', entityId: room.id, newName })}
            className="text-3xl font-bold text-stone-100"
          />
          <div className="flex items-center space-x-4 text-stone-400 mt-1">
            <span>Purpose: {room.purpose}</span>
            <span className="text-stone-600">|</span>
            <span>Area: {room.area} m²</span>
          </div>
        </div>
        <ActionIcons
          onDuplicate={(e) => {
            e.stopPropagation();
            onOpenModal('duplicateRoom', { room });
          }}
          onDelete={(e) => {
            e.stopPropagation();
            onOpenModal('delete', { entityType: 'room', entityId: room.id, entityName: room.name });
          }}
        />
      </div>
      <div className="bg-stone-800/30 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-stone-100 mb-4">Zones</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {room.zones.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              onClick={() => onNavigate('zone', zone.id, room.id, structure.id)}
              onOpenModal={onOpenModal}
            />
          ))}
          {room.zones.length === 0 && (
            <p className="text-sm text-stone-500 col-span-full text-center py-4">
              No zones created in this room.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
