import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RoomView } from '../RoomView';
import { useSimulationStore } from '@/store/simulation';
import { useNavigationStore } from '@/store/navigation';
import { useUIStore } from '@/store/ui';
import { quickstartSnapshot } from '@/data/mockTelemetry';

const methodCatalogEntry = {
  id: 'method-sog',
  name: 'Sea of Green',
  laborIntensity: 1,
  areaPerPlant: 0.5,
  minimumSpacing: 0.5,
  compatibility: {},
};

const substrateCatalogEntry = {
  id: 'substrate-coco-mix',
  slug: 'coco-blend',
  name: 'Coco Coir',
  type: 'coco',
};

describe('RoomView', () => {
  beforeEach(() => {
    const snapshot = structuredClone(quickstartSnapshot);
    useSimulationStore.getState().reset();
    useSimulationStore.setState({
      snapshot,
      catalogs: {
        cultivationMethods: { status: 'ready', data: [methodCatalogEntry], error: null },
        containers: { status: 'ready', data: [], error: null },
        substrates: { status: 'ready', data: [substrateCatalogEntry], error: null },
      },
    });

    useNavigationStore.getState().reset();
    useNavigationStore.setState({
      selectedStructureId: snapshot.structures[0]!.id,
      selectedRoomId: snapshot.rooms[0]!.id,
    });

    useUIStore.setState({ activeModal: null, modalQueue: [] });
  });

  afterEach(() => {
    cleanup();
    useSimulationStore.getState().reset();
    useNavigationStore.getState().reset();
    useUIStore.setState({ activeModal: null, modalQueue: [] });
  });

  it('renders duplicate and delete zone icon buttons', () => {
    render(<RoomView />);

    expect(screen.getByLabelText(/Duplicate North Canopy/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Delete North Canopy/i)).toBeInTheDocument();
  });

  it('omits reservoir status rows from zone cards', () => {
    render(<RoomView />);

    expect(screen.queryByText(/Reservoir/i)).not.toBeInTheDocument();
  });

  it('shows cultivation method and substrate names when catalogs are ready', () => {
    render(<RoomView />);

    expect(screen.getByText(/Method Sea of Green · Substrate Coco Coir/i)).toBeInTheDocument();
  });
});
