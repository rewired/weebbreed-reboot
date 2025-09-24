/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { initialMockData, generateCandidates, createPlant } from './data/mockData';
import { deterministicUuid } from './lib/deterministic';
import {
  findStructureForRoom,
  findRoomById,
  findZoneById,
  findParentRoomForZone,
} from './utils/helpers';
import { DEVICE_COSTS } from './data/constants';
import { Candidate, GameData, Room, Selection, Structure, Zone } from './types/domain';

import { DashboardHeader } from './components/layout/DashboardHeader';
import { Sidebar } from './components/layout/Sidebar';
import { MainContent } from './components/layout/MainContent';
import { EventLog } from './components/layout/EventLog';
import { Modal } from './components/common/Modal';

import { AddRoomModal } from './components/modals/AddRoomModal';
import { AddZoneModal } from './components/modals/AddZoneModal';
import { PlantStrainModal } from './components/modals/PlantStrainModal';
import { PlantDetailModal } from './components/modals/PlantDetailModal';
import { AddDeviceModal } from './components/modals/AddDeviceModal';
import { RemoveDeviceModal } from './components/modals/RemoveDeviceModal';
import { RentStructureModal } from './components/modals/RentStructureModal';
import { HireEmployeeModal } from './components/modals/HireEmployeeModal';
import { DeleteConfirmationModal } from './components/modals/DeleteConfirmationModal';
import { DuplicateRoomModal } from './components/modals/DuplicateRoomModal';
import { DuplicateZoneModal } from './components/modals/DuplicateZoneModal';
import { GameMenuModal } from './components/modals/GameMenuModal';

export const App = () => {
  const [gameData, setGameData] = useState<GameData>(initialMockData);
  const [selection, setSelection] = useState<Selection>({
    view: 'dashboard',
    structureId: null,
    roomId: null,
    zoneId: null,
  });
  const [modal, setModal] = useState<{ type: string | null; props: any }>({
    type: null,
    props: {},
  });
  const [isPlaying, setIsPlaying] = useState(true);
  const [gameSpeed, setGameSpeed] = useState('1x');

  const openModal = (type: string, props = {}) => setModal({ type, props });
  const closeModal = () => setModal({ type: null, props: {} });

  const handleTogglePlay = () => setIsPlaying((prev) => !prev);
  const handleChangeSpeed = (newSpeed: string) => setGameSpeed(newSpeed);

  const handleNavigate = (
    level: string,
    id: string | null = null,
    parentId: string | null = null,
    grandParentId: string | null = null,
  ) => {
    if (level === 'dashboard') {
      setSelection({ view: 'dashboard', structureId: null, roomId: null, zoneId: null });
    } else if (level === 'structure') {
      setSelection({ view: 'dashboard', structureId: id, roomId: null, zoneId: null });
    } else if (level === 'room') {
      setSelection({ view: 'dashboard', structureId: parentId, roomId: id, zoneId: null });
    } else if (level === 'zone') {
      setSelection({ view: 'dashboard', structureId: grandParentId, roomId: parentId, zoneId: id });
    } else if (level === 'personnel') {
      setSelection({ view: 'personnel', structureId: null, roomId: null, zoneId: null });
    } else if (level === 'finance') {
      setSelection({ view: 'finance', structureId: null, roomId: null, zoneId: null });
    }
  };

  const handleControlsChange = (
    zoneId: string,
    controlName: string,
    newValue: number | string | boolean,
  ) => {
    setGameData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const zone = findZoneById(zoneId, newData);
      if (zone && zone.controls && zone.kpis) {
        if (controlName === 'lightPower') zone.controls.light.power = newValue as number;
        else if (controlName === 'lightState') zone.controls.light.on = newValue as boolean;
        else if (controlName === 'lightCycle') zone.controls.light.cycle = newValue as string;
        else (zone.controls as any)[controlName].value = newValue as number;

        const lightOn = zone.controls.light.on;
        const power = zone.controls.light.power;
        const ppfdKpi = zone.kpis.find((k) => k.title === 'PPFD');
        const ppfdTarget = ppfdKpi?.target || 900;

        if (ppfdKpi) {
          const newPPFD = lightOn ? ppfdTarget * (power / 100) : 0;
          ppfdKpi.value = newPPFD.toFixed(0);
          if (newPPFD > ppfdTarget * 0.8) ppfdKpi.status = 'optimal';
          else if (newPPFD > 0) ppfdKpi.status = 'warning';
          else ppfdKpi.status = 'danger';
        }

        return newData;
      }
      return prevData;
    });
  };

  const handleCreateRoom = ({
    structureId,
    name,
    purpose,
    area,
  }: {
    structureId: string;
    name: string;
    purpose: string;
    area: number;
  }) => {
    setGameData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const structure = newData.structures.find((s) => s.id === structureId);
      if (structure && structure.totalArea - structure.usedArea >= area) {
        const newRoom: Room = { id: deterministicUuid(), name, purpose, area, zones: [] };
        if (purpose === 'breakroom') newRoom.occupancy = { current: 0 };
        if (purpose === 'processing') newRoom.curingBatches = [];
        structure.rooms.push(newRoom);
        structure.usedArea += area;
      }
      return newData;
    });
    closeModal();
  };

  const handleCreateZone = ({
    roomId,
    name,
    method,
  }: {
    roomId: string;
    name: string;
    method: string;
  }) => {
    setGameData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const room = findRoomById(roomId, newData);
      const structure = findStructureForRoom(roomId, newData);
      if (room && structure && room.purpose === 'growroom') {
        const newZone: Zone = {
          id: deterministicUuid(),
          name,
          method,
          area: 50,
          maxPlants: 20,
          strain: '-',
          phase: 'Empty',
          devices: [],
          plants: [],
          estYield: 0,
          stress: 0,
          kpis: [],
          controls: {
            temperature: { value: 22, min: 15, max: 35, target: 24 },
            humidity: { value: 50, min: 30, max: 80, target: 50 },
            co2: { value: 400, min: 400, max: 2000, target: 1200 },
            light: { power: 0, on: false, cycle: '18h/6h' },
          },
        };
        room.zones.push(newZone);
        handleNavigate('zone', newZone.id, room.id, structure.id);
      }
      return newData;
    });
    closeModal();
  };

  const handlePlantStrain = ({
    zoneId,
    strain,
    count,
  }: {
    zoneId: string;
    strain: string;
    count: number;
  }) => {
    setGameData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const zone = findZoneById(zoneId, newData);
      if (zone) {
        zone.strain = strain;
        zone.phase = 'Vegetative (Day 1)';
        zone.plants = Array(count)
          .fill(0)
          .map(() => createPlant({ name: strain, health: 100, progress: 1 }));
      }
      return newData;
    });
    closeModal();
  };

  const handleAddDevice = ({
    zoneId,
    name,
    type,
    count,
  }: {
    zoneId: string;
    name: string;
    type: string;
    count: number;
  }) => {
    setGameData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const zone = findZoneById(zoneId, newData);
      if (zone) {
        for (let i = 0; i < count; i++) {
          zone.devices.push({ id: deterministicUuid(), name, type });
        }
      }
      return newData;
    });
    closeModal();
  };

  const handleRemoveDevice = ({
    zoneId,
    device,
    quantity,
  }: {
    zoneId: string;
    device: { ids: string[] };
    quantity: number;
  }) => {
    setGameData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const zone = findZoneById(zoneId, newData);
      if (zone) {
        const deviceIdsToRemove = new Set(device.ids.slice(0, quantity));
        zone.devices = zone.devices.filter((d) => !deviceIdsToRemove.has(d.id));
      }
      return newData;
    });
    closeModal();
  };

  const handleRentStructure = ({ structure, name }: { structure: any; name: string }) => {
    setGameData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      if (newData.globalStats.balance >= structure.cost) {
        newData.globalStats.balance -= structure.cost;
        const newStructure: Structure = {
          id: deterministicUuid(),
          name: name,
          footprint: structure.footprint,
          totalArea: structure.totalArea,
          usedArea: 0,
          dailyCost: Math.round(structure.cost / 2000), // Example daily cost
          rooms: [],
        };
        newData.structures.push(newStructure);
        handleNavigate('structure', newStructure.id);
      }
      return newData;
    });
    closeModal();
  };

  const handleRename = ({
    entityType,
    entityId,
    newName,
  }: {
    entityType: string;
    entityId: string;
    newName: string;
  }) => {
    setGameData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      let entity;
      if (entityType === 'structure') {
        entity = newData.structures.find((s) => s.id === entityId);
      } else if (entityType === 'room') {
        entity = findRoomById(entityId, newData);
      } else if (entityType === 'zone') {
        entity = findZoneById(entityId, newData);
      }
      if (entity) {
        entity.name = newName;
      }
      return newData;
    });
  };

  const handleDelete = ({ entityType, entityId }: { entityType: string; entityId: string }) => {
    setGameData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      if (entityType === 'room') {
        const structure = findStructureForRoom(entityId, newData);
        if (structure) {
          const room = structure.rooms.find((r) => r.id === entityId);
          if (room) structure.usedArea -= room.area;
          structure.rooms = structure.rooms.filter((r) => r.id !== entityId);
          handleNavigate('structure', structure.id);
        }
      } else if (entityType === 'zone') {
        const room = findParentRoomForZone(entityId, newData);
        if (room) {
          room.zones = room.zones.filter((z) => z.id !== entityId);
          const structure = findStructureForRoom(room.id, newData);
          if (structure) handleNavigate('room', room.id, structure.id);
        }
      }
      return newData;
    });
    closeModal();
  };

  const handleDuplicateRoom = ({
    room,
    newName,
    deviceCost,
  }: {
    room: Room;
    newName: string;
    deviceCost: number;
  }) => {
    setGameData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const structure = findStructureForRoom(room.id, newData);
      if (structure && structure.totalArea - structure.usedArea >= room.area) {
        const newRoom = JSON.parse(JSON.stringify(room)); // Deep copy
        newRoom.id = deterministicUuid();
        newRoom.name = newName;
        newRoom.zones = newRoom.zones.map((zone: Zone) => {
          zone.id = deterministicUuid();
          zone.devices = zone.devices.map((device) => ({ ...device, id: deterministicUuid() }));
          return zone;
        });

        structure.rooms.push(newRoom);
        structure.usedArea += newRoom.area;
        newData.globalStats.balance -= deviceCost;
      }
      return newData;
    });
    closeModal();
  };

  const handleDuplicateZone = ({
    zone,
    room,
    newName,
    includeDevices,
    includeMethod,
  }: {
    zone: Zone;
    room: Room;
    newName: string;
    includeDevices: boolean;
    includeMethod: boolean;
  }) => {
    setGameData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const targetRoom = findRoomById(room.id, newData);
      if (targetRoom) {
        const newZone = JSON.parse(JSON.stringify(zone));
        newZone.id = deterministicUuid();
        newZone.name = newName;

        if (!includeMethod) {
          newZone.method = 'Empty';
          newZone.plants = [];
          newZone.strain = '-';
          newZone.phase = 'Empty';
        } else {
          newZone.plants = newZone.plants.map((p) => ({ ...p, id: deterministicUuid() }));
        }

        if (!includeDevices) {
          newZone.devices = [];
        } else {
          newZone.devices = newZone.devices.map((d) => ({ ...d, id: deterministicUuid() }));
          const deviceCost = newZone.devices.reduce(
            (total: number, device: any) =>
              total + (DEVICE_COSTS[device.name as keyof typeof DEVICE_COSTS] || 0),
            0,
          );
          newData.globalStats.balance -= deviceCost;
        }

        targetRoom.zones.push(newZone);
      }
      return newData;
    });
    closeModal();
  };

  const handleRefreshCandidates = () => {
    setGameData((prev) => ({ ...prev, candidates: generateCandidates() }));
  };

  const handleHireEmployee = ({
    candidate,
    structureId,
  }: {
    candidate: Candidate;
    structureId: string;
  }) => {
    setGameData((prev) => {
      const newEmployee = { ...candidate, assignment: structureId };
      return {
        ...prev,
        employees: [...prev.employees, newEmployee],
        candidates: prev.candidates.filter((c) => c.id !== candidate.id),
      };
    });
    closeModal();
  };

  const handleFireEmployee = (employeeId: string) => {
    setGameData((prev) => ({
      ...prev,
      employees: prev.employees.filter((e) => e.id !== employeeId),
    }));
  };

  const handlePlantAction = (zoneId: string, plantId: string, action: 'harvest' | 'trash') => {
    setGameData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const zone = findZoneById(zoneId, newData);
      if (zone) {
        if (action === 'harvest' || action === 'trash') {
          zone.plants = zone.plants.filter((p) => p.id !== plantId);
        }
      }
      return newData;
    });
    closeModal();
  };

  const handleBatchAction = (
    zoneId: string,
    plantIds: string[],
    action: 'harvest' | 'trash' | 'treat',
  ) => {
    setGameData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const zone = findZoneById(zoneId, newData);
      if (zone) {
        const idSet = new Set(plantIds);
        if (action === 'harvest' || action === 'trash') {
          zone.plants = zone.plants.filter((p) => !idSet.has(p.id));
        }
        if (action === 'treat') {
          zone.plants.forEach((p) => {
            if (idSet.has(p.id)) {
              p.status = 'treatment';
            }
          });
        }
      }
      return newData;
    });
  };

  const modalTitles: { [key: string]: string } = {
    addRoom: 'Create New Room',
    addZone: 'Create New Zone',
    plantStrain: 'Plant New Strain',
    addDevice: 'Install New Device',
    removeDevice: 'Remove Device',
    rentStructure: 'Rent New Structure',
    hireEmployee: 'Hire Candidate',
    gameMenu: 'Game Menu',
    plantDetail: 'Plant Details',
    delete: 'Confirm Deletion',
    duplicateRoom: 'Duplicate Room',
    duplicateZone: 'Duplicate Zone',
  };

  const modalContent = () => {
    switch (modal.type) {
      case 'addRoom':
        return (
          <AddRoomModal
            onSubmit={handleCreateRoom}
            structure={gameData.structures.find((s) => s.id === modal.props.structureId)}
            onClose={closeModal}
          />
        );
      case 'addZone':
        return (
          <AddZoneModal
            onSubmit={handleCreateZone}
            roomId={modal.props.roomId}
            onClose={closeModal}
          />
        );
      case 'plantStrain':
        return (
          <PlantStrainModal
            onSubmit={handlePlantStrain}
            zoneId={modal.props.zoneId}
            onClose={closeModal}
          />
        );
      case 'plantDetail':
        return (
          <PlantDetailModal
            plant={modal.props.plant}
            onHarvest={() => handlePlantAction(modal.props.zoneId, modal.props.plant.id, 'harvest')}
            onTrash={() => handlePlantAction(modal.props.zoneId, modal.props.plant.id, 'trash')}
          />
        );
      case 'addDevice':
        return (
          <AddDeviceModal
            onSubmit={handleAddDevice}
            zoneId={modal.props.zoneId}
            onClose={closeModal}
          />
        );
      case 'removeDevice':
        return (
          <RemoveDeviceModal
            onSubmit={handleRemoveDevice}
            zoneId={modal.props.zoneId}
            device={modal.props.device}
            onClose={closeModal}
          />
        );
      case 'rentStructure':
        return (
          <RentStructureModal
            onSubmit={handleRentStructure}
            availableStructures={gameData.availableStructures}
            balance={gameData.globalStats.balance}
            onClose={closeModal}
          />
        );
      case 'hireEmployee':
        return (
          <HireEmployeeModal
            onSubmit={handleHireEmployee}
            candidate={modal.props.candidate}
            structures={gameData.structures}
            onClose={closeModal}
          />
        );
      case 'delete':
        return (
          <DeleteConfirmationModal
            entityType={modal.props.entityType}
            entityName={modal.props.entityName}
            onConfirm={() => handleDelete(modal.props)}
          />
        );
      case 'duplicateRoom': {
        const room = findRoomById(modal.props.room.id, gameData);
        const structure = findStructureForRoom(modal.props.room.id, gameData);
        if (!room || !structure) return null;
        return (
          <DuplicateRoomModal onSubmit={handleDuplicateRoom} room={room} structure={structure} />
        );
      }
      case 'duplicateZone': {
        const zone = findZoneById(modal.props.zone.id, gameData);
        const room = findParentRoomForZone(modal.props.zone.id, gameData);
        if (!zone || !room) return null;
        return <DuplicateZoneModal onSubmit={handleDuplicateZone} zone={zone} room={room} />;
      }
      case 'gameMenu':
        return <GameMenuModal />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-stone-900 text-stone-300">
      <DashboardHeader
        stats={gameData.globalStats}
        onOpenModal={openModal}
        isPlaying={isPlaying}
        gameSpeed={gameSpeed}
        onTogglePlay={handleTogglePlay}
        onChangeSpeed={handleChangeSpeed}
        onNavigate={handleNavigate}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          structures={gameData.structures}
          selection={selection}
          onNavigate={handleNavigate}
          onOpenModal={openModal}
        />
        <main className="flex-1 p-6 overflow-y-auto">
          <MainContent
            selection={selection}
            gameData={gameData}
            onControlsChange={handleControlsChange}
            onOpenModal={openModal}
            onNavigate={handleNavigate}
            onRename={handleRename}
            onRefreshCandidates={handleRefreshCandidates}
            onFireEmployee={handleFireEmployee}
            onBatchAction={handleBatchAction}
          />
        </main>
      </div>
      <EventLog events={gameData.events} />
      {modal.type && (
        <Modal title={modalTitles[modal.type]} onClose={closeModal}>
          {modalContent()}
        </Modal>
      )}
    </div>
  );
};
