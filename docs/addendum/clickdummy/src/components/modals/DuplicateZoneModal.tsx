/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { Zone, Room } from '../../types/domain';
import { DEVICE_COSTS } from '../../data/constants';
import { FormInput, FormCheckbox } from '../common/Form';
import { PrimaryButton } from '../common/Buttons';

interface DuplicateZoneModalProps {
  onSubmit: (data: {
    zone: Zone;
    room: Room;
    newName: string;
    includeDevices: boolean;
    includeMethod: boolean;
  }) => void;
  zone: Zone;
  room: Room;
}

export const DuplicateZoneModal = ({ onSubmit, zone, room }: DuplicateZoneModalProps) => {
  const [name, setName] = useState(`${zone.name} (Copy)`);
  const [includeDevices, setIncludeDevices] = useState(true);
  const [includeMethod, setIncludeMethod] = useState(true);

  const deviceCost =
    zone.devices?.reduce(
      (total, device) => total + (DEVICE_COSTS[device.name as keyof typeof DEVICE_COSTS] || 0),
      0,
    ) || 0;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ zone, room, newName: name, includeDevices, includeMethod });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput
        label="New Zone Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <div className="space-y-2">
        <FormCheckbox
          label="Duplicate Cultivation Method"
          checked={includeMethod}
          onChange={(e) => setIncludeMethod(e.target.checked)}
        />
        <FormCheckbox
          label={`Duplicate Devices (${deviceCost.toLocaleString()} €)`}
          checked={includeDevices}
          onChange={(e) => setIncludeDevices(e.target.checked)}
        />
      </div>
      <PrimaryButton type="submit">Duplicate Zone</PrimaryButton>
    </form>
  );
};
