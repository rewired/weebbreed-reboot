import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ROOM_PURPOSE_IDS } from '@/engine/roomPurposeIds';
import type { RoomSnapshot } from '../../types/simulation';
import styles from './HierarchyGrid.module.css';

export interface RoomSummary {
  room: RoomSnapshot;
  zoneCount: number;
  plantCount: number;
  totalYield: number;
}

interface RoomGridProps {
  rooms: RoomSummary[];
  selectedRoomId?: string;
  onSelect: (roomId: string) => void;
  onRename: (roomId: string, name: string) => void;
  onDuplicate: (roomId: string) => void;
  onDelete: (roomId: string) => void;
  onAddZone?: () => void;
}

const PURPOSE_LABELS: Record<string, string> = {
  [ROOM_PURPOSE_IDS.LABORATORY]: 'labels.roomPurposeLab',
  [ROOM_PURPOSE_IDS.GROW_ROOM]: 'labels.roomPurposeGrow',
};

export const RoomGrid = ({
  rooms,
  selectedRoomId,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
  onAddZone,
}: RoomGridProps) => {
  const { t } = useTranslation('simulation');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const duplicateTooltip = t('tooltips.duplicateRoom', {
    defaultValue: 'Duplicate room (re-purchases devices)',
  });

  const startEditing = (roomId: string, currentName: string) => {
    setEditingId(roomId);
    setDraftName(currentName);
  };

  const purposeLabel = (purposeId: string) => {
    const key = PURPOSE_LABELS[purposeId] ?? 'labels.roomPurposeGeneric';
    return t(key, { defaultValue: purposeId });
  };

  const commitRename = () => {
    if (!editingId) {
      return;
    }
    const trimmed = draftName.trim();
    if (trimmed.length && rooms.some((entry) => entry.room.id === editingId)) {
      onRename(editingId, trimmed);
    }
    setEditingId(null);
    setDraftName('');
  };

  const totalCount = useMemo(() => rooms.length, [rooms]);

  return (
    <section className={styles.section} aria-label={t('labels.rooms')}>
      <header className={styles.sectionHeader}>
        <div>
          <h3 className={styles.sectionTitle}>{t('labels.rooms')}</h3>
          <p className={styles.sectionMeta}>{t('labels.count', { count: totalCount })}</p>
        </div>
        {onAddZone ? (
          <button type="button" className={styles.cardButton} onClick={onAddZone}>
            {t('actions.addZone')}
          </button>
        ) : null}
      </header>
      {rooms.length === 0 ? (
        <p className={styles.emptyState}>{t('labels.noRooms')}</p>
      ) : (
        <div className={styles.cardContainer}>
          {rooms.map(({ room, zoneCount, plantCount, totalYield }) => {
            const isEditing = editingId === room.id;
            const isActive = selectedRoomId === room.id;
            return (
              <article
                key={room.id}
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
                        onClick={() => onSelect(room.id)}
                      >
                        {room.name}
                      </button>
                    )}
                    <span className={styles.cardSubtitle}>
                      <span className={styles.purposeBadge}>{purposeLabel(room.purposeId)}</span>
                      <span>
                        {t('labels.roomArea', {
                          defaultValue: '{{value}} m²',
                          value:
                            room.area?.toLocaleString(undefined, { maximumFractionDigits: 1 }) ??
                            '—',
                        })}
                      </span>
                    </span>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => startEditing(room.id, room.name)}
                      aria-label={t('labels.renameRoom', { defaultValue: 'Rename room' })}
                    >
                      <span className="material-symbols-outlined" aria-hidden>
                        edit
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      title={duplicateTooltip}
                      onClick={() => onDuplicate(room.id)}
                      aria-label={t('labels.duplicateRoom', { defaultValue: 'Duplicate room' })}
                    >
                      <span className="material-symbols-outlined" aria-hidden>
                        content_copy
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                      onClick={() => {
                        if (
                          window.confirm(
                            t('labels.confirmDeleteRoom', { defaultValue: 'Delete this room?' }),
                          )
                        ) {
                          onDelete(room.id);
                        }
                      }}
                      aria-label={t('labels.deleteRoom', { defaultValue: 'Delete room' })}
                    >
                      <span className="material-symbols-outlined" aria-hidden>
                        delete
                      </span>
                    </button>
                  </div>
                </header>
                <dl className={styles.cardMetrics}>
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
