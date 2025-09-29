import type { ReactElement } from 'react';
import { GameMenuModal } from './session/GameMenuModal';
import { LoadGameModal } from './session/LoadGameModal';
import { ImportGameModal } from './session/ImportGameModal';
import { NewGameModal } from './session/NewGameModal';
import { NotificationsModal } from './session/NotificationsModal';
import { RentStructureModal } from './structures/RentStructureModal';
import { DuplicateStructureModal } from './structures/DuplicateStructureModal';
import { RenameStructureModal } from './structures/RenameStructureModal';
import { DeleteStructureModal } from './structures/DeleteStructureModal';
import { CreateRoomModal } from './structures/CreateRoomModal';
import { DuplicateRoomModal } from './structures/DuplicateRoomModal';
import { DeleteRoomModal } from './structures/DeleteRoomModal';
import { PlantZoneModal } from './zones/PlantZoneModal';
import { ChangeZoneMethodModal } from './zones/ChangeZoneMethodModal';
import { DuplicateZoneModal } from './zones/DuplicateZoneModal';
import { DeleteZoneModal } from './zones/DeleteZoneModal';
import { CreateZoneModal } from './zones/CreateZoneModal';
import { ConfirmPlantActionModal } from './zones/ConfirmPlantActionModal';
import { InstallDeviceModal } from './devices/InstallDeviceModal';
import { MoveDeviceModal } from './devices/MoveDeviceModal';
import { RemoveDeviceModal } from './devices/RemoveDeviceModal';
import { TuneDeviceModal } from './devices/TuneDeviceModal';
import { RecruitStaffModal } from './workforce/RecruitStaffModal';
import { RejectApplicantModal } from './workforce/RejectApplicantModal';
import { EmployeeDetailsModal } from './workforce/EmployeeDetailsModal';
import { HireModal } from '@/components/personnel/HireModal';
import { FireModal } from '@/components/personnel/FireModal';
import type { SimulationBridge } from '@/facade/systemFacade';
import type { ModalDescriptor } from '@/store/ui';

export interface ModalRendererProps {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}

export type ModalRenderer = (props: ModalRendererProps) => ReactElement | null;

export const modalRegistry: Record<ModalDescriptor['type'], ModalRenderer> = {
  gameMenu: ({ bridge, closeModal }) => <GameMenuModal bridge={bridge} closeModal={closeModal} />,
  loadGame: () => <LoadGameModal />,
  importGame: () => <ImportGameModal />,
  newGame: ({ bridge, closeModal }) => <NewGameModal bridge={bridge} closeModal={closeModal} />,
  notifications: () => <NotificationsModal />,
  rentStructure: ({ bridge, closeModal }) => (
    <RentStructureModal bridge={bridge} closeModal={closeModal} />
  ),
  duplicateStructure: ({ bridge, closeModal, context }) => (
    <DuplicateStructureModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  renameStructure: ({ bridge, closeModal, context }) => (
    <RenameStructureModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  deleteStructure: ({ bridge, closeModal, context }) => (
    <DeleteStructureModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  createRoom: ({ bridge, closeModal, context }) => (
    <CreateRoomModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  duplicateRoom: ({ bridge, closeModal, context }) => (
    <DuplicateRoomModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  deleteRoom: () => <DeleteRoomModal />,
  createZone: ({ bridge, closeModal, context }) => (
    <CreateZoneModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  duplicateZone: ({ bridge, closeModal, context }) => (
    <DuplicateZoneModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  plantZone: ({ bridge, closeModal, context }) => (
    <PlantZoneModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  deleteZone: ({ bridge, closeModal, context }) => (
    <DeleteZoneModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  recruitStaff: ({ bridge, closeModal }) => (
    <RecruitStaffModal bridge={bridge} closeModal={closeModal} />
  ),
  hireApplicant: ({ bridge, closeModal, context }) => (
    <HireModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  fireEmployee: ({ bridge, closeModal, context }) => (
    <FireModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  rejectApplicant: ({ bridge, closeModal, context }) => (
    <RejectApplicantModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  employeeDetails: ({ bridge, closeModal, context }) => (
    <EmployeeDetailsModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  installDevice: ({ bridge, closeModal, context }) => (
    <InstallDeviceModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  tuneDevice: ({ bridge, closeModal, context }) => (
    <TuneDeviceModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  moveDevice: ({ bridge, closeModal, context }) => (
    <MoveDeviceModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  removeDevice: ({ bridge, closeModal, context }) => (
    <RemoveDeviceModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  confirmPlantAction: ({ closeModal, context }) => (
    <ConfirmPlantActionModal closeModal={closeModal} context={context} />
  ),
  changeZoneMethod: ({ bridge, closeModal, context }) => (
    <ChangeZoneMethodModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
};
