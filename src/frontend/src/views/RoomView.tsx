import { useMemo } from 'react';
import { Card } from '@/components/primitives/Card';
import { Button, IconButton } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/primitives/Badge';
import { useSimulationStore } from '@/store/simulation';
import { useNavigationStore } from '@/store/navigation';
import { useUIStore } from '@/store/ui';
import { formatNumber } from '@/utils/formatNumber';

export const RoomView = () => {
  const { snapshot, catalogs } = useSimulationStore((state) => ({
    snapshot: state.snapshot,
    catalogs: state.catalogs,
  }));
  const { selectedRoomId, selectedStructureId, openZone } = useNavigationStore((state) => ({
    selectedRoomId: state.selectedRoomId,
    selectedStructureId: state.selectedStructureId,
    openZone: state.openZone,
  }));
  const openModal = useUIStore((state) => state.openModal);

  const cultivationMethodLookup = useMemo(() => {
    const entries = catalogs.cultivationMethods.data;
    return new Map(entries.map((entry) => [entry.id, entry.name]));
  }, [catalogs.cultivationMethods.data]);

  const substrateLookup = useMemo(() => {
    const entries = catalogs.substrates.data;
    return new Map(entries.map((entry) => [entry.id, entry.name]));
  }, [catalogs.substrates.data]);

  if (!snapshot || !selectedRoomId || !selectedStructureId) {
    return null;
  }

  const room = snapshot.rooms.find((item) => item.id === selectedRoomId);
  if (!room) {
    return null;
  }

  const zones = snapshot.zones.filter((zone) => zone.roomId === room.id);

  const resolveMethodLabel = (methodId: string): string => {
    if (!methodId) {
      return '—';
    }
    const label = cultivationMethodLookup.get(methodId);
    if (label) {
      return label;
    }
    return catalogs.cultivationMethods.status === 'loading' ? 'Loading method…' : methodId;
  };

  const resolveSubstrateLabel = (
    substrate?: NonNullable<(typeof zones)[number]['cultivation']>['substrate'],
  ): string => {
    if (!substrate) {
      return catalogs.substrates.status === 'loading' ? 'Loading substrate…' : '—';
    }
    const label = substrateLookup.get(substrate.blueprintId);
    if (label) {
      return label;
    }
    return substrate.slug ?? substrate.type ?? substrate.blueprintId;
  };

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
          {formatNumber(room.area)} m² · {zones.length} zones · method {room.purposeName}
        </p>
      </header>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {zones.map((zone) => (
          <Card
            key={zone.id}
            title={zone.name}
            subtitle={`${formatNumber(zone.area)} m² · PPFD ${formatNumber(zone.environment.ppfd)} µmol`}
            action={
              <div className="flex items-center gap-2">
                <IconButton
                  size="sm"
                  aria-label={`Duplicate ${zone.name}`}
                  onClick={() =>
                    openModal({
                      id: `duplicate-zone-${zone.id}`,
                      type: 'duplicateZone',
                      title: 'Duplicate zone',
                      subtitle: `Clone ${zone.name} with its cultivation setup`,
                      context: { zoneId: zone.id },
                    })
                  }
                >
                  <Icon name="content_copy" />
                </IconButton>
                <IconButton
                  size="sm"
                  aria-label={`Delete ${zone.name}`}
                  onClick={() =>
                    openModal({
                      id: `delete-zone-${zone.id}`,
                      type: 'deleteZone',
                      title: 'Remove zone',
                      subtitle: `Delete ${zone.name} from ${room.name}`,
                      context: { zoneId: zone.id },
                    })
                  }
                >
                  <Icon name="delete" />
                </IconButton>
              </div>
            }
          >
            <div className="flex flex-col gap-3 text-sm text-text-muted">
              <div className="flex items-center gap-2 text-text">
                <Icon name="device_thermostat" size={20} />
                <span>
                  {formatNumber(zone.environment.temperature, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                  °C · RH{' '}
                  {formatNumber(zone.environment.relativeHumidity * 100, {
                    maximumFractionDigits: 0,
                  })}
                  %
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="science" size={20} />
                <span className="text-text">
                  Method {resolveMethodLabel(zone.cultivationMethodId)} · Substrate{' '}
                  {resolveSubstrateLabel(zone.cultivation?.substrate)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="park" size={20} />
                <span>
                  {zone.plants.length} plants · Stress{' '}
                  {formatNumber(zone.metrics.stressLevel * 100, { maximumFractionDigits: 0 })}%
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Badge tone="default">
                DLI {formatNumber(zone.lighting?.dli ?? 0, { maximumFractionDigits: 2 })} mol
              </Badge>
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
        <Card
          title="Add Zone"
          subtitle="Create a new cultivation zone"
          className="flex items-center justify-center border-dashed border-primary/30"
        >
          <Button
            variant="primary"
            icon={<Icon name="add" />}
            onClick={() =>
              openModal({
                id: `add-zone-${room.id}`,
                type: 'createZone',
                title: 'Add Zone',
                subtitle: `Create a new zone in ${room.name}`,
                context: { roomId: room.id },
              })
            }
          >
            Add Zone
          </Button>
        </Card>
      </section>
    </div>
  );
};
