/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { Structure, Room } from '../../types/domain';
import { InlineEdit } from '../common/InlineEdit';
import { ZoneCard } from '../simulation/ZoneCard';
import { ActionIcons } from '../common/ActionIcons';
import { GroupIcon } from '../common/Icons';

interface StructureDetailViewProps {
  structure: Structure;
  onNavigate: (level: string, id: string, parentId?: string | null) => void;
  onOpenModal: (type: string, props: any) => void;
  onRename: (details: { entityType: string; entityId: string; newName: string }) => void;
}

export const StructureDetailView = ({
  structure,
  onNavigate,
  onOpenModal,
  onRename,
}: StructureDetailViewProps) => {
  const getRoomYield = (room: Room) =>
    room.zones.reduce((sum, zone) => sum + (zone.estYield || 0), 0);
  const getRoomAvgStress = (room: Room) => {
    const zonesWithStress = room.zones.filter((z) => z.stress !== undefined);
    if (zonesWithStress.length === 0) return 0;
    const totalStress = zonesWithStress.reduce((sum, zone) => sum + zone.stress, 0);
    return totalStress / zonesWithStress.length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-baseline space-x-2">
        <InlineEdit
          value={structure.name}
          onSave={(newName) =>
            onRename({ entityType: 'structure', entityId: structure.id, newName })
          }
          className="text-3xl font-bold text-stone-100"
        />
        <h2 className="text-3xl font-bold text-stone-100">Overview</h2>
      </div>
      <div className="space-y-8">
        {structure.rooms.map((room) => (
          <div key={room.id} className="bg-stone-800/30 rounded-lg flex flex-col">
            <div className="flex-grow">
              <div
                className="p-6 cursor-pointer hover:bg-stone-700/20"
                onClick={() => onNavigate('room', room.id, structure.id)}
              >
                <div className="flex justify-between items-center">
                  <InlineEdit
                    value={room.name}
                    onSave={(newName) =>
                      onRename({ entityType: 'room', entityId: room.id, newName })
                    }
                    className="text-xl font-semibold text-stone-100"
                  />
                  {room.purpose === 'growroom' && (
                    <div className="flex space-x-4 text-sm">
                      <span>
                        Est. Yield:{' '}
                        <span className="font-bold text-green-400">{getRoomYield(room)} g/day</span>
                      </span>
                      <span>
                        Avg. Stress:{' '}
                        <span className="font-bold text-yellow-400">
                          {(getRoomAvgStress(room) * 100).toFixed(0)}%
                        </span>
                      </span>
                    </div>
                  )}
                  {room.purpose === 'breakroom' && room.occupancy && (
                    <div className="flex items-center space-x-2 text-sm">
                      <GroupIcon />
                      <span>
                        Occupancy:{' '}
                        <span className="font-bold text-cyan-400">
                          {room.occupancy.current || 0} / {Math.floor(room.area / 4)}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {room.purpose === 'growroom' && (
                <div className="px-6 pb-6 border-t border-stone-700/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                    {room.zones.map((zone) => (
                      <ZoneCard
                        key={zone.id}
                        zone={zone}
                        onClick={() => onNavigate('zone', zone.id, room.id)}
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
              )}
              {room.purpose === 'processing' && (
                <div className="px-6 pb-6 border-t border-stone-700/50">
                  <div className="space-y-3 mt-4">
                    {room.curingBatches && room.curingBatches.length > 0 ? (
                      <ul className="space-y-3 text-sm">
                        {room.curingBatches.map((batch) => (
                          <li key={batch.id}>
                            <div className="flex justify-between items-center font-semibold">
                              <span className="text-stone-100">
                                {batch.strain} ({batch.yield}g)
                              </span>
                              <span className="text-stone-400">
                                THC: {batch.thc}% | CBD: {batch.cbd}%
                              </span>
                            </div>
                            <div className="w-full bg-stone-700 rounded-full h-2 mt-1.5">
                              <div
                                className="bg-lime-500 h-2 rounded-full"
                                style={{ width: `${batch.progress}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-right text-stone-500 mt-1">
                              {batch.progress}% Cured
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-stone-500 text-center py-4">
                        No batches currently processing.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-stone-700/50">
              <ActionIcons
                className="p-2 justify-end"
                onDuplicate={(e) => {
                  e.stopPropagation();
                  onOpenModal('duplicateRoom', { room });
                }}
                onDelete={(e) => {
                  e.stopPropagation();
                  onOpenModal('delete', {
                    entityType: 'room',
                    entityId: room.id,
                    entityName: room.name,
                  });
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
