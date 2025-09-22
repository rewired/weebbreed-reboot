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
}

export interface ZoneMetricState {
  averageTemperature: number;
  averageHumidity: number;
  averageCo2: number;
  averagePpfd: number;
  stressLevel: number;
  lastUpdatedTick: number;
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
  health: ZoneHealthState;
  activeTaskIds: string[];
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

export type EmployeeRole = 'Gardener' | 'Technician' | 'Janitor' | 'Operator' | 'Manager';

export type SkillName =
  | 'Gardening'
  | 'Maintenance'
  | 'Logistics'
  | 'Cleanliness'
  | 'Administration';

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
  firstNames: string[];
  lastNames: string[];
  traits: PersonnelTrait[];
}

export interface EmployeeState {
  id: string;
  name: string;
  role: EmployeeRole;
  salaryPerTick: number;
  status: EmployeeStatus;
  morale: number;
  energy: number;
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
}

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
