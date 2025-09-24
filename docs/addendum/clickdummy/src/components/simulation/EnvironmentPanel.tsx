/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { Zone, KPI } from '../../types/domain';
import {
  ThermometerIcon,
  DropletIcon,
  SunIcon,
  WindIcon,
  PowerIcon,
  LightCycleIcon,
  NightlightIcon,
  WbSunnyIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '../common/Icons';

// --- SUB-COMPONENTS ---
const ToggleSwitch = ({
  icon,
  label,
  enabled,
  onChange,
  color,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  onChange: () => void;
  color: string;
  disabled?: boolean;
}) => (
  <div
    className={`flex items-center justify-between py-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <div className="flex items-center space-x-3 text-stone-300">
      <span className={`text-${color}-400`}>{icon}</span>
      <span>{label}</span>
    </div>
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? `bg-${color}-500` : 'bg-stone-600'} ${disabled ? 'cursor-not-allowed' : ''}`}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  </div>
);

const LightCycleSlider = ({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) => {
  const [litHours, setLitHours] = useState(() => parseInt(value.split('h/')[0], 10));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLitHours = parseInt(e.target.value, 10);
    setLitHours(newLitHours);
    onChange(`${newLitHours}h/${24 - newLitHours}h`);
  };

  return (
    <div className={`space-y-2 py-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className="flex justify-between items-center text-stone-300">
        <div className="flex items-center space-x-3">
          <span className="text-cyan-400">
            <LightCycleIcon />
          </span>
          <span>Light Cycle</span>
        </div>
        <div className="font-semibold text-stone-100">
          {litHours}h <span className="text-stone-500">/</span> {24 - litHours}h
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-yellow-400">
          <NightlightIcon />
        </span>
        <input
          type="range"
          min={0}
          max={24}
          step={1}
          value={litHours}
          onChange={handleChange}
          disabled={disabled}
          className={`w-full h-2 bg-stone-700 rounded-lg appearance-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        />
        <span className="text-yellow-400">
          <WbSunnyIcon />
        </span>
      </div>
    </div>
  );
};

const EnvironmentControlRow = ({
  icon,
  label,
  value,
  unit,
  min,
  max,
  step,
  target,
  tolerance,
  color,
  onChange,
  disabled = false,
}: any) => {
  const isOptimal = Math.abs(value - target) <= tolerance;
  const valueColor = isOptimal ? 'text-green-400' : 'text-yellow-400';

  return (
    <div className={`py-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3 text-stone-300">
          <span className={`text-${color}-400`}>{icon}</span>
          <span>{label}</span>
        </div>
        <div className={`font-semibold ${valueColor}`}>
          {value.toFixed(label === 'Temperature' ? 1 : 0)}{' '}
          <span className="text-stone-400">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full h-2 bg-stone-700 rounded-lg appearance-none mt-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      />
    </div>
  );
};

const MetricDisplayRow = ({
  icon,
  title,
  value,
  unit,
  status,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  unit: string;
  status: KPI['status'];
}) => {
  const statusColors = {
    optimal: 'text-green-400',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
  };
  return (
    <div className="flex items-center justify-between py-2 text-stone-300">
      <div className="flex items-center space-x-3">
        {icon}
        <span>{title}</span>
      </div>
      <div className={`font-semibold ${statusColors[status] || 'text-stone-100'}`}>
        {value} <span className="text-stone-400">{unit}</span>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
interface EnvironmentPanelProps {
  zone: Zone;
  onUpdate: (zoneId: string, controlName: string, newValue: number | string | boolean) => void;
}

export const EnvironmentPanel = ({ zone, onUpdate }: EnvironmentPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { controls, devices = [], id: zoneId, kpis = [] } = zone;

  const hasDevice = (type: string) => devices.some((d) => d.type === type);

  const hasHVAC = hasDevice('HVAC');
  const hasClimate = hasDevice('Climate');
  const hasLighting = hasDevice('Lighting');

  const ppfd = kpis.find((k) => k.title === 'PPFD');
  const vpd = kpis.find((k) => k.title === 'VPD');

  if (!controls) return null;

  const isTempOptimal = Math.abs(controls.temperature.value - controls.temperature.target) <= 1;
  const isHumidityOptimal = Math.abs(controls.humidity.value - controls.humidity.target) <= 5;

  if (!isExpanded) {
    return (
      <div className="bg-stone-800/30 rounded-lg">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex justify-between items-center p-6 text-left"
        >
          <h3 className="text-xl font-semibold">Environment</h3>
          <div className="flex items-center gap-6 text-sm">
            <div
              className={`flex items-center gap-1 ${!isTempOptimal ? 'text-yellow-400' : 'text-green-400'}`}
            >
              <ThermometerIcon /> {controls.temperature.value.toFixed(1)}°C
            </div>
            <div
              className={`flex items-center gap-1 ${!isHumidityOptimal ? 'text-yellow-400' : 'text-blue-400'}`}
            >
              <DropletIcon /> {controls.humidity.value.toFixed(0)}%
            </div>
            <div className="flex items-center gap-1 text-yellow-400">
              <SunIcon /> {ppfd?.value || 0} µmol
            </div>
            <div className="flex items-center gap-1 text-cyan-400">
              <LightCycleIcon /> {controls.light.cycle}
            </div>
            <ChevronRightIcon className="text-stone-400" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-stone-800/30 rounded-lg">
      <button
        onClick={() => setIsExpanded(false)}
        className="w-full flex justify-between items-center p-6 text-left"
      >
        <h3 className="text-xl font-semibold">Environment</h3>
        <ChevronDownIcon />
      </button>
      <div className="px-6 pb-6 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div className="space-y-2">
            <EnvironmentControlRow
              icon={<ThermometerIcon />}
              label="Temperature"
              value={controls.temperature.value}
              min={controls.temperature.min}
              max={controls.temperature.max}
              step="0.1"
              unit="°C"
              color="yellow"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdate(zoneId, 'temperature', parseFloat(e.target.value))
              }
              disabled={!hasHVAC}
              target={controls.temperature.target}
              tolerance={1}
            />
            <EnvironmentControlRow
              icon={<DropletIcon />}
              label="Humidity"
              value={controls.humidity.value}
              min={controls.humidity.min}
              max={controls.humidity.max}
              step="1"
              unit="%"
              color="blue"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdate(zoneId, 'humidity', parseInt(e.target.value))
              }
              disabled={!hasHVAC}
              target={controls.humidity.target}
              tolerance={5}
            />
            <EnvironmentControlRow
              icon={<WindIcon />}
              label="CO₂"
              value={controls.co2.value}
              min={controls.co2.min}
              max={controls.co2.max}
              step="10"
              unit="ppm"
              color="gray"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdate(zoneId, 'co2', parseInt(e.target.value))
              }
              disabled={!hasClimate}
              target={controls.co2.target}
              tolerance={100}
            />
          </div>
          <div className="space-y-2">
            <ToggleSwitch
              icon={<PowerIcon />}
              label="Light System"
              enabled={controls.light.on}
              onChange={() => onUpdate(zoneId, 'lightState', !controls.light.on)}
              color="green"
              disabled={!hasLighting}
            />
            <EnvironmentControlRow
              icon={<SunIcon />}
              label="Light Power"
              value={controls.light.power}
              min={0}
              max={100}
              step="1"
              unit="%"
              color="yellow"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdate(zoneId, 'lightPower', parseInt(e.target.value))
              }
              disabled={!controls.light.on || !hasLighting}
              target={100}
              tolerance={100}
            />
            <LightCycleSlider
              value={controls.light.cycle}
              onChange={(val) => onUpdate(zoneId, 'lightCycle', val)}
              disabled={!hasLighting}
            />
            {ppfd && (
              <MetricDisplayRow
                icon={<SunIcon />}
                title={ppfd.title}
                value={ppfd.value}
                unit={ppfd.unit}
                status={ppfd.status}
              />
            )}
            {vpd && (
              <MetricDisplayRow
                icon={
                  <span className="material-icons-outlined text-purple-400 align-middle text-xl">
                    science
                  </span>
                }
                title={vpd.title}
                value={vpd.value}
                unit={vpd.unit}
                status={vpd.status}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
