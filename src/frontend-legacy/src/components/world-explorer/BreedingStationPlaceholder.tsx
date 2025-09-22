import { useTranslation } from 'react-i18next';
import styles from './BreedingStationPlaceholder.module.css';

interface BreedingStationPlaceholderProps {
  onBreedNewStrain?: () => void;
}

export const BreedingStationPlaceholder = ({
  onBreedNewStrain,
}: BreedingStationPlaceholderProps) => {
  const { t } = useTranslation('simulation');

  return (
    <div className={styles.placeholder}>
      <h4 className={styles.title}>{t('labels.breedingStation')}</h4>
      <p className={styles.description}>{t('labels.breedingStationDescription')}</p>
      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.primaryAction}
          onClick={onBreedNewStrain}
          disabled={!onBreedNewStrain}
        >
          <span className="material-symbols-outlined" aria-hidden>
            science
          </span>
          {t('actions.breedStrain', { defaultValue: 'Breed new strain' })}
        </button>
      </div>
    </div>
  );
};
