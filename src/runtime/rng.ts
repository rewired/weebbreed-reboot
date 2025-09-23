import seedrandom, { type PRNG } from 'seedrandom';

export type SeededRngStream = PRNG;

export const RNG_STREAM_IDS = {
  pests: 'pests',
  events: 'events',
  loot: 'loot',
  market: 'market',
  placement: 'placement',
  plants: 'plants',
  ids: 'ids',
  structures: 'structures',
  strains: 'strains',
  methods: 'methods',
  devices: 'devices',
  blueprintOptions: 'options',
  personnelNames: 'personnel-names',
  personnelTraits: 'personnel-traits',
  personnelMorale: 'personnel-morale',
  jobMarket: 'job-market',
  jobMarketCandidates: 'job-market.candidates',
  jobMarketGender: 'job-market.gender',
  simulationTest: 'sim.test',
} as const;

export type RngStreamKey = keyof typeof RNG_STREAM_IDS;
export type RngStreamId = (typeof RNG_STREAM_IDS)[RngStreamKey];

const registeredStreamIds = new Set<string>(Object.values(RNG_STREAM_IDS));

export const registerRngStreamIds = (...streamIds: string[]): void => {
  for (const streamId of streamIds) {
    if (!streamId) {
      continue;
    }
    registeredStreamIds.add(streamId);
  }
};

export const getRegisteredRngStreamIds = (): readonly string[] => {
  return Array.from(registeredStreamIds.values()).sort();
};

const composeStreamSeed = (seed: string, streamId: string): string => `${seed}::${streamId}`;

export const createSeededStreamGenerator = (seed: string, streamId: string): SeededRngStream => {
  registerRngStreamIds(streamId);
  return seedrandom(composeStreamSeed(seed, streamId), { state: true });
};

export type SeededStreamFactory = (streamId: string) => SeededRngStream;

export const createSeededStreamFactory = (seed: string): SeededStreamFactory => {
  return (streamId: string) => createSeededStreamGenerator(seed, streamId);
};
