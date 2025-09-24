import { useMemo } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MetricsBar from '@/components/MetricsBar';
import Panel from '@/components/Panel';
import { StructureSummaryCard, RoomSummaryCard, ZoneSummaryCard } from '@/components/cards';
import {
  selectAlertCount,
  selectCapital,
  selectCurrentTick,
  selectCumulativeYield,
  selectTimeStatus,
  useAppStore,
  useGameStore,
  useZoneStore,
} from '@/store';
import type { RoomSnapshot, StructureSnapshot, ZoneSnapshot } from '@/types/simulation';
import { computeZoneAggregateMetrics } from '@/views/utils/zoneAggregates';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

const sortByName = <T extends { name: string }>(items: T[]): T[] =>
  items.slice().sort((a, b) => a.name.localeCompare(b.name));

const DashboardOverview = () => {
  const timeStatus = useGameStore(selectTimeStatus);
  const currentTick = useGameStore(selectCurrentTick);
  const alertCount = useGameStore(selectAlertCount);
  const cashOnHand = useZoneStore(selectCapital);
  const cumulativeYield = useZoneStore(selectCumulativeYield);
  const { structures, rooms, zones, plants } = useZoneStore((state) => ({
    structures: state.structures,
    rooms: state.rooms,
    zones: state.zones,
    plants: state.plants,
  }));
  const selectedStructureId = useAppStore((state) => state.selectedStructureId);
  const selectedRoomId = useAppStore((state) => state.selectedRoomId);
  const selectedZoneId = useAppStore((state) => state.selectedZoneId);
  const selectStructure = useAppStore((state) => state.selectStructure);
  const selectRoom = useAppStore((state) => state.selectRoom);
  const selectZone = useAppStore((state) => state.selectZone);

  const structureList = useMemo(
    () => sortByName(Object.values(structures) as StructureSnapshot[]),
    [structures],
  );
  const roomList = useMemo(() => sortByName(Object.values(rooms) as RoomSnapshot[]), [rooms]);
  const zoneList = useMemo(() => sortByName(Object.values(zones) as ZoneSnapshot[]), [zones]);

  const { zonesByRoom, zonesByStructure } = useMemo(() => {
    const zonesGroupedByRoom: Record<string, ZoneSnapshot[]> = {};
    const zonesGroupedByStructure: Record<string, ZoneSnapshot[]> = {};

    for (const zone of zoneList) {
      const roomZones = zonesGroupedByRoom[zone.roomId] ?? [];
      roomZones.push(zone);
      zonesGroupedByRoom[zone.roomId] = roomZones;

      const structureZones = zonesGroupedByStructure[zone.structureId] ?? [];
      structureZones.push(zone);
      zonesGroupedByStructure[zone.structureId] = structureZones;
    }

    return { zonesByRoom: zonesGroupedByRoom, zonesByStructure: zonesGroupedByStructure };
  }, [zoneList]);

  const roomsByStructure = useMemo(() => {
    const grouped: Record<string, RoomSnapshot[]> = {};
    for (const room of roomList) {
      const list = grouped[room.structureId] ?? [];
      list.push(room);
      grouped[room.structureId] = list;
    }
    for (const structureId of Object.keys(grouped)) {
      grouped[structureId] = sortByName(grouped[structureId]);
    }
    return grouped;
  }, [roomList]);

  const roomSummaries = useMemo(
    () =>
      roomList.map((room) => {
        const roomZones = zonesByRoom[room.id] ?? [];
        const metrics = computeZoneAggregateMetrics(roomZones);
        return { room, zones: roomZones, metrics };
      }),
    [roomList, zonesByRoom],
  );

  const structureSummaries = useMemo(
    () =>
      structureList.map((structure) => {
        const structureRooms = roomsByStructure[structure.id] ?? [];
        const structureZones = zonesByStructure[structure.id] ?? [];
        const metrics = computeZoneAggregateMetrics(structureZones);
        return {
          structure,
          rooms: structureRooms,
          zones: structureZones,
          metrics,
        };
      }),
    [structureList, roomsByStructure, zonesByStructure],
  );

  const plantCount = Object.keys(plants).length;

  const plannedPlantCapacity = useMemo(
    () =>
      zoneList.reduce((total, zone) => {
        const plan = zone.plantingPlan;
        if (!plan || !plan.enabled) {
          return total;
        }
        return total + Math.max(plan.count, 0);
      }, 0),
    [zoneList],
  );

  const headerStatus =
    timeStatus === undefined
      ? undefined
      : {
          label: timeStatus.paused ? 'Paused' : timeStatus.speed > 1 ? 'Fast forward' : 'Running',
          tone: timeStatus.paused ? 'warning' : 'positive',
          tooltip: timeStatus.paused
            ? 'Simulation is currently paused'
            : `Tick rate: ${timeStatus.targetTickRate.toFixed(0)}x (speed ${timeStatus.speed.toFixed(2)})`,
        };

  const overviewMetrics = useMemo(() => {
    const metrics = [
      {
        id: 'tick',
        label: 'Current tick',
        value: currentTick,
      },
      {
        id: 'capital',
        label: 'Cash on hand',
        value: currencyFormatter.format(cashOnHand),
      },
      {
        id: 'yield',
        label: 'Cumulative dry yield',
        value: `${decimalFormatter.format(cumulativeYield)} g`,
      },
      {
        id: 'alerts',
        label: 'Active alerts',
        value: alertCount,
      },
    ];

    if (plannedPlantCapacity > 0) {
      metrics.push({
        id: 'planting-plan-capacity',
        label: 'Active planting plan capacity',
        value: plannedPlantCapacity.toLocaleString(),
      });
    }

    return metrics;
  }, [currentTick, cashOnHand, cumulativeYield, alertCount, plannedPlantCapacity]);

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Facility overview"
        subtitle="High-level snapshot of structures, rooms, and grow zones across the simulation."
        status={headerStatus}
        meta={[
          { label: 'Structures', value: structureList.length.toLocaleString() },
          { label: 'Rooms', value: roomList.length.toLocaleString() },
          { label: 'Zones', value: zoneList.length.toLocaleString() },
          { label: 'Plants', value: plantCount.toLocaleString() },
        ]}
      />

      <MetricsBar metrics={overviewMetrics} layout="compact" />

      <Panel
        title="Structures"
        description="Overview of each structure with footprint metrics and aggregated zone telemetry. Click a structure to drill down into rooms and zones."
        padding="lg"
        variant="elevated"
      >
        {structureSummaries.length === 0 ? (
          <p className="text-sm text-text-muted">
            No structures detected. Load a snapshot to explore the facility hierarchy.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {structureSummaries.map(
              ({ structure, rooms: structureRooms, zones: structureZones, metrics }) => (
                <StructureSummaryCard
                  key={structure.id}
                  structure={structure}
                  roomCount={structureRooms.length}
                  zoneCount={structureZones.length}
                  plantCount={metrics.plantCount}
                  averageTemperature={metrics.averageTemperature}
                  averageHumidity={metrics.averageHumidity}
                  averageCo2={metrics.averageCo2}
                  averagePpfd={metrics.averagePpfd}
                  averageStress={metrics.averageStress}
                  averageLightingCoverage={metrics.averageLightingCoverage}
                  isSelected={selectedStructureId === structure.id}
                  onSelect={selectStructure}
                />
              ),
            )}
          </div>
        )}
      </Panel>

      <Panel
        title="Rooms"
        description="Room-level readiness with cleanliness, maintenance, and averaged zone telemetry. Use these cards to jump into a room detail view."
        padding="lg"
        variant="elevated"
      >
        {roomSummaries.length === 0 ? (
          <p className="text-sm text-text-muted">
            No rooms available yet. Create a room to populate this view.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {roomSummaries.map(({ room, zones: roomZones, metrics }) => (
              <RoomSummaryCard
                key={room.id}
                room={room}
                zoneCount={roomZones.length}
                plantCount={metrics.plantCount}
                averageTemperature={metrics.averageTemperature}
                averageHumidity={metrics.averageHumidity}
                averageCo2={metrics.averageCo2}
                averagePpfd={metrics.averagePpfd}
                averageStress={metrics.averageStress}
                isSelected={selectedRoomId === room.id}
                onSelect={selectRoom}
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Zones"
        description="Live environment readings, resource levels, and stress indicators for each active zone."
        padding="lg"
        variant="elevated"
      >
        {zoneList.length === 0 ? (
          <p className="text-sm text-text-muted">
            No zones available yet. Create a zone to start monitoring.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {zoneList.map((zone) => (
              <ZoneSummaryCard
                key={zone.id}
                zone={zone}
                isSelected={selectedZoneId === zone.id}
                onSelect={selectZone}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};

export default DashboardOverview;
