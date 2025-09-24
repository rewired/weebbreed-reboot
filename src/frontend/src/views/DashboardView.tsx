import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/primitives/Badge';
import { useSimulationStore } from '@/store/simulation';
import { useNavigationStore } from '@/store/navigation';
import { useUIStore } from '@/store/ui';

export const DashboardView = () => {
  const snapshot = useSimulationStore((state) => state.snapshot);
  const openStructure = useNavigationStore((state) => state.openStructure);
  const openModal = useUIStore((state) => state.openModal);

  if (!snapshot) {
    return null;
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text">Structure Overview</h2>
        <Button
          variant="secondary"
          icon={<Icon name="domain" />}
          onClick={() =>
            openModal({
              id: 'rent-structure',
              type: 'rentStructure',
              title: 'Rent Structure',
              subtitle: 'Preview CapEx, zone templates, and rent per tick',
            })
          }
        >
          Rent Structure
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.structures.map((structure) => {
          const rooms = snapshot.rooms.filter((room) => room.structureId === structure.id);
          const zones = snapshot.zones.filter((zone) => zone.structureId === structure.id);
          const plantCount = zones.reduce((sum, zone) => sum + zone.plants.length, 0);
          return (
            <Card
              key={structure.id}
              title={structure.name}
              subtitle={`${structure.footprint.area.toLocaleString()} m² · ${rooms.length} rooms`}
              action={
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Icon name="content_copy" size={18} />}
                    onClick={() =>
                      openModal({
                        id: `duplicate-${structure.id}`,
                        type: 'duplicateStructure',
                        title: `Duplicate ${structure.name}`,
                        subtitle: 'Review device coverage and CapEx before duplicating',
                      })
                    }
                  >
                    Duplicate
                  </Button>
                </div>
              }
              className="bg-surface-elevated/80"
            >
              <div className="flex flex-col gap-3 text-sm text-text-muted">
                <div className="flex items-center gap-2 text-text">
                  <Icon name="account_tree" size={20} />
                  <span>{zones.length} zones provisioned</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="query_stats" size={20} />
                  <span>{plantCount} plants planned</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="euro_symbol" size={20} />
                  <span>Rent per tick €{structure.rentPerTick.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Badge tone="success">Operational</Badge>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Icon name="open_in_new" />}
                  onClick={() => openStructure(structure.id)}
                >
                  Enter
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
