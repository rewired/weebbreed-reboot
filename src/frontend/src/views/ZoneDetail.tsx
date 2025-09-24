import { useEffect, useMemo, useRef, useState } from 'react';
import Card from '@/components/Card';
import DashboardHeader from '@/components/DashboardHeader';
import MetricsBar from '@/components/MetricsBar';
import Panel from '@/components/Panel';
import { RoomSummaryCard, ZoneSummaryCard } from '@/components/cards';
import ToggleSwitch from '@/components/ToggleSwitch';
import { FormField, NumberInputField, RangeField } from '@/components/forms';
import { Button, TextInput } from '@/components/inputs';
import { selectCurrentTick, useAppStore, useGameStore, useZoneStore } from '@/store';
import { computeZoneAggregateMetrics } from '@/views/utils/zoneAggregates';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

type SetpointMetric = 'temperature' | 'relativeHumidity' | 'co2' | 'ppfd' | 'vpd';

const DEFAULT_SETPOINT_DRAFTS: Record<SetpointMetric, number> = {
  temperature: 24,
  relativeHumidity: 60,
  co2: 800,
  ppfd: 650,
  vpd: 1.2,
};

const STRUCTURE_STATUS_LABEL = {
  active: 'Active',
  underConstruction: 'Under construction',
  decommissioned: 'Decommissioned',
} as const;

const STRUCTURE_STATUS_TONE = {
  active: 'positive',
  underConstruction: 'warning',
  decommissioned: 'danger',
} as const satisfies Record<keyof typeof STRUCTURE_STATUS_LABEL, 'positive' | 'warning' | 'danger'>;

const buildEnvironmentMetrics = (metrics: ReturnType<typeof computeZoneAggregateMetrics>) => [
  {
    id: 'avg-temp',
    label: 'Avg temperature',
    value:
      metrics.averageTemperature !== undefined
        ? `${metrics.averageTemperature.toFixed(1)} °C`
        : '—',
  },
  {
    id: 'avg-humidity',
    label: 'Avg humidity',
    value:
      metrics.averageHumidity !== undefined
        ? `${(metrics.averageHumidity * 100).toFixed(0)}%`
        : '—',
  },
  {
    id: 'avg-co2',
    label: 'Avg CO₂',
    value: metrics.averageCo2 !== undefined ? `${metrics.averageCo2.toFixed(0)} ppm` : '—',
  },
  {
    id: 'avg-ppfd',
    label: 'Avg PPFD',
    value:
      metrics.averagePpfd !== undefined ? `${metrics.averagePpfd.toFixed(0)} μmol·m⁻²·s⁻¹` : '—',
  },
  {
    id: 'avg-vpd',
    label: 'Avg VPD',
    value: metrics.averageVpd !== undefined ? metrics.averageVpd.toFixed(2) : '—',
  },
  {
    id: 'avg-stress',
    label: 'Avg stress',
    value:
      metrics.averageStress !== undefined
        ? percentageFormatter.format(Math.max(0, Math.min(metrics.averageStress, 1)))
        : '—',
  },
];

const resolveRoomStatus = (cleanliness: number, maintenanceLevel: number) => {
  const readiness = Math.min(cleanliness, maintenanceLevel);
  if (readiness < 0.4) {
    return {
      label: 'Critical upkeep',
      tone: 'danger' as const,
      tooltip: 'Cleanliness or maintenance fell below 40%; schedule service immediately.',
    };
  }
  if (readiness < 0.7) {
    return {
      label: 'Needs attention',
      tone: 'warning' as const,
      tooltip: 'Room readiness is trending below target thresholds.',
    };
  }
  return {
    label: 'Operational',
    tone: 'positive' as const,
    tooltip: 'Cleanliness and maintenance are within acceptable bounds.',
  };
};

const ZoneDetail = () => {
  const selectedStructureId = useAppStore((state) => state.selectedStructureId);
  const selectedRoomId = useAppStore((state) => state.selectedRoomId);
  const selectedZoneId = useAppStore((state) => state.selectedZoneId);
  const selectRoom = useAppStore((state) => state.selectRoom);
  const selectZone = useAppStore((state) => state.selectZone);
  const currentTick = useGameStore(selectCurrentTick);

  const { structures, rooms, zones, timeline } = useZoneStore((state) => ({
    structures: state.structures,
    rooms: state.rooms,
    zones: state.zones,
    timeline: state.timeline,
  }));

  const lastSetpoints = useZoneStore((state) => state.lastSetpoints);
  const sendSetpoint = useZoneStore((state) => state.sendSetpoint);
  const applyWater = useZoneStore((state) => state.applyWater);
  const applyNutrients = useZoneStore((state) => state.applyNutrients);
  const togglePlantingPlan = useZoneStore((state) => state.togglePlantingPlan);
  const harvestPlantings = useZoneStore((state) => state.harvestPlantings);
  const toggleDeviceGroup = useZoneStore((state) => state.toggleDeviceGroup);

  const [setpointDrafts, setSetpointDrafts] = useState<Record<SetpointMetric, number>>(() => ({
    ...DEFAULT_SETPOINT_DRAFTS,
  }));
  const [waterCommandLiters, setWaterCommandLiters] = useState(10);
  const [nutrientDraft, setNutrientDraft] = useState<{ N: number; P: number; K: number }>(() => ({
    N: 10,
    P: 5,
    K: 5,
  }));
  const previousZoneIdRef = useRef<string | undefined>();

  const roomList = useMemo(() => Object.values(rooms), [rooms]);
  const zoneList = useMemo(() => Object.values(zones), [zones]);

  const zone = selectedZoneId ? zones[selectedZoneId] : undefined;
  const roomFromSelection = selectedRoomId ? rooms[selectedRoomId] : undefined;
  const room = zone ? (rooms[zone.roomId] ?? roomFromSelection) : roomFromSelection;
  const structureFromSelection = selectedStructureId ? structures[selectedStructureId] : undefined;
  const structure = zone
    ? (structures[zone.structureId] ?? structureFromSelection)
    : room
      ? (structures[room.structureId] ?? structureFromSelection)
      : structureFromSelection;

  useEffect(() => {
    if (!zone) {
      previousZoneIdRef.current = undefined;
      return;
    }

    if (previousZoneIdRef.current === zone.id) {
      return;
    }

    previousZoneIdRef.current = zone.id;

    setSetpointDrafts({
      temperature: zone.environment.temperature,
      relativeHumidity: zone.environment.relativeHumidity * 100,
      co2: zone.environment.co2,
      ppfd: zone.environment.ppfd,
      vpd: zone.environment.vpd,
    });
    setWaterCommandLiters(10);
    setNutrientDraft({ N: 10, P: 5, K: 5 });
  }, [zone]);

  const structureRooms = useMemo(() => {
    if (!structure) {
      return [] as typeof roomList;
    }
    return roomList.filter((item) => item.structureId === structure.id);
  }, [structure, roomList]);

  const structureZones = useMemo(() => {
    if (!structure) {
      return [] as typeof zoneList;
    }
    return zoneList.filter((item) => item.structureId === structure.id);
  }, [structure, zoneList]);

  const roomZones = useMemo(() => {
    if (!room) {
      return [] as typeof zoneList;
    }
    return zoneList.filter((item) => item.roomId === room.id);
  }, [room, zoneList]);

  const structureMetrics = computeZoneAggregateMetrics(structureZones);
  const roomMetrics = computeZoneAggregateMetrics(roomZones);
  const structureEnvironmentMetrics =
    structureZones.length > 0 ? buildEnvironmentMetrics(structureMetrics) : undefined;
  const roomEnvironmentMetrics =
    roomZones.length > 0 ? buildEnvironmentMetrics(roomMetrics) : undefined;

  const zoneTimeline = useMemo(() => {
    if (!zone) {
      return [] as typeof timeline;
    }
    return timeline
      .filter((entry) => entry.zoneId === zone.id)
      .slice(-12)
      .reverse();
  }, [zone, timeline]);

  if (zone) {
    const stressLevel = Math.max(0, Math.min(zone.metrics.stressLevel ?? 0, 1));
    const substrateHealth = Math.max(0, Math.min(zone.resources.substrateHealth ?? 0, 1));
    const reservoirLevel = Math.max(0, Math.min(zone.resources.reservoirLevel ?? 0, 1));
    const nutrientStrength = Math.max(0, Math.min(zone.resources.nutrientStrength ?? 0, 1));
    const plantingGroups = zone.plantingGroups ?? [];
    const displayedPlants = zone.plants.slice(0, 6);
    const deviceGroups = zone.deviceGroups ?? [];
    const harvestablePlantingIds = plantingGroups
      .filter((group) => (group.harvestReadyCount ?? 0) > 0)
      .map((group) => group.id);
    const plantingPlan = zone.plantingPlan ?? null;
    const plantingPlanEnabled = plantingPlan?.enabled ?? false;

    const formatSetpointValue = (metric: SetpointMetric, value: number) => {
      switch (metric) {
        case 'temperature':
          return value.toFixed(1);
        case 'relativeHumidity':
          return value.toFixed(0);
        case 'co2':
        case 'ppfd':
          return value.toFixed(0);
        case 'vpd':
          return value.toFixed(2);
        default:
          return value.toString();
      }
    };

    const formatSetpointWithUnit = (metric: SetpointMetric, value: number) => {
      const base = formatSetpointValue(metric, value);
      switch (metric) {
        case 'temperature':
          return `${base} °C`;
        case 'relativeHumidity':
          return `${base}%`;
        case 'co2':
          return `${base} ppm`;
        case 'ppfd':
          return `${base} μmol·m⁻²·s⁻¹`;
        case 'vpd':
          return `${base} kPa`;
        default:
          return base;
      }
    };

    const getCurrentMetricValue = (metric: SetpointMetric) => {
      switch (metric) {
        case 'temperature':
          return zone.environment.temperature;
        case 'relativeHumidity':
          return zone.environment.relativeHumidity * 100;
        case 'co2':
          return zone.environment.co2;
        case 'ppfd':
          return zone.environment.ppfd;
        case 'vpd':
          return zone.environment.vpd;
        default:
          return 0;
      }
    };

    const getLastSetpointLabel = (metric: SetpointMetric) => {
      const rawValue = lastSetpoints[`${zone.id}:${metric}`];
      if (rawValue === undefined) {
        return undefined;
      }
      const displayValue = metric === 'relativeHumidity' ? rawValue * 100 : rawValue;
      return formatSetpointWithUnit(metric, displayValue);
    };

    const handleSetpointDispatch = (metric: SetpointMetric) => {
      const pendingValue = setpointDrafts[metric];
      const rawValue = metric === 'relativeHumidity' ? pendingValue / 100 : pendingValue;
      sendSetpoint(zone.id, metric, Number(rawValue.toFixed(4)));
    };

    const handleApplyWater = () => {
      if (waterCommandLiters <= 0) {
        return;
      }
      applyWater(zone.id, waterCommandLiters);
    };

    const handleApplyNutrients = () => {
      if (nutrientDraft.N <= 0 && nutrientDraft.P <= 0 && nutrientDraft.K <= 0) {
        return;
      }
      applyNutrients(zone.id, nutrientDraft);
    };

    const handleHarvestReady = () => {
      if (harvestablePlantingIds.length === 0) {
        return;
      }
      harvestPlantings(harvestablePlantingIds);
    };

    const handleTogglePlantingPlan = (enabled: boolean) => {
      if (!plantingPlan) {
        return;
      }
      togglePlantingPlan(zone.id, enabled);
    };

    const setpointConfig: Array<{
      metric: SetpointMetric;
      label: string;
      min: number;
      max: number;
      step: number;
      unit: string;
      description: string;
    }> = [
      {
        metric: 'temperature',
        label: 'Temperature',
        min: 16,
        max: 32,
        step: 0.5,
        unit: '°C',
        description: 'Dispatch an HVAC setpoint for this zone.',
      },
      {
        metric: 'relativeHumidity',
        label: 'Humidity',
        min: 35,
        max: 95,
        step: 1,
        unit: '%',
        description: 'Program humidity targets (converted to device commands by the facade).',
      },
      {
        metric: 'vpd',
        label: 'VPD',
        min: 0,
        max: 2.5,
        step: 0.05,
        unit: 'kPa',
        description: 'Request a vapor pressure deficit setpoint for humidity automation.',
      },
      {
        metric: 'co2',
        label: 'CO₂',
        min: 300,
        max: 1500,
        step: 25,
        unit: 'ppm',
        description: 'Set the CO₂ enrichment target for this zone.',
      },
      {
        metric: 'ppfd',
        label: 'PPFD',
        min: 0,
        max: 1600,
        step: 25,
        unit: 'μmol·m⁻²·s⁻¹',
        description: 'Adjust the canopy lighting intensity setpoint.',
      },
    ];

    const formatGroupStatus = (status?: string) => {
      switch (status) {
        case 'on':
          return 'Active';
        case 'off':
          return 'Off';
        case 'mixed':
          return 'Mixed';
        case 'broken':
          return 'Broken';
        default:
          return 'Unknown';
      }
    };

    const formatDeviceStatus = (status: string) => {
      switch (status) {
        case 'operational':
          return 'Operational';
        case 'maintenance':
          return 'Maintenance';
        case 'offline':
          return 'Offline';
        case 'failed':
          return 'Failed';
        default:
          return status;
      }
    };

    const nutrientKeys: Array<'N' | 'P' | 'K'> = ['N', 'P', 'K'];
    const nutrientSummary = `${nutrientDraft.N.toFixed(1)} / ${nutrientDraft.P.toFixed(1)} / ${nutrientDraft.K.toFixed(1)} g`;
    const plantingPlanLabel = plantingPlan
      ? plantingPlanEnabled
        ? 'Automation on'
        : 'Automation off'
      : 'No plan';
    const harvestSummary = `${harvestablePlantingIds.length.toLocaleString()} ready`;

    const environmentMetrics = [
      {
        id: 'temperature',
        label: 'Temperature',
        value: `${zone.environment.temperature.toFixed(1)} °C`,
      },
      {
        id: 'humidity',
        label: 'Humidity',
        value: `${(zone.environment.relativeHumidity * 100).toFixed(0)}%`,
      },
      {
        id: 'co2',
        label: 'CO₂',
        value: `${zone.environment.co2.toLocaleString()} ppm`,
      },
      {
        id: 'ppfd',
        label: 'PPFD',
        value: `${zone.environment.ppfd.toFixed(0)} μmol·m⁻²·s⁻¹`,
      },
      {
        id: 'vpd',
        label: 'VPD proxy',
        value: zone.environment.vpd.toFixed(2),
      },
      {
        id: 'stress',
        label: 'Stress level',
        value: percentageFormatter.format(stressLevel),
      },
    ];

    const headerStatus =
      zone.health.diseases > 0 || zone.health.pests > 0
        ? {
            label: 'Attention required',
            tone: 'warning' as const,
            tooltip: 'Active disease or pest pressure detected in this zone.',
          }
        : {
            label: 'Healthy',
            tone: 'positive' as const,
            tooltip: 'No outstanding health alerts for this zone.',
          };

    return (
      <div className="space-y-8">
        <DashboardHeader
          title={zone.name}
          subtitle={`Detailed telemetry for tick ${currentTick.toLocaleString()} with historical averages per zone.`}
          status={headerStatus}
          meta={[
            { label: 'Structure', value: zone.structureName },
            { label: 'Room', value: zone.roomName },
            { label: 'Area', value: `${numberFormatter.format(zone.area)} m²` },
            { label: 'Volume', value: `${numberFormatter.format(zone.volume)} m³` },
          ]}
        >
          <MetricsBar metrics={environmentMetrics} layout="compact" />
        </DashboardHeader>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <Panel title="Environment controls" padding="lg" variant="elevated">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {setpointConfig.map((config) => {
                  const sliderValue = setpointDrafts[config.metric];
                  const currentValue = getCurrentMetricValue(config.metric);
                  const lastValue = getLastSetpointLabel(config.metric);

                  return (
                    <RangeField
                      key={config.metric}
                      label={`${config.label} setpoint`}
                      value={sliderValue}
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      unit={config.unit}
                      description={config.description}
                      formatValue={(value) => formatSetpointValue(config.metric, value)}
                      onChange={(next) =>
                        setSetpointDrafts((prev) => ({
                          ...prev,
                          [config.metric]: next,
                        }))
                      }
                      footer={
                        <div className="mt-3 space-y-2 text-xs text-text-muted">
                          <div className="flex items-center justify-between gap-2">
                            <span>
                              Current: {formatSetpointWithUnit(config.metric, currentValue)}
                            </span>
                            {lastValue ? <span>Last command: {lastValue}</span> : null}
                          </div>
                          <div className="flex justify-end">
                            <Button
                              variant="solid"
                              tone="accent"
                              size="xs"
                              className="font-semibold"
                              onClick={() => handleSetpointDispatch(config.metric)}
                            >
                              Dispatch
                            </Button>
                          </div>
                        </div>
                      }
                    />
                  );
                })}
              </div>
            </Panel>

            <Panel title="Environment detail" padding="lg" variant="elevated">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                    Instantaneous
                  </h3>
                  <dl className="grid grid-cols-2 gap-3 text-sm text-text-secondary">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-text-muted">
                        Temperature
                      </dt>
                      <dd className="text-base font-medium text-text-primary">
                        {zone.environment.temperature.toFixed(1)} °C
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-text-muted">Humidity</dt>
                      <dd className="text-base font-medium text-text-primary">
                        {(zone.environment.relativeHumidity * 100).toFixed(0)}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-text-muted">CO₂</dt>
                      <dd className="text-base font-medium text-text-primary">
                        {zone.environment.co2.toLocaleString()} ppm
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-text-muted">PPFD</dt>
                      <dd className="text-base font-medium text-text-primary">
                        {zone.environment.ppfd.toFixed(0)} μmol·m⁻²·s⁻¹
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-text-muted">VPD proxy</dt>
                      <dd className="text-base font-medium text-text-primary">
                        {zone.environment.vpd.toFixed(2)}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                    Rolling averages
                  </h3>
                  <dl className="grid grid-cols-2 gap-3 text-sm text-text-secondary">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-text-muted">
                        Avg temperature
                      </dt>
                      <dd className="text-base font-medium text-text-primary">
                        {zone.metrics.averageTemperature.toFixed(1)} °C
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-text-muted">
                        Avg humidity
                      </dt>
                      <dd className="text-base font-medium text-text-primary">
                        {(zone.metrics.averageHumidity * 100).toFixed(0)}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-text-muted">Avg CO₂</dt>
                      <dd className="text-base font-medium text-text-primary">
                        {zone.metrics.averageCo2.toLocaleString()} ppm
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-text-muted">Avg PPFD</dt>
                      <dd className="text-base font-medium text-text-primary">
                        {zone.metrics.averagePpfd.toFixed(0)} μmol·m⁻²·s⁻¹
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </Panel>

            <Panel title="Plant actions" padding="lg" variant="elevated">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <NumberInputField
                  label="Irrigation command"
                  value={waterCommandLiters}
                  onChange={setWaterCommandLiters}
                  min={0}
                  step={0.5}
                  unit="L"
                  description="Send an immediate irrigation command to this zone."
                  formatValue={(value) => value.toFixed(1)}
                  footer={
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="solid"
                        tone="accent"
                        size="xs"
                        className="font-semibold"
                        onClick={handleApplyWater}
                        disabled={waterCommandLiters <= 0}
                      >
                        Apply water
                      </Button>
                    </div>
                  }
                />

                <FormField
                  label="Nutrient mix"
                  secondaryLabel={nutrientSummary}
                  description="Apply an N-P-K fertilizer mix to the active planting groups."
                >
                  <div className="grid grid-cols-3 gap-2 text-xs text-text-muted">
                    {nutrientKeys.map((key) => (
                      <label key={key} className="flex flex-col gap-1">
                        <span className="font-semibold uppercase tracking-wide text-text-secondary">
                          {key}
                        </span>
                        <TextInput
                          type="number"
                          min={0}
                          step={0.5}
                          size="sm"
                          value={nutrientDraft[key]}
                          onChange={(event) => {
                            const parsed = Number(event.target.value);
                            if (Number.isNaN(parsed)) {
                              return;
                            }
                            setNutrientDraft((prev) => ({
                              ...prev,
                              [key]: Math.max(0, parsed),
                            }));
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="solid"
                      tone="default"
                      size="xs"
                      className="font-semibold"
                      onClick={handleApplyNutrients}
                      disabled={
                        nutrientDraft.N <= 0 && nutrientDraft.P <= 0 && nutrientDraft.K <= 0
                      }
                    >
                      Apply nutrients
                    </Button>
                  </div>
                </FormField>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  label="Planting plan"
                  secondaryLabel={plantingPlanLabel}
                  description={
                    plantingPlan
                      ? `Maintains ${plantingPlan.count.toLocaleString()} plants of ${plantingPlan.strainId}.`
                      : 'Define a planting plan to enable automatic replanting.'
                  }
                >
                  <ToggleSwitch
                    checked={plantingPlanEnabled}
                    onChange={handleTogglePlantingPlan}
                    disabled={!plantingPlan}
                    size="sm"
                    label="Auto replant"
                    description={
                      plantingPlan?.autoReplant
                        ? 'Automatically replant when capacity is available.'
                        : 'Manual replanting required.'
                    }
                  />
                </FormField>

                <FormField
                  label="Harvest batches"
                  secondaryLabel={harvestSummary}
                  description="Trigger batch harvest commands for planting groups reporting ready plants."
                >
                  <p className="text-sm text-text-secondary">
                    {harvestablePlantingIds.length > 0
                      ? 'Ready groups will be harvested immediately.'
                      : 'No harvest-ready planting groups detected.'}
                  </p>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="solid"
                      tone="default"
                      size="xs"
                      className="font-semibold"
                      onClick={handleHarvestReady}
                      disabled={harvestablePlantingIds.length === 0}
                    >
                      Harvest ready groups
                    </Button>
                  </div>
                </FormField>
              </div>
            </Panel>

            <Panel title="Plant inventory" padding="lg" variant="elevated">
              {plantingGroups.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                    Planting groups
                  </h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {plantingGroups.map((group) => (
                      <Card
                        key={group.id}
                        title={group.name ?? group.strainId}
                        subtitle={group.stage ? `Stage: ${group.stage}` : undefined}
                        metadata={[
                          { label: 'Strain', value: group.strainId },
                          {
                            label: 'Plants',
                            value:
                              group.plantIds && group.plantIds.length > 0
                                ? group.plantIds.length.toLocaleString()
                                : '—',
                          },
                          {
                            label: 'Harvest ready',
                            value:
                              group.harvestReadyCount !== undefined
                                ? group.harvestReadyCount.toLocaleString()
                                : '—',
                          },
                        ]}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                  Sample plants
                </h3>
                {displayedPlants.length === 0 ? (
                  <p className="text-sm text-text-muted">No active plants in this zone.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {displayedPlants.map((plant) => (
                      <Card
                        key={plant.id}
                        title={plant.id}
                        subtitle={`Strain ${plant.strainId}`}
                        metadata={[
                          { label: 'Stage', value: plant.stage },
                          {
                            label: 'Health',
                            value: percentageFormatter.format(
                              Math.max(0, Math.min(plant.health, 1)),
                            ),
                          },
                          {
                            label: 'Stress',
                            value: percentageFormatter.format(
                              Math.max(0, Math.min(plant.stress, 1)),
                            ),
                          },
                          {
                            label: 'Dry mass',
                            value: `${numberFormatter.format(plant.biomassDryGrams)} g`,
                          },
                        ]}
                      />
                    ))}
                  </div>
                )}
                {zone.plants.length > displayedPlants.length ? (
                  <p className="text-xs text-text-muted">
                    {zone.plants.length - displayedPlants.length} additional plants tracked in this
                    zone.
                  </p>
                ) : null}
              </div>
            </Panel>

            <Panel title="Recent telemetry" padding="lg" variant="elevated">
              {zoneTimeline.length === 0 ? (
                <p className="text-sm text-text-muted">
                  No telemetry has been recorded for this zone yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border/50 text-sm">
                    <thead className="bg-surfaceAlt/70 text-xs uppercase tracking-wide text-text-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Tick</th>
                        <th className="px-3 py-2 text-left">Temperature</th>
                        <th className="px-3 py-2 text-left">Humidity</th>
                        <th className="px-3 py-2 text-left">CO₂</th>
                        <th className="px-3 py-2 text-left">PPFD</th>
                        <th className="px-3 py-2 text-left">VPD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-text-secondary">
                      {zoneTimeline.map((entry) => (
                        <tr key={`${entry.tick}-${entry.ts}`}>
                          <td className="px-3 py-2 font-mono text-xs text-text-muted">
                            {entry.tick.toLocaleString()}
                          </td>
                          <td className="px-3 py-2">
                            {entry.temperature !== undefined
                              ? `${entry.temperature.toFixed(1)} °C`
                              : '—'}
                          </td>
                          <td className="px-3 py-2">
                            {entry.humidity !== undefined
                              ? `${(entry.humidity * 100).toFixed(0)}%`
                              : '—'}
                          </td>
                          <td className="px-3 py-2">
                            {entry.co2 !== undefined ? entry.co2.toLocaleString() : '—'}
                          </td>
                          <td className="px-3 py-2">
                            {entry.ppfd !== undefined ? entry.ppfd.toFixed(0) : '—'}
                          </td>
                          <td className="px-3 py-2">
                            {entry.vpd !== undefined ? entry.vpd.toFixed(2) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Resources & automation" padding="lg" variant="elevated">
              <dl className="space-y-4 text-sm text-text-secondary">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-text-muted">
                    <dt>Water reserve</dt>
                    <dd>{`${numberFormatter.format(zone.resources.waterLiters)} L`}</dd>
                  </div>
                  <div className="h-2 w-full rounded-full bg-border/30">
                    <div
                      className="h-2 rounded-full bg-accent"
                      style={{ width: `${Math.round(reservoirLevel * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-text-muted">
                    <dt>Nutrient solution</dt>
                    <dd>{`${numberFormatter.format(zone.resources.nutrientSolutionLiters)} L`}</dd>
                  </div>
                  <div className="h-2 w-full rounded-full bg-border/30">
                    <div
                      className="h-2 rounded-full bg-positive"
                      style={{ width: `${Math.round(nutrientStrength * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-text-muted">
                    <dt>Substrate health</dt>
                    <dd>{percentageFormatter.format(substrateHealth)}</dd>
                  </div>
                  <div className="h-2 w-full rounded-full bg-border/30">
                    <div
                      className="h-2 rounded-full bg-positive/80"
                      style={{ width: `${Math.round(substrateHealth * 100)}%` }}
                    />
                  </div>
                </div>
              </dl>
              {zone.supplyStatus ? (
                <div className="mt-6 space-y-3 text-xs text-text-muted">
                  <p className="font-semibold uppercase tracking-wide text-text-secondary">
                    Daily consumption
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm text-text-secondary">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-text-muted">Water</p>
                      <p className="font-medium text-text-primary">
                        {zone.supplyStatus.dailyWaterConsumptionLiters?.toFixed(1) ?? '—'} L
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-text-muted">Nutrients</p>
                      <p className="font-medium text-text-primary">
                        {zone.supplyStatus.dailyNutrientConsumptionLiters?.toFixed(1) ?? '—'} L
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </Panel>

            <Panel title="Device automation" padding="lg" variant="elevated">
              {deviceGroups.length === 0 ? (
                <p className="text-sm text-text-muted">
                  No automation groups configured for this zone.
                </p>
              ) : (
                <ul className="space-y-4 text-sm text-text-secondary">
                  {deviceGroups.map((group) => {
                    const isEnabled = group.status !== 'off';
                    const statusLabel = formatGroupStatus(group.status);

                    return (
                      <li
                        key={group.id}
                        className="space-y-3 rounded-md border border-border/40 bg-surfaceAlt/60 p-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-text-primary">
                              {group.label ?? group.kind}
                            </p>
                            <p className="text-xs uppercase tracking-wide text-text-muted">
                              {group.kind} • {group.deviceIds.length.toLocaleString()} devices
                            </p>
                          </div>
                          <ToggleSwitch
                            checked={isEnabled}
                            onChange={(checked) => toggleDeviceGroup(zone.id, group.kind, checked)}
                            disabled={group.deviceIds.length === 0}
                            size="sm"
                            label="Enabled"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-text-muted">
                          <span className="rounded-full border border-border/50 px-2 py-0.5">
                            Status: {statusLabel}
                          </span>
                          {group.supportsScheduling ? (
                            <span className="rounded-full border border-border/50 px-2 py-0.5">
                              Scheduling
                            </span>
                          ) : null}
                          {group.supportsTuning ? (
                            <span className="rounded-full border border-border/50 px-2 py-0.5">
                              Tuning
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel title="Device inventory" padding="lg" variant="elevated">
              {zone.devices.length === 0 ? (
                <p className="text-sm text-text-muted">No devices assigned to this zone.</p>
              ) : (
                <ul className="space-y-4 text-sm text-text-secondary">
                  {zone.devices.map((device) => {
                    const statusClass =
                      device.status === 'operational'
                        ? 'text-positive'
                        : device.status === 'maintenance'
                          ? 'text-warning'
                          : device.status === 'failed'
                            ? 'text-danger'
                            : 'text-text-muted';
                    const settingsEntries = Object.entries(device.settings ?? {});

                    return (
                      <li
                        key={device.id}
                        className="space-y-3 rounded-md border border-border/40 bg-surfaceAlt/60 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-text-primary">{device.name}</p>
                            <p className="text-xs uppercase tracking-wide text-text-muted">
                              {device.kind}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-semibold uppercase tracking-wide ${statusClass}`}
                          >
                            {formatDeviceStatus(device.status)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-text-muted">Blueprint</p>
                            <p className="font-medium text-text-secondary">{device.blueprintId}</p>
                          </div>
                          <div>
                            <p className="text-text-muted">Efficiency</p>
                            <p className="font-medium text-text-secondary">
                              {percentageFormatter.format(
                                Math.max(0, Math.min(device.efficiency, 1)),
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-text-muted">Runtime hours</p>
                            <p className="font-medium text-text-secondary">
                              {numberFormatter.format(device.runtimeHours)}
                            </p>
                          </div>
                          <div>
                            <p className="text-text-muted">Condition</p>
                            <p className="font-medium text-text-secondary">
                              {percentageFormatter.format(
                                Math.max(0, Math.min(device.maintenance.condition ?? 0, 1)),
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-text-muted">Next maintenance</p>
                            <p className="font-medium text-text-secondary">
                              Tick {device.maintenance.nextDueTick.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-text-muted">Degradation</p>
                            <p className="font-medium text-text-secondary">
                              {percentageFormatter.format(
                                Math.max(0, Math.min(device.maintenance.degradation ?? 0, 1)),
                              )}
                            </p>
                          </div>
                        </div>
                        {settingsEntries.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
                            {settingsEntries.slice(0, 4).map(([key, value]) => (
                              <div key={key}>
                                <p className="uppercase tracking-wide">{key}</p>
                                <p className="font-medium text-text-secondary">{String(value)}</p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel title="Health & restrictions" padding="lg" variant="elevated">
              <dl className="grid grid-cols-2 gap-4 text-sm text-text-secondary">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Diseases</dt>
                  <dd className="text-base font-medium text-text-primary">
                    {zone.health.diseases}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Pests</dt>
                  <dd className="text-base font-medium text-text-primary">{zone.health.pests}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">
                    Pending treatments
                  </dt>
                  <dd className="text-base font-medium text-text-primary">
                    {zone.health.pendingTreatments}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">
                    Applied treatments
                  </dt>
                  <dd className="text-base font-medium text-text-primary">
                    {zone.health.appliedTreatments}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 space-y-2 text-xs text-text-muted">
                {zone.health.reentryRestrictedUntilTick ? (
                  <p>
                    Re-entry restricted until tick{' '}
                    {zone.health.reentryRestrictedUntilTick.toLocaleString()}.
                  </p>
                ) : null}
                {zone.health.preHarvestRestrictedUntilTick ? (
                  <p>
                    Pre-harvest restricted until tick{' '}
                    {zone.health.preHarvestRestrictedUntilTick.toLocaleString()}.
                  </p>
                ) : null}
                {!zone.health.reentryRestrictedUntilTick &&
                !zone.health.preHarvestRestrictedUntilTick ? (
                  <p>No active restrictions.</p>
                ) : null}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    );
  }

  if (room) {
    const roomStatus = resolveRoomStatus(room.cleanliness, room.maintenanceLevel);
    const plantCount = roomMetrics.plantCount;

    return (
      <div className="space-y-8">
        <DashboardHeader
          title={room.name}
          subtitle={`Room telemetry aggregated from ${roomZones.length.toLocaleString()} zones.`}
          status={roomStatus}
          meta={[
            { label: 'Structure', value: room.structureName },
            { label: 'Zones', value: roomZones.length.toLocaleString() },
            { label: 'Area', value: `${numberFormatter.format(room.area)} m²` },
            { label: 'Volume', value: `${numberFormatter.format(room.volume)} m³` },
          ]}
        >
          {roomEnvironmentMetrics ? (
            <MetricsBar metrics={roomEnvironmentMetrics} layout="compact" />
          ) : null}
        </DashboardHeader>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <Panel
              title="Zones in this room"
              description="Select a zone to drill into its live telemetry and automation controls."
              padding="lg"
              variant="elevated"
            >
              {roomZones.length === 0 ? (
                <p className="text-sm text-text-muted">No zones assigned to this room yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {roomZones.map((zoneItem) => (
                    <ZoneSummaryCard
                      key={zoneItem.id}
                      zone={zoneItem}
                      isSelected={selectedZoneId === zoneItem.id}
                      onSelect={selectZone}
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Purpose & operations" padding="lg" variant="elevated">
              <dl className="grid grid-cols-2 gap-4 text-sm text-text-secondary">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Purpose</dt>
                  <dd className="text-base font-medium text-text-primary">{room.purposeName}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Purpose kind</dt>
                  <dd className="text-base font-medium text-text-primary">{room.purposeKind}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Area per zone</dt>
                  <dd className="text-base font-medium text-text-primary">
                    {roomZones.length > 0
                      ? `${numberFormatter.format(room.area / roomZones.length)} m²`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Height</dt>
                  <dd className="text-base font-medium text-text-primary">
                    {numberFormatter.format(room.height)} m
                  </dd>
                </div>
              </dl>
              {room.purposeFlags ? (
                <div className="mt-4 space-y-2 text-xs text-text-muted">
                  <p className="font-semibold uppercase tracking-wide text-text-secondary">
                    Capabilities
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(room.purposeFlags).map(([flag, enabled]) => (
                      <span
                        key={flag}
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                          enabled
                            ? 'border-accent/60 bg-accent/10 text-accent'
                            : 'border-border/60 text-text-muted'
                        }`}
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Room readiness" padding="lg" variant="elevated">
              <dl className="space-y-4 text-sm text-text-secondary">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-text-muted">
                    <dt>Cleanliness</dt>
                    <dd>
                      {percentageFormatter.format(Math.max(0, Math.min(room.cleanliness, 1)))}
                    </dd>
                  </div>
                  <div className="h-2 w-full rounded-full bg-border/30">
                    <div
                      className="h-2 rounded-full bg-accent"
                      style={{
                        width: `${Math.round(Math.max(0, Math.min(room.cleanliness, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-text-muted">
                    <dt>Maintenance</dt>
                    <dd>
                      {percentageFormatter.format(Math.max(0, Math.min(room.maintenanceLevel, 1)))}
                    </dd>
                  </div>
                  <div className="h-2 w-full rounded-full bg-border/30">
                    <div
                      className="h-2 rounded-full bg-positive"
                      style={{
                        width: `${Math.round(Math.max(0, Math.min(room.maintenanceLevel, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </dl>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-text-secondary">
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted">Plant count</p>
                  <p className="text-base font-medium text-text-primary">
                    {plantCount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted">Average stress</p>
                  <p className="text-base font-medium text-text-primary">
                    {roomMetrics.averageStress !== undefined
                      ? percentageFormatter.format(
                          Math.max(0, Math.min(roomMetrics.averageStress, 1)),
                        )
                      : '—'}
                  </p>
                </div>
              </div>
            </Panel>

            <Panel title="Environment overview" padding="lg" variant="elevated">
              {roomEnvironmentMetrics ? (
                <dl className="grid grid-cols-2 gap-3 text-sm text-text-secondary">
                  {roomEnvironmentMetrics.map((metric) => (
                    <div key={metric.id}>
                      <dt className="text-xs uppercase tracking-wide text-text-muted">
                        {metric.label}
                      </dt>
                      <dd className="text-base font-medium text-text-primary">{metric.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-text-muted">
                  No zone telemetry available yet for this room.
                </p>
              )}
            </Panel>
          </div>
        </div>
      </div>
    );
  }

  if (structure) {
    const structureStatusLabel = STRUCTURE_STATUS_LABEL[structure.status] ?? structure.status;
    const structureStatusTone =
      STRUCTURE_STATUS_TONE[structure.status as keyof typeof STRUCTURE_STATUS_TONE] ?? 'warning';
    const structureStatusTooltip = (() => {
      switch (structure.status) {
        case 'active':
          return 'Structure is operational and contributes to facility output.';
        case 'underConstruction':
          return 'Structure is currently being built or renovated and may have limited capacity.';
        case 'decommissioned':
          return 'Structure is offline and not available for cultivation.';
        default:
          return undefined;
      }
    })();
    const plantCount = structureMetrics.plantCount;

    return (
      <div className="space-y-8">
        <DashboardHeader
          title={structure.name}
          subtitle="Structure overview with aggregated zone telemetry and facility readiness."
          status={{
            label: structureStatusLabel,
            tone: structureStatusTone,
            tooltip: structureStatusTooltip,
          }}
          meta={[
            { label: 'Rooms', value: structureRooms.length.toLocaleString() },
            { label: 'Zones', value: structureZones.length.toLocaleString() },
            {
              label: 'Footprint area',
              value: `${numberFormatter.format(structure.footprint.area)} m²`,
            },
            {
              label: 'Footprint volume',
              value: `${numberFormatter.format(structure.footprint.volume)} m³`,
            },
          ]}
        >
          {structureEnvironmentMetrics ? (
            <MetricsBar metrics={structureEnvironmentMetrics} layout="compact" />
          ) : null}
        </DashboardHeader>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <Panel
              title="Rooms in this structure"
              description="Explore rooms to inspect their zones and readiness."
              padding="lg"
              variant="elevated"
            >
              {structureRooms.length === 0 ? (
                <p className="text-sm text-text-muted">No rooms registered for this structure.</p>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {structureRooms.map((roomItem) => {
                    const roomZonesForItem = zoneList.filter(
                      (zoneItem) => zoneItem.roomId === roomItem.id,
                    );
                    const roomMetricsForItem = computeZoneAggregateMetrics(roomZonesForItem);
                    return (
                      <RoomSummaryCard
                        key={roomItem.id}
                        room={roomItem}
                        zoneCount={roomZonesForItem.length}
                        plantCount={roomMetricsForItem.plantCount}
                        averageTemperature={roomMetricsForItem.averageTemperature}
                        averageHumidity={roomMetricsForItem.averageHumidity}
                        averageCo2={roomMetricsForItem.averageCo2}
                        averagePpfd={roomMetricsForItem.averagePpfd}
                        averageStress={roomMetricsForItem.averageStress}
                        isSelected={selectedRoomId === roomItem.id}
                        onSelect={selectRoom}
                      />
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel
              title="Zones"
              description="Click a zone to inspect detailed telemetry and automation controls."
              padding="lg"
              variant="elevated"
            >
              {structureZones.length === 0 ? (
                <p className="text-sm text-text-muted">No zones assigned to this structure yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {structureZones.map((zoneItem) => (
                    <ZoneSummaryCard
                      key={zoneItem.id}
                      zone={zoneItem}
                      isSelected={selectedZoneId === zoneItem.id}
                      onSelect={selectZone}
                    />
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Structure stats" padding="lg" variant="elevated">
              <dl className="grid grid-cols-1 gap-3 text-sm text-text-secondary">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Status</dt>
                  <dd className="text-base font-medium text-text-primary">
                    {structureStatusLabel}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Rent per tick</dt>
                  <dd className="text-base font-medium text-text-primary">
                    {currencyFormatter.format(structure.rentPerTick)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">
                    Dimensions (L × W × H)
                  </dt>
                  <dd className="text-base font-medium text-text-primary">
                    {`${numberFormatter.format(structure.footprint.length)} × ${numberFormatter.format(structure.footprint.width)} × ${numberFormatter.format(structure.footprint.height)} m`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Plant count</dt>
                  <dd className="text-base font-medium text-text-primary">
                    {plantCount.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">
                    Avg lighting coverage
                  </dt>
                  <dd className="text-base font-medium text-text-primary">
                    {structureMetrics.averageLightingCoverage !== undefined
                      ? percentageFormatter.format(
                          Math.max(0, Math.min(structureMetrics.averageLightingCoverage, 1)),
                        )
                      : '—'}
                  </dd>
                </div>
              </dl>
            </Panel>

            <Panel title="Environment overview" padding="lg" variant="elevated">
              {structureEnvironmentMetrics ? (
                <dl className="grid grid-cols-2 gap-3 text-sm text-text-secondary">
                  {structureEnvironmentMetrics.map((metric) => (
                    <div key={metric.id}>
                      <dt className="text-xs uppercase tracking-wide text-text-muted">
                        {metric.label}
                      </dt>
                      <dd className="text-base font-medium text-text-primary">{metric.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-text-muted">
                  No zone telemetry available yet for this structure.
                </p>
              )}
            </Panel>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Panel
      title="Facility detail"
      description="Select a structure, room, or zone from the overview to inspect telemetry and readiness."
      padding="lg"
      variant="elevated"
    >
      <p className="text-sm text-text-muted">
        Choose an item in the facility hierarchy to view detailed telemetry, resources, and health
        indicators.
      </p>
    </Panel>
  );
};

export default ZoneDetail;
