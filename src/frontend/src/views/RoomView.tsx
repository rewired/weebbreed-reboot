import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/primitives/Badge';
import { useSimulationStore } from '@/store/simulation';
import { useNavigationStore } from '@/store/navigation';
import { useUIStore } from '@/store/ui';

export const RoomView = () => {
  const snapshot = useSimulationStore((state) => state.snapshot);
  const { selectedRoomId, selectedStructureId, openZone } = useNavigationStore((state) => ({
    selectedRoomId: state.selectedRoomId,
    selectedStructureId: state.selectedStructureId,
    openZone: state.openZone,
  }));
  const openModal = useUIStore((state) => state.openModal);

  if (!snapshot || !selectedRoomId || !selectedStructureId) {
    return null;
  }

  const room = snapshot.rooms.find((item) => item.id === selectedRoomId);
  if (!room) {
    return null;
  }

  const zones = snapshot.zones.filter((zone) => zone.roomId === room.id);

  if (room.purposeKind === 'lab') {
    return (
      <div className="grid gap-6">
        <header className="flex flex-col gap-2 rounded-3xl border border-border/40 bg-surface-elevated/80 p-6">
          <span className="text-xs uppercase tracking-wide text-text-muted">Breeding Lab</span>
          <h2 className="text-2xl font-semibold text-text">{room.name}</h2>
          <p className="text-sm text-text-muted">
            Run deterministic crossbreeding experiments. Facade intents: breeding.startRun,
            breeding.abortRun, breeding.finalizeRun.
          </p>
        </header>
        <Card title="Breeding Station" subtitle="Workflow placeholder">
          <p className="text-sm text-text-muted">
            Configure parent strains, target traits, and deterministic seeds. The detailed workflow
            will sync with the breeding facade once telemetry streams are live.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Button
              variant="primary"
              icon={<Icon name="science" />}
              onClick={() =>
                openModal({
                  id: `breeding-${room.id}`,
                  type: 'duplicateRoom',
                  title: 'Configure Breeding Run',
                  subtitle: 'Opens the breeding.startRun modal',
                })
              }
            >
              Start Cross
            </Button>
            <Button
              variant="ghost"
              icon={<Icon name="history" />}
              onClick={() =>
                openModal({
                  id: `breeding-history-${room.id}`,
                  type: 'duplicateRoom',
                  title: 'Run History',
                  subtitle: 'Displays deterministic breeding run history',
                })
              }
            >
              View History
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-2 rounded-3xl border border-border/40 bg-surface-elevated/80 p-6">
        <span className="text-xs uppercase tracking-wide text-text-muted">Room</span>
        <h2 className="text-2xl font-semibold text-text">{room.name}</h2>
        <p className="text-sm text-text-muted">
          {room.area} m² · {zones.length} zones · method {room.purposeName}
        </p>
      </header>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {zones.map((zone) => (
          <Card
            key={zone.id}
            title={zone.name}
            subtitle={`${zone.area} m² · PPFD ${zone.environment.ppfd} µmol`}
            action={
              <Button
                variant="ghost"
                size="sm"
                icon={<Icon name="more_horiz" />}
                onClick={() =>
                  openModal({
                    id: `zone-actions-${zone.id}`,
                    type: 'duplicateRoom',
                    title: `${zone.name} Actions`,
                    subtitle: 'Rename, duplicate, or delete zone blueprint',
                  })
                }
              >
                Actions
              </Button>
            }
          >
            <div className="flex flex-col gap-3 text-sm text-text-muted">
              <div className="flex items-center gap-2 text-text">
                <Icon name="device_thermostat" size={20} />
                <span>
                  {zone.environment.temperature.toFixed(1)}°C · RH{' '}
                  {(zone.environment.relativeHumidity * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="water_drop" size={20} />
                <span>Reservoir {(zone.resources.reservoirLevel * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="park" size={20} />
                <span>
                  {zone.plants.length} plants · Stress {Math.round(zone.metrics.stressLevel * 100)}%
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Badge tone="default">DLI {zone.lighting?.dli ?? 0} mol</Badge>
              <Button
                variant="primary"
                size="sm"
                icon={<Icon name="spa" />}
                onClick={() => openZone(zone.structureId, room.id, zone.id)}
              >
                Open Zone
              </Button>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
};
