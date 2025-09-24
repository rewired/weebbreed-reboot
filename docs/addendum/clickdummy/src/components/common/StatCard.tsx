/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  unit?: string;
  color: string;
}

export const StatCard = ({ icon, title, value, unit, color }: StatCardProps) => (
  <div className="flex items-center space-x-3 p-3 bg-stone-800/50 rounded-lg">
    <div className={`text-${color}-400`}>{icon}</div>
    <div>
      <div className="text-sm text-stone-400">{title}</div>
      <div className="text-lg font-semibold text-stone-100">
        {value} <span className="text-sm text-stone-400">{unit}</span>
      </div>
    </div>
  </div>
);
