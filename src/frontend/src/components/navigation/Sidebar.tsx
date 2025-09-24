import cx from 'clsx';
import { Icon } from '@/components/common/Icon';
import { Button } from '@/components/primitives/Button';
import { useSimulationStore } from '@/store/simulation';
import { useNavigationStore } from '@/store/navigation';
import { useUIStore } from '@/store/ui';

export const Sidebar = () => {
  const snapshot = useSimulationStore((state) => state.snapshot);
  const {
    selectedStructureId,
    selectedRoomId,
    selectedZoneId,
    openStructure,
    openRoom,
    openZone,
    isSidebarOpen,
    toggleSidebar,
  } = useNavigationStore((state) => ({
    selectedStructureId: state.selectedStructureId,
    selectedRoomId: state.selectedRoomId,
    selectedZoneId: state.selectedZoneId,
    openStructure: state.openStructure,
    openRoom: state.openRoom,
    openZone: state.openZone,
    isSidebarOpen: state.isSidebarOpen,
    toggleSidebar: state.toggleSidebar,
  }));
  const openModal = useUIStore((state) => state.openModal);

  if (!snapshot) {
    return null;
  }

  const content = (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-4 pb-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Structures
        </h2>
        <Button
          variant="ghost"
          size="sm"
          icon={<Icon name="add" />}
          onClick={() =>
            openModal({
              id: 'rent-structure',
              type: 'rentStructure',
              title: 'Rent Structure',
              subtitle: 'Preview footprint, CapEx, and zone templates',
            })
          }
        >
          Rent
        </Button>
      </div>
      <nav className="flex flex-col gap-4 text-sm text-text-muted">
        {snapshot.structures.map((structure) => {
          const rooms = snapshot.rooms.filter((room) => room.structureId === structure.id);
          const isActiveStructure = structure.id === selectedStructureId;
          return (
            <div
              key={structure.id}
              className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-surface-muted/60 p-4"
            >
              <button
                type="button"
                className={cx(
                  'flex items-center justify-between text-left text-text transition hover:text-primary',
                  {
                    'text-primary': isActiveStructure,
                  },
                )}
                onClick={() => openStructure(structure.id)}
              >
                <span className="flex items-center gap-2 text-base font-semibold">
                  <Icon name="domain" />
                  {structure.name}
                </span>
                <Icon name={isActiveStructure ? 'expand_less' : 'expand_more'} />
              </button>
              {isActiveStructure ? (
                <div className="flex flex-col gap-3 border-l border-border/40 pl-4">
                  {rooms.map((room) => {
                    const zones = snapshot.zones.filter((zone) => zone.roomId === room.id);
                    const isActiveRoom = room.id === selectedRoomId;
                    return (
                      <div key={room.id} className="flex flex-col gap-2">
                        <button
                          type="button"
                          className={cx(
                            'flex items-center justify-between text-left transition hover:text-text',
                            {
                              'text-text': isActiveRoom,
                            },
                          )}
                          onClick={() => openRoom(structure.id, room.id)}
                        >
                          <span className="inline-flex items-center gap-2 text-sm font-medium">
                            <Icon name="meeting_room" size={20} />
                            {room.name}
                          </span>
                          <Icon name={isActiveRoom ? 'expand_less' : 'chevron_right'} size={18} />
                        </button>
                        {isActiveRoom ? (
                          <div className="flex flex-col gap-2 pl-5 text-xs">
                            {zones.map((zone) => (
                              <button
                                type="button"
                                key={zone.id}
                                className={cx(
                                  'flex items-center justify-between rounded-lg px-2 py-1 text-left transition',
                                  {
                                    'bg-primary/15 text-primary-strong': zone.id === selectedZoneId,
                                    'hover:bg-surface-elevated/80 hover:text-text':
                                      zone.id !== selectedZoneId,
                                  },
                                )}
                                onClick={() => openZone(structure.id, room.id, zone.id)}
                              >
                                <span className="inline-flex items-center gap-2">
                                  <Icon name="spa" size={18} />
                                  {zone.name}
                                </span>
                                <span className="text-[11px] text-text-muted">
                                  {zone.plants.length} plants
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      <aside
        className={cx(
          'content-area fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-width)] shrink-0 border-r border-border/40 bg-surface-muted/70 backdrop-blur lg:flex',
          'lg:static lg:translate-x-0 lg:opacity-100',
          isSidebarOpen
            ? 'translate-x-0 opacity-100'
            : '-translate-x-full opacity-0 lg:opacity-100',
        )}
      >
        {content}
      </aside>
      <button
        type="button"
        className="fixed left-4 top-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-border/40 bg-surface-elevated/80 text-text shadow-md transition hover:text-primary lg:hidden"
        onClick={() => toggleSidebar()}
        aria-label="Toggle sidebar"
      >
        <Icon name={isSidebarOpen ? 'close' : 'menu'} />
      </button>
      {isSidebarOpen ? (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => toggleSidebar(false)}
        />
      ) : null}
    </>
  );
};
