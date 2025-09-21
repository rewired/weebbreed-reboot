import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ZoneSnapshot, PlantSnapshot } from '../../types/simulation';
import styles from './HierarchyGrid.module.css';

export interface ZoneSummary {
  zone: ZoneSnapshot;
  plants: PlantSnapshot[];
}

interface ZoneGridProps {
  zones: ZoneSummary[];
  selectedZoneId?: string;
  onSelect: (zoneId: string) => void;
  onRename: (zoneId: string, name: string) => void;
  onDuplicate: (zoneId: string) => void;
  onDelete: (zoneId: string) => void;
  onAddPlanting?: () => void;
  disabled?: boolean;
  emptyState?: string;
}

const harvestReadyCount = (plants: PlantSnapshot[]): number => {
  return plants.reduce((count, plant) => {
    const stage = plant.stage?.toLowerCase?.() ?? '';
    return count + (stage.includes('harvest') || stage.includes('ripe') ? 1 : 0);
  }, 0);
};

export const ZoneGrid = ({
  zones,
  selectedZoneId,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
  onAddPlanting,
  disabled = false,
  emptyState,
}: ZoneGridProps) => {
  const { t } = useTranslation('simulation');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const duplicateTooltip = t('tooltips.duplicateZone', {
    defaultValue: 'Duplicate zone (re-purchases devices)',
  });

  const startEditing = (zoneId: string, name: string) => {
    if (disabled) {
      return;
    }
    setEditingId(zoneId);
    setDraftName(name);
  };

  const commitRename = () => {
    if (!editingId) {
      return;
    }
    const trimmed = draftName.trim();
    if (trimmed.length && zones.some((entry) => entry.zone.id === editingId)) {
      onRename(editingId, trimmed);
    }
    setEditingId(null);
    setDraftName('');
  };

  if (disabled) {
    return (
      <section className={styles.section} aria-label={t('labels.zones')}>
        <header className={styles.sectionHeader}>
          <div>
            <h3 className={styles.sectionTitle}>{t('labels.zones')}</h3>
            <p className={styles.sectionMeta}>{t('labels.count', { count: 0 })}</p>
          </div>
        </header>
        <p className={styles.emptyState}>{emptyState ?? t('labels.noZones')}</p>
      </section>
    );
  }

  return (
    <section className={styles.section} aria-label={t('labels.zones')}>
      <header className={styles.sectionHeader}>
        <div>
          <h3 className={styles.sectionTitle}>{t('labels.zones')}</h3>
          <p className={styles.sectionMeta}>{t('labels.count', { count: zones.length })}</p>
        </div>
        {onAddPlanting ? (
          <button type="button" className={styles.cardButton} onClick={onAddPlanting}>
            {t('actions.addPlanting')}
          </button>
        ) : null}
      </header>
      {zones.length === 0 ? (
        <p className={styles.emptyState}>{emptyState ?? t('labels.noZones')}</p>
      ) : (
        <div className={styles.cardContainer}>
          {zones.map(({ zone, plants }) => {
            const isEditing = editingId === zone.id;
            const isActive = selectedZoneId === zone.id;
            const harvestable = harvestReadyCount(plants);
            return (
              <article key={zone.id} className={`${styles.card} ${isActive ? styles.cardActive : ''}`.trim()}>
                <header className={styles.cardHeader}>
                  <div className={styles.cardTitleGroup}>
                    {isEditing ? (
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
                            setEditingId(null);
                            setDraftName('');
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        className={styles.cardName}
                        onClick={() => onSelect(zone.id)}
                      >
                        {zone.name}
                      </button>
                    )}
                    <span className={styles.cardSubtitle}>
                      <span>
                        {t('labels.zoneMethod', {
                          defaultValue: 'Method: {{value}}',
                          value: zone.cultivationMethodId ?? t('labels.unknown', { defaultValue: 'Unknown' }),
                        })}
                      </span>
                    </span>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => startEditing(zone.id, zone.name)}
                      aria-label={t('labels.renameZone', { defaultValue: 'Rename zone' })}
                    >
                      <span className="material-symbols-outlined" aria-hidden>
                        edit
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      title={duplicateTooltip}
                      onClick={() => onDuplicate(zone.id)}
                      aria-label={t('labels.duplicateZone', { defaultValue: 'Duplicate zone' })}
                    >
                      <span className="material-symbols-outlined" aria-hidden>
                        content_copy
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                      onClick={() => {
                        if (window.confirm(t('labels.confirmDeleteZone', { defaultValue: 'Delete this zone?' }))) {
                          onDelete(zone.id);
                        }
                      }}
                      aria-label={t('labels.deleteZone', { defaultValue: 'Delete zone' })}
                    >
                      <span className="material-symbols-outlined" aria-hidden>
                        delete
                      </span>
                    </button>
                  </div>
                </header>
                <dl className={styles.cardMetrics}>
                  <div className={styles.metricRow}>
                    <dt>{t('labels.plants')}</dt>
                    <dd className={styles.metricValue}>{plants.length}</dd>
                  </div>
                  <div className={styles.metricRow}>
                    <dt>{t('labels.harvestReady', { defaultValue: 'Harvest ready' })}</dt>
                    <dd className={styles.metricValue}>{harvestable}</dd>
                  </div>
                  <div className={styles.metricRow}>
                    <dt>{t('labels.ppfd')}</dt>
                    <dd className={styles.metricValue}>{zone.environment.ppfd.toFixed(0)} µmol·m⁻²·s⁻¹</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
