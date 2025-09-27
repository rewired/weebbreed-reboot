import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { ZoneSnapshot } from '../../types/simulation';
import { ZoneDetailView } from './ZoneDetailView';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => {
      if (key === 'actions.addPlanting') {
        return 'Add planting';
      }
      if (key === 'actions.installDevice') {
        return 'Install device';
      }
      if (typeof options?.defaultValue === 'string') {
        return options.defaultValue;
      }
      return key;
    },
  }),
}));

const deviceOptionsByZone: Record<string, number> = {};
const strainOptionsByZone: Record<string, number> = {};

vi.mock('../../store', () => ({
  useAppStore: (selector: (state: unknown) => unknown) => selector({}),
  selectDeviceOptionsForZone: (zoneId: string) => () =>
    Array.from({ length: deviceOptionsByZone[zoneId] ?? 0 }),
  selectStrainOptionsForZone: (zoneId: string) => () =>
    Array.from({ length: strainOptionsByZone[zoneId] ?? 0 }),
}));

describe('ZoneDetailView availability indicators', () => {
  it('disables planting and device install actions when no options are returned', () => {
    deviceOptionsByZone['zone-1'] = 0;
    strainOptionsByZone['zone-1'] = 0;

    const zone: ZoneSnapshot = {
      id: 'zone-1',
      name: 'Alpha Zone',
      structureId: 'structure-1',
      structureName: 'Structure One',
      roomId: 'room-1',
      roomName: 'Room One',
      area: 20,
      ceilingHeight: 3,
      volume: 60,
      environment: {
        temperature: 24,
        relativeHumidity: 0.55,
        co2: 950,
        ppfd: 500,
        vpd: 1.1,
      },
      resources: {
        waterLiters: 120,
        nutrientSolutionLiters: 60,
        nutrientStrength: 1.2,
        substrateHealth: 0.9,
        reservoirLevel: 0.8,
      },
      metrics: {
        averageTemperature: 24,
        averageHumidity: 0.55,
        averageCo2: 950,
        averagePpfd: 500,
        stressLevel: 0.1,
        lastUpdatedTick: 0,
      },
      devices: [],
      plants: [],
      health: {
        diseases: 0,
        pests: 0,
        pendingTreatments: 0,
        appliedTreatments: 0,
      },
      lighting: undefined,
      supplyStatus: undefined,
      plantingGroups: [],
      plantingPlan: null,
      deviceGroups: [],
    };

    const markup = renderToStaticMarkup(
      <ZoneDetailView
        zone={zone}
        devices={[]}
        plants={[]}
        onSelectZone={() => {}}
        onRename={() => {}}
        onDuplicate={() => {}}
        onDelete={() => {}}
        onAdjustWater={() => {}}
        onAdjustNutrients={() => {}}
        onOpenPlantingModal={() => {}}
        onOpenAutomationPlanModal={() => {}}
        onOpenDeviceModal={() => {}}
        onHarvestPlant={() => {}}
        onHarvestAll={() => {}}
        onToggleDeviceGroup={() => {}}
        onTogglePlan={() => {}}
      />,
    );

    expect(markup).toContain(
      'disabled="" aria-disabled="true" title="No compatible strains available. Ask your designers to add strain blueprints."',
    );
    expect(markup).toContain('Designers: add strain blueprints to enable planting.');
    expect(markup).toContain(
      'disabled="" aria-disabled="true" title="No compatible devices available. Ask your designers to add device blueprints."',
    );
    expect(markup).toContain('Designers: add device blueprints to enable installations.');
  });
});
