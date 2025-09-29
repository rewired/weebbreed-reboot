import type { TaskState } from '@/state/types.js';
import type { WorkforceTaskMetadata } from '../types.js';

export const getTaskMetadata = (task: TaskState): WorkforceTaskMetadata | undefined => {
  const raw = task.metadata as WorkforceTaskMetadata | undefined;
  if (!raw) {
    return undefined;
  }
  if (typeof raw.estimatedWorkHours !== 'number') {
    return undefined;
  }
  return raw;
};
