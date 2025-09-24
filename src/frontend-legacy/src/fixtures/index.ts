export {
  CLICKDUMMY_SEED,
  createDeterministicManager,
  createDeterministicSequence,
  getSharedSequence,
  nextSharedId,
  sharedDeterministic,
  type DeterministicManager,
  type DeterministicSequence,
  type DeterministicSequenceSnapshot,
  type SequenceOptions,
} from './deterministic';

export {
  JOB_ROLES,
  SKILLS_BY_ROLE,
  TRAITS,
  NAMES,
  BASE_SALARIES,
  DEVICE_COSTS,
  type CandidateNameProfile,
  type JobRole,
} from './constants';

export {
  createClickDummyFixture,
  createFixtureFactoryContext,
  createPlant,
  generateCandidates,
  nextDeterministicId,
  type CandidateGenerationOptions,
  type ClickDummyFixtureOptions,
  type ClickDummyFixtureResult,
  type FixtureFactoryContext,
  type PlantFactoryOptions,
  type SequenceSourceOptions,
} from './clickDummyFactories';

export { CLICKDUMMY_SAMPLE, CLICKDUMMY_SAMPLE_CONTEXT } from './sampleClickDummyData';

export type { ClickDummyGameData, ClickDummyStructure, ClickDummyZone } from './types';
export type { RoomPurposeDescriptor, FixtureTranslationOptions } from './translator';
export { translateClickDummyGameData } from './translator';
