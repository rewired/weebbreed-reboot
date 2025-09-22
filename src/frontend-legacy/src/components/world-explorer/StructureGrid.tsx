import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StructureSnapshot } from '@/types/simulation';
import styles from './HierarchyGrid.module.css';

export interface StructureSummary {
  structure: StructureSnapshot;
  roomCount: number;
  zoneCount: number;
  plantCount: number;
  totalYield: number;
}

interface StructureGridProps {
  structures: StructureSummary[];
  selectedStructureId?: string;
  onSelect: (structureId: string) => void;
  onRename: (structureId: string, name: string) => void;
  onDelete: (structureId: string) => void;
  onResetSelection?: () => void;
  onAddRoom?: () => void;
}

export const StructureGrid = ({
  structures,
  selectedStructureId,
  onSelect,
  onRename,
  onDelete,
  onResetSelection,
  onAddRoom,
}: StructureGridProps) => {
  const { t } = useTranslation('simulation');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const startEditing = (structureId: string, currentName: string) => {
    setEditingId(structureId);
    setDraftName(currentName);
  };

  const commitRename = () => {
    if (!editingId) {
      return;
    }
    const trimmed = draftName.trim();
    if (trimmed.length && structures.some((entry) => entry.structure.id === editingId)) {
      onRename(editingId, trimmed);
    }
    setEditingId(null);
    setDraftName('');
  };

  return (
    <section className={styles.section} aria-label={t('labels.structures')}>
      <header className={styles.sectionHeader}>
        <div>
          <h3 className={styles.sectionTitle}>{t('labels.structures')}</h3>
          <p className={styles.sectionMeta}>{t('labels.count', { count: structures.length })}</p>
        </div>
        <div className={styles.sectionActions}>
          {onAddRoom ? (
            <button type="button" className={styles.cardButton} onClick={onAddRoom}>
              {t('actions.addRoom')}
            </button>
          ) : null}
          {onResetSelection ? (
            <button type="button" className={styles.cardButton} onClick={onResetSelection}>
              {t('labels.resetSelection', { defaultValue: 'Reset selection' })}
            </button>
          ) : null}
        </div>
      </header>
      {structures.length === 0 ? (
        <p className={styles.emptyState}>{t('labels.noStructures')}</p>
      ) : (
        <div className={styles.cardContainer}>
          {structures.map(({ structure, roomCount, zoneCount, plantCount, totalYield }) => {
            const isEditing = editingId === structure.id;
            const isActive = selectedStructureId === structure.id;
            return (
              <article
                key={structure.id}
                className={`${styles.card} ${isActive ? styles.cardActive : ''}`.trim()}
              >
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
                        onClick={() => onSelect(structure.id)}
                      >
                        {structure.name}
                      </button>
                    )}
                    <span className={styles.cardSubtitle}>
                      {t('labels.structureFootprint', {
                        defaultValue: '{{value}} m² footprint',
                        value:
                          structure.footprint?.area?.toLocaleString(undefined, {
                            maximumFractionDigits: 1,
                          }) ?? '—',
                      })}
                    </span>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => startEditing(structure.id, structure.name)}
                      aria-label={t('labels.renameStructure', { defaultValue: 'Rename structure' })}
                    >
                      <span className="material-symbols-outlined" aria-hidden>
                        edit
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                      onClick={() => {
                        if (
                          window.confirm(
                            t('labels.confirmDeleteStructure', {
                              defaultValue: 'Delete this structure?',
                            }),
                          )
                        ) {
                          onDelete(structure.id);
                        }
                      }}
                      aria-label={t('labels.deleteStructure', { defaultValue: 'Delete structure' })}
                    >
                      <span className="material-symbols-outlined" aria-hidden>
                        delete
                      </span>
                    </button>
                  </div>
                </header>
                <dl className={styles.cardMetrics}>
                  <div className={styles.metricRow}>
                    <dt>{t('labels.rooms')}</dt>
                    <dd className={styles.metricValue}>{roomCount}</dd>
                  </div>
                  <div className={styles.metricRow}>
                    <dt>{t('labels.zones')}</dt>
                    <dd className={styles.metricValue}>{zoneCount}</dd>
                  </div>
                  <div className={styles.metricRow}>
                    <dt>{t('labels.plants')}</dt>
                    <dd className={styles.metricValue}>{plantCount}</dd>
                  </div>
                  <div className={styles.metricRow}>
                    <dt>{t('labels.yield')}</dt>
                    <dd className={styles.metricValue}>
                      {totalYield.toLocaleString(undefined, { maximumFractionDigits: 1 })} g
                    </dd>
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
