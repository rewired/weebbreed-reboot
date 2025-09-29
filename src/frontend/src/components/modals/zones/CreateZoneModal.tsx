import { useState } from 'react';
import { ActionFooter, Feedback } from '@/components/modals/common';
import type { SimulationBridge } from '@/facade/systemFacade';
import { useSimulationStore } from '@/store/simulation';
import { formatNumber } from '@/utils/formatNumber';
import {
  CultivationSetupSection,
  useCultivationSetup,
} from '@/components/modals/zones/CultivationSetupSection';

export interface CreateZoneModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}

export const CreateZoneModal = ({ bridge, closeModal, context }: CreateZoneModalProps) => {
  const roomId = typeof context?.roomId === 'string' ? context.roomId : null;
  const room = useSimulationStore((state) =>
    roomId ? (state.snapshot?.rooms.find((item) => item.id === roomId) ?? null) : null,
  );
  const zones = useSimulationStore((state) =>
    roomId ? (state.snapshot?.zones.filter((zone) => zone.roomId === roomId) ?? []) : [],
  );
  const catalogs = useSimulationStore((state) => state.catalogs);
  const [zoneName, setZoneName] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const existingArea = zones.reduce((sum, zone) => sum + zone.area, 0);
  const availableArea = Math.max(0, (room?.area ?? 0) - existingArea);

  const cultivationSetup = useCultivationSetup({
    catalogs,
    availableArea,
    initialArea: 10,
    areaEditable: true,
    minArea: 0.1,
    containerCountMin: 0,
  });

  const {
    selectedMethod,
    selectedContainer,
    selectedSubstrate,
    containerCount,
    substrateVolumeLiters,
    maxContainers,
    containerOverCapacity,
    catalogError,
    area,
  } = cultivationSetup;

  const handleCreate = async () => {
    if (!zoneName.trim()) {
      setFeedback('Zone name is required.');
      return;
    }
    if (!selectedMethod || !selectedContainer || !selectedSubstrate) {
      setFeedback('Catalog data unavailable. Please try again.');
      return;
    }
    if (maxContainers <= 0) {
      setFeedback('Selected container cannot be packed into this area.');
      return;
    }
    if (containerCount <= 0 || containerCount > maxContainers) {
      setFeedback('Container count exceeds the supported capacity.');
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'createZone',
        payload: {
          roomId,
          zone: {
            name: zoneName.trim(),
            area,
            methodId: selectedMethod.id,
            container: {
              blueprintId: selectedContainer.id,
              type: selectedContainer.type,
              count: containerCount,
            },
            substrate: {
              blueprintId: selectedSubstrate.id,
              type: selectedSubstrate.type,
              ...(substrateVolumeLiters && substrateVolumeLiters > 0
                ? { volumeLiters: substrateVolumeLiters }
                : {}),
            },
          },
        },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Zone creation rejected by facade.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to create zone', error);
      setFeedback('Connection error while creating zone.');
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = Boolean(
    !busy &&
      !catalogError &&
      !containerOverCapacity &&
      selectedMethod &&
      selectedContainer &&
      selectedSubstrate &&
      maxContainers > 0 &&
      containerCount > 0 &&
      zoneName.trim() &&
      area > 0,
  );

  if (!room || !roomId) {
    return (
      <p className="text-sm text-text-muted">Room data unavailable. Select a room to add zone.</p>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Zone name
          </span>
          <input
            type="text"
            value={zoneName}
            onChange={(event) => setZoneName(event.target.value)}
            placeholder="Enter zone name"
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          />
        </label>
        <CultivationSetupSection
          setup={cultivationSetup}
          areaEditable
          areaHelperText={`Available: ${formatNumber(availableArea, { maximumFractionDigits: 1 })} m² (room area ${formatNumber(
            room.area,
          )} m²)`}
        />
      </div>
      {catalogError ? <Feedback message={catalogError} /> : null}
      {containerOverCapacity ? (
        <Feedback message="Container count exceeds the supported capacity for this area." />
      ) : null}
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleCreate}
        confirmLabel={busy ? 'Creating…' : 'Create zone'}
        confirmDisabled={!canSubmit}
        cancelDisabled={busy}
      />
    </div>
  );
};
