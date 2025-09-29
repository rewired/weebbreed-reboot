import { useEffect, useMemo, useState } from 'react';
import { ActionFooter, Feedback } from '@/components/modals/common';
import { useSimulationStore } from '@/store/simulation';
import type { SimulationBridge, StrainBlueprint } from '@/facade/systemFacade';
import { formatNumber } from '@/utils/formatNumber';
import { getCultivationMethodHint } from './cultivationHints';

export interface PlantZoneModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}

export const PlantZoneModal = ({ bridge, closeModal, context }: PlantZoneModalProps) => {
  const zoneId = typeof context?.zoneId === 'string' ? context.zoneId : null;
  const zone = useSimulationStore((state) =>
    zoneId ? (state.snapshot?.zones.find((item) => item.id === zoneId) ?? null) : null,
  );
  const [strains, setStrains] = useState<StrainBlueprint[]>([]);
  const [selectedStrainId, setSelectedStrainId] = useState('');
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadBlueprints = async () => {
      setLoading(true);
      try {
        const response = await bridge.getStrainBlueprints();
        if (!isMounted) {
          return;
        }
        if (response.ok && response.data) {
          const data = response.data;
          setStrains(data);
          if (data.length > 0) {
            setSelectedStrainId((previous) => {
              const existing = data.find((item) => item.id === previous);
              return existing ? existing.id : data[0]!.id;
            });
          }
        } else {
          setFeedback('Failed to load strain catalog from facade.');
        }
      } catch (error) {
        console.error('Failed to load strain catalog', error);
        if (isMounted) {
          setFeedback('Connection error while loading strain catalog.');
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

  const methodHint = getCultivationMethodHint(zone?.cultivationMethodId);
  const capacity = useMemo(() => {
    if (!zone || !methodHint) {
      return null;
    }
    const areaPerPlant = Math.max(methodHint.areaPerPlant, 0.1);
    return Math.max(1, Math.floor(zone.area / areaPerPlant));
  }, [methodHint, zone]);

  const plantedCount = zone?.plants.length ?? 0;
  const remainingCapacity = capacity !== null ? Math.max(0, capacity - plantedCount) : null;
  const selectedStrain = useMemo(
    () => strains.find((strain) => strain.id === selectedStrainId) ?? null,
    [selectedStrainId, strains],
  );

  const affinity = useMemo(() => {
    if (!selectedStrain) {
      return null;
    }
    const methodId = zone?.cultivationMethodId;
    if (!methodId) {
      return null;
    }
    if (typeof selectedStrain.methodAffinity?.[methodId] === 'number') {
      return selectedStrain.methodAffinity[methodId]!;
    }
    return selectedStrain.compatibility.methodAffinity[methodId] ?? null;
  }, [selectedStrain, zone?.cultivationMethodId]);

  const compatibilityLabel = useMemo(() => {
    if (affinity === null) {
      return zone?.cultivationMethodId
        ? 'No affinity data for this cultivation method.'
        : 'Assign a cultivation method to compute capacity hints.';
    }
    const affinityPct = affinity * 100;
    if (affinityPct >= 95) {
      return `Excellent fit (${formatNumber(affinityPct, { maximumFractionDigits: 0 })}% affinity)`;
    }
    if (affinityPct >= 60) {
      return `Good fit (${formatNumber(affinityPct, { maximumFractionDigits: 0 })}% affinity)`;
    }
    if (affinityPct >= 40) {
      return `Fair fit (${formatNumber(affinityPct, { maximumFractionDigits: 0 })}% affinity)`;
    }
    return `Low affinity (${formatNumber(affinityPct, { maximumFractionDigits: 0 })}%). Consider another strain or method.`;
  }, [affinity, zone?.cultivationMethodId]);

  const exceedsCapacity = useMemo(() => {
    if (capacity === null) {
      return false;
    }
    return count + plantedCount > capacity;
  }, [capacity, count, plantedCount]);

  const handlePlanting = async () => {
    if (!zoneId) {
      setFeedback('Zone context missing. Close the modal and retry.');
      return;
    }
    if (!selectedStrainId) {
      setFeedback('Select a strain to continue.');
      return;
    }
    setBusy(true);
    setFeedback(null);
    setWarnings([]);
    try {
      const response = await bridge.plants.addPlanting({
        zoneId,
        strainId: selectedStrainId,
        count,
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Planting intent rejected by facade.');
        return;
      }
      if (response.warnings?.length) {
        setWarnings(response.warnings);
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to plant zone', error);
      setFeedback('Connection error while planting this zone.');
    } finally {
      setBusy(false);
    }
  };

  if (!zone || !zoneId) {
    return (
      <p className="text-sm text-text-muted">Zone context unavailable. Select a zone and retry.</p>
    );
  }

  if (loading) {
    return <p className="text-sm text-text-muted">Loading strain catalog…</p>;
  }

  if (!strains.length) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-text-muted">No strains available from the facade catalog.</p>
        {feedback ? <Feedback message={feedback} /> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 text-sm">
        <div className="rounded-xl bg-surface-muted/50 p-3 text-xs text-text-muted">
          <span className="block text-text font-semibold">{zone.name}</span>
          <span>
            {formatNumber(zone.area)} m² · {plantedCount} plants active
            {methodHint
              ? ` · ${methodHint.name} (${formatNumber(methodHint.areaPerPlant, {
                  maximumFractionDigits: 2,
                })} m²/plant)`
              : zone.cultivationMethodId
                ? ` · method ${zone.cultivationMethodId}`
                : ' · no cultivation method configured'}
          </span>
          {capacity !== null ? (
            <span className="mt-1 block">
              Capacity {capacity} plants ({remainingCapacity} slots free)
            </span>
          ) : (
            <span className="mt-1 block">Assign a cultivation method to compute capacity.</span>
          )}
        </div>
        <label className="grid gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Strain
          </span>
          <select
            value={selectedStrainId}
            onChange={(event) => setSelectedStrainId(event.target.value)}
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            {strains.map((strain) => (
              <option key={strain.id} value={strain.id}>
                {strain.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Plant count
          </span>
          <input
            type="number"
            min={1}
            value={count}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setCount(Number.isFinite(nextValue) && nextValue > 0 ? Math.floor(nextValue) : 1);
            }}
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          />
          {exceedsCapacity ? (
            <span className="text-xs text-warning">
              Planting {count} plants now would exceed the estimated capacity by{' '}
              {count + plantedCount - (capacity ?? 0)} plants.
            </span>
          ) : (
            <span className="text-xs text-text-muted">
              Remaining capacity estimate: {remainingCapacity}
            </span>
          )}
        </label>
        <p className="text-xs text-text-muted">{compatibilityLabel}</p>
        {methodHint ? <p className="text-xs text-text-muted">{methodHint.description}</p> : null}
      </div>
      {feedback ? <Feedback message={feedback} /> : null}
      {warnings.map((warning) => (
        <Feedback key={warning} message={warning} />
      ))}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handlePlanting}
        confirmLabel={busy ? 'Planting…' : 'Plant zone'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};
