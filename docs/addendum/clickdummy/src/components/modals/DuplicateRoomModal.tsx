/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { Room, Structure } from '../../types/domain';
import { DEVICE_COSTS } from '../../data/constants';
import { FormInput } from '../common/Form';
import { PrimaryButton } from '../common/Buttons';

interface DuplicateRoomModalProps {
  onSubmit: (data: { room: Room; newName: string; deviceCost: number }) => void;
  room: Room;
  structure: Structure;
}

export const DuplicateRoomModal = ({ onSubmit, room, structure }: DuplicateRoomModalProps) => {
  const [name, setName] = useState(`${room.name} (Copy)`);
  const availableArea = structure.totalArea - structure.usedArea;
  const canDuplicate = room.area <= availableArea;
  const deviceCost = room.zones.reduce((total, zone) => {
    return (
      total +
      (zone.devices?.reduce((zoneTotal, device) => {
        return zoneTotal + (DEVICE_COSTS[device.name as keyof typeof DEVICE_COSTS] || 0);
      }, 0) || 0)
    );
  }, 0);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ room, newName: name, deviceCost });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput
        label="New Room Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <div className="text-sm space-y-1 text-stone-300">
        <p>
          Required Area: <span className="font-semibold">{room.area} m²</span>
        </p>
        <p className={canDuplicate ? 'text-green-400' : 'text-red-400'}>
          Available Area: <span className="font-semibold">{availableArea} m²</span>
        </p>
        <p>
          Device Duplication Cost (CapEx):{' '}
          <span className="font-semibold text-yellow-400">{deviceCost.toLocaleString()} €</span>
        </p>
      </div>
      <PrimaryButton type="submit" disabled={!canDuplicate}>
        Duplicate Room
      </PrimaryButton>
    </form>
  );
};
