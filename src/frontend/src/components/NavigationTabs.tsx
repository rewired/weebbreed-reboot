import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store';
import { selectSelectedRoom, selectSelectedStructure, selectSelectedZone } from '@/store/selectors';
import styles from './NavigationTabs.module.css';

interface BreadcrumbSegment {
  key: string;
  label: string;
  onClick?: () => void;
}

export const NavigationTabs = () => {
  const { t } = useTranslation(['simulation', 'navigation']);
  const currentView = useAppStore((state) => state.currentView);
  const selectedStructure = useAppStore(selectSelectedStructure);
  const selectedStructureId = useAppStore((state) => state.selectedStructureId);
  const selectedRoom = useAppStore(selectSelectedRoom);
  const selectedRoomId = useAppStore((state) => state.selectedRoomId);
  const selectedZone = useAppStore(selectSelectedZone);
  const selectedZoneId = useAppStore((state) => state.selectedZoneId);
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const resetSelection = useAppStore((state) => state.resetSelection);
  const selectStructure = useAppStore((state) => state.selectStructure);
  const selectRoom = useAppStore((state) => state.selectRoom);
  const navigateUp = useAppStore((state) => state.navigateUp);

  const segments = useMemo<BreadcrumbSegment[]>(() => {
    const items: BreadcrumbSegment[] = [
      {
        key: 'structures-root',
        label: t('labels.structures'),
        onClick: () => {
          resetSelection();
          setCurrentView('world');
        },
      },
    ];

    if (selectedStructure || selectedStructureId) {
      const structureKey = selectedStructure?.id ?? selectedStructureId ?? 'structure';
      items.push({
        key: structureKey,
        label: selectedStructure?.name ?? structureKey,
        onClick:
          selectedRoom || selectedZone
            ? () => {
                if (selectedStructure?.id) {
                  selectStructure(selectedStructure.id);
                } else if (selectedStructureId) {
                  selectStructure(selectedStructureId);
                }
              }
            : undefined,
      });
    }

    if (selectedRoom || selectedRoomId) {
      const roomKey = selectedRoom?.id ?? selectedRoomId ?? 'room';
      items.push({
        key: roomKey,
        label: selectedRoom?.name ?? roomKey,
        onClick: selectedZone
          ? () => {
              if (selectedRoom?.id) {
                selectRoom(selectedRoom.id);
              } else if (selectedRoomId) {
                selectRoom(selectedRoomId);
              }
            }
          : undefined,
      });
    }

    if (selectedZone || selectedZoneId) {
      const zoneKey = selectedZone?.id ?? selectedZoneId ?? 'zone';
      items.push({
        key: zoneKey,
        label: selectedZone?.name ?? zoneKey,
      });
    }

    return items;
  }, [
    resetSelection,
    selectRoom,
    selectStructure,
    selectedRoom,
    selectedRoomId,
    selectedStructure,
    selectedStructureId,
    selectedZone,
    selectedZoneId,
    setCurrentView,
    t,
  ]);

  if (currentView !== 'world' || segments.length <= 1) {
    return null;
  }

  return (
    <nav className={styles.nav} aria-label={t('labels.breadcrumbs')}>
      <button
        type="button"
        className={styles.backButton}
        onClick={navigateUp}
        aria-label={t('navigation:goBack')}
      >
        <span className="material-symbols-outlined" aria-hidden>
          arrow_back
        </span>
      </button>
      <ol className={styles.list}>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          if (isLast) {
            return (
              <li key={segment.key} className={styles.item}>
                <span className={styles.current} aria-current="page">
                  {segment.label}
                </span>
              </li>
            );
          }

          return (
            <li key={segment.key} className={styles.item}>
              {segment.onClick ? (
                <button type="button" className={styles.linkButton} onClick={segment.onClick}>
                  {segment.label}
                </button>
              ) : (
                <span className={styles.text}>{segment.label}</span>
              )}
              <span className={styles.separator} aria-hidden>
                /
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
