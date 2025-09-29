import { useMemo, useState } from 'react';
import { ModalFrame } from './ModalFrame';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { useSimulationStore } from '@/store/simulation';
import { type SimulationBridge } from '@/facade/systemFacade';
import type { PlantSnapshot } from '@/types/simulation';

export interface ConfirmPlantActionContext {
  action?: 'harvest' | 'cull';
  plantIds?: string[];
  zoneId?: string;
  onConfirm?: () => Promise<boolean> | boolean;
}

interface ConfirmPlantActionModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}

const resolveContext = (context?: Record<string, unknown>): ConfirmPlantActionContext => {
  if (!context) {
    return {};
  }
  const entries = context as ConfirmPlantActionContext & { plantId?: unknown };
  const plantIds: string[] = [];
  if (Array.isArray(entries.plantIds)) {
    for (const value of entries.plantIds) {
      if (typeof value === 'string') {
        plantIds.push(value);
      }
    }
  } else if (typeof entries.plantIds === 'string') {
    plantIds.push(entries.plantIds);
  }
  if (!plantIds.length && typeof entries.plantId === 'string') {
    plantIds.push(entries.plantId);
  }
  return {
    action: entries.action,
    plantIds,
    zoneId: entries.zoneId,
    onConfirm: entries.onConfirm,
  };
};

const findPlants = (snapshotPlants: PlantSnapshot[], ids: string[]): PlantSnapshot[] => {
  const idSet = new Set(ids);
  return snapshotPlants.filter((plant) => idSet.has(plant.id));
};

const usePlantsForContext = (plantIds: string[], zoneId?: string) => {
  return useSimulationStore(
    (state) => {
      const snapshot = state.snapshot;
      if (!snapshot || !plantIds.length) {
        return [] as PlantSnapshot[];
      }
      if (zoneId) {
        const zone = snapshot.zones.find((entry) => entry.id === zoneId);
        if (zone) {
          return findPlants(zone.plants, plantIds);
        }
      }
      for (const zone of snapshot.zones) {
        const matches = findPlants(zone.plants, plantIds);
        if (matches.length) {
          return matches;
        }
      }
      return [] as PlantSnapshot[];
    },
    (a, b) => {
      if (a === b) {
        return true;
      }
      if (a.length !== b.length) {
        return false;
      }
      return a.every((plant, index) => plant.id === b[index]?.id);
    },
  );
};

export const ConfirmPlantActionModal = ({ closeModal, context }: ConfirmPlantActionModalProps) => {
  const parsed = resolveContext(context);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const plantIds = parsed.plantIds ?? [];
  const plants = usePlantsForContext(plantIds, parsed.zoneId);
  const action = parsed.action ?? 'harvest';
  const actionVerb = action === 'cull' ? 'cull' : 'harvest';
  const actionLabel = action === 'cull' ? 'Cull' : 'Harvest';
  const plural = plantIds.length !== 1;

  const details = useMemo(() => {
    if (!plants.length) {
      return null;
    }
    return plants.map((plant) => ({
      id: plant.id,
      label: plant.strainName || plant.id,
      stage: plant.stage,
      harvestable: plant.isHarvestable,
    }));
  }, [plants]);

  const handleConfirm = async () => {
    if (typeof parsed.onConfirm !== 'function') {
      setFeedback('Command handler missing. Close the modal and try again.');
      return;
    }
    if (!plantIds.length) {
      setFeedback('Select at least one plant to continue.');
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const result = await parsed.onConfirm();
      if (result === false) {
        setFeedback('Action was not accepted. Review the toast notification for details.');
        setBusy(false);
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to confirm plant action', error);
      setFeedback('Unexpected error while dispatching the command. Please retry in a moment.');
      setBusy(false);
    }
  };

  const disabled = busy || !plantIds.length;

  return (
    <ModalFrame
      title={`${actionLabel} plant${plural ? 's' : ''}`}
      subtitle={`Confirm ${actionVerb} command${plural ? 's' : ''}`}
      onClose={() => {
        if (!busy) {
          closeModal();
        }
      }}
    >
      <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-warning">
        <div className="flex items-start gap-3">
          <Icon name="report" className="mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-warning">This action cannot be undone.</p>
            <p className="text-sm text-warning/80">
              {plural
                ? `You are about to ${actionVerb} ${plantIds.length} plants. Their biomass and telemetry will be removed.`
                : `You are about to ${actionVerb} this plant. Its biomass and telemetry will be removed.`}
            </p>
          </div>
        </div>
      </div>
      {details && details.length ? (
        <ul className="grid gap-2" data-testid="confirm-plant-action-list">
          {details.map((plant) => (
            <li
              key={plant.id}
              className="flex items-center justify-between rounded-xl border border-border/40 bg-surface-muted/30 px-4 py-3"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-text">{plant.label}</span>
                <span className="text-xs text-text-muted">{plant.stage || 'Stage unknown'}</span>
              </div>
              <span className="text-xs text-text-muted">{plant.id}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-warning" data-testid="confirm-plant-action-missing">
          Plants could not be found in the current snapshot. Continue only if you are sure the
          selection is correct.
        </p>
      )}
      {feedback ? <p className="text-sm text-danger">{feedback}</p> : null}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!busy) {
              closeModal();
            }
          }}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          variant={action === 'cull' ? 'danger' : 'primary'}
          onClick={() => {
            void handleConfirm();
          }}
          disabled={disabled}
          data-testid="confirm-plant-action-confirm"
        >
          {busy ? `${actionLabel}ing…` : actionLabel}
        </Button>
      </div>
    </ModalFrame>
  );
};
