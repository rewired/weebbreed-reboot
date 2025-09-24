/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export {
  CLICKDUMMY_SEED,
  createDeterministicManager,
  createDeterministicSequence,
  getSharedSequence,
  nextSharedId,
  sharedDeterministic,
} from '../store/utils/deterministic';

export type {
  DeterministicManager,
  DeterministicSequence,
  DeterministicSequenceSnapshot,
  SequenceOptions,
} from '../store/utils/deterministic';
