import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAppStore } from '../store';
import type { DeviceSnapshot, PlantSnapshot, ZoneSnapshot } from '../types/simulation';
import styles from './WorldExplorer.module.css';

interface VirtualListProps<T> {
  items: T[];
  estimateSize?: number;
  render: (item: T, index: number) => JSX.Element;
}

const VirtualList = <T,>({ items, estimateSize = 64, render }: VirtualListProps<T>) => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 4,
  });

  return (
    <div ref={parentRef} className={styles.virtualContainer}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {render(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const formatPercent = (value: number, fractionDigits = 0) =>
  `${(Math.max(Math.min(value, 1), 0) * 100).toFixed(fractionDigits)}%`;

const formatNumber = (value: number, fractionDigits = 0) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

const ZoneDetail = ({
  zone,
  devices,
  plants,
}: {
  zone: ZoneSnapshot;
  devices: DeviceSnapshot[];
  plants: PlantSnapshot[];
}) => {
  const { t } = useTranslation('simulation');

  return (
    <section className={styles.zoneDetail} aria-live="polite">
      <header className={styles.zoneDetailHeader}>
        <div>
          <h3>{zone.name}</h3>
          <p className={styles.zoneMeta}>
            {t('labels.zonePath', { room: zone.roomName, structure: zone.structureName })}
          </p>
        </div>
      </header>

      <div className={styles.zoneDetailGrid}>
        <section>
          <h4>{t('labels.environment')}</h4>
          <dl>
            <div>
              <dt>{t('labels.temperature')}</dt>
              <dd>{zone.environment.temperature.toFixed(1)} °C</dd>
            </div>
            <div>
              <dt>{t('labels.humidity')}</dt>
              <dd>{formatPercent(zone.environment.relativeHumidity)}</dd>
            </div>
            <div>
              <dt>{t('labels.co2')}</dt>
              <dd>{formatNumber(zone.environment.co2)} ppm</dd>
            </div>
            <div>
              <dt>{t('labels.ppfd')}</dt>
              <dd>{zone.environment.ppfd.toFixed(0)} µmol·m⁻²·s⁻¹</dd>
            </div>
            <div>
              <dt>{t('labels.vpd')}</dt>
              <dd>{zone.environment.vpd.toFixed(2)} kPa</dd>
            </div>
          </dl>
        </section>

        <section>
          <h4>{t('labels.resources')}</h4>
          <dl>
            <div>
              <dt>{t('labels.water')}</dt>
              <dd>{formatNumber(zone.resources.waterLiters)} L</dd>
            </div>
            <div>
              <dt>{t('labels.nutrientSolution')}</dt>
              <dd>{formatNumber(zone.resources.nutrientSolutionLiters)} L</dd>
            </div>
            <div>
              <dt>{t('labels.nutrientStrength')}</dt>
              <dd>{zone.resources.nutrientStrength.toFixed(2)}</dd>
            </div>
            <div>
              <dt>{t('labels.substrateHealth')}</dt>
              <dd>{formatPercent(zone.resources.substrateHealth, 1)}</dd>
            </div>
            <div>
              <dt>{t('labels.reservoirLevel')}</dt>
              <dd>{formatPercent(zone.resources.reservoirLevel, 1)}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h4>{t('labels.metrics')}</h4>
          <dl>
            <div>
              <dt>{t('labels.avgTemperature')}</dt>
              <dd>{zone.metrics.averageTemperature.toFixed(1)} °C</dd>
            </div>
            <div>
              <dt>{t('labels.avgHumidity')}</dt>
              <dd>{formatPercent(zone.metrics.averageHumidity, 1)}</dd>
            </div>
            <div>
              <dt>{t('labels.avgCo2')}</dt>
              <dd>{formatNumber(zone.metrics.averageCo2)} ppm</dd>
            </div>
            <div>
              <dt>{t('labels.avgPpfd')}</dt>
              <dd>{zone.metrics.averagePpfd.toFixed(0)} µmol·m⁻²·s⁻¹</dd>
            </div>
            <div>
              <dt>{t('labels.stressLevel')}</dt>
              <dd>{formatPercent(zone.metrics.stressLevel, 1)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className={styles.deviceSection}>
        <header>
          <h4>{t('labels.devices')}</h4>
          <span>{t('labels.count', { count: devices.length })}</span>
        </header>
        {devices.length === 0 ? (
          <p className={styles.emptyState}>{t('labels.noDevices')}</p>
        ) : (
          <VirtualList
            items={devices}
            render={(device) => (
              <article key={device.id} className={styles.deviceCard}>
                <header>
                  <h5>{device.name}</h5>
                  <span className={styles.deviceStatus}>{device.status}</span>
                </header>
                <dl>
                  <div>
                    <dt>{t('labels.kind')}</dt>
                    <dd>{device.kind}</dd>
                  </div>
                  <div>
                    <dt>{t('labels.efficiency')}</dt>
                    <dd>{formatPercent(device.efficiency, 1)}</dd>
                  </div>
                  <div>
                    <dt>{t('labels.runtimeHours')}</dt>
                    <dd>{formatNumber(device.runtimeHours, 1)} h</dd>
                  </div>
                  <div>
                    <dt>{t('labels.maintenanceCondition')}</dt>
                    <dd>{formatPercent(device.maintenance.condition, 1)}</dd>
                  </div>
                </dl>
              </article>
            )}
          />
        )}
      </section>

      <section className={styles.plantSection}>
        <header>
          <h4>{t('labels.plants')}</h4>
          <span>{t('labels.count', { count: plants.length })}</span>
        </header>
        {plants.length === 0 ? (
          <p className={styles.emptyState}>{t('labels.noPlants')}</p>
        ) : (
          <VirtualList
            items={plants}
            estimateSize={72}
            render={(plant) => (
              <article key={plant.id} className={styles.plantCard}>
                <header>
                  <h5>{plant.id}</h5>
                  <span className={styles.plantStage}>{plant.stage}</span>
                </header>
                <dl>
                  <div>
                    <dt>{t('labels.strain')}</dt>
                    <dd>{plant.strainId}</dd>
                  </div>
                  <div>
                    <dt>{t('labels.health')}</dt>
                    <dd>{formatPercent(plant.health, 1)}</dd>
                  </div>
                  <div>
                    <dt>{t('labels.stress')}</dt>
                    <dd>{formatPercent(plant.stress, 1)}</dd>
                  </div>
                  <div>
                    <dt>{t('labels.biomass')}</dt>
                    <dd>{plant.biomassDryGrams.toFixed(1)} g</dd>
                  </div>
                  <div>
                    <dt>{t('labels.yield')}</dt>
                    <dd>{plant.yieldDryGrams.toFixed(1)} g</dd>
                  </div>
                </dl>
              </article>
            )}
          />
        )}
      </section>
    </section>
  );
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

  const structureList = useMemo(
    () => Object.values(structures).sort((a, b) => a.name.localeCompare(b.name)),
    [structures],
  );

  const activeStructure = selectedStructureId ? structures[selectedStructureId] : undefined;
  const roomList = useMemo(() => {
    if (!activeStructure) {
      return [];
    }
    return activeStructure.roomIds
      .map((roomId) => rooms[roomId])
      .filter((room): room is NonNullable<typeof room> => Boolean(room))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeStructure, rooms]);

  const activeRoom = selectedRoomId ? rooms[selectedRoomId] : undefined;
  const zoneList = useMemo(() => {
    if (!activeRoom) {
      return [];
    }
    return Object.values(zones)
      .filter((zone) => zone.roomId === activeRoom.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeRoom, zones]);

  const activeZone = selectedZoneId ? zones[selectedZoneId] : undefined;
  const zoneDevices = useMemo(() => {
    if (!activeZone) {
      return [] as DeviceSnapshot[];
    }

    return activeZone.devices.map((device) => {
      const record = devices[device.id];
      return record ?? device;
    });
  }, [activeZone, devices]);

  const zonePlants = useMemo(() => {
    if (!activeZone) {
      return [] as PlantSnapshot[];
    }

    return activeZone.plants.map((plant) => {
      const record = plants[plant.id] ?? plant;
      return {
        ...record,
        zoneId: record.zoneId ?? activeZone.id,
        structureId: record.structureId ?? activeZone.structureId,
        roomId: record.roomId ?? activeZone.roomId,
      } satisfies PlantSnapshot;
    });
  }, [activeZone, plants]);

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

      <div className={styles.columns}>
        <section className={styles.column} aria-label={t('labels.structures')}>
          <div className={styles.columnHeader}>
            <h3>{t('labels.structures')}</h3>
            <span className={styles.count}>
              {t('labels.count', { count: structureList.length })}
            </span>
          </div>
          {structureList.length === 0 ? (
            <p className={styles.emptyState}>{t('labels.noStructures')}</p>
          ) : (
            <VirtualList
              items={structureList}
              render={(structure) => (
                <button
                  key={structure.id}
                  type="button"
                  className={`${styles.listItem} ${structure.id === selectedStructureId ? styles.active : ''}`}
                  onClick={() => selectStructure(structure.id)}
                >
                  <span>{structure.name}</span>
                  <span className={styles.meta}>
                    {t('labels.roomsShort', { count: structure.roomIds.length })}
                  </span>
                </button>
              )}
            />
          )}
          {activeStructure ? (
            <button
              type="button"
              className={styles.actionButton}
              onClick={() =>
                openModal({
                  kind: 'createEntity',
                  autoPause: true,
                  payload: { entity: 'room', structureId: activeStructure.id },
                  title: t('modals.createRoomTitle'),
                })
              }
            >
              {t('actions.addRoom')}
            </button>
          ) : null}
        </section>

        <section className={styles.column} aria-label={t('labels.rooms')}>
          <div className={styles.columnHeader}>
            <h3>{t('labels.rooms')}</h3>
            <span className={styles.count}>{t('labels.count', { count: roomList.length })}</span>
          </div>
          {activeStructure ? (
            roomList.length === 0 ? (
              <p className={styles.emptyState}>{t('labels.noRooms')}</p>
            ) : (
              <VirtualList
                items={roomList}
                render={(room) => (
                  <button
                    key={room.id}
                    type="button"
                    className={`${styles.listItem} ${room.id === selectedRoomId ? styles.active : ''}`}
                    onClick={() => selectRoom(room.id)}
                  >
                    <span>{room.name}</span>
                    <span className={styles.meta}>
                      {t('labels.zonesShort', { count: room.zoneIds.length })}
                    </span>
                  </button>
                )}
              />
            )
          ) : (
            <p className={styles.placeholder}>{t('labels.selectStructureFirst')}</p>
          )}
          {activeRoom ? (
            <div className={styles.buttonRow}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() =>
                  openModal({
                    kind: 'updateEntity',
                    autoPause: true,
                    payload: { entity: 'room', roomId: activeRoom.id },
                    title: t('modals.updateRoomTitle', { name: activeRoom.name }),
                  })
                }
              >
                {t('actions.renameRoom')}
              </button>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() =>
                  openModal({
                    kind: 'createEntity',
                    autoPause: true,
                    payload: { entity: 'zone', roomId: activeRoom.id },
                    title: t('modals.createZoneTitle'),
                  })
                }
              >
                {t('actions.addZone')}
              </button>
            </div>
          ) : null}
        </section>

        <section className={styles.column} aria-label={t('labels.zones')}>
          <div className={styles.columnHeader}>
            <h3>{t('labels.zones')}</h3>
            <span className={styles.count}>{t('labels.count', { count: zoneList.length })}</span>
          </div>
          {activeRoom ? (
            zoneList.length === 0 ? (
              <p className={styles.emptyState}>{t('labels.noZones')}</p>
            ) : (
              <VirtualList
                items={zoneList}
                render={(zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    className={`${styles.listItem} ${zone.id === selectedZoneId ? styles.active : ''}`}
                    onClick={() => selectZone(zone.id)}
                  >
                    <span>{zone.name}</span>
                    <span className={styles.meta}>
                      {t('labels.plantsShort', { count: zone.plants.length })}
                    </span>
                  </button>
                )}
              />
            )
          ) : (
            <p className={styles.placeholder}>{t('labels.selectRoomFirst')}</p>
          )}
          {activeZone ? (
            <div className={styles.buttonRow}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() =>
                  openModal({
                    kind: 'installDevice',
                    autoPause: true,
                    payload: { zoneId: activeZone.id },
                    title: t('modals.installDeviceTitle'),
                  })
                }
              >
                {t('actions.installDevice')}
              </button>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() =>
                  openModal({
                    kind: 'planting',
                    autoPause: true,
                    payload: { zoneId: activeZone.id },
                    title: t('modals.addPlantingTitle'),
                  })
                }
              >
                {t('actions.addPlanting')}
              </button>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() =>
                  openModal({
                    kind: 'automationPlan',
                    autoPause: true,
                    payload: { zoneId: activeZone.id },
                    title: t('modals.automationPlanTitle'),
                  })
                }
              >
                {t('actions.editAutomation')}
              </button>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() =>
                  openModal({
                    kind: 'treatment',
                    autoPause: true,
                    payload: { zoneId: activeZone.id },
                    title: t('modals.applyTreatmentTitle'),
                  })
                }
              >
                {t('actions.applyTreatment')}
              </button>
            </div>
          ) : null}
        </section>

        <section className={styles.detailColumn} aria-label={t('labels.zoneDetail')}>
          {activeZone ? (
            <ZoneDetail zone={activeZone} devices={zoneDevices} plants={zonePlants} />
          ) : (
            <p className={styles.placeholder}>{t('labels.selectZoneToView')}</p>
          )}
        </section>
      </div>
    </section>
  );
};
