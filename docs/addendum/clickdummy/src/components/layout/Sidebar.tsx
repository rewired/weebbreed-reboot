/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { Structure, Selection } from '../../types/domain';
import { ChevronDownIcon, PlusIcon } from '../common/Icons';

interface SidebarProps {
  structures: Structure[];
  selection: Selection;
  onNavigate: (
    level: string,
    id: string,
    parentId?: string | null,
    grandParentId?: string | null,
  ) => void;
  onOpenModal: (type: string, props?: any) => void;
}

export const Sidebar = ({ structures, selection, onNavigate, onOpenModal }: SidebarProps) => {
  const selectedStructure = structures.find((s) => s.id === selection.structureId);

  return (
    <aside className="w-80 flex-shrink-0 bg-stone-800/50 p-4 border-r border-stone-700 overflow-y-auto space-y-4">
      {!selectedStructure ? (
        <div className="text-center text-stone-500 p-4 mt-4">
          <p>Select a structure from the dashboard to see its rooms.</p>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-2">
            <button
              onClick={() => onNavigate('structure', selectedStructure.id)}
              className="text-lg font-semibold text-stone-300 hover:text-lime-400 transition-colors"
            >
              {selectedStructure.name}
            </button>
            <button
              onClick={() => onOpenModal('addRoom', { structureId: selectedStructure.id })}
              className="text-stone-400 hover:text-stone-100"
              aria-label="Add Room"
            >
              <PlusIcon />
            </button>
          </div>
          <nav>
            <ul>
              {selectedStructure.rooms.map((room) => (
                <li key={room.id} className="mb-2">
                  <div className="flex items-center justify-between text-stone-400 group">
                    <button
                      onClick={() => onNavigate('room', room.id, selectedStructure.id)}
                      className="flex items-center flex-grow text-left p-1 rounded-md hover:bg-stone-700/50 transition-colors"
                    >
                      <ChevronDownIcon />
                      <span className="ml-1 font-semibold">{room.name}</span>
                      <span className="ml-2 text-xs text-stone-500">({room.area}m²)</span>
                    </button>
                    {room.purpose === 'growroom' && (
                      <button
                        onClick={() => onOpenModal('addZone', { roomId: room.id })}
                        className="text-stone-400 hover:text-stone-100 p-1"
                        aria-label="Add Zone"
                      >
                        <PlusIcon />
                      </button>
                    )}
                  </div>
                  {room.zones && room.zones.length > 0 && (
                    <ul className="mt-1 ml-4 pl-2 border-l border-stone-600">
                      {room.zones.map((zone) => (
                        <li key={zone.id}>
                          <button
                            onClick={() =>
                              onNavigate('zone', zone.id, room.id, selectedStructure.id)
                            }
                            className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${selection.zoneId === zone.id && selection.roomId === room.id ? 'bg-lime-600/30 text-lime-300' : 'hover:bg-stone-700/50'}`}
                            aria-current={selection.zoneId === zone.id}
                          >
                            {zone.name}{' '}
                            <span className="text-xs text-stone-500">
                              {zone.method ? `(${zone.method})` : ''}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </aside>
  );
};
