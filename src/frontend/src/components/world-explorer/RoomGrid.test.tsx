import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { RoomSnapshot } from '@/types/simulation';
import { RoomGrid, type RoomSummary } from './RoomGrid';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => {
      if (key === 'labels.roomPurposes.lab') {
        return 'Translated Lab';
      }
      if (typeof options?.defaultValue === 'string') {
        return options.defaultValue;
      }
      return key;
    },
  }),
}));

describe('RoomGrid', () => {
  it('renders the room purpose from snapshot metadata', () => {
    const room: RoomSnapshot = {
      id: 'room-1',
      name: 'Lab Alpha',
      structureId: 'structure-1',
      structureName: 'Structure A',
      purposeId: 'purpose-lab',
      purposeKind: 'lab',
      purposeName: 'Laboratory',
      purposeFlags: { supportsResearch: true },
      area: 100,
      height: 4,
      volume: 400,
      cleanliness: 0.95,
      maintenanceLevel: 0.9,
      zoneIds: [],
    };

    const summary: RoomSummary = {
      room,
      zoneCount: 0,
      plantCount: 0,
      totalYield: 0,
    };

    const markup = renderToStaticMarkup(
      <RoomGrid
        rooms={[summary]}
        selectedRoomId={undefined}
        onSelect={() => {}}
        onRename={() => {}}
        onDuplicate={() => {}}
        onDelete={() => {}}
      />,
    );

    expect(markup).toContain('Laboratory');
    expect(markup).not.toContain('Translated Lab');
  });
});
