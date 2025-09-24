import { useEffect, useMemo } from 'react';
import HireEmployeeModal from '@/views/personnel/modals/HireEmployeeModal';
import FireEmployeeModal from '@/views/personnel/modals/FireEmployeeModal';
import CreateRoomModal from '@/views/world/modals/CreateRoomModal';
import CreateZoneModal from '@/views/world/modals/CreateZoneModal';
import DuplicateRoomModal from '@/views/world/modals/DuplicateRoomModal';
import DuplicateZoneModal from '@/views/world/modals/DuplicateZoneModal';
import RenameEntityModal from '@/views/world/modals/RenameEntityModal';
import ConfirmDeletionModal from '@/views/world/modals/ConfirmDeletionModal';
import PlantDetailModal from '@/views/zone/modals/PlantDetailModal';
import {
  selectIsPaused,
  useAppStore,
  useGameStore,
  usePersonnelStore,
  useZoneStore,
} from '@/store';

const ModalHost = () => {
  const activeModal = useAppStore((state) => state.activeModal);
  const closeModal = useAppStore((state) => state.closeModal);
  const wasRunningBeforeModal = useAppStore((state) => state.wasRunningBeforeModal);
  const setWasRunningBeforeModal = useAppStore((state) => state.setWasRunningBeforeModal);

  const issueControlCommand = useGameStore((state) => state.issueControlCommand);
  const isPaused = useGameStore(selectIsPaused);

  const personnel = usePersonnelStore((state) => state.personnel);
  const hireCandidate = usePersonnelStore((state) => state.hireCandidate);
  const fireEmployee = usePersonnelStore((state) => state.fireEmployee);

  const {
    structures,
    rooms,
    zones,
    plants,
    duplicateRoom,
    duplicateZone,
    updateStructureName,
    updateRoomName,
    updateZoneName,
    removeStructure,
    removeRoom,
    removeZone,
  } = useZoneStore((state) => ({
    structures: state.structures,
    rooms: state.rooms,
    zones: state.zones,
    plants: state.plants,
    duplicateRoom: state.duplicateRoom,
    duplicateZone: state.duplicateZone,
    updateStructureName: state.updateStructureName,
    updateRoomName: state.updateRoomName,
    updateZoneName: state.updateZoneName,
    removeStructure: state.removeStructure,
    removeRoom: state.removeRoom,
    removeZone: state.removeZone,
  }));

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

  const roomList = useMemo(() => Object.values(rooms), [rooms]);
  const zoneList = useMemo(() => Object.values(zones), [zones]);

  useEffect(() => {
    if (!activeModal) {
      if (wasRunningBeforeModal) {
        issueControlCommand({ action: 'play' });
        setWasRunningBeforeModal(false);
      }
      return;
    }

    if (activeModal.autoPause) {
      if (!isPaused) {
        setWasRunningBeforeModal(true);
        issueControlCommand({ action: 'pause' });
      } else {
        setWasRunningBeforeModal(false);
      }
    }
  }, [activeModal, isPaused, issueControlCommand, setWasRunningBeforeModal, wasRunningBeforeModal]);

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
      const structureRooms = roomList.filter((room) => room.structureId === structureId);
      return (
        <CreateRoomModal
          structure={structure}
          existingRooms={structureRooms}
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onSubmit={() => {
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
      const roomZones = zoneList.filter((zone) => zone.roomId === roomId);
      return (
        <CreateZoneModal
          room={room}
          existingZones={roomZones}
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onSubmit={() => {
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
      const structureRooms = roomList.filter((item) => item.structureId === structure.id);
      const structureZones = zoneList.filter((zone) => zone.structureId === structure.id);
      const roomZones = structureZones.filter((zone) => zone.roomId === room.id);
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
      const roomZones = zoneList.filter((item) => item.roomId === room.id);
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
    default:
      return null;
  }
};

export default ModalHost;
