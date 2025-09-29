import { useEffect, useState } from 'react';
import { ActionFooter, Feedback } from '@/components/modals/common';
import type { SimulationBridge, StructureBlueprint } from '@/facade/systemFacade';
import { formatNumber } from '@/utils/formatNumber';

export interface RentStructureModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
}

export const RentStructureModal = ({ bridge, closeModal }: RentStructureModalProps) => {
  const [blueprints, setBlueprints] = useState<StructureBlueprint[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load structure blueprints from backend
  useEffect(() => {
    let isMounted = true;
    const loadBlueprints = async () => {
      if (isMounted) {
        setLoading(true);
      }
      try {
        const response = await bridge.getStructureBlueprints();
        if (!isMounted) {
          return;
        }
        if (response.ok && response.data) {
          if (isMounted) {
            setBlueprints(response.data);
            if (response.data.length > 0) {
              setSelected(response.data[0].id);
            }
          }
        } else if (isMounted) {
          setFeedback('Failed to load structure blueprints from backend.');
        }
      } catch (error) {
        console.error('Failed to load structure blueprints:', error);
        if (isMounted) {
          setFeedback('Connection error while loading structure blueprints.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadBlueprints();

    return () => {
      isMounted = false;
    };
  }, [bridge]);

  const handleRent = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'rentStructure',
        payload: { structureId: selected },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Unable to rent structure.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to rent structure', error);
      setFeedback('Connection error while dispatching rent intent.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-text-muted">Loading structure blueprints...</p>
      </div>
    );
  }

  if (blueprints.length === 0) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-text-muted">No structure blueprints available.</p>
        {feedback ? <Feedback message={feedback} /> : null}
        <ActionFooter
          onCancel={closeModal}
          onConfirm={() => {}}
          confirmLabel="Close"
          confirmDisabled={true}
          cancelDisabled={false}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Select a deterministic blueprint to rent. The facade validates availability and applies rent
        per tick once the command succeeds.
      </p>
      <div className="grid gap-3">
        {blueprints.map((blueprint) => {
          const area = blueprint.footprint.length * blueprint.footprint.width;
          return (
            <label
              key={blueprint.id}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/50 bg-surface-muted/60 p-4 transition hover:border-primary"
            >
              <input
                type="radio"
                className="mt-1 size-4 shrink-0 accent-primary"
                name="structure-blueprint"
                value={blueprint.id}
                checked={selected === blueprint.id}
                onChange={() => setSelected(blueprint.id)}
              />
              <div className="flex flex-col gap-1 text-left">
                <span className="text-sm font-semibold text-text">{blueprint.name}</span>
                <span className="text-xs text-text-muted">
                  {formatNumber(area)} m² · Upfront €
                  {formatNumber(blueprint.upfrontFee, { maximumFractionDigits: 0 })} · Rent €
                  {formatNumber(blueprint.rentalCostPerSqmPerMonth)}/m²·month
                </span>
                <span className="text-xs text-text-muted/80">
                  {formatNumber(blueprint.footprint.length)}m ×{' '}
                  {formatNumber(blueprint.footprint.width)}m ×{' '}
                  {formatNumber(blueprint.footprint.height)}m
                </span>
              </div>
            </label>
          );
        })}
      </div>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleRent}
        confirmLabel={busy ? 'Renting…' : 'Rent structure'}
        confirmDisabled={busy || !selected}
        cancelDisabled={busy}
      />
    </div>
  );
};
