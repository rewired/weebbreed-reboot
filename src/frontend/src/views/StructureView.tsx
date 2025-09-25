import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/primitives/Badge';
import { useSimulationStore } from '@/store/simulation';
import { useNavigationStore } from '@/store/navigation';
import { useUIStore } from '@/store/ui';

export const StructureView = () => {
  const snapshot = useSimulationStore((state) => state.snapshot);
  const { selectedStructureId, openRoom } = useNavigationStore((state) => ({
    selectedStructureId: state.selectedStructureId,
    openRoom: state.openRoom,
  }));
  const openModal = useUIStore((state) => state.openModal);

  if (!snapshot || !selectedStructureId) {
    return null;
  }

  const structure = snapshot.structures.find((item) => item.id === selectedStructureId);
  if (!structure) {
    return null;
  }

  const rooms = snapshot.rooms.filter((room) => room.structureId === structure.id);

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-border/40 bg-surface-elevated/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-text-muted">Structure</span>
            <h2 className="text-2xl font-semibold text-text">{structure.name}</h2>
            <p className="text-sm text-text-muted">
              {structure.footprint.area} m² · {rooms.length} rooms · {structure.footprint.volume} m³
              volume
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              icon={<Icon name="edit" />}
              onClick={() =>
                openModal({
                  id: `rename-${structure.id}`,
                  type: 'renameStructure',
                  title: 'Rename Structure',
                  subtitle: 'Names persist once world.renameStructure succeeds',
                  context: { structureId: structure.id, currentName: structure.name },
                })
              }
            >
              Rename
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<Icon name="delete" />}
              onClick={() =>
                openModal({
                  id: `delete-${structure.id}`,
                  type: 'deleteStructure',
                  title: 'Remove Structure',
                  subtitle: 'Confirm removal before dispatching world.deleteStructure',
                  context: { structureId: structure.id },
                })
              }
            >
              Delete
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="success">Operational</Badge>
          <Badge tone="default">Rent €{structure.rentPerTick.toLocaleString()} / tick</Badge>
        </div>
      </header>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => {
          const zones = snapshot.zones.filter((zone) => zone.roomId === room.id);
          return (
            <Card
              key={room.id}
              title={room.name}
              subtitle={`${zones.length} zones · ${room.area} m²`}
              action={
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Icon name="content_copy" size={18} />}
                    onClick={() =>
                      openModal({
                        id: `duplicate-room-${room.id}`,
                        type: 'duplicateRoom',
                        title: `Duplicate ${room.name}`,
                        subtitle: 'Review device inventory before duplicating',
                        context: { roomId: room.id },
                      })
                    }
                  >
                    Duplicate
                  </Button>
                </div>
              }
            >
              <div className="flex flex-col gap-3 text-sm text-text-muted">
                <div className="flex items-center gap-2 text-text">
                  <Icon name="biotech" size={20} />
                  <span>{room.purposeName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="grid_view" size={20} />
                  <span>{zones.length} zones configured</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="science" size={20} />
                  <span>Maintenance {Math.round(room.maintenanceLevel * 100)}%</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Badge tone="default">Cleanliness {Math.round(room.cleanliness * 100)}%</Badge>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Icon name="meeting_room" />}
                  onClick={() => openRoom(structure.id, room.id)}
                >
                  Open
                </Button>
              </div>
            </Card>
          );
        })}
        <Card
          title="Add Room"
          subtitle="Provision deterministic layouts from blueprints"
          action={
            <Button
              size="sm"
              variant="ghost"
              icon={<Icon name="add" />}
              onClick={() =>
                openModal({
                  id: `add-room-${structure.id}`,
                  type: 'duplicateRoom',
                  title: 'Add Room',
                  subtitle: 'Select blueprint, area, and device presets',
                })
              }
            >
              Configure
            </Button>
          }
          className="border-dashed border-border/40 bg-surface-muted/40 text-text-muted"
        >
          <p className="text-sm">
            Rooms orchestrate zone grids, climate budgets, and staffing allowances.
          </p>
        </Card>
      </section>
    </div>
  );
};
