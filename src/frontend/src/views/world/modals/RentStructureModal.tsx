import Modal from '@/components/Modal';
import type { RoomSnapshot, StructureSnapshot, ZoneSnapshot } from '@/types/simulation';

type RentStructureModalProps = {
  structure: StructureSnapshot;
  rooms?: RoomSnapshot[];
  zones?: ZoneSnapshot[];
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const RentStructureModal = ({
  structure,
  rooms = [],
  zones = [],
  onConfirm,
  onCancel,
  title,
  description,
}: RentStructureModalProps) => {
  const rentLabel =
    structure.rentPerTick > 0
      ? currencyFormatter.format(structure.rentPerTick)
      : 'Included in tick costs';

  return (
    <Modal
      isOpen
      title={title ?? `Rent ${structure.name}`}
      description={
        description ??
        'Renting a structure unlocks its footprint, rooms, and zones for scheduling. The facade validates availability and ' +
          'applies recurring rent when the contract is accepted.'
      }
      onClose={onCancel}
      size="sm"
      actions={[
        {
          label: 'Cancel',
          onClick: onCancel,
          variant: 'secondary',
        },
        {
          label: 'Rent structure',
          onClick: onConfirm,
          variant: 'primary',
        },
      ]}
    >
      <div className="space-y-4 text-sm text-text-secondary">
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-border/60 bg-surfaceAlt/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">Status</span>
            <span className="font-medium text-text-primary">{structure.status}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">Footprint area</span>
            <span className="font-medium text-text-primary">
              {structure.footprint.area.toLocaleString()} m²
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">
              Footprint volume
            </span>
            <span className="font-medium text-text-primary">
              {structure.footprint.volume.toLocaleString()} m³
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">Rooms available</span>
            <span className="font-medium text-text-primary">{rooms.length.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">Zones available</span>
            <span className="font-medium text-text-primary">{zones.length.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">Rent per tick</span>
            <span className="font-medium text-text-primary">{rentLabel}</span>
          </div>
        </div>
        <p className="text-xs text-text-muted">
          Once confirmed, the facade emits updated finance telemetry reflecting the rental
          agreement. No client-side state is mutated optimistically; the UI waits for the
          acknowledgement tick.
        </p>
      </div>
    </Modal>
  );
};

export type { RentStructureModalProps };
export default RentStructureModal;
