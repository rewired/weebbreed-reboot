import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import type { DeviceSnapshot, PlantSnapshot, ZoneSnapshot } from '../types/simulation';
import { BreedingStationPlaceholder } from './world-explorer/BreedingStationPlaceholder';
import { RoomGrid, type RoomSummary } from './world-explorer/RoomGrid';
import { StructureGrid, type StructureSummary } from './world-explorer/StructureGrid';
import { ZoneDetailView } from './world-explorer/ZoneDetailView';
import { ZoneGrid, type ZoneSummary } from './world-explorer/ZoneGrid';
import styles from './WorldExplorer.module.css';

const groupPlantsByZone = (
  zone: ZoneSnapshot,
  globalPlants: Record<string, PlantSnapshot>,
): PlantSnapshot[] => {
  return zone.plants.map((plant) => {
    const record = globalPlants[plant.id];
    if (!record) {
      return {
        ...plant,
        zoneId: plant.zoneId ?? zone.id,
        structureId: plant.structureId ?? zone.structureId,
        roomId: plant.roomId ?? zone.roomId,
      } satisfies PlantSnapshot;
    }
    return {
      ...record,
      zoneId: record.zoneId ?? zone.id,
      structureId: record.structureId ?? zone.structureId,
      roomId: record.roomId ?? zone.roomId,
    } satisfies PlantSnapshot;
  });
};

const mergeDevices = (
  zone: ZoneSnapshot,
  devices: Record<string, DeviceSnapshot>,
): DeviceSnapshot[] => {
  return zone.devices.map((device) => devices[device.id] ?? device);
};

export const WorldExplorer = () => {
  const { t } = useTranslation('simulation');
  const structures = useAppStore((state) => state.structures);
  const rooms = useAppStore((state) => state.rooms);
  const zones = useAppStore((state) => state.zones);
  const devices = useAppStore((state) => state.devices);
  const plants = useAppStore((state) => state.plants);
  const selectedStructureId = useAppStore((state) => state.selectedStructureId);
  const selectedRoomId = useAppStore((state) => state.selectedRoomId);
  const selectedZoneId = useAppStore((state) => state.selectedZoneId);
  const selectStructure = useAppStore((state) => state.selectStructure);
  const selectRoom = useAppStore((state) => state.selectRoom);
  const selectZone = useAppStore((state) => state.selectZone);
  const resetSelection = useAppStore((state) => state.resetSelection);
  const openModal = useAppStore((state) => state.openModal);
  const updateStructureName = useAppStore((state) => state.updateStructureName);
  const updateRoomName = useAppStore((state) => state.updateRoomName);
  const updateZoneName = useAppStore((state) => state.updateZoneName);
  const duplicateRoom = useAppStore((state) => state.duplicateRoom);
  const duplicateZone = useAppStore((state) => state.duplicateZone);
  const removeStructure = useAppStore((state) => state.removeStructure);
  const removeRoom = useAppStore((state) => state.removeRoom);
  const removeZone = useAppStore((state) => state.removeZone);
  const applyWater = useAppStore((state) => state.applyWater);
  const applyNutrients = useAppStore((state) => state.applyNutrients);
  const toggleDeviceGroup = useAppStore((state) => state.toggleDeviceGroup);
  const harvestPlanting = useAppStore((state) => state.harvestPlanting);
  const harvestPlantings = useAppStore((state) => state.harvestPlantings);
  const togglePlantingPlan = useAppStore((state) => state.togglePlantingPlan);

  const structureList = useMemo(
    () => Object.values(structures).sort((a, b) => a.name.localeCompare(b.name)),
    [structures],
  );

  const structureSummaries: StructureSummary[] = useMemo(() => {
    return structureList.map((structure) => {
      const structureRooms = structure.roomIds
        .map((roomId) => rooms[roomId])
        .filter((room): room is NonNullable<typeof room> => Boolean(room));
      const structureZones = structureRooms.flatMap((room) =>
        room.zoneIds
          .map((zoneId) => zones[zoneId])
          .filter((zone): zone is NonNullable<typeof zone> => Boolean(zone)),
      );
      const resolvedPlants = structureZones.flatMap((zone) => groupPlantsByZone(zone, plants));
      const totalYield = resolvedPlants.reduce((sum, plant) => sum + (plant.yieldDryGrams ?? 0), 0);
      return {
        structure,
        roomCount: structureRooms.length,
        zoneCount: structureZones.length,
        plantCount: resolvedPlants.length,
        totalYield,
      } satisfies StructureSummary;
    });
  }, [structureList, rooms, zones, plants]);

  const activeStructure = selectedStructureId ? structures[selectedStructureId] : undefined;

  const roomSummaries: RoomSummary[] = useMemo(() => {
    if (!activeStructure) {
      return [];
    }
    return activeStructure.roomIds
      .map((roomId) => rooms[roomId])
      .filter((room): room is NonNullable<typeof room> => Boolean(room))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((room) => {
        const roomZones = room.zoneIds
          .map((zoneId) => zones[zoneId])
          .filter((zone): zone is NonNullable<typeof zone> => Boolean(zone));
        const resolvedPlants = roomZones.flatMap((zone) => groupPlantsByZone(zone, plants));
        const totalYield = resolvedPlants.reduce(
          (sum, plant) => sum + (plant.yieldDryGrams ?? 0),
          0,
        );
        return {
          room,
          zoneCount: roomZones.length,
          plantCount: resolvedPlants.length,
          totalYield,
        } satisfies RoomSummary;
      });
  }, [activeStructure, rooms, zones, plants]);

  const activeRoom = selectedRoomId ? rooms[selectedRoomId] : undefined;
  const isLabRoom = Boolean(activeRoom?.purposeFlags?.supportsResearch);

  const zoneSummaries: ZoneSummary[] = useMemo(() => {
    if (!activeRoom || isLabRoom) {
      return [];
    }
    return activeRoom.zoneIds
      .map((zoneId) => zones[zoneId])
      .filter((zone): zone is NonNullable<typeof zone> => Boolean(zone))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        (zone) =>
          ({
            zone,
            plants: groupPlantsByZone(zone, plants),
          }) satisfies ZoneSummary,
      );
  }, [activeRoom, zones, plants, isLabRoom]);

  const activeZone = selectedZoneId ? zones[selectedZoneId] : undefined;

  const resolvedZone = useMemo(() => {
    if (!activeZone) {
      return undefined;
    }
    return {
      zone: activeZone,
      devices: mergeDevices(activeZone, devices),
      plants: groupPlantsByZone(activeZone, plants),
    };
  }, [activeZone, devices, plants]);

  const siblingZoneIds = useMemo(() => {
    if (!activeRoom || isLabRoom) {
      return [] as string[];
    }
    return activeRoom.zoneIds.filter((zoneId) => zones[zoneId]);
  }, [activeRoom, zones, isLabRoom]);

  const previousZoneId = useMemo(() => {
    if (!selectedZoneId || !siblingZoneIds.length) {
      return undefined;
    }
    const index = siblingZoneIds.indexOf(selectedZoneId);
    if (index <= 0) {
      return undefined;
    }
    return siblingZoneIds[index - 1];
  }, [selectedZoneId, siblingZoneIds]);

  const nextZoneId = useMemo(() => {
    if (!selectedZoneId || !siblingZoneIds.length) {
      return undefined;
    }
    const index = siblingZoneIds.indexOf(selectedZoneId);
    if (index < 0 || index >= siblingZoneIds.length - 1) {
      return undefined;
    }
    return siblingZoneIds[index + 1];
  }, [selectedZoneId, siblingZoneIds]);

  return (
    <section className={styles.worldExplorer}>
      <header className={styles.header}>
        <div>
          <h2>{t('labels.world')}</h2>
          <p className={styles.subheader}>{t('labels.worldDescription')}</p>
        </div>
        <nav aria-label={t('labels.breadcrumbs')} className={styles.breadcrumbs}>
          <button type="button" onClick={resetSelection} className={styles.breadcrumbButton}>
            {t('labels.structures')}
          </button>
          {activeStructure ? (
            <button
              type="button"
              onClick={() => selectStructure(activeStructure.id)}
              className={styles.breadcrumbButton}
            >
              {activeStructure.name}
            </button>
          ) : null}
          {activeRoom ? (
            <button
              type="button"
              onClick={() => selectRoom(activeRoom.id)}
              className={styles.breadcrumbButton}
            >
              {activeRoom.name}
            </button>
          ) : null}
          {activeZone ? <span className={styles.breadcrumbCurrent}>{activeZone.name}</span> : null}
        </nav>
      </header>

      <div className={styles.layout}>
        <div className={styles.hierarchyPanel}>
          <StructureGrid
            structures={structureSummaries}
            selectedStructureId={selectedStructureId}
            onSelect={selectStructure}
            onRename={updateStructureName}
            onDelete={(structureId) => {
              if (selectedStructureId === structureId) {
                resetSelection();
              }
              removeStructure(structureId);
            }}
            onResetSelection={resetSelection}
            onAddRoom={
              activeStructure
                ? () =>
                    openModal({
                      kind: 'createEntity',
                      autoPause: true,
                      payload: { entity: 'room', structureId: activeStructure.id },
                      title: t('modals.createRoomTitle'),
                    })
                : undefined
            }
          />

          <RoomGrid
            rooms={roomSummaries}
            selectedRoomId={selectedRoomId}
            onSelect={selectRoom}
            onRename={updateRoomName}
            onDuplicate={duplicateRoom}
            onDelete={(roomId) => {
              if (selectedRoomId === roomId) {
                selectRoom(undefined);
              }
              removeRoom(roomId);
            }}
            onAddZone={
              activeRoom && !isLabRoom
                ? () =>
                    openModal({
                      kind: 'createEntity',
                      autoPause: true,
                      payload: { entity: 'zone', roomId: activeRoom.id },
                      title: t('modals.createZoneTitle'),
                    })
                : undefined
            }
          />

          <ZoneGrid
            zones={zoneSummaries}
            selectedZoneId={selectedZoneId}
            onSelect={selectZone}
            onRename={updateZoneName}
            onDuplicate={duplicateZone}
            onDelete={(zoneId) => {
              if (selectedZoneId === zoneId) {
                selectZone(undefined);
              }
              removeZone(zoneId);
            }}
            onAddPlanting={
              selectedZoneId
                ? () =>
                    openModal({
                      kind: 'planting',
                      autoPause: true,
                      payload: { zoneId: selectedZoneId },
                      title: t('modals.addPlantingTitle'),
                    })
                : undefined
            }
            disabled={isLabRoom}
            emptyState={
              isLabRoom
                ? t('labels.labNoZones', {
                    defaultValue: 'Laboratories use breeding stations instead of zones.',
                  })
                : undefined
            }
          />
        </div>

        <div className={styles.detailPanel}>
          {isLabRoom ? (
            <BreedingStationPlaceholder />
          ) : resolvedZone ? (
            <ZoneDetailView
              zone={resolvedZone.zone}
              devices={resolvedZone.devices}
              plants={resolvedZone.plants}
              previousZoneId={previousZoneId}
              nextZoneId={nextZoneId}
              onSelectZone={(zoneId) => selectZone(zoneId)}
              onRename={(name) => updateZoneName(resolvedZone.zone.id, name)}
              onDuplicate={() => duplicateZone(resolvedZone.zone.id)}
              onDelete={() => {
                removeZone(resolvedZone.zone.id);
                selectZone(undefined);
              }}
              onAdjustWater={(liters) => applyWater(resolvedZone.zone.id, liters)}
              onAdjustNutrients={(nutrients) => applyNutrients(resolvedZone.zone.id, nutrients)}
              onOpenPlantingModal={() =>
                openModal({
                  kind: 'planting',
                  autoPause: true,
                  payload: { zoneId: resolvedZone.zone.id },
                  title: t('modals.addPlantingTitle'),
                })
              }
              onOpenAutomationPlanModal={() =>
                openModal({
                  kind: 'automationPlan',
                  autoPause: true,
                  payload: { zoneId: resolvedZone.zone.id },
                  title: t('modals.automationPlanTitle'),
                })
              }
              onOpenDeviceModal={() =>
                openModal({
                  kind: 'installDevice',
                  autoPause: true,
                  payload: { zoneId: resolvedZone.zone.id },
                  title: t('modals.installDeviceTitle'),
                })
              }
              onHarvestPlant={(plantId) => harvestPlanting(plantId)}
              onHarvestAll={(plantIds) => harvestPlantings(plantIds)}
              onToggleDeviceGroup={(kind, enabled) =>
                toggleDeviceGroup(resolvedZone.zone.id, kind, enabled)
              }
              onTogglePlan={(enabled) => togglePlantingPlan(resolvedZone.zone.id, enabled)}
            />
          ) : (
            <p className={styles.detailPanelPlaceholder}>{t('labels.selectZoneToView')}</p>
          )}
        </div>
      </div>
    </section>
  );
};
