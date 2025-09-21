export const ROOM_PURPOSE_IDS = {
  GROW_ROOM: '2630459c-fc40-4e91-a69f-b47665b5a917',
  BREAK_ROOM: '5ab7d9ac-f14a-45d9-b5f9-908182ca4a02',
  LABORATORY: '05566944-af3c-40f5-9d22-2cbe701457c7',
  SALES_ROOM: '828aa416-37be-4176-bfa6-9ce847e9dfd5',
} as const;

export type RoomPurposeId = (typeof ROOM_PURPOSE_IDS)[keyof typeof ROOM_PURPOSE_IDS];

export const ROOM_PURPOSE_IDS_BY_NAME = {
  'Grow Room': ROOM_PURPOSE_IDS.GROW_ROOM,
  'Break Room': ROOM_PURPOSE_IDS.BREAK_ROOM,
  Laboratory: ROOM_PURPOSE_IDS.LABORATORY,
  'Sales Room': ROOM_PURPOSE_IDS.SALES_ROOM,
} as const;

export const ROOM_PURPOSE_NAMES_BY_ID = Object.fromEntries(
  Object.entries(ROOM_PURPOSE_IDS_BY_NAME).map(([name, id]) => [id, name]),
) as Record<RoomPurposeId, keyof typeof ROOM_PURPOSE_IDS_BY_NAME>;
