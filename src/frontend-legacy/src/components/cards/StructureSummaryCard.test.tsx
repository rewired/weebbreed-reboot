import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import StructureSummaryCard from './StructureSummaryCard';
import type { StructureSnapshot } from '@/types/simulation';

const baseStructure = {
  id: 'structure-1',
  name: 'North Facility',
  status: 'active',
  footprint: { length: 40, width: 20, height: 6, area: 800, volume: 4800 },
  rentPerTick: 1250,
  roomIds: ['room-1', 'room-2'],
} satisfies StructureSnapshot;

describe('StructureSummaryCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders metadata, metrics and status pills', () => {
    render(
      <StructureSummaryCard
        structure={baseStructure}
        roomCount={2}
        zoneCount={4}
        plantCount={128}
        averageTemperature={24.5}
        averageHumidity={0.62}
        averageCo2={980}
        averagePpfd={540}
        averageStress={0.18}
        averageLightingCoverage={0.84}
      />,
    );

    expect(screen.getByText('North Facility')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('2 rooms • 4 zones')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Footprint area')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('800 m²')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Footprint volume')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('4,800 m³')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Rent per tick')).toBeInstanceOf(HTMLElement);
    const rentMatcher = (content: string) =>
      content.replace(/\s/g, '') === '€1,250'.replace(/\s/g, '');
    expect(screen.getByText(rentMatcher)).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Plants')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('128')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Active')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('24.5 °C')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('62%')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('980 ppm')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('540 μmol·m⁻²·s⁻¹')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('18%')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('84%')).toBeInstanceOf(HTMLElement);
  });

  it('invokes the selection callback when clicked', () => {
    const handleSelect = vi.fn();
    const { container } = render(
      <StructureSummaryCard
        structure={baseStructure}
        roomCount={2}
        zoneCount={4}
        onSelect={handleSelect}
      />,
    );

    fireEvent.click(container.firstElementChild as HTMLElement);

    expect(handleSelect).toHaveBeenCalledWith('structure-1');
  });

  it('matches the snapshot for highlighted structures', () => {
    const { container } = render(
      <StructureSummaryCard
        structure={{ ...baseStructure, status: 'underConstruction' }}
        roomCount={0}
        zoneCount={0}
        averageStress={0.5}
        averageLightingCoverage={0.3}
        isSelected
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });
});
