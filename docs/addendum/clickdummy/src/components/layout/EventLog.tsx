/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { EventLogItem } from '../../types/domain';

interface EventLogProps {
  events: EventLogItem[];
}

export const EventLog = ({ events }: EventLogProps) => {
  const typeClasses: { [key: string]: string } = {
    info: 'text-cyan-400',
    warning: 'text-yellow-400',
    success: 'text-green-400',
    danger: 'text-red-400',
  };
  return (
    <footer className="flex-shrink-0 h-24 bg-stone-900/70 backdrop-blur-sm border-t border-stone-700 p-3 overflow-y-auto">
      <div className="font-mono text-xs space-y-1">
        {events.map((event, i) => (
          <p key={i}>
            <span className="text-stone-500 mr-2">{event.time}</span>{' '}
            <span className={typeClasses[event.type] || 'text-stone-300'}>{event.message}</span>
          </p>
        ))}
      </div>
    </footer>
  );
};
