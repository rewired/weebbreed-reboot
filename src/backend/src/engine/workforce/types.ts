import type { TreatmentCategory } from '../../state/models.js';

export type TaskHazardLevel = 'low' | 'medium' | 'high';

export interface TaskSafetyRequirements {
  hazardLevel: TaskHazardLevel;
  requiredCertifications: string[];
  protectiveEquipment?: string[];
}

export interface WorkforceTaskMetadata {
  estimatedWorkHours: number;
  safety?: TaskSafetyRequirements;
  [key: string]: unknown;
}

export interface WorkforceEmployeeRuntimeState {
  certifications: Set<string>;
  lastShiftDayIndex: number;
}

export interface UtilityWeights {
  priority: number;
  skill: number;
  energy: number;
  morale: number;
}

export interface UtilityPolicy {
  weights: UtilityWeights;
  claimThreshold: number;
  skillEfficiencyBonus: number;
}

export interface EnergyPolicy {
  minEnergyToClaim: number;
  energyCostPerHour: number;
  idleRecoveryPerTick: number;
  overtimeCostMultiplier: number;
}

export interface OvertimePolicy {
  standardHoursPerDay: number;
  overtimeThresholdHours: number;
  maxOvertimeHoursPerDay: number;
}

export interface SafetyPolicy {
  treatmentCertifications: Partial<Record<TreatmentCategory, string>>;
  defaultTreatmentCertification?: string;
}

export interface TaskGenerationPolicy {
  reservoirLevelThreshold: number;
  nutrientStrengthThreshold: number;
  cleanlinessThreshold: number;
  harvestReadinessThreshold: number;
  maintenanceConditionThreshold: number;
  maintenanceGraceTicks: number;
}

export interface WorkforcePolicies {
  energy: EnergyPolicy;
  overtime: OvertimePolicy;
  utility: UtilityPolicy;
  safety: SafetyPolicy;
  generation: TaskGenerationPolicy;
}

export interface WorkforceEngineOptions {
  policies?: Partial<WorkforcePolicies>;
}
