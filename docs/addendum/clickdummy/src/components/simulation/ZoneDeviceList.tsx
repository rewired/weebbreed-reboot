/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useMemo } from 'react';
import { Device } from '../../types/domain';
import { DeleteIcon } from '../common/Icons';

interface ZoneDeviceListProps {
  devices: Device[];
  onOpenModal: (type: string, props: any) => void;
  zoneId: string;
}

export const ZoneDeviceList = ({ devices, onOpenModal, zoneId }: ZoneDeviceListProps) => {
  const deviceGroups = useMemo(() => {
    return (devices || []).reduce(
      (acc, device) => {
        const key = `${device.name}|${device.type}`;
        if (!acc[key]) {
          acc[key] = { ...device, count: 0, ids: [] };
        }
        acc[key].count++;
        acc[key].ids.push(device.id);
        return acc;
      },
      {} as { [key: string]: Device & { count: number; ids: string[] } },
    );
  }, [devices]);

  return (
    <div className="bg-stone-800/30 rounded-lg p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Devices ({devices.length})</h3>
        <button
          onClick={() => onOpenModal('addDevice', { zoneId })}
          className="bg-blue-600/50 hover:bg-blue-600 text-white text-sm font-semibold py-1 px-3 rounded-md transition-colors"
        >
          Install Device
        </button>
      </div>
      <ul className="space-y-2">
        {Object.values(deviceGroups).map((device) => (
          <li
            key={device.id}
            className="flex items-center justify-between bg-stone-700/40 p-2 rounded-md group"
          >
            <span className="text-sm">{device.name}</span>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-stone-400">{device.type}</span>
              {device.count > 1 && (
                <span className="text-xs font-bold text-cyan-400 bg-cyan-900/50 px-1.5 py-0.5 rounded-full">
                  x{device.count}
                </span>
              )}
              <button
                onClick={() => onOpenModal('removeDevice', { zoneId, device: device })}
                className="text-stone-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <DeleteIcon />
              </button>
            </div>
          </li>
        ))}
        {devices.length === 0 && (
          <p className="text-sm text-stone-500 text-center py-4">No devices installed.</p>
        )}
      </ul>
    </div>
  );
};
