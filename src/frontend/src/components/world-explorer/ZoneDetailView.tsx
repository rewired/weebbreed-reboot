import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, selectDeviceOptionsForZone, selectStrainOptionsForZone } from '../../store';
import type {
  DeviceSnapshot,
  PlantSnapshot,
  PlantingGroupSnapshot,
  ZoneSnapshot,
} from '../../types/simulation';
import styles from './ZoneDetailView.module.css';

interface DerivedPlantGroup {
  id: string;
  name: string;
  strainId: string;
  stage?: string;
  plants: PlantSnapshot[];
  harvestableCount: number;
}

interface DeviceGroupModel {
  id: string;
  kind: string;
  label: string;
  devices: DeviceSnapshot[];
  status: 'on' | 'off' | 'mixed' | 'broken';
  supportsScheduling?: boolean;
  supportsTuning?: boolean;
}

const ENVIRONMENT_RANGES = {
  temperature: { min: 20, max: 27 },
  humidity: { min: 0.45, max: 0.65 },
  co2: { min: 800, max: 1200 },
  vpd: { min: 0.8, max: 1.4 },
  ppfd: { min: 400, max: 900 },
};

const DEFAULT_WATER_INCREMENT = 25;
const DEFAULT_NUTRIENT_INCREMENT = { N: 150, P: 75, K: 150 };

const harvestableCount = (plants: PlantSnapshot[]): number => {
  return plants.reduce((count, plant) => {
    const stage = plant.stage?.toLowerCase?.() ?? '';
    return count + (stage.includes('harvest') || stage.includes('ripe') ? 1 : 0);
  }, 0);
};

const resolveGroupStatus = (devices: DeviceSnapshot[]): 'on' | 'off' | 'mixed' | 'broken' => {
  if (!devices.length) {
    return 'off';
  }
  const statuses = new Set(devices.map((device) => device.status));
  if (statuses.has('failed')) {
    return 'broken';
  }
  const hasOperational = statuses.has('operational');
  const hasOffline = statuses.has('offline');
  const hasMaintenance = statuses.has('maintenance');
  if (hasOperational && !hasOffline && !hasMaintenance) {
    return 'on';
  }
  if (!hasOperational && (hasOffline || hasMaintenance)) {
    return 'off';
  }
  return 'mixed';
};

const toDeviceGroups = (zone: ZoneSnapshot, devices: DeviceSnapshot[]): DeviceGroupModel[] => {
  if (Array.isArray(zone.deviceGroups) && zone.deviceGroups.length) {
    const byId = new Map(devices.map((device) => [device.id, device] as const));
    return zone.deviceGroups.map((group) => {
      const groupDevices = group.deviceIds
        .map((id) => byId.get(id))
        .filter((device): device is DeviceSnapshot => Boolean(device));
      const label = group.label ?? group.kind;
      return {
        id: group.id,
        kind: group.kind,
        label,
        devices: groupDevices,
        status: group.status ?? resolveGroupStatus(groupDevices),
        supportsScheduling: group.supportsScheduling,
        supportsTuning: group.supportsTuning,
      } satisfies DeviceGroupModel;
    });
  }

  const map = new Map<string, DeviceSnapshot[]>();
  for (const device of devices) {
    const bucket = map.get(device.kind);
    if (bucket) {
      bucket.push(device);
    } else {
      map.set(device.kind, [device]);
    }
  }
  return Array.from(map.entries()).map(([kind, entries]) => ({
    id: kind,
    kind,
    label: kind,
    devices: entries,
    status: resolveGroupStatus(entries),
  }));
};

const toDerivedPlantGroups = (
  zone: ZoneSnapshot,
  plants: PlantSnapshot[],
  t: ReturnType<typeof useTranslation>['t'],
): DerivedPlantGroup[] => {
  const plantLookup = new Map(plants.map((plant) => [plant.id, plant] as const));

  if (Array.isArray(zone.plantingGroups) && zone.plantingGroups.length) {
    return zone.plantingGroups.map((group: PlantingGroupSnapshot) => {
      const groupPlants = (group.plantIds ?? [])
        .map((id) => plantLookup.get(id))
        .filter((plant): plant is PlantSnapshot => Boolean(plant));
      const fallback = plants.filter((plant) => plant.strainId === group.strainId);
      const resolvedPlants = groupPlants.length ? groupPlants : fallback;
      return {
        id: group.id,
        name:
          group.name ??
          t('labels.strainName', { defaultValue: 'Strain {{id}}', id: group.strainId }),
        strainId: group.strainId,
        stage: group.stage,
        plants: resolvedPlants,
        harvestableCount: group.harvestReadyCount ?? harvestableCount(resolvedPlants),
      } satisfies DerivedPlantGroup;
    });
  }

  const byStrain = new Map<string, PlantSnapshot[]>();
  for (const plant of plants) {
    const list = byStrain.get(plant.strainId);
    if (list) {
      list.push(plant);
    } else {
      byStrain.set(plant.strainId, [plant]);
    }
  }
  return Array.from(byStrain.entries()).map(([strainId, entries]) => ({
    id: `strain-${strainId}`,
    name: t('labels.strainName', { defaultValue: 'Strain {{id}}', id: strainId }),
    strainId,
    stage: entries[0]?.stage,
    plants: entries,
    harvestableCount: harvestableCount(entries),
  }));
};

const metricClass = (metric: keyof typeof ENVIRONMENT_RANGES, value: number): string => {
  const range = ENVIRONMENT_RANGES[metric];
  if (!range) {
    return styles.metricValue;
  }
  if (value < range.min * 0.85 || value > range.max * 1.15) {
    return `${styles.metricValue} ${styles.metricValueCritical}`;
  }
  if (value < range.min || value > range.max) {
    return `${styles.metricValue} ${styles.metricValueWarning}`;
  }
  return styles.metricValue;
};

interface ZoneDetailViewProps {
  zone: ZoneSnapshot;
  devices: DeviceSnapshot[];
  plants: PlantSnapshot[];
  previousZoneId?: string;
  nextZoneId?: string;
  onSelectZone: (zoneId: string) => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAdjustWater: (liters: number) => void;
  onAdjustNutrients: (nutrients: { N: number; P: number; K: number }) => void;
  onOpenPlantingModal: () => void;
  onOpenAutomationPlanModal: () => void;
  onOpenDeviceModal: () => void;
  onHarvestPlant: (plantId: string) => void;
  onHarvestAll: (plantIds: string[]) => void;
  onToggleDeviceGroup: (kind: string, enabled: boolean) => void;
  onTogglePlan: (enabled: boolean) => void;
  onTuneDeviceGroup?: (kind: string) => void;
  onScheduleDeviceGroup?: (kind: string) => void;
  hasAvailableStrains?: boolean;
  hasCompatibleDevices?: boolean;
}

export const ZoneDetailView = ({
  zone,
  devices,
  plants,
  previousZoneId,
  nextZoneId,
  onSelectZone,
  onRename,
  onDuplicate,
  onDelete,
  onAdjustWater,
  onAdjustNutrients,
  onOpenPlantingModal,
  onOpenAutomationPlanModal,
  onOpenDeviceModal,
  onHarvestPlant,
  onHarvestAll,
  onToggleDeviceGroup,
  onTogglePlan,
  onTuneDeviceGroup,
  onScheduleDeviceGroup,
  hasAvailableStrains: hasAvailableStrainsProp,
  hasCompatibleDevices: hasCompatibleDevicesProp,
}: ZoneDetailViewProps) => {
  const { t } = useTranslation('simulation');
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(zone.name);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const hasAvailableStrains = useAppStore((state) => {
    if (typeof hasAvailableStrainsProp === 'boolean') {
      return hasAvailableStrainsProp;
    }
    return selectStrainOptionsForZone(zone.id)(state).length > 0;
  });

  const hasCompatibleDevices = useAppStore((state) => {
    if (typeof hasCompatibleDevicesProp === 'boolean') {
      return hasCompatibleDevicesProp;
    }
    return selectDeviceOptionsForZone(zone.id)(state).length > 0;
  });

  const plantGroups = useMemo(() => toDerivedPlantGroups(zone, plants, t), [zone, plants, t]);
  const deviceGroups = useMemo(() => toDeviceGroups(zone, devices), [zone, devices]);

  useEffect(() => {
    setDraftName(zone.name);
    setEditing(false);
    setExpandedGroups([]);
  }, [zone.id, zone.name]);

  const lightingCoverage =
    zone.lighting?.coverageRatio ?? zone.environment.ppfd / (ENVIRONMENT_RANGES.ppfd.max || 900);
  const lightingClass = lightingCoverage >= 1 ? styles.lightingOk : styles.lightingInsufficient;

  const commitRename = () => {
    const trimmed = draftName.trim();
    if (trimmed.length && trimmed !== zone.name) {
      onRename(trimmed);
    }
    setEditing(false);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((previous) => {
      const exists = previous.includes(groupId);
      if (exists) {
        return previous.filter((id) => id !== groupId);
      }
      return [...previous, groupId];
    });
  };

  const handleHarvestAll = () => {
    const plantIds = plantGroups.flatMap((group) => group.plants.map((plant) => plant.id));
    if (plantIds.length) {
      onHarvestAll(plantIds);
    }
  };

  const noStrainOptionsTooltip = t('tooltips.noStrainBlueprints', {
    defaultValue: 'No compatible strains available. Ask your designers to add strain blueprints.',
  });
  const noDeviceOptionsTooltip = t('tooltips.noDeviceBlueprints', {
    defaultValue: 'No compatible devices available. Ask your designers to add device blueprints.',
  });

  return (
    <div>
      <div className={styles.headerRow}>
        <div className={styles.headerGroup}>
          <div className={styles.zoneTitleRow}>
            {editing ? (
              <input
                className={styles.inlineInput}
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitRename();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setDraftName(zone.name);
                    setEditing(false);
                  }
                }}
                autoFocus
              />
            ) : (
              <h3 className={styles.zoneTitle}>{zone.name}</h3>
            )}
            <div className={styles.zoneActions}>
              <button
                type="button"
                className={styles.navButton}
                onClick={() => previousZoneId && onSelectZone(previousZoneId)}
                aria-label={t('labels.previousZone', { defaultValue: 'Previous zone' })}
                disabled={!previousZoneId}
              >
                <span className="material-symbols-outlined" aria-hidden>
                  arrow_back_ios
                </span>
              </button>
              <button
                type="button"
                className={styles.navButton}
                onClick={() => nextZoneId && onSelectZone(nextZoneId)}
                aria-label={t('labels.nextZone', { defaultValue: 'Next zone' })}
                disabled={!nextZoneId}
              >
                <span className="material-symbols-outlined" aria-hidden>
                  arrow_forward_ios
                </span>
              </button>
              <button
                type="button"
                className={styles.zoneAction}
                onClick={() => {
                  setEditing(true);
                  setDraftName(zone.name);
                }}
                aria-label={t('labels.renameZone', { defaultValue: 'Rename zone' })}
              >
                <span className="material-symbols-outlined" aria-hidden>
                  edit
                </span>
              </button>
              <button
                type="button"
                className={styles.zoneAction}
                title={t('tooltips.duplicateZone', {
                  defaultValue: 'Duplicate zone (re-purchases devices)',
                })}
                onClick={onDuplicate}
                aria-label={t('labels.duplicateZone', { defaultValue: 'Duplicate zone' })}
              >
                <span className="material-symbols-outlined" aria-hidden>
                  content_copy
                </span>
              </button>
              <button
                type="button"
                className={`${styles.zoneAction} ${styles.zoneActionDanger}`}
                onClick={() => {
                  if (
                    window.confirm(
                      t('labels.confirmDeleteZone', { defaultValue: 'Delete this zone?' }),
                    )
                  ) {
                    onDelete();
                  }
                }}
                aria-label={t('labels.deleteZone', { defaultValue: 'Delete zone' })}
              >
                <span className="material-symbols-outlined" aria-hidden>
                  delete
                </span>
              </button>
            </div>
          </div>
          <p className={styles.pathMeta}>
            {t('labels.zonePath', { structure: zone.structureName, room: zone.roomName })}
          </p>
        </div>
      </div>

      <div className={styles.zoneDetailView}>
        <div className={styles.column}>
          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <h4 className={styles.cardTitle}>{t('labels.supplies')}</h4>
              <p className={styles.cardSubtitle}>
                {t('labels.dailyUse', {
                  defaultValue: 'Daily use: {{water}} L water / {{nutrients}} L nutrients',
                  water:
                    zone.supplyStatus?.dailyWaterConsumptionLiters?.toFixed(1) ??
                    t('labels.unknown', { defaultValue: 'n/a' }),
                  nutrients:
                    zone.supplyStatus?.dailyNutrientConsumptionLiters?.toFixed(1) ??
                    t('labels.unknown', { defaultValue: 'n/a' }),
                })}
              </p>
            </header>
            <div className={styles.metricGrid}>
              <div className={styles.metricRow}>
                <span>{t('labels.water')}</span>
                <span className={styles.metricValue}>
                  {zone.resources.waterLiters.toFixed(1)} L
                </span>
              </div>
              <div className={styles.metricRow}>
                <span>{t('labels.nutrientSolution')}</span>
                <span className={styles.metricValue}>
                  {zone.resources.nutrientSolutionLiters.toFixed(1)} L
                </span>
              </div>
              <div className={styles.metricRow}>
                <span>{t('labels.nutrientStrength')}</span>
                <span className={styles.metricValue}>
                  {zone.resources.nutrientStrength.toFixed(2)}
                </span>
              </div>
              <div className={styles.metricRow}>
                <span>{t('labels.substrateHealth')}</span>
                <span className={styles.metricValue}>
                  {(zone.resources.substrateHealth * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className={styles.suppliesFooter}>
              <button
                type="button"
                className={styles.supplyButton}
                title={t('tooltips.addWater', {
                  defaultValue: 'Add {{value}} L of water',
                  value: DEFAULT_WATER_INCREMENT,
                })}
                onClick={() => onAdjustWater(DEFAULT_WATER_INCREMENT)}
              >
                <span className="material-symbols-outlined" aria-hidden>
                  water_drop
                </span>
                {t('labels.addWater', { defaultValue: '+ Water' })}
              </button>
              <button
                type="button"
                className={styles.supplyButton}
                title={t('tooltips.addNutrients', {
                  defaultValue: 'Add nutrients (N{{N}} / P{{P}} / K{{K}} g)',
                  ...DEFAULT_NUTRIENT_INCREMENT,
                })}
                onClick={() => onAdjustNutrients(DEFAULT_NUTRIENT_INCREMENT)}
              >
                <span className="material-symbols-outlined" aria-hidden>
                  science
                </span>
                {t('labels.addNutrients', { defaultValue: '+ Nutrients' })}
              </button>
            </div>
          </section>

          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <h4 className={styles.cardTitle}>{t('labels.lighting')}</h4>
              <p className={`${styles.cardSubtitle} ${lightingClass}`}>
                {t('labels.lightingCoverage', {
                  defaultValue: 'Coverage {{value}}%',
                  value: Math.round(Math.min(lightingCoverage, 1.5) * 100),
                })}
              </p>
            </header>
            <div className={styles.metricGrid}>
              <div className={styles.metricRow}>
                <span>{t('labels.lightingCycle', { defaultValue: 'Cycle' })}</span>
                <span className={styles.metricValue}>
                  {zone.lighting?.photoperiodHours
                    ? `${zone.lighting.photoperiodHours.on ?? 0}h / ${zone.lighting.photoperiodHours.off ?? 0}h`
                    : t('labels.unknown', { defaultValue: 'Unknown' })}
                </span>
              </div>
              <div className={styles.metricRow}>
                <span>{t('labels.ppfd')}</span>
                <span className={metricClass('ppfd', zone.environment.ppfd)}>
                  {zone.environment.ppfd.toFixed(0)} µmol·m⁻²·s⁻¹
                </span>
              </div>
              <div className={styles.metricRow}>
                <span>{t('labels.dli', { defaultValue: 'DLI' })}</span>
                <span className={styles.metricValue}>
                  {zone.lighting?.dli ? zone.lighting.dli.toFixed(1) : '—'} mol·m⁻²·d⁻¹
                </span>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <h4 className={styles.cardTitle}>{t('labels.environment')}</h4>
            </header>
            <div className={styles.metricGrid}>
              <div className={styles.metricRow}>
                <span>{t('labels.temperature')}</span>
                <span className={metricClass('temperature', zone.environment.temperature)}>
                  {zone.environment.temperature.toFixed(1)} °C
                </span>
              </div>
              <div className={styles.metricRow}>
                <span>{t('labels.humidity')}</span>
                <span className={metricClass('humidity', zone.environment.relativeHumidity)}>
                  {(zone.environment.relativeHumidity * 100).toFixed(1)}%
                </span>
              </div>
              <div className={styles.metricRow}>
                <span>{t('labels.co2')}</span>
                <span className={metricClass('co2', zone.environment.co2)}>
                  {zone.environment.co2.toFixed(0)} ppm
                </span>
              </div>
              <div className={styles.metricRow}>
                <span>{t('labels.vpd')}</span>
                <span className={metricClass('vpd', zone.environment.vpd)}>
                  {zone.environment.vpd.toFixed(2)} kPa
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className={styles.column}>
          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <div>
                <h4 className={styles.cardTitle}>
                  {t('labels.plantingGroups', { defaultValue: 'Planting groups' })}
                </h4>
                <p className={styles.cardSubtitle}>
                  {t('labels.groupCount', {
                    defaultValue: '{{count}} groups',
                    count: plantGroups.length,
                  })}
                </p>
              </div>
              <button type="button" className={styles.harvestButton} onClick={handleHarvestAll}>
                <span className="material-symbols-outlined" aria-hidden>
                  content_cut
                </span>
                {t('labels.harvestAll', { defaultValue: 'Harvest all' })}
              </button>
            </header>
            {plantGroups.length === 0 ? (
              <p className={styles.emptyState}>{t('labels.noPlants')}</p>
            ) : (
              <div className={styles.groupList}>
                {plantGroups.map((group) => {
                  const isExpanded = expandedGroups.includes(group.id);
                  return (
                    <div key={group.id} className={styles.groupCard}>
                      <div className={styles.groupHeader}>
                        <div>
                          <h5 className={styles.groupTitle}>{group.name}</h5>
                          <div className={styles.groupMeta}>
                            <span>
                              {t('labels.groupCountShort', {
                                defaultValue: '{{count}} plants',
                                count: group.plants.length,
                              })}
                            </span>
                            <span>
                              {t('labels.harvestReady', { defaultValue: 'Harvest ready' })}:{' '}
                              {group.harvestableCount}
                            </span>
                          </div>
                        </div>
                        <div className={styles.groupActions}>
                          <button
                            type="button"
                            className={styles.zoneAction}
                            onClick={() => toggleGroup(group.id)}
                            aria-expanded={isExpanded}
                            aria-label={t('labels.toggleGroup', {
                              defaultValue: 'Toggle group',
                            })}
                          >
                            <span className="material-symbols-outlined" aria-hidden>
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>
                          <span
                            className={`material-symbols-outlined ${styles.infoIcon}`}
                            aria-hidden
                            title={t('tooltips.strainInfo', {
                              defaultValue: 'View strain preferences',
                            })}
                          >
                            info
                          </span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <div className={styles.plantList}>
                          {group.plants.map((plant) => (
                            <div key={plant.id} className={styles.plantRow}>
                              <span>
                                {plant.id} {plant.stage ? `• ${plant.stage}` : ''}
                              </span>
                              <div className={styles.plantActions}>
                                <button
                                  type="button"
                                  className={styles.zoneAction}
                                  onClick={() => onHarvestPlant(plant.id)}
                                  aria-label={t('labels.harvestPlant', {
                                    defaultValue: 'Harvest plant',
                                  })}
                                >
                                  <span className="material-symbols-outlined" aria-hidden>
                                    content_cut
                                  </span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              className={`${styles.planAction} ${!hasAvailableStrains ? styles.actionDisabled : ''}`}
              onClick={hasAvailableStrains ? onOpenPlantingModal : undefined}
              disabled={!hasAvailableStrains}
              aria-disabled={!hasAvailableStrains}
              title={!hasAvailableStrains ? noStrainOptionsTooltip : undefined}
            >
              <span className="material-symbols-outlined" aria-hidden>
                add_circle
              </span>
              {t('actions.addPlanting')}
            </button>
            {!hasAvailableStrains ? (
              <p className={styles.helperText}>
                {t('labels.noStrainBlueprintsHelper', {
                  defaultValue: 'Designers: add strain blueprints to enable planting.',
                })}
              </p>
            ) : null}
          </section>

          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <h4 className={styles.cardTitle}>
                {t('labels.plantingPlan', { defaultValue: 'Planting plan' })}
              </h4>
            </header>
            {zone.plantingPlan ? (
              <div className={styles.metricGrid}>
                <div className={styles.metricRow}>
                  <span>{t('labels.strain')}</span>
                  <span className={styles.metricValue}>{zone.plantingPlan.strainId}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>{t('labels.plants')}</span>
                  <span className={styles.metricValue}>{zone.plantingPlan.count}</span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={zone.plantingPlan.enabled}
                    onChange={(event) => onTogglePlan(event.target.checked)}
                    aria-label={t('labels.autoReplantToggle', { defaultValue: 'Auto replant' })}
                  />
                  <span>{t('labels.autoReplantToggle', { defaultValue: 'Auto replant' })}</span>
                </label>
                <div className={styles.deviceActions}>
                  <button
                    type="button"
                    className={styles.deviceActionButton}
                    onClick={onOpenAutomationPlanModal}
                  >
                    <span className="material-symbols-outlined" aria-hidden>
                      edit
                    </span>
                    {t('labels.editPlan', { defaultValue: 'Edit plan' })}
                  </button>
                  <button
                    type="button"
                    className={styles.deviceActionButton}
                    onClick={() => onTogglePlan(false)}
                  >
                    <span className="material-symbols-outlined" aria-hidden>
                      delete
                    </span>
                    {t('labels.deletePlan', { defaultValue: 'Delete plan' })}
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.metricGrid}>
                <p className={styles.emptyState}>
                  {t('labels.noPlantingPlan', { defaultValue: 'No plan configured.' })}
                </p>
                <button
                  type="button"
                  className={styles.planAction}
                  onClick={onOpenAutomationPlanModal}
                >
                  <span className="material-symbols-outlined" aria-hidden>
                    add_circle
                  </span>
                  {t('labels.createPlan', { defaultValue: 'Create plan' })}
                </button>
              </div>
            )}
          </section>

          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <div>
                <h4 className={styles.cardTitle}>
                  {t('labels.deviceGroups', { defaultValue: 'Device groups' })}
                </h4>
                <p className={styles.cardSubtitle}>
                  {t('labels.deviceCount', {
                    defaultValue: '{{count}} devices',
                    count: devices.length,
                  })}
                </p>
              </div>
              <button
                type="button"
                className={`${styles.planAction} ${!hasCompatibleDevices ? styles.actionDisabled : ''}`}
                onClick={hasCompatibleDevices ? onOpenDeviceModal : undefined}
                disabled={!hasCompatibleDevices}
                aria-disabled={!hasCompatibleDevices}
                title={!hasCompatibleDevices ? noDeviceOptionsTooltip : undefined}
              >
                <span className="material-symbols-outlined" aria-hidden>
                  add_circle
                </span>
                {t('actions.installDevice')}
              </button>
            </header>
            {!hasCompatibleDevices ? (
              <p className={styles.helperText}>
                {t('labels.noDeviceBlueprintsHelper', {
                  defaultValue: 'Designers: add device blueprints to enable installations.',
                })}
              </p>
            ) : null}
            {deviceGroups.length === 0 ? (
              <p className={styles.emptyState}>{t('labels.noDevices')}</p>
            ) : (
              <div className={styles.groupList}>
                {deviceGroups.map((group) => {
                  const isEnabled = group.status === 'on';
                  const indicatorClass =
                    group.status === 'broken'
                      ? styles.statusBroken
                      : group.status === 'mixed'
                        ? styles.statusMixed
                        : group.status === 'on'
                          ? styles.statusOn
                          : styles.statusOff;
                  return (
                    <div key={group.id} className={styles.groupCard}>
                      <div className={styles.deviceGroupHeader}>
                        <div className={styles.deviceGroupTitle}>
                          <span className={`${styles.deviceStatusIndicator} ${indicatorClass}`} />
                          <span>{group.label}</span>
                        </div>
                        <div className={styles.deviceActions}>
                          <button
                            type="button"
                            className={styles.zoneAction}
                            onClick={() => onToggleDeviceGroup(group.kind, !isEnabled)}
                            title={t('tooltips.toggleDeviceGroup', {
                              defaultValue: 'Toggle group power',
                            })}
                          >
                            <span className="material-symbols-outlined" aria-hidden>
                              power_settings_new
                            </span>
                          </button>
                          {onTuneDeviceGroup ? (
                            <button
                              type="button"
                              className={styles.zoneAction}
                              onClick={() => onTuneDeviceGroup(group.kind)}
                              title={t('labels.tuneDevices', { defaultValue: 'Tune settings' })}
                            >
                              <span className="material-symbols-outlined" aria-hidden>
                                tune
                              </span>
                            </button>
                          ) : null}
                          {onScheduleDeviceGroup &&
                          (group.supportsScheduling ||
                            group.kind.toLowerCase().includes('light')) ? (
                            <button
                              type="button"
                              className={styles.zoneAction}
                              onClick={() => onScheduleDeviceGroup(group.kind)}
                              title={t('labels.editSchedule', { defaultValue: 'Edit schedule' })}
                            >
                              <span className="material-symbols-outlined" aria-hidden>
                                schedule
                              </span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className={styles.deviceList}>
                        {group.devices.map((device) => (
                          <div key={device.id} className={styles.deviceListItem}>
                            <span>{device.name}</span>
                            <span>{device.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
