import { useEffect, useMemo } from 'react';
import HireEmployeeModal from '@/views/personnel/modals/HireEmployeeModal';
import FireEmployeeModal from '@/views/personnel/modals/FireEmployeeModal';
import CreateRoomModal from '@/views/world/modals/CreateRoomModal';
import CreateZoneModal from '@/views/world/modals/CreateZoneModal';
import DuplicateRoomModal from '@/views/world/modals/DuplicateRoomModal';
import DuplicateStructureModal from '@/views/world/modals/DuplicateStructureModal';
import DuplicateZoneModal from '@/views/world/modals/DuplicateZoneModal';
import RentStructureModal from '@/views/world/modals/RentStructureModal';
import RenameEntityModal from '@/views/world/modals/RenameEntityModal';
import ConfirmDeletionModal from '@/views/world/modals/ConfirmDeletionModal';
import PlantDetailModal from '@/views/zone/modals/PlantDetailModal';
import InstallDeviceModal from '@/views/zone/modals/InstallDeviceModal';
import UpdateDeviceModal from '@/views/zone/modals/UpdateDeviceModal';
import MoveDeviceModal from '@/views/zone/modals/MoveDeviceModal';
import RemoveDeviceModal from '@/views/zone/modals/RemoveDeviceModal';
import {
  selectRoomsGroupedByStructure,
  selectZonesGroupedByStructure,
  selectZonesGroupedByRoom,
  useAppStore,
  usePersonnelStore,
  useZoneStore,
} from '@/store';

const ModalHost = () => {
  const activeModal = useAppStore((state) => state.activeModal);
  const closeModal = useAppStore((state) => state.closeModal);

  const personnel = usePersonnelStore((state) => state.personnel);
  const hireCandidate = usePersonnelStore((state) => state.hireCandidate);
  const fireEmployee = usePersonnelStore((state) => state.fireEmployee);

  const {
    structures,
    rooms,
    zones,
    devices,
    plants,
    rentStructure,
    createRoom,
    createZone,
    duplicateStructure,
    duplicateRoom,
    duplicateZone,
    updateStructureName,
    updateRoomName,
    updateZoneName,
    removeStructure,
    removeRoom,
    removeZone,
    installDevice,
    updateDevice,
    moveDevice,
    removeDevice,
  } = useZoneStore((state) => ({
    structures: state.structures,
    rooms: state.rooms,
    zones: state.zones,
    devices: state.devices,
    plants: state.plants,
    rentStructure: state.rentStructure,
    createRoom: state.createRoom,
    createZone: state.createZone,
    duplicateStructure: state.duplicateStructure,
    duplicateRoom: state.duplicateRoom,
    duplicateZone: state.duplicateZone,
    updateStructureName: state.updateStructureName,
    updateRoomName: state.updateRoomName,
    updateZoneName: state.updateZoneName,
    removeStructure: state.removeStructure,
    removeRoom: state.removeRoom,
    removeZone: state.removeZone,
    installDevice: state.installDevice,
    updateDevice: state.updateDevice,
    moveDevice: state.moveDevice,
    removeDevice: state.removeDevice,
  }));

  const roomsByStructure = useZoneStore(selectRoomsGroupedByStructure);
  const zonesByRoom = useZoneStore(selectZonesGroupedByRoom);
  const zonesByStructure = useZoneStore(selectZonesGroupedByStructure);

  const candidateId = useMemo(() => {
    if (activeModal?.kind !== 'hireEmployee') {
      return undefined;
    }
    return activeModal.payload.candidateId;
  }, [activeModal]);

  const employeeId = useMemo(() => {
    if (activeModal?.kind !== 'fireEmployee') {
      return undefined;
    }
    return activeModal.payload.employeeId;
  }, [activeModal]);

  const plantId = useMemo(() => {
    if (activeModal?.kind !== 'plantDetails') {
      return undefined;
    }
    return activeModal.payload.plantId;
  }, [activeModal]);

  const candidate = useMemo(() => {
    if (!candidateId) {
      return undefined;
    }
    return personnel?.applicants?.find((item) => item.id === candidateId);
  }, [candidateId, personnel?.applicants]);

  const employee = useMemo(() => {
    if (!employeeId) {
      return undefined;
    }
    return personnel?.employees?.find((item) => item.id === employeeId);
  }, [employeeId, personnel?.employees]);

  const plant = useMemo(() => {
    if (!plantId) {
      return undefined;
    }
    return plants[plantId];
  }, [plantId, plants]);

  useEffect(() => {
    if (!activeModal) {
      return;
    }
    if (activeModal.kind === 'hireEmployee' && candidateId && !candidate) {
      closeModal();
    }
    if (activeModal.kind === 'fireEmployee' && employeeId && !employee) {
      closeModal();
    }
    if (activeModal.kind === 'plantDetails' && plantId && !plant) {
      closeModal();
    }
  }, [activeModal, candidate, candidateId, closeModal, employee, employeeId, plant, plantId]);

  if (!activeModal) {
    return null;
  }

  switch (activeModal.kind) {
    case 'hireEmployee':
      if (!candidate) {
        return null;
      }
      return (
        <HireEmployeeModal
          candidate={candidate}
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onConfirm={({ wage, role }) => {
            hireCandidate(candidate.id, { wage, role });
            closeModal();
          }}
        />
      );
    case 'fireEmployee':
      if (!employee) {
        return null;
      }
      return (
        <FireEmployeeModal
          employee={employee}
          structureName={
            employee.assignedStructureId
              ? structures[employee.assignedStructureId]?.name
              : undefined
          }
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onConfirm={() => {
            fireEmployee(employee.id);
            closeModal();
          }}
        />
      );
    case 'createRoom': {
      const { structureId } = activeModal.payload;
      const structure = structures[structureId];
      if (!structure) {
        closeModal();
        return null;
      }
      const structureRooms = roomsByStructure[structureId] ?? [];
      return (
        <CreateRoomModal
          structure={structure}
          existingRooms={structureRooms}
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onSubmit={({ name, purposeId, area, height }) => {
            createRoom(structure.id, { name, purposeId, area, height });
            closeModal();
          }}
        />
      );
    }
    case 'createZone': {
      const { roomId } = activeModal.payload;
      const room = rooms[roomId];
      if (!room) {
        closeModal();
        return null;
      }
      const roomZones = zonesByRoom[roomId] ?? [];
      return (
        <CreateZoneModal
          room={room}
          existingZones={roomZones}
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onSubmit={({ name, area, methodId, targetPlantCount }) => {
            createZone(room.id, { name, area, methodId, targetPlantCount });
            closeModal();
          }}
        />
      );
    }
    case 'rentStructure': {
      const { structureId } = activeModal.payload;
      const structure = structures[structureId];
      if (!structure) {
        closeModal();
        return null;
      }
      const structureRooms = roomsByStructure[structureId] ?? [];
      const structureZones = zonesByStructure[structureId] ?? [];
      return (
        <RentStructureModal
          structure={structure}
          rooms={structureRooms}
          zones={structureZones}
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onConfirm={() => {
            rentStructure(structure.id);
            closeModal();
          }}
        />
      );
    }
    case 'duplicateStructure': {
      const { structureId } = activeModal.payload;
      const structure = structures[structureId];
      if (!structure) {
        closeModal();
        return null;
      }
      const structureRooms = roomsByStructure[structureId] ?? [];
      const structureZones = zonesByStructure[structureId] ?? [];
      return (
        <DuplicateStructureModal
          structure={structure}
          rooms={structureRooms}
          zones={structureZones}
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onConfirm={({ name }) => {
            duplicateStructure(structure.id, { name });
            closeModal();
          }}
        />
      );
    }
    case 'duplicateRoom': {
      const { roomId } = activeModal.payload;
      const room = rooms[roomId];
      if (!room) {
        closeModal();
        return null;
      }
      const structure = structures[room.structureId];
      if (!structure) {
        closeModal();
        return null;
      }
      const structureRooms = roomsByStructure[structure.id] ?? [];
      const roomZones = zonesByRoom[room.id] ?? [];
      const usedArea = structureRooms.reduce((sum, item) => sum + Math.max(item.area, 0), 0);
      const availableArea = Math.max(structure.footprint.area - usedArea, 0);
      const deviceCount = roomZones.reduce((sum, zone) => sum + zone.devices.length, 0);
      return (
        <DuplicateRoomModal
          room={room}
          structure={structure}
          zones={roomZones}
          availableArea={availableArea}
          deviceCount={deviceCount}
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onConfirm={({ name }) => {
            duplicateRoom(room.id, { name });
            closeModal();
          }}
        />
      );
    }
    case 'duplicateZone': {
      const { zoneId } = activeModal.payload;
      const zone = zones[zoneId];
      if (!zone) {
        closeModal();
        return null;
      }
      const room = rooms[zone.roomId];
      if (!room) {
        closeModal();
        return null;
      }
      const roomZones = zonesByRoom[room.id] ?? [];
      const usedArea = roomZones.reduce((sum, item) => sum + Math.max(item.area, 0), 0);
      const availableArea = Math.max(room.area - usedArea, 0);
      const deviceCount = zone.devices.length;
      return (
        <DuplicateZoneModal
          zone={zone}
          room={room}
          availableArea={availableArea}
          deviceCount={deviceCount}
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onConfirm={({ name, includeDevices, includeMethod }) => {
            duplicateZone(zone.id, { name, includeDevices, includeMethod });
            closeModal();
          }}
        />
      );
    }
    case 'renameStructure': {
      const { structureId } = activeModal.payload;
      const structure = structures[structureId];
      if (!structure) {
        closeModal();
        return null;
      }
      return (
        <RenameEntityModal
          entityLabel="Structure"
          currentName={structure.name}
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onConfirm={(name) => {
            updateStructureName(structure.id, name);
            closeModal();
          }}
        />
      );
    }
    case 'renameRoom': {
      const { roomId } = activeModal.payload;
      const room = rooms[roomId];
      if (!room) {
        closeModal();
        return null;
      }
      return (
        <RenameEntityModal
          entityLabel="Room"
          currentName={room.name}
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onConfirm={(name) => {
            updateRoomName(room.id, name);
            closeModal();
          }}
        />
      );
    }
    case 'renameZone': {
      const { zoneId } = activeModal.payload;
      const zone = zones[zoneId];
      if (!zone) {
        closeModal();
        return null;
      }
      return (
        <RenameEntityModal
          entityLabel="Zone"
          currentName={zone.name}
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onConfirm={(name) => {
            updateZoneName(zone.id, name);
            closeModal();
          }}
        />
      );
    }
    case 'deleteStructure': {
      const { structureId } = activeModal.payload;
      const structure = structures[structureId];
      if (!structure) {
        closeModal();
        return null;
      }
      return (
        <ConfirmDeletionModal
          entityLabel="Structure"
          entityName={structure.name}
          impactDescription="All rooms and zones within the structure will be scheduled for teardown by the simulation facade."
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onConfirm={() => {
            removeStructure(structure.id);
            closeModal();
          }}
        />
      );
    }
    case 'deleteRoom': {
      const { roomId } = activeModal.payload;
      const room = rooms[roomId];
      if (!room) {
        closeModal();
        return null;
      }
      return (
        <ConfirmDeletionModal
          entityLabel="Room"
          entityName={room.name}
          impactDescription="Zones and devices in this room will be cleaned up deterministically by the facade."
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onConfirm={() => {
            removeRoom(room.id);
            closeModal();
          }}
        />
      );
    }
    case 'deleteZone': {
      const { zoneId } = activeModal.payload;
      const zone = zones[zoneId];
      if (!zone) {
        closeModal();
        return null;
      }
      return (
        <ConfirmDeletionModal
          entityLabel="Zone"
          entityName={zone.name}
          impactDescription="Plantings, devices, and automation assigned to this zone will be removed."
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onConfirm={() => {
            removeZone(zone.id);
            closeModal();
          }}
        />
      );
    }
    case 'plantDetails':
      if (!plant) {
        return null;
      }
      return (
        <PlantDetailModal
          plant={plant}
          title={activeModal.title}
          description={activeModal.description}
          onClose={closeModal}
        />
      );
    case 'installDevice': {
      const { zoneId } = activeModal.payload;
      const zone = zones[zoneId];
      if (!zone) {
        closeModal();
        return null;
      }
      return (
        <InstallDeviceModal
          zone={zone}
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onSubmit={({ deviceId, settings }) => {
            installDevice(zone.id, deviceId, settings);
            closeModal();
          }}
        />
      );
    }
    case 'updateDevice': {
      const { deviceId } = activeModal.payload;
      const device = devices[deviceId];
      if (!device) {
        closeModal();
        return null;
      }
      const zone = zones[device.zoneId];
      return (
        <UpdateDeviceModal
          device={device}
          zone={zone}
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onSubmit={({ settings }) => {
            updateDevice(device.id, settings);
            closeModal();
          }}
        />
      );
    }
    case 'moveDevice': {
      const { deviceId } = activeModal.payload;
      const device = devices[deviceId];
      if (!device) {
        closeModal();
        return null;
      }
      const zone = zones[device.zoneId];
      return (
        <MoveDeviceModal
          device={device}
          currentZone={zone}
          zones={Object.values(zones)}
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onSubmit={({ targetZoneId }) => {
            moveDevice(device.id, targetZoneId);
            closeModal();
          }}
        />
      );
    }
    case 'removeDevice': {
      const { deviceId } = activeModal.payload;
      const device = devices[deviceId];
      if (!device) {
        closeModal();
        return null;
      }
      const zone = zones[device.zoneId];
      return (
        <RemoveDeviceModal
          device={device}
          zone={zone}
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onConfirm={() => {
            removeDevice(device.id);
            closeModal();
          }}
        />
      );
    }
    default:
      return null;
  }
};

export default ModalHost;
