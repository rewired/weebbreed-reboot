import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ModalRoot } from './ModalRoot';
import { useAppStore } from '../store';
import type { ZoneSnapshot } from '../types/simulation';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string; count?: number }) => {
      if (key === 'modals.selectStrain') {
        return 'Select strain';
      }
      if (key === 'modals.plantCount') {
        return 'Plant count';
      }
      if (key === 'modals.cancel') {
        return 'Cancel';
      }
      if (key === 'modals.apply') {
        return 'Apply';
      }
      if (key === 'modals.recommendedPlantCount' && typeof options?.count === 'number') {
        return `Recommended: ${options.count} plants`;
      }
      if (typeof options?.defaultValue === 'string') {
        return options.defaultValue;
      }
      return key;
    },
  }),
}));

const initialState = useAppStore.getState();

describe('ModalRoot planting modal', () => {
  beforeEach(() => {
    useAppStore.setState(() => initialState, true);
  });

  it('renders strain options and submits recommended payload', () => {
    const closeModal = vi.fn();
    const issueFacadeIntent = vi.fn();
    const issueControlCommand = vi.fn();
    const setWasRunningBeforeModal = vi.fn();

    const zone: ZoneSnapshot = {
      id: 'zone-1',
      name: 'Alpha',
      structureId: 'structure-1',
      structureName: 'Structure One',
      roomId: 'room-1',
      roomName: 'Room One',
      area: 10,
      ceilingHeight: 3,
      volume: 30,
      cultivationMethodId: 'method-1',
      environment: {
        temperature: 24,
        relativeHumidity: 0.55,
        co2: 900,
        ppfd: 500,
        vpd: 1.1,
      },
      resources: {
        waterLiters: 100,
        nutrientSolutionLiters: 50,
        nutrientStrength: 1,
        substrateHealth: 1,
        reservoirLevel: 0.5,
      },
      metrics: {
        averageTemperature: 24,
        averageHumidity: 0.55,
        averageCo2: 900,
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

    useAppStore.setState((state) => ({
      ...state,
      closeModal,
      issueFacadeIntent,
      issueControlCommand,
      setWasRunningBeforeModal,
      wasRunningBeforeModal: false,
      activeModal: {
        kind: 'planting',
        payload: { zoneId: 'zone-1' },
        title: 'Schedule planting',
      },
      blueprintCatalog: {
        strains: {
          'strain-1': {
            id: 'strain-1',
            slug: 'strain-1',
            name: 'Sunset Haze',
            genotype: { indica: 0.6, sativa: 0.4 },
            chemotype: {},
            morphology: { growthRate: 1, yieldFactor: 1, leafAreaIndex: 1 },
            photoperiod: {
              vegetationTime: 1_209_600,
              floweringTime: 1_209_600,
              transitionTrigger: 0,
            },
            harvestWindow: [60, 90],
            generalResilience: 0.8,
            germinationRate: 0.9,
          },
        },
        devices: {},
        cultivationMethods: {
          'method-1': {
            id: 'method-1',
            name: 'Sea of Green',
            areaPerPlant: 0.5,
            minimumSpacing: 0.5,
          },
        },
      },
      rooms: {
        'room-1': {
          id: 'room-1',
          name: 'Room One',
          structureId: 'structure-1',
          structureName: 'Structure One',
          purposeId: 'grow-room',
          purposeKind: 'grow',
          purposeName: 'Grow',
          purposeFlags: {},
          area: 10,
          height: 3,
          volume: 30,
          cleanliness: 1,
          maintenanceLevel: 1,
          zoneIds: ['zone-1'],
        },
      },
      zones: {
        'zone-1': zone,
      },
    }));

    render(<ModalRoot />);

    const strainSelect = screen.getByLabelText('Select strain');
    expect(strainSelect).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Sunset Haze/ })).toBeInTheDocument();

    const countInput = screen.getByLabelText('Plant count') as HTMLInputElement;
    expect(countInput.value).toBe('20');

    fireEvent.submit(strainSelect.closest('form') as HTMLFormElement);

    expect(issueFacadeIntent).toHaveBeenCalledTimes(1);
    expect(issueFacadeIntent).toHaveBeenCalledWith({
      domain: 'plants',
      action: 'addPlanting',
      payload: {
        zoneId: 'zone-1',
        strainId: 'strain-1',
        count: 20,
      },
    });
    expect(closeModal).toHaveBeenCalled();
  });
});
