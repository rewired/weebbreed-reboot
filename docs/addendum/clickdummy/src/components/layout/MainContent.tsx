/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useMemo } from 'react';
import { GameData, Selection } from '../../types/domain';
import { Breadcrumbs } from '../common/Breadcrumbs';

import { DashboardView } from '../views/DashboardView';
import { PersonnelView } from '../views/PersonnelView';
import { FinanceView } from '../views/FinanceView';
import { ZoneDetailView } from '../views/ZoneDetailView';
import { RoomDetailView } from '../views/RoomDetailView';
import { StructureDetailView } from '../views/StructureDetailView';

interface MainContentProps {
  selection: Selection;
  gameData: GameData;
  onControlsChange: (
    zoneId: string,
    controlName: string,
    newValue: number | string | boolean,
  ) => void;
  onOpenModal: (type: string, props?: any) => void;
  onNavigate: (
    level: string,
    id?: string | null,
    parentId?: string | null,
    grandParentId?: string | null,
  ) => void;
  onRename: (details: { entityType: string; entityId: string; newName: string }) => void;
  onRefreshCandidates: () => void;
  onFireEmployee: (employeeId: string) => void;
  onBatchAction: (
    zoneId: string,
    plantIds: string[],
    action: 'harvest' | 'trash' | 'treat',
  ) => void;
}

export const MainContent = (props: MainContentProps) => {
  const { selection, gameData, onNavigate } = props;
  const { structures } = gameData;
  const selectedStructure = structures.find((s) => s.id === selection.structureId);

  const selectedRoom = useMemo(() => {
    if (selectedStructure && selection.roomId) {
      return selectedStructure.rooms.find((r) => r.id === selection.roomId);
    }
    return null;
  }, [selectedStructure, selection.roomId]);

  const selectedZone = useMemo(() => {
    if (selectedRoom && selection.zoneId) {
      return selectedRoom.zones.find((z) => z.id === selection.zoneId);
    }
    return null;
  }, [selectedRoom, selection.zoneId]);

  const breadcrumbPath = useMemo(() => {
    const path: {
      level: string;
      id: string;
      name: string;
      parentId?: string;
      grandParentId?: string;
    }[] = [{ level: 'dashboard', id: 'dashboard', name: 'Structures' }];

    if (selection.view === 'personnel') {
      path.push({ level: 'personnel', id: 'personnel', name: 'Personnel' });
    } else if (selection.view === 'finance') {
      path.push({ level: 'finance', id: 'finance', name: 'Finances' });
    } else if (selectedStructure) {
      path[0].name = 'Structures'; // Always have Structures as root
      path.push({ level: 'structure', id: selectedStructure.id, name: selectedStructure.name });
      if (selectedRoom) {
        path.push({
          level: 'room',
          id: selectedRoom.id,
          name: selectedRoom.name,
          parentId: selectedStructure.id,
        });
        if (selectedZone) {
          path.push({
            level: 'zone',
            id: selectedZone.id,
            name: selectedZone.name,
            parentId: selectedRoom.id,
            grandParentId: selectedStructure.id,
          });
        }
      }
    }
    return path;
  }, [selection, selectedStructure, selectedRoom, selectedZone]);

  const renderContent = () => {
    if (selection.view === 'personnel') {
      return (
        <PersonnelView
          gameData={gameData}
          onOpenModal={props.onOpenModal}
          onRefreshCandidates={props.onRefreshCandidates}
          onFireEmployee={props.onFireEmployee}
        />
      );
    }
    if (selection.view === 'finance') {
      return <FinanceView gameData={gameData} />;
    }
    if (selection.zoneId && selectedZone) {
      return (
        <ZoneDetailView
          zone={selectedZone}
          onControlsChange={props.onControlsChange}
          onOpenModal={props.onOpenModal}
          onRename={props.onRename}
          onBatchAction={props.onBatchAction}
        />
      );
    }
    if (selection.roomId && selectedRoom && selectedStructure) {
      return (
        <RoomDetailView
          room={selectedRoom}
          structure={selectedStructure}
          onNavigate={onNavigate}
          onRename={props.onRename}
          onOpenModal={props.onOpenModal}
        />
      );
    }
    if (selection.structureId && selectedStructure) {
      return (
        <StructureDetailView
          structure={selectedStructure}
          onNavigate={onNavigate}
          onOpenModal={props.onOpenModal}
          onRename={props.onRename}
        />
      );
    }
    return (
      <DashboardView
        structures={structures}
        onNavigate={onNavigate}
        onOpenModal={props.onOpenModal}
        onRename={props.onRename}
      />
    );
  };

  return (
    <div>
      <Breadcrumbs path={breadcrumbPath} onNavigate={onNavigate} />
      {renderContent()}
    </div>
  );
};
