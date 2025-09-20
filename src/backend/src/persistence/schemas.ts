import { z } from 'zod';

const isoDateString = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid ISO date string',
  });

const nonEmptyString = z.string().min(1);

const positiveNumber = z.number().positive();

const zoneEnvironmentSchema = z.object({
  temperature: z.number(),
  relativeHumidity: z.number(),
  co2: z.number(),
  ppfd: z.number(),
  vpd: z.number(),
});

const zoneResourceSchema = z.object({
  waterLiters: z.number(),
  nutrientSolutionLiters: z.number(),
  nutrientStrength: z.number(),
  substrateHealth: z.number(),
  reservoirLevel: z.number(),
});

const zoneMetricSchema = z.object({
  averageTemperature: z.number(),
  averageHumidity: z.number(),
  averageCo2: z.number(),
  averagePpfd: z.number(),
  stressLevel: z.number(),
  lastUpdatedTick: z.number().int().nonnegative(),
});

const diseaseTreatmentEffectSchema = z.object({
  optionId: nonEmptyString,
  expiresTick: z.number().int().nonnegative(),
  infectionMultiplier: z.number(),
  degenerationMultiplier: z.number(),
  recoveryMultiplier: z.number(),
});

const pestTreatmentEffectSchema = z.object({
  optionId: nonEmptyString,
  expiresTick: z.number().int().nonnegative(),
  reproductionMultiplier: z.number(),
  mortalityMultiplier: z.number(),
  damageMultiplier: z.number(),
});

const diseaseStateSchema = z.object({
  id: nonEmptyString,
  pathogenId: nonEmptyString,
  severity: z.number(),
  infection: z.number(),
  detected: z.boolean(),
  detectionTick: z.number().int().nonnegative().optional(),
  symptomTimerTicks: z.number().int().nonnegative(),
  spreadCooldownTicks: z.number().int().nonnegative(),
  lastSpreadTick: z.number().int().nonnegative().optional(),
  baseInfectionRatePerDay: z.number(),
  baseRecoveryRatePerDay: z.number(),
  baseDegenerationRatePerDay: z.number(),
  phaseOverride: nonEmptyString.optional(),
  activeTreatments: z.array(diseaseTreatmentEffectSchema),
});

const pestStateSchema = z.object({
  id: nonEmptyString,
  pestId: nonEmptyString,
  population: z.number(),
  damage: z.number(),
  detected: z.boolean(),
  detectionTick: z.number().int().nonnegative().optional(),
  symptomTimerTicks: z.number().int().nonnegative(),
  spreadCooldownTicks: z.number().int().nonnegative(),
  lastSpreadTick: z.number().int().nonnegative().optional(),
  baseReproductionRatePerDay: z.number(),
  baseMortalityRatePerDay: z.number(),
  baseDamageRatePerDay: z.number(),
  phaseOverride: nonEmptyString.optional(),
  activeTreatments: z.array(pestTreatmentEffectSchema),
});

const plantHealthStateSchema = z.object({
  diseases: z.array(diseaseStateSchema),
  pests: z.array(pestStateSchema),
});

const pendingTreatmentSchema = z.object({
  optionId: nonEmptyString,
  target: z.enum(['disease', 'pest']),
  plantIds: z.array(nonEmptyString),
  scheduledTick: z.number().int().nonnegative(),
  diseaseIds: z.array(nonEmptyString).optional(),
  pestIds: z.array(nonEmptyString).optional(),
  reentryIntervalTicks: z.number().int().nonnegative().optional(),
  preHarvestIntervalTicks: z.number().int().nonnegative().optional(),
});

const appliedTreatmentSchema = z.object({
  optionId: nonEmptyString,
  target: z.enum(['disease', 'pest']),
  plantIds: z.array(nonEmptyString),
  appliedTick: z.number().int().nonnegative(),
  reentryRestrictedUntilTick: z.number().int().nonnegative().optional(),
  preHarvestRestrictedUntilTick: z.number().int().nonnegative().optional(),
});

const zoneHealthSchema = z.object({
  plantHealth: z.record(plantHealthStateSchema),
  pendingTreatments: z.array(pendingTreatmentSchema),
  appliedTreatments: z.array(appliedTreatmentSchema),
  reentryRestrictedUntilTick: z.number().int().nonnegative().optional(),
  preHarvestRestrictedUntilTick: z.number().int().nonnegative().optional(),
});

const deviceMaintenanceSchema = z.object({
  lastServiceTick: z.number().int().nonnegative(),
  nextDueTick: z.number().int().nonnegative(),
  condition: z.number(),
  degradation: z.number(),
});

const deviceInstanceSchema = z.object({
  id: nonEmptyString,
  blueprintId: nonEmptyString,
  kind: nonEmptyString,
  name: nonEmptyString,
  zoneId: nonEmptyString,
  status: z.enum(['operational', 'maintenance', 'offline', 'failed']),
  efficiency: z.number(),
  runtimeHours: z.number(),
  maintenance: deviceMaintenanceSchema,
  settings: z.record(z.unknown()),
});

const plantStateSchema = z.object({
  id: nonEmptyString,
  strainId: nonEmptyString,
  zoneId: nonEmptyString,
  stage: z.enum([
    'seedling',
    'vegetative',
    'flowering',
    'ripening',
    'harvestReady',
    'drying',
    'cured',
    'dead',
  ]),
  plantedAtTick: z.number().int().nonnegative(),
  ageInHours: z.number(),
  health: z.number(),
  stress: z.number(),
  biomassDryGrams: z.number(),
  heightMeters: z.number(),
  canopyCover: z.number(),
  yieldDryGrams: z.number(),
  quality: z.number(),
  lastMeasurementTick: z.number().int().nonnegative(),
  notes: z.string().optional(),
});

const zoneStateSchema = z.object({
  id: nonEmptyString,
  roomId: nonEmptyString,
  name: nonEmptyString,
  cultivationMethodId: nonEmptyString,
  strainId: nonEmptyString.optional(),
  environment: zoneEnvironmentSchema,
  resources: zoneResourceSchema,
  plants: z.array(plantStateSchema),
  devices: z.array(deviceInstanceSchema),
  metrics: zoneMetricSchema,
  health: zoneHealthSchema,
  activeTaskIds: z.array(nonEmptyString),
});

const roomStateSchema = z.object({
  id: nonEmptyString,
  structureId: nonEmptyString,
  name: nonEmptyString,
  purposeId: nonEmptyString,
  area: z.number(),
  height: z.number(),
  volume: z.number(),
  zones: z.array(zoneStateSchema),
  cleanliness: z.number(),
  maintenanceLevel: z.number(),
});

const footprintDimensionsSchema = z.object({
  length: z.number(),
  width: z.number(),
  height: z.number(),
  area: z.number(),
  volume: z.number(),
});

const structureStateSchema = z.object({
  id: nonEmptyString,
  blueprintId: nonEmptyString,
  name: nonEmptyString,
  status: z.enum(['active', 'underConstruction', 'decommissioned']),
  footprint: footprintDimensionsSchema,
  rooms: z.array(roomStateSchema),
  rentPerTick: z.number(),
  upfrontCostPaid: z.number(),
  notes: z.string().optional(),
});

const resourceInventorySchema = z.object({
  waterLiters: z.number(),
  nutrientsGrams: z.number(),
  co2Kg: z.number(),
  substrateKg: z.number(),
  packagingUnits: z.number(),
  sparePartsValue: z.number(),
});

const seedStockEntrySchema = z.object({
  id: nonEmptyString,
  strainId: nonEmptyString,
  quantity: z.number(),
  viability: z.number(),
  storedAtTick: z.number().int().nonnegative(),
});

const deviceStockEntrySchema = z.object({
  id: nonEmptyString,
  blueprintId: nonEmptyString,
  quantity: z.number(),
  condition: z.number(),
});

const harvestBatchSchema = z.object({
  id: nonEmptyString,
  strainId: nonEmptyString,
  weightGrams: z.number(),
  quality: z.number(),
  stage: z.enum(['fresh', 'drying', 'cured', 'waste']),
  harvestedAtTick: z.number().int().nonnegative(),
  notes: z.string().optional(),
});

const globalInventorySchema = z.object({
  resources: resourceInventorySchema,
  seeds: z.array(seedStockEntrySchema),
  devices: z.array(deviceStockEntrySchema),
  harvest: z.array(harvestBatchSchema),
  consumables: z.record(z.number()),
});

const ledgerEntrySchema = z.object({
  id: nonEmptyString,
  tick: z.number().int().nonnegative(),
  timestamp: isoDateString,
  amount: z.number(),
  type: z.enum(['income', 'expense']),
  category: z.enum([
    'capital',
    'structure',
    'device',
    'inventory',
    'rent',
    'utilities',
    'payroll',
    'maintenance',
    'sales',
    'loan',
    'other',
  ]),
  description: z.string(),
});

const loanStateSchema = z.object({
  id: nonEmptyString,
  principal: z.number(),
  interestRate: z.number(),
  paymentsRemaining: z.number(),
  nextPaymentTick: z.number().int().nonnegative(),
});

const financialSummarySchema = z.object({
  totalRevenue: z.number(),
  totalExpenses: z.number(),
  totalPayroll: z.number(),
  totalMaintenance: z.number(),
  netIncome: z.number(),
  lastTickRevenue: z.number(),
  lastTickExpenses: z.number(),
});

const financeStateSchema = z.object({
  cashOnHand: z.number(),
  reservedCash: z.number(),
  outstandingLoans: z.array(loanStateSchema),
  ledger: z.array(ledgerEntrySchema),
  summary: financialSummarySchema,
});

const skillNames = [
  'Gardening',
  'Maintenance',
  'Logistics',
  'Cleanliness',
  'Administration',
] as const;
const employeeSkillsSchema = z
  .object(
    Object.fromEntries(skillNames.map((name) => [name, z.number()])) as Record<
      (typeof skillNames)[number],
      z.ZodNumber
    >,
  )
  .partial();

const employeeStateSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  role: z.enum(['Gardener', 'Technician', 'Janitor', 'Operator', 'Manager']),
  salaryPerTick: z.number(),
  status: z.enum(['idle', 'assigned', 'offShift', 'training']),
  morale: z.number(),
  energy: z.number(),
  skills: employeeSkillsSchema,
  experience: employeeSkillsSchema,
  traits: z.array(nonEmptyString),
  certifications: z.array(nonEmptyString),
  hoursWorkedToday: z.number(),
  overtimeHours: z.number(),
  lastShiftResetTick: z.number().int().nonnegative().optional(),
  assignedStructureId: nonEmptyString.optional(),
  assignedRoomId: nonEmptyString.optional(),
  assignedZoneId: nonEmptyString.optional(),
  currentTaskId: nonEmptyString.optional(),
});

const applicantStateSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  desiredRole: z.enum(['Gardener', 'Technician', 'Janitor', 'Operator', 'Manager']),
  expectedSalary: z.number(),
  traits: z.array(nonEmptyString),
  skills: employeeSkillsSchema,
});

const trainingProgramSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  targetRole: z.enum(['Gardener', 'Technician', 'Janitor', 'Operator', 'Manager']),
  progress: z.number(),
  attendees: z.array(nonEmptyString),
});

const personnelRosterSchema = z.object({
  employees: z.array(employeeStateSchema),
  applicants: z.array(applicantStateSchema),
  trainingPrograms: z.array(trainingProgramSchema),
  overallMorale: z.number(),
});

const taskLocationSchema = z.object({
  structureId: nonEmptyString,
  roomId: nonEmptyString.optional(),
  zoneId: nonEmptyString.optional(),
});

const taskAssignmentSchema = z.object({
  employeeId: nonEmptyString,
  startedAtTick: z.number().int().nonnegative(),
  progress: z.number(),
  etaTick: z.number().int().nonnegative().optional(),
});

const taskStateSchema = z.object({
  id: nonEmptyString,
  definitionId: nonEmptyString,
  status: z.enum(['pending', 'queued', 'inProgress', 'completed', 'cancelled', 'blocked']),
  priority: z.number(),
  createdAtTick: z.number().int().nonnegative(),
  dueTick: z.number().int().nonnegative().optional(),
  location: taskLocationSchema.optional(),
  assignment: taskAssignmentSchema.optional(),
  metadata: z.record(z.unknown()),
});

const taskSystemSchema = z.object({
  backlog: z.array(taskStateSchema),
  active: z.array(taskStateSchema),
  completed: z.array(taskStateSchema),
  cancelled: z.array(taskStateSchema),
});

const economicsSettingsSchema = z.object({
  initialCapital: z.number(),
  itemPriceMultiplier: z.number(),
  harvestPriceMultiplier: z.number(),
  rentPerSqmStructurePerTick: z.number(),
  rentPerSqmRoomPerTick: z.number(),
});

const gameMetadataSchema = z.object({
  gameId: nonEmptyString,
  createdAt: isoDateString,
  seed: nonEmptyString,
  difficulty: z.enum(['easy', 'normal', 'hard']),
  simulationVersion: nonEmptyString,
  tickLengthMinutes: z.number(),
  economics: economicsSettingsSchema,
});

const simulationClockSchema = z.object({
  tick: z.number().int().nonnegative(),
  isPaused: z.boolean(),
  startedAt: isoDateString,
  lastUpdatedAt: isoDateString,
  targetTickRate: z.number(),
});

const simulationNoteSchema = z.object({
  id: nonEmptyString,
  tick: z.number().int().nonnegative(),
  message: z.string(),
  level: z.enum(['info', 'warning', 'error']),
});

export const gameStateSchema = z.object({
  metadata: gameMetadataSchema,
  clock: simulationClockSchema,
  structures: z.array(structureStateSchema),
  inventory: globalInventorySchema,
  finances: financeStateSchema,
  personnel: personnelRosterSchema,
  tasks: taskSystemSchema,
  notes: z.array(simulationNoteSchema).optional(),
});

export const serializedRngStateSchema = z.object({
  seed: nonEmptyString,
  streams: z.record(z.number().int().min(0)),
});

export const SAVEGAME_KIND = 'WeedBreedSave' as const;

export const saveGameHeaderSchema = z.object({
  kind: z.literal(SAVEGAME_KIND),
  version: nonEmptyString,
  createdAt: isoDateString,
});

export const saveGameMetadataSchema = z.object({
  tickLengthMinutes: positiveNumber,
  rngSeed: nonEmptyString,
});

export const saveGameEnvelopeSchema = z
  .object({
    header: saveGameHeaderSchema,
    metadata: saveGameMetadataSchema,
    rng: serializedRngStateSchema,
    state: gameStateSchema,
  })
  .passthrough();

export const legacySaveGameEnvelopeSchema = z
  .object({
    kind: z.literal(SAVEGAME_KIND),
    version: nonEmptyString,
    createdAt: isoDateString,
    tickLengthMinutes: positiveNumber,
    rngSeed: nonEmptyString,
    rng: serializedRngStateSchema,
    state: gameStateSchema,
  })
  .passthrough();

export type GameStatePayload = z.infer<typeof gameStateSchema>;
export type SaveGameEnvelopePayload = z.infer<typeof saveGameEnvelopeSchema>;
export type LegacySaveGameEnvelopePayload = z.infer<typeof legacySaveGameEnvelopeSchema>;
