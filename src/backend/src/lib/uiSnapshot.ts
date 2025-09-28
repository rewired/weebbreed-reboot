import { requireRoomPurpose, type RoomPurposeSource } from '@/engine/roomPurposes/index.js';
import {
  getApplicantPersonalSeed,
  type ApplicantState,
  type DeviceInstanceState,
  type EmployeeState,
  type GameState,
  type LedgerEntry,
  type PlantState,
  type StructureState,
  type ZoneControlState,
  type ZoneEnvironmentState,
  type ZoneMetricState,
  type ZonePlantingPlanState,
  type ZoneResourceState,
} from '@/state/models.js';

const LIGHT_DEVICE_KINDS = new Set<string>(['GrowLight', 'Lamp', 'Light']);

export interface StructureSnapshot {
  id: string;
  name: string;
  status: StructureState['status'];
  footprint: StructureState['footprint'];
  rentPerTick: number;
  roomIds: string[];
}

export interface RoomSnapshot {
  id: string;
  name: string;
  structureId: string;
  structureName: string;
  purposeId: string;
  purposeKind: string;
  purposeName: string;
  purposeFlags?: Record<string, boolean>;
  area: number;
  height: number;
  volume: number;
  cleanliness: number;
  maintenanceLevel: number;
  zoneIds: string[];
}

export type DeviceMaintenanceSnapshot = DeviceInstanceState['maintenance'];

export interface DeviceSnapshot {
  id: string;
  blueprintId: string;
  kind: string;
  name: string;
  zoneId: string;
  status: DeviceInstanceState['status'];
  efficiency: number;
  runtimeHours: number;
  maintenance: DeviceMaintenanceSnapshot;
  settings: Record<string, unknown>;
}

export interface PlantSnapshot {
  id: string;
  strainId: string;
  stage: PlantState['stage'];
  health: number;
  stress: number;
  biomassDryGrams: number;
  yieldDryGrams: number;
}

export interface ZoneHealthSnapshot {
  diseases: number;
  pests: number;
  pendingTreatments: number;
  appliedTreatments: number;
  reentryRestrictedUntilTick?: number;
  preHarvestRestrictedUntilTick?: number;
}

export interface ZoneLightingSnapshot {
  photoperiodHours?: { on: number; off: number };
  coverageRatio?: number;
  averagePpfd?: number;
  dli?: number;
}

export interface ZonePlantingPlanSnapshot {
  id: string;
  strainId: string;
  count: number;
  autoReplant: boolean;
  enabled: boolean;
  name?: string;
}

export interface ZoneSnapshot {
  id: string;
  name: string;
  structureId: string;
  structureName: string;
  roomId: string;
  roomName: string;
  area: number;
  ceilingHeight: number;
  volume: number;
  environment: ZoneEnvironmentState;
  resources: ZoneResourceState;
  metrics: ZoneMetricState;
  devices: DeviceSnapshot[];
  plants: PlantSnapshot[];
  control: ZoneControlState;
  health: ZoneHealthSnapshot;
  lighting?: ZoneLightingSnapshot;
  plantingPlan?: ZonePlantingPlanSnapshot | null;
}

export interface EmployeeSnapshot {
  id: string;
  name: string;
  role: EmployeeState['role'];
  salaryPerTick: number;
  morale: number;
  energy: number;
  maxMinutesPerTick: number;
  status: EmployeeState['status'];
  assignedStructureId?: string;
}

export interface ApplicantSnapshot {
  id: string;
  name: string;
  desiredRole: ApplicantState['desiredRole'];
  expectedSalary: number;
  traits: ApplicantState['traits'];
  skills: ApplicantState['skills'];
  personalSeed?: ApplicantState['personalSeed'];
  gender?: ApplicantState['gender'];
}

export interface PersonnelSnapshot {
  employees: EmployeeSnapshot[];
  applicants: ApplicantSnapshot[];
  overallMorale: number;
}

export interface FinanceSummarySnapshot {
  cashOnHand: number;
  reservedCash: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  lastTickRevenue: number;
  lastTickExpenses: number;
  utilityPrices?: {
    pricePerKwh?: number;
    pricePerLiterWater?: number;
    pricePerGramNutrients?: number;
  };
  ledger?: FinanceLedgerEntrySnapshot[];
}

export interface FinanceLedgerEntrySnapshot {
  type: LedgerEntry['type'];
  category: LedgerEntry['category'];
  amount: number;
  tick: number;
  description: string;
}

export interface SimulationClockSnapshot {
  tick: number;
  isPaused: boolean;
  targetTickRate: number;
  startedAt: string;
  lastUpdatedAt: string;
}

export interface SimulationSnapshot {
  tick: number;
  clock: SimulationClockSnapshot;
  structures: StructureSnapshot[];
  rooms: RoomSnapshot[];
  zones: ZoneSnapshot[];
  personnel: PersonnelSnapshot;
  finance: FinanceSummarySnapshot;
}

const summarizeHealth = (
  zone: StructureState['rooms'][number]['zones'][number],
): ZoneHealthSnapshot => {
  const plantHealthEntries = Object.values(zone.health.plantHealth ?? {});
  const diseaseCount = plantHealthEntries.reduce(
    (accumulator, item) => accumulator + (item?.diseases?.length ?? 0),
    0,
  );
  const pestCount = plantHealthEntries.reduce(
    (accumulator, item) => accumulator + (item?.pests?.length ?? 0),
    0,
  );

  return {
    diseases: diseaseCount,
    pests: pestCount,
    pendingTreatments: zone.health.pendingTreatments.length,
    appliedTreatments: zone.health.appliedTreatments.length,
    reentryRestrictedUntilTick: zone.health.reentryRestrictedUntilTick,
    preHarvestRestrictedUntilTick: zone.health.preHarvestRestrictedUntilTick,
  };
};

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
};

const summarizeLighting = (
  zone: StructureState['rooms'][number]['zones'][number],
): ZoneLightingSnapshot | undefined => {
  const area = toFiniteNumber(zone.area);
  const zoneArea = area !== undefined && area > 0 ? area : undefined;
  let coverage = 0;

  if (zoneArea !== undefined) {
    for (const device of zone.devices) {
      if (device.status !== 'operational' || !LIGHT_DEVICE_KINDS.has(device.kind)) {
        continue;
      }
      const coverageArea = toFiniteNumber(device.settings.coverageArea);
      if (coverageArea === undefined || coverageArea <= 0) {
        continue;
      }
      const sanitizedCoverage = Math.min(Math.max(coverageArea, 0), zoneArea);
      const efficiency = toFiniteNumber(device.efficiency);
      const efficiencyFactor = efficiency !== undefined ? Math.max(0, Math.min(efficiency, 1)) : 1;
      coverage += sanitizedCoverage * efficiencyFactor;
    }
  }

  const coverageRatio =
    zoneArea !== undefined && coverage > 0
      ? Math.max(0, Math.min(coverage / zoneArea, 1))
      : undefined;

  const averagePpfd =
    toFiniteNumber(zone.metrics?.averagePpfd) ?? toFiniteNumber(zone.environment?.ppfd);

  const photoperiodOn = toFiniteNumber(zone.lighting?.photoperiodHours?.on);
  const photoperiodOff = toFiniteNumber(zone.lighting?.photoperiodHours?.off);
  const hasPhotoperiod = photoperiodOn !== undefined && photoperiodOff !== undefined;

  if (!hasPhotoperiod && coverageRatio === undefined && averagePpfd === undefined) {
    return undefined;
  }

  const snapshot: ZoneLightingSnapshot = {};
  if (coverageRatio !== undefined) {
    snapshot.coverageRatio = coverageRatio;
  }
  if (averagePpfd !== undefined) {
    snapshot.averagePpfd = averagePpfd;
  }
  if (hasPhotoperiod) {
    snapshot.photoperiodHours = { on: photoperiodOn!, off: photoperiodOff! };
  }

  return snapshot;
};

const clonePlantingPlan = (
  plan: ZonePlantingPlanState | null | undefined,
): ZonePlantingPlanSnapshot | null | undefined => {
  if (plan === undefined) {
    return undefined;
  }

  if (plan === null) {
    return null;
  }

  return {
    id: plan.id,
    strainId: plan.strainId,
    count: plan.count,
    autoReplant: plan.autoReplant,
    enabled: plan.enabled,
    name: plan.name,
  } satisfies ZonePlantingPlanSnapshot;
};

const cloneResources = (resources: ZoneResourceState): ZoneResourceState => ({
  waterLiters: resources.waterLiters,
  nutrientSolutionLiters: resources.nutrientSolutionLiters,
  nutrientStrength: resources.nutrientStrength,
  substrateHealth: resources.substrateHealth,
  reservoirLevel: resources.reservoirLevel,
  lastTranspirationLiters: resources.lastTranspirationLiters,
});

const cloneControl = (control: ZoneControlState): ZoneControlState => ({
  setpoints: {
    temperature: control.setpoints.temperature,
    humidity: control.setpoints.humidity,
    co2: control.setpoints.co2,
    ppfd: control.setpoints.ppfd,
    vpd: control.setpoints.vpd,
  },
});

export const buildSimulationSnapshot = (
  state: GameState,
  roomPurposeSource: RoomPurposeSource,
): SimulationSnapshot => {
  const structures: StructureSnapshot[] = [];
  const rooms: RoomSnapshot[] = [];
  const zones: ZoneSnapshot[] = [];

  const clock: SimulationClockSnapshot = {
    tick: state.clock.tick,
    isPaused: state.clock.isPaused,
    targetTickRate: state.clock.targetTickRate,
    startedAt: state.clock.startedAt,
    lastUpdatedAt: state.clock.lastUpdatedAt,
  };

  for (const structure of state.structures) {
    const roomIds: string[] = [];

    for (const room of structure.rooms) {
      roomIds.push(room.id);
      const zoneIds: string[] = [];

      for (const zone of room.zones) {
        zoneIds.push(zone.id);
        const lighting = summarizeLighting(zone);
        const plantingPlan = clonePlantingPlan(zone.plantingPlan);
        zones.push({
          id: zone.id,
          name: zone.name,
          structureId: structure.id,
          structureName: structure.name,
          roomId: room.id,
          roomName: room.name,
          area: zone.area,
          ceilingHeight: zone.ceilingHeight,
          volume: zone.volume,
          environment: { ...zone.environment },
          resources: cloneResources(zone.resources),
          metrics: { ...zone.metrics },
          control: cloneControl(zone.control ?? { setpoints: {} }),
          devices: zone.devices.map((device) => ({
            id: device.id,
            blueprintId: device.blueprintId,
            kind: device.kind,
            name: device.name,
            zoneId: device.zoneId,
            status: device.status,
            efficiency: device.efficiency,
            runtimeHours: device.runtimeHours,
            maintenance: { ...device.maintenance },
            settings: { ...device.settings },
          })),
          plants: zone.plants.map((plant) => ({
            id: plant.id,
            strainId: plant.strainId,
            stage: plant.stage,
            health: plant.health,
            stress: plant.stress,
            biomassDryGrams: plant.biomassDryGrams,
            yieldDryGrams: plant.yieldDryGrams,
          })),
          health: summarizeHealth(zone),
          lighting,
          plantingPlan,
        });
      }

      const purpose = requireRoomPurpose(roomPurposeSource, room.purposeId, { by: 'id' });

      rooms.push({
        id: room.id,
        name: room.name,
        structureId: structure.id,
        structureName: structure.name,
        purposeId: room.purposeId,
        purposeKind: purpose.kind,
        purposeName: purpose.name,
        purposeFlags: purpose.flags ? { ...purpose.flags } : undefined,
        area: room.area,
        height: room.height,
        volume: room.volume,
        cleanliness: room.cleanliness,
        maintenanceLevel: room.maintenanceLevel,
        zoneIds,
      });
    }

    structures.push({
      id: structure.id,
      name: structure.name,
      status: structure.status,
      footprint: { ...structure.footprint },
      rentPerTick: structure.rentPerTick,
      roomIds,
    });
  }

  const personnel: PersonnelSnapshot = {
    employees: state.personnel.employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      role: employee.role,
      salaryPerTick: employee.salaryPerTick,
      morale: employee.morale,
      energy: employee.energy,
      maxMinutesPerTick: employee.maxMinutesPerTick,
      status: employee.status,
      assignedStructureId: employee.assignedStructureId,
    })),
    applicants: state.personnel.applicants.map((applicant) => {
      const snapshot: ApplicantSnapshot = {
        id: applicant.id,
        name: applicant.name,
        desiredRole: applicant.desiredRole,
        expectedSalary: applicant.expectedSalary,
        traits: [...applicant.traits],
        skills: { ...applicant.skills },
      };

      const personalSeed = getApplicantPersonalSeed(applicant);
      if (personalSeed) {
        snapshot.personalSeed = personalSeed;
      }

      if (applicant.gender) {
        snapshot.gender = applicant.gender;
      }

      return snapshot;
    }),
    overallMorale: state.personnel.overallMorale,
  };

  const ledger: FinanceLedgerEntrySnapshot[] | undefined = (() => {
    const source = state.finances.ledger;
    if (!Array.isArray(source) || source.length === 0) {
      return undefined;
    }

    const compact = source
      .slice(Math.max(0, source.length - 50))
      .map((entry): FinanceLedgerEntrySnapshot | undefined => {
        const amount = toFiniteNumber(entry.amount);
        const tickValue = toFiniteNumber(entry.tick);
        if (amount === undefined || tickValue === undefined) {
          return undefined;
        }
        const description = typeof entry.description === 'string' ? entry.description.trim() : '';

        return {
          type: entry.type,
          category: entry.category,
          amount,
          tick: Math.max(0, Math.trunc(tickValue)),
          description: description.length > 0 ? description : entry.category,
        } satisfies FinanceLedgerEntrySnapshot;
      })
      .filter((value): value is FinanceLedgerEntrySnapshot => value !== undefined);

    return compact.length > 0 ? compact : undefined;
  })();

  const finance: FinanceSummarySnapshot = {
    cashOnHand: state.finances.cashOnHand,
    reservedCash: state.finances.reservedCash,
    totalRevenue: state.finances.summary.totalRevenue,
    totalExpenses: state.finances.summary.totalExpenses,
    netIncome: state.finances.summary.netIncome,
    lastTickRevenue: state.finances.summary.lastTickRevenue,
    lastTickExpenses: state.finances.summary.lastTickExpenses,
    utilityPrices: (() => {
      const prices = state.finances.utilityPrices;
      if (!prices) {
        return undefined;
      }
      const pricePerKwh = toFiniteNumber(prices.pricePerKwh);
      const pricePerLiterWater = toFiniteNumber(prices.pricePerLiterWater);
      const pricePerGramNutrients = toFiniteNumber(prices.pricePerGramNutrients);
      if (
        pricePerKwh === undefined &&
        pricePerLiterWater === undefined &&
        pricePerGramNutrients === undefined
      ) {
        return undefined;
      }
      return {
        pricePerKwh: pricePerKwh !== undefined ? Math.max(0, pricePerKwh) : undefined,
        pricePerLiterWater:
          pricePerLiterWater !== undefined ? Math.max(0, pricePerLiterWater) : undefined,
        pricePerGramNutrients:
          pricePerGramNutrients !== undefined ? Math.max(0, pricePerGramNutrients) : undefined,
      };
    })(),
    ledger,
  };

  return {
    tick: state.clock.tick,
    clock,
    structures,
    rooms,
    zones,
    personnel,
    finance,
  };
};
