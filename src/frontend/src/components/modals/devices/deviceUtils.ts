import type { DeviceBlueprint } from '@/facade/systemFacade';

export interface CoverageCapacity {
  area?: { value: number; derived: boolean; referenceHeight?: number };
  volume?: { value: number };
}

const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const resolveCoverageCapacity = (
  device: DeviceBlueprint | null | undefined,
  context?: { zoneHeight?: number | null; roomHeight?: number | null },
): CoverageCapacity | null => {
  if (!device) {
    return null;
  }

  const coverage = device.coverage ?? {};
  const areaFromCoverage = asNumber((coverage as Record<string, unknown>).maxArea_m2);
  const fallbackCoverageArea = asNumber((coverage as Record<string, unknown>).coverageArea);
  const areaFromDefaults = asNumber(
    (device.defaults?.settings as Record<string, unknown> | undefined)?.coverageArea,
  );
  const areaFromSettings = asNumber(
    (device.settings as Record<string, unknown> | undefined)?.coverageArea,
  );

  const volumeFromCoverage = asNumber((coverage as Record<string, unknown>).maxVolume_m3);

  const capacity: CoverageCapacity = {};

  const resolvedArea =
    areaFromCoverage ?? fallbackCoverageArea ?? areaFromDefaults ?? areaFromSettings ?? null;
  if (resolvedArea !== null) {
    capacity.area = { value: resolvedArea, derived: false };
  }

  if (volumeFromCoverage !== null) {
    capacity.volume = { value: volumeFromCoverage };
  }

  if (!capacity.area && capacity.volume) {
    const height = asNumber(context?.zoneHeight) ?? asNumber(context?.roomHeight);
    if (height && height > 0) {
      const derivedArea = capacity.volume.value / height;
      if (Number.isFinite(derivedArea)) {
        capacity.area = { value: derivedArea, derived: true, referenceHeight: height };
      }
    }
  }

  if (!capacity.area && !capacity.volume) {
    return null;
  }

  return capacity;
};

export interface TargetFieldDefinition {
  key: string;
  label: string;
  helper?: string;
  step?: string;
  validate?: (value: number) => string | null;
  defaultValue: number;
}

const TARGET_FIELD_TEMPLATES: {
  keys: string[];
  label: string;
  helper?: string;
  step?: string;
  validate?: (value: number) => string | null;
}[] = [
  {
    keys: ['targetTemperature', 'temperatureTarget'],
    label: 'Target temperature (°C)',
    step: '0.1',
  },
  {
    keys: ['targetHumidity', 'targetRelativeHumidity', 'humidityTarget'],
    label: 'Target humidity (0–1)',
    step: '0.01',
    validate: (value) => (value < 0 || value > 1 ? 'Enter a value between 0 and 1.' : null),
  },
  {
    keys: ['targetCO2', 'targetCo2', 'co2Target'],
    label: 'Target CO₂ (ppm)',
    validate: (value) => (value < 0 ? 'Value must be non-negative.' : null),
  },
  {
    keys: ['ppfd', 'targetPpfd', 'lightTarget'],
    label: 'Target PPFD (µmol·m⁻²·s⁻¹)',
    validate: (value) => (value < 0 ? 'Value must be non-negative.' : null),
  },
];

export const deriveTargetFields = (device: DeviceBlueprint | null): TargetFieldDefinition[] => {
  if (!device) {
    return [];
  }
  const defaults =
    (device.defaults?.settings as Record<string, unknown> | undefined) ??
    (device.settings as Record<string, unknown> | undefined) ??
    {};

  const derived: TargetFieldDefinition[] = [];

  for (const template of TARGET_FIELD_TEMPLATES) {
    const matchedKey = template.keys.find(
      (candidate) =>
        typeof defaults[candidate] === 'number' && Number.isFinite(defaults[candidate]),
    );
    if (!matchedKey) {
      continue;
    }
    derived.push({
      key: matchedKey,
      label: template.label,
      helper: template.helper,
      step: template.step,
      validate: template.validate,
      defaultValue: defaults[matchedKey] as number,
    });
  }

  return derived;
};

export const MIN_DEVICE_QUANTITY = 1;
export const MAX_DEVICE_QUANTITY = 20;

export const clampQuantity = (value: number) =>
  Math.min(MAX_DEVICE_QUANTITY, Math.max(MIN_DEVICE_QUANTITY, Math.floor(value)));
