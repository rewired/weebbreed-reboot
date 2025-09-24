/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';

export const GameMenuModal = () => (
  <div className="space-y-2">
    <button className="w-full text-left p-2 hover:bg-stone-700 rounded-md">Save Game</button>
    <button className="w-full text-left p-2 hover:bg-stone-700 rounded-md">Load Game</button>
    <button className="w-full text-left p-2 hover:bg-stone-700 rounded-md">Export Snapshot</button>
    <button className="w-full text-left p-2 hover:bg-stone-700 rounded-md">Import Snapshot</button>
    <hr className="border-stone-600" />
    <button className="w-full text-left p-2 text-red-400 hover:bg-red-500/20 rounded-md">
      Reset Game
    </button>
  </div>
);
