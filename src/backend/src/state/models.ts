/**
 * Core TypeScript interfaces for the simulation game state.
 * These structures intentionally mirror the blueprint driven domain model
 * and provide a strongly typed foundation for serialization, factories and
 * simulation logic.
 */

export type DifficultyLevel = 'easy' | 'normal' | 'hard';

export interface EconomicsSettings {
  initialCapital: number;
  itemPriceMultiplier: number;
  harvestPriceMultiplier: number;
  rentPerSqmStructurePerTick: number;
  rentPerSqmRoomPerTick: number;
}

export interface GameMetadata {
  gameId: string;
  createdAt: string;
  seed: string;
  difficulty: DifficultyLevel;
  simulationVersion: string;
  tickLengthMinutes: number;
  economics: EconomicsSettings;
}

export interface SimulationClockState {
  tick: number;
  isPaused: boolean;
  startedAt: string;
  lastUpdatedAt: string;
  targetTickRate: number;
}

export interface SimulationNote {
  id: string;
  tick: number;
  message: string;
  level: 'info' | 'warning' | 'error';
}

export interface GameState {
  metadata: GameMetadata;
  clock: SimulationClockState;
  structures: StructureState[];
  inventory: GlobalInventoryState;
  finances: FinanceState;
  personnel: PersonnelRoster;
  tasks: TaskSystemState;
  notes?: SimulationNote[];
}

export interface FootprintBlueprint {
  length: number;
  width: number;
  height?: number;
}

export interface StructureBlueprint {
  id: string;
  name: string;
  footprint: FootprintBlueprint;
  rentalCostPerSqmPerMonth: number;
  upfrontFee: number;
}

export interface FootprintDimensions extends FootprintBlueprint {
  height: number;
  area: number;
  volume: number;
}

export type StructureStatus = 'active' | 'underConstruction' | 'decommissioned';

export interface StructureState {
  id: string;
  blueprintId: string;
  name: string;
  status: StructureStatus;
  footprint: FootprintDimensions;
  rooms: RoomState[];
  rentPerTick: number;
  upfrontCostPaid: number;
  notes?: string;
}

export interface RoomState {
  id: string;
  structureId: string;
  name: string;
  purposeId: string;
  area: number;
  height: number;
  volume: number;
  zones: ZoneState[];
  cleanliness: number;
  maintenanceLevel: number;
}

export interface ZoneEnvironmentState {
  temperature: number;
  relativeHumidity: number;
  co2: number;
  ppfd: number;
  vpd: number;
}

export interface ZoneResourceState {
  waterLiters: number;
  nutrientSolutionLiters: number;
  nutrientStrength: number;
  substrateHealth: number;
  reservoirLevel: number;
  lastTranspirationLiters: number;
}

export interface ZoneMetricState {
  averageTemperature: number;
  averageHumidity: number;
  averageCo2: number;
  averagePpfd: number;
  stressLevel: number;
  lastUpdatedTick: number;
}

export interface ZoneControlSetpoints {
  temperature?: number;
  humidity?: number;
  co2?: number;
  ppfd?: number;
  vpd?: number;
}

export interface ZoneControlState {
  setpoints: ZoneControlSetpoints;
}

export interface ZonePlantingPlanState {
  id: string;
  strainId: string;
  count: number;
  autoReplant: boolean;
  enabled: boolean;
  name?: string;
}

export type HealthTarget = 'disease' | 'pest';

export type TreatmentCategory = 'cultural' | 'biological' | 'mechanical' | 'chemical' | 'physical';

export interface DiseaseTreatmentEffectState {
  optionId: string;
  expiresTick: number;
  infectionMultiplier: number;
  degenerationMultiplier: number;
  recoveryMultiplier: number;
}

export interface PestTreatmentEffectState {
  optionId: string;
  expiresTick: number;
  reproductionMultiplier: number;
  mortalityMultiplier: number;
  damageMultiplier: number;
}

export interface DiseaseState {
  id: string;
  pathogenId: string;
  severity: number;
  infection: number;
  detected: boolean;
  detectionTick?: number;
  symptomTimerTicks: number;
  spreadCooldownTicks: number;
  lastSpreadTick?: number;
  baseInfectionRatePerDay: number;
  baseRecoveryRatePerDay: number;
  baseDegenerationRatePerDay: number;
  phaseOverride?: string;
  activeTreatments: DiseaseTreatmentEffectState[];
}

export interface PestState {
  id: string;
  pestId: string;
  population: number;
  damage: number;
  detected: boolean;
  detectionTick?: number;
  symptomTimerTicks: number;
  spreadCooldownTicks: number;
  lastSpreadTick?: number;
  baseReproductionRatePerDay: number;
  baseMortalityRatePerDay: number;
  baseDamageRatePerDay: number;
  phaseOverride?: string;
  activeTreatments: PestTreatmentEffectState[];
}

export interface PlantHealthState {
  diseases: DiseaseState[];
  pests: PestState[];
}

export interface PendingTreatmentApplication {
  optionId: string;
  target: HealthTarget;
  plantIds: string[];
  scheduledTick: number;
  diseaseIds?: string[];
  pestIds?: string[];
  reentryIntervalTicks?: number;
  preHarvestIntervalTicks?: number;
}

export interface AppliedTreatmentRecord {
  optionId: string;
  target: HealthTarget;
  plantIds: string[];
  appliedTick: number;
  reentryRestrictedUntilTick?: number;
  preHarvestRestrictedUntilTick?: number;
}

export interface ZoneHealthState {
  plantHealth: Record<string, PlantHealthState>;
  pendingTreatments: PendingTreatmentApplication[];
  appliedTreatments: AppliedTreatmentRecord[];
  reentryRestrictedUntilTick?: number;
  preHarvestRestrictedUntilTick?: number;
}

export interface ZoneState {
  id: string;
  roomId: string;
  name: string;
  cultivationMethodId: string;
  strainId?: string;
  area: number;
  ceilingHeight: number;
  volume: number;
  environment: ZoneEnvironmentState;
  resources: ZoneResourceState;
  plants: PlantState[];
  devices: DeviceInstanceState[];
  metrics: ZoneMetricState;
  control: ZoneControlState;
  health: ZoneHealthState;
  activeTaskIds: string[];
  plantingPlan?: ZonePlantingPlanState | null;
}

export type PlantStage =
  | 'seedling'
  | 'vegetative'
  | 'flowering'
  | 'ripening'
  | 'harvestReady'
  | 'drying'
  | 'cured'
  | 'dead';

export interface PlantState {
  id: string;
  strainId: string;
  zoneId: string;
  stage: PlantStage;
  plantedAtTick: number;
  ageInHours: number;
  health: number;
  stress: number;
  biomassDryGrams: number;
  heightMeters: number;
  canopyCover: number;
  yieldDryGrams: number;
  quality: number;
  lastMeasurementTick: number;
  notes?: string;
}

export type DeviceStatus = 'operational' | 'maintenance' | 'offline' | 'failed';

export interface DeviceMaintenanceState {
  lastServiceTick: number;
  nextDueTick: number;
  condition: number;
  runtimeHoursAtLastService: number;
  degradation: number;
}

export interface DeviceInstanceState {
  id: string;
  blueprintId: string;
  kind: string;
  name: string;
  zoneId: string;
  status: DeviceStatus;
  efficiency: number;
  runtimeHours: number;
  maintenance: DeviceMaintenanceState;
  settings: Record<string, unknown>;
}

export interface ResourceInventory {
  waterLiters: number;
  nutrientsGrams: number;
  co2Kg: number;
  substrateKg: number;
  packagingUnits: number;
  sparePartsValue: number;
}

export interface SeedStockEntry {
  id: string;
  strainId: string;
  quantity: number;
  viability: number;
  storedAtTick: number;
}

export interface DeviceStockEntry {
  id: string;
  blueprintId: string;
  quantity: number;
  condition: number;
}

export type HarvestStage = 'fresh' | 'drying' | 'cured' | 'waste';

export interface HarvestCoolingState {
  enabled: boolean;
  enabledAtTick?: number;
  temperatureC?: number;
}

export interface HarvestBatch {
  id: string;
  strainId: string;
  weightGrams: number;
  quality: number;
  stage: HarvestStage;
  harvestedAtTick: number;
  notes?: string;
  decayRate?: number;
  maxStorageTime?: number;
  qualityUpdatedAtTick?: number;
  cooling?: HarvestCoolingState;
}

export interface GlobalInventoryState {
  resources: ResourceInventory;
  seeds: SeedStockEntry[];
  devices: DeviceStockEntry[];
  harvest: HarvestBatch[];
  consumables: Record<string, number>;
}

export type LedgerEntryType = 'income' | 'expense';

export type LedgerCategory =
  | 'capital'
  | 'structure'
  | 'device'
  | 'inventory'
  | 'rent'
  | 'utilities'
  | 'payroll'
  | 'maintenance'
  | 'sales'
  | 'loan'
  | 'other';

export interface LedgerEntry {
  id: string;
  tick: number;
  timestamp: string;
  amount: number;
  type: LedgerEntryType;
  category: LedgerCategory;
  description: string;
}

export interface LoanState {
  id: string;
  principal: number;
  interestRate: number;
  paymentsRemaining: number;
  nextPaymentTick: number;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalPayroll: number;
  totalMaintenance: number;
  netIncome: number;
  lastTickRevenue: number;
  lastTickExpenses: number;
}

export interface FinanceState {
  cashOnHand: number;
  reservedCash: number;
  outstandingLoans: LoanState[];
  ledger: LedgerEntry[];
  summary: FinancialSummary;
}

export const EMPLOYEE_SKILL_NAMES = [
  'Gardening',
  'Maintenance',
  'Logistics',
  'Cleanliness',
  'Administration',
] as const;

export type SkillName = (typeof EMPLOYEE_SKILL_NAMES)[number];

export interface PersonnelRoleSkillRoll {
  min: number;
  max: number;
}

export interface PersonnelRoleSkillTemplate {
  skill: SkillName;
  startingLevel: number;
  roll?: PersonnelRoleSkillRoll;
  weight?: number;
}

export interface PersonnelRoleTertiarySkillConfig {
  chance?: number;
  roll?: PersonnelRoleSkillRoll;
  candidates: PersonnelRoleSkillTemplate[];
}

export interface PersonnelRoleSkillProfile {
  primary: PersonnelRoleSkillTemplate;
  secondary?: PersonnelRoleSkillTemplate;
  tertiary?: PersonnelRoleTertiarySkillConfig;
}

export interface PersonnelRoleSkillProfileDraft {
  primary?: PersonnelRoleSkillTemplate;
  secondary?: PersonnelRoleSkillTemplate;
  tertiary?: PersonnelRoleTertiarySkillConfig;
}

export interface PersonnelRoleSalaryWeights {
  primary?: number;
  secondary?: number;
  tertiary?: number;
}

export interface PersonnelRoleSalaryRandomRange {
  min?: number;
  max?: number;
}

export interface PersonnelRoleSalaryFactorConfig {
  base?: number;
  perPoint?: number;
  min?: number;
  max?: number;
}

export interface PersonnelRoleSalaryConfig {
  basePerTick: number;
  skillFactor?: PersonnelRoleSalaryFactorConfig;
  randomRange?: PersonnelRoleSalaryRandomRange;
  skillWeights?: PersonnelRoleSalaryWeights;
}

export interface PersonnelRoleSalaryConfigDraft {
  basePerTick?: number;
  skillFactor?: PersonnelRoleSalaryFactorConfig;
  randomRange?: PersonnelRoleSalaryRandomRange;
  skillWeights?: PersonnelRoleSalaryWeights;
}

export interface PersonnelRoleBlueprint {
  id: string;
  name: string;
  description?: string;
  preferredShiftId?: string;
  maxMinutesPerTick?: number;
  roleWeight?: number;
  salary: PersonnelRoleSalaryConfig;
  skillProfile: PersonnelRoleSkillProfile;
}

export interface PersonnelRoleBlueprintDraft {
  id: string;
  name?: string;
  description?: string;
  preferredShiftId?: string;
  maxMinutesPerTick?: number;
  roleWeight?: number;
  salary?: PersonnelRoleSalaryConfigDraft;
  skillProfile?: PersonnelRoleSkillProfileDraft;
}

export const DEFAULT_PERSONNEL_ROLE_BLUEPRINTS = [
  {
    id: 'Gardener',
    name: 'Gardener',
    maxMinutesPerTick: 90,
    roleWeight: 0.35,
    salary: {
      basePerTick: 24,
      skillFactor: { base: 0.85, perPoint: 0.04, min: 0.85, max: 1.45 },
      randomRange: { min: 0.9, max: 1.1 },
      skillWeights: { primary: 1.2, secondary: 0.6, tertiary: 0.35 },
    },
    skillProfile: {
      primary: {
        skill: 'Gardening',
        startingLevel: 4,
        roll: { min: 3, max: 5 },
      },
      secondary: {
        skill: 'Cleanliness',
        startingLevel: 2,
        roll: { min: 1, max: 4 },
      },
      tertiary: {
        chance: 0.25,
        roll: { min: 1, max: 3 },
        candidates: [
          { skill: 'Logistics', startingLevel: 1 },
          { skill: 'Administration', startingLevel: 1 },
          { skill: 'Maintenance', startingLevel: 1 },
        ],
      },
    },
  },
  {
    id: 'Technician',
    name: 'Technician',
    maxMinutesPerTick: 120,
    roleWeight: 0.2,
    salary: {
      basePerTick: 28,
      skillFactor: { base: 0.85, perPoint: 0.04, min: 0.85, max: 1.45 },
      randomRange: { min: 0.9, max: 1.12 },
      skillWeights: { primary: 1.25, secondary: 0.65, tertiary: 0.4 },
    },
    skillProfile: {
      primary: {
        skill: 'Maintenance',
        startingLevel: 4,
        roll: { min: 3, max: 5 },
      },
      secondary: {
        skill: 'Logistics',
        startingLevel: 2,
        roll: { min: 1, max: 4 },
      },
      tertiary: {
        chance: 0.25,
        roll: { min: 1, max: 3 },
        candidates: [
          { skill: 'Gardening', startingLevel: 1 },
          { skill: 'Administration', startingLevel: 1 },
          { skill: 'Cleanliness', startingLevel: 1 },
        ],
      },
    },
  },
  {
    id: 'Janitor',
    name: 'Janitor',
    maxMinutesPerTick: 75,
    preferredShiftId: 'shift.night',
    roleWeight: 0.15,
    salary: {
      basePerTick: 18,
      skillFactor: { base: 0.85, perPoint: 0.04, min: 0.85, max: 1.45 },
      randomRange: { min: 0.88, max: 1.08 },
      skillWeights: { primary: 1.1, secondary: 0.55, tertiary: 0.3 },
    },
    skillProfile: {
      primary: {
        skill: 'Cleanliness',
        startingLevel: 4,
        roll: { min: 3, max: 5 },
      },
      secondary: {
        skill: 'Logistics',
        startingLevel: 1,
        roll: { min: 0, max: 3 },
      },
      tertiary: {
        chance: 0.3,
        roll: { min: 1, max: 3 },
        candidates: [
          { skill: 'Administration', startingLevel: 1 },
          { skill: 'Gardening', startingLevel: 1 },
          { skill: 'Maintenance', startingLevel: 1 },
        ],
      },
    },
  },
  {
    id: 'Operator',
    name: 'Operator',
    maxMinutesPerTick: 90,
    preferredShiftId: 'shift.day',
    roleWeight: 0.18,
    salary: {
      basePerTick: 22,
      skillFactor: { base: 0.85, perPoint: 0.04, min: 0.85, max: 1.45 },
      randomRange: { min: 0.9, max: 1.1 },
      skillWeights: { primary: 1.15, secondary: 0.6, tertiary: 0.35 },
    },
    skillProfile: {
      primary: {
        skill: 'Logistics',
        startingLevel: 3,
        roll: { min: 2, max: 4 },
      },
      secondary: {
        skill: 'Administration',
        startingLevel: 2,
        roll: { min: 1, max: 4 },
      },
      tertiary: {
        chance: 0.25,
        roll: { min: 1, max: 3 },
        candidates: [
          { skill: 'Cleanliness', startingLevel: 1 },
          { skill: 'Gardening', startingLevel: 1 },
          { skill: 'Maintenance', startingLevel: 1 },
        ],
      },
    },
  },
  {
    id: 'Manager',
    name: 'Manager',
    maxMinutesPerTick: 60,
    preferredShiftId: 'shift.day',
    roleWeight: 0.12,
    salary: {
      basePerTick: 35,
      skillFactor: { base: 0.85, perPoint: 0.04, min: 0.85, max: 1.5 },
      randomRange: { min: 0.95, max: 1.18 },
      skillWeights: { primary: 1.3, secondary: 0.7, tertiary: 0.45 },
    },
    skillProfile: {
      primary: {
        skill: 'Administration',
        startingLevel: 4,
        roll: { min: 3, max: 5 },
      },
      secondary: {
        skill: 'Logistics',
        startingLevel: 2,
        roll: { min: 1, max: 4 },
      },
      tertiary: {
        chance: 0.4,
        roll: { min: 1, max: 3 },
        candidates: [{ skill: 'Cleanliness', startingLevel: 2, weight: 2 }],
      },
    },
  },
] as const satisfies readonly PersonnelRoleBlueprint[];

export type EmployeeRole = (typeof DEFAULT_PERSONNEL_ROLE_BLUEPRINTS)[number]['id'];

export type EmployeeSkills = Partial<Record<SkillName, number>>;

export type EmployeeStatus = 'idle' | 'assigned' | 'offShift' | 'training';

export interface EmployeeShiftAssignment {
  shiftId: string;
  name: string;
  startHour: number;
  durationHours: number;
  overlapMinutes: number;
}

export interface PersonnelTrait {
  id: string;
  name: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral';
}

export interface PersonnelNameDirectory {
  firstNamesMale: string[];
  firstNamesFemale: string[];
  lastNames: string[];
  traits: PersonnelTrait[];
  randomSeeds: string[];
}

export interface EmployeeState {
  id: string;
  name: string;
  role: EmployeeRole;
  salaryPerTick: number;
  status: EmployeeStatus;
  morale: number;
  energy: number;
  maxMinutesPerTick: number;
  skills: EmployeeSkills;
  experience: EmployeeSkills;
  traits: string[];
  certifications: string[];
  shift: EmployeeShiftAssignment;
  hoursWorkedToday: number;
  overtimeHours: number;
  lastShiftResetTick?: number;
  assignedStructureId?: string;
  assignedRoomId?: string;
  assignedZoneId?: string;
  currentTaskId?: string;
}

export interface ApplicantState {
  id: string;
  name: string;
  desiredRole: EmployeeRole;
  expectedSalary: number;
  traits: string[];
  skills: EmployeeSkills;
  personalSeed?: string;
  gender?: 'male' | 'female' | 'other';
}

export const getApplicantPersonalSeed = (applicant: ApplicantState): string | undefined => {
  const value = applicant.personalSeed;
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export interface TrainingProgramState {
  id: string;
  name: string;
  targetRole: EmployeeRole;
  progress: number;
  attendees: string[];
}

export interface PersonnelRoster {
  employees: EmployeeState[];
  applicants: ApplicantState[];
  trainingPrograms: TrainingProgramState[];
  overallMorale: number;
}

export type TaskStatus =
  | 'pending'
  | 'queued'
  | 'inProgress'
  | 'completed'
  | 'cancelled'
  | 'blocked';

export type TaskBasis = 'perAction' | 'perPlant' | 'perSquareMeter';

export interface TaskCostModel {
  basis: TaskBasis;
  laborMinutes: number;
}

export interface TaskDefinition {
  id: string;
  costModel: TaskCostModel;
  priority: number;
  requiredRole: EmployeeRole;
  requiredSkill: SkillName;
  minSkillLevel: number;
  description: string;
}

export type TaskDefinitionMap = Record<string, TaskDefinition>;

export interface TaskLocation {
  structureId: string;
  roomId?: string;
  zoneId?: string;
}

export interface TaskAssignment {
  employeeId: string;
  startedAtTick: number;
  progress: number;
  etaTick?: number;
}

export interface TaskState {
  id: string;
  definitionId: string;
  status: TaskStatus;
  priority: number;
  createdAtTick: number;
  dueTick?: number;
  location?: TaskLocation;
  assignment?: TaskAssignment;
  metadata: Record<string, unknown>;
}

export interface TaskSystemState {
  backlog: TaskState[];
  active: TaskState[];
  completed: TaskState[];
  cancelled: TaskState[];
}
