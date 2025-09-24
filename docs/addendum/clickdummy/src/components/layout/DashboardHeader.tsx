/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { GlobalStats } from '../../types/domain';
import { StatCard } from '../common/StatCard';
import {
  ClockIcon,
  DollarIcon,
  PauseIcon,
  PlayIcon,
  HomeIcon,
  BadgeIcon,
  CogIcon,
} from '../common/Icons';

interface DashboardHeaderProps {
  stats: GlobalStats;
  onOpenModal: (type: string) => void;
  isPlaying: boolean;
  gameSpeed: string;
  onTogglePlay: () => void;
  onChangeSpeed: (speed: string) => void;
  onNavigate: (view: 'dashboard' | 'personnel' | 'finance') => void;
}

export const DashboardHeader = ({
  stats,
  onOpenModal,
  isPlaying,
  gameSpeed,
  onTogglePlay,
  onChangeSpeed,
  onNavigate,
}: DashboardHeaderProps) => (
  <header className="flex-shrink-0 bg-stone-900/70 backdrop-blur-sm border-b border-stone-700 p-3">
    <div className="container mx-auto flex justify-between items-center">
      {/* LEFT: Controls */}
      <div className="flex items-center space-x-2 bg-stone-800/50 p-1 rounded-lg">
        <button
          onClick={onTogglePlay}
          className={`p-2 rounded-md transition-colors hover:bg-stone-700 ${isPlaying ? 'text-yellow-400' : 'text-green-400'}`}
          aria-label={isPlaying ? 'Pause game' : 'Play game'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <select
          value={gameSpeed}
          onChange={(e) => onChangeSpeed(e.target.value)}
          className="bg-transparent border-none rounded-md px-2 py-2 text-stone-100 font-semibold focus:ring-0 outline-none"
          aria-label="Game speed"
        >
          <option value="0.5x">0.5x</option>
          <option value="1x">1x</option>
          <option value="10x">10x</option>
          <option value="25x">25x</option>
          <option value="100x">100x</option>
        </select>
      </div>

      {/* CENTER: Nav & Stats */}
      <div className="flex-grow flex justify-center items-center space-x-6">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center space-x-2 p-2 text-stone-400 hover:text-stone-100 rounded-lg"
          aria-label="Structures"
        >
          <HomeIcon /> <span>Structures</span>
        </button>
        <button
          onClick={() => onNavigate('personnel')}
          className="flex items-center space-x-2 p-2 text-stone-400 hover:text-stone-100 rounded-lg"
          aria-label="Personnel"
        >
          <BadgeIcon /> <span>Personnel</span>
        </button>
        <button
          onClick={() => onNavigate('finance')}
          className="flex items-center space-x-2 p-2 text-stone-400 hover:text-stone-100 rounded-lg"
          aria-label="Finances"
        >
          <span className="material-icons-outlined align-middle text-3xl">paid</span>{' '}
          <span>Finances</span>
        </button>

        <div className="h-12 border-l border-stone-700 mx-2"></div>

        <StatCard icon={<ClockIcon />} title="Game Time" value={stats.time} unit="" color="cyan" />
        <StatCard
          icon={<DollarIcon />}
          title="Balance"
          value={stats.balance.toLocaleString()}
          unit="€"
          color="green"
        />
      </div>

      {/* RIGHT: Settings */}
      <button
        onClick={() => onOpenModal('gameMenu')}
        className="p-2 text-stone-400 hover:text-stone-100 rounded-lg"
        aria-label="Game Menu"
      >
        <CogIcon />
      </button>
    </div>
  </header>
);
