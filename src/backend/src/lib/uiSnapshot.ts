import { requireRoomPurpose, type RoomPurposeSource } from '@/engine/roomPurposes/index.js';
import type {
  ApplicantState,
  DeviceInstanceState,
  EmployeeState,
  GameState,
  PlantState,
  StructureState,
  ZoneEnvironmentState,
  ZoneMetricState,
  ZoneResourceState,
} from '@/state/models.js';

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

export interface DeviceSnapshot {
  id: string;
  blueprintId: string;
  kind: string;
  name: string;
  zoneId: string;
  status: DeviceInstanceState['status'];
  efficiency: number;
  runtimeHours: number;
  maintenance: DeviceInstanceState['maintenance'];
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
  health: ZoneHealthSnapshot;
}

export interface EmployeeSnapshot {
  id: string;
  name: string;
  role: EmployeeState['role'];
  salaryPerTick: number;
  morale: number;
  energy: number;
  status: EmployeeState['status'];
  assignedStructureId?: string;
}

export interface ApplicantSnapshot {
  id: string;
  name: string;
  desiredRole: ApplicantState['desiredRole'];
  expectedSalary: number;
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
}

export interface SimulationSnapshot {
  tick: number;
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

const cloneResources = (resources: ZoneResourceState): ZoneResourceState => ({
  waterLiters: resources.waterLiters,
  nutrientSolutionLiters: resources.nutrientSolutionLiters,
  nutrientStrength: resources.nutrientStrength,
  substrateHealth: resources.substrateHealth,
  reservoirLevel: resources.reservoirLevel,
});

export const buildSimulationSnapshot = (
  state: GameState,
  roomPurposeSource: RoomPurposeSource,
): SimulationSnapshot => {
  const structures: StructureSnapshot[] = [];
  const rooms: RoomSnapshot[] = [];
  const zones: ZoneSnapshot[] = [];

  for (const structure of state.structures) {
    const roomIds: string[] = [];

    for (const room of structure.rooms) {
      roomIds.push(room.id);
      const zoneIds: string[] = [];

      for (const zone of room.zones) {
        zoneIds.push(zone.id);
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
      status: employee.status,
      assignedStructureId: employee.assignedStructureId,
    })),
    applicants: state.personnel.applicants.map((applicant) => ({
      id: applicant.id,
      name: applicant.name,
      desiredRole: applicant.desiredRole,
      expectedSalary: applicant.expectedSalary,
    })),
    overallMorale: state.personnel.overallMorale,
  };

  const finance: FinanceSummarySnapshot = {
    cashOnHand: state.finances.cashOnHand,
    reservedCash: state.finances.reservedCash,
    totalRevenue: state.finances.summary.totalRevenue,
    totalExpenses: state.finances.summary.totalExpenses,
    netIncome: state.finances.summary.netIncome,
    lastTickRevenue: state.finances.summary.lastTickRevenue,
    lastTickExpenses: state.finances.summary.lastTickExpenses,
  };

  return {
    tick: state.clock.tick,
    structures,
    rooms,
    zones,
    personnel,
    finance,
  };
};
