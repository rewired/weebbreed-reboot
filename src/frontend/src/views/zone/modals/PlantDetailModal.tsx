import Modal from '@/components/Modal';
import type { PlantSnapshot } from '@/types/simulation';

type PlantDetailModalProps = {
  plant: PlantSnapshot;
  onClose: () => void;
  title?: string;
  description?: string;
};

const percentage = (value: number | undefined) => {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const normalized = Math.max(0, Math.min(value ?? 0, 1));
  return `${Math.round(normalized * 100)}%`;
};

const grams = (value: number | undefined) => {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `${value?.toFixed(1)} g`;
};

const PlantDetailModal = ({ plant, onClose, title, description }: PlantDetailModalProps) => {
  return (
    <Modal
      isOpen
      title={title ?? `Plant ${plant.id}`}
      description={
        description ??
        'Read-only snapshot of the plant state. Lifecycle updates, health changes, and harvesting are orchestrated by the simulation facade.'
      }
      onClose={onClose}
      size="md"
      actions={[
        {
          label: 'Close',
          onClick: onClose,
          variant: 'secondary',
        },
      ]}
    >
      <section className="grid gap-4 text-sm text-text-secondary md:grid-cols-2">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Strain</h3>
          <p className="font-medium text-text-primary">{plant.strainId}</p>
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Stage</h3>
          <p className="font-medium text-text-primary">{plant.stage}</p>
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Health</h3>
          <p className="font-medium text-text-primary">{percentage(plant.health)}</p>
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Stress</h3>
          <p className="font-medium text-text-primary">{percentage(plant.stress)}</p>
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Biomass (dry)
          </h3>
          <p className="font-medium text-text-primary">{grams(plant.biomassDryGrams)}</p>
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Yield (dry)
          </h3>
          <p className="font-medium text-text-primary">{grams(plant.yieldDryGrams)}</p>
        </div>
      </section>

      <section className="space-y-2 rounded-lg border border-border/60 bg-surfaceAlt/60 p-4 text-xs text-text-muted">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Assignments
        </h3>
        <ul className="space-y-1 text-sm text-text-secondary">
          <li>
            <span className="text-text-muted">Structure:</span>{' '}
            <span className="font-medium text-text-primary">{plant.structureId ?? '—'}</span>
          </li>
          <li>
            <span className="text-text-muted">Room:</span>{' '}
            <span className="font-medium text-text-primary">{plant.roomId ?? '—'}</span>
          </li>
          <li>
            <span className="text-text-muted">Zone:</span>{' '}
            <span className="font-medium text-text-primary">{plant.zoneId ?? '—'}</span>
          </li>
        </ul>
      </section>
    </Modal>
  );
};

export type { PlantDetailModalProps };
export default PlantDetailModal;
