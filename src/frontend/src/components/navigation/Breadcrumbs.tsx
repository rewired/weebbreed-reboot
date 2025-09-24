import { Icon } from '@/components/common/Icon';
import { useNavigationStore } from '@/store/navigation';
import { useSimulationStore } from '@/store/simulation';

export const Breadcrumbs = () => {
  const {
    currentView,
    selectedStructureId,
    selectedRoomId,
    selectedZoneId,
    goToStructures,
    goToStructure,
    goToRoom,
  } = useNavigationStore((state) => ({
    currentView: state.currentView,
    selectedStructureId: state.selectedStructureId,
    selectedRoomId: state.selectedRoomId,
    selectedZoneId: state.selectedZoneId,
    goToStructures: state.goToStructures,
    goToStructure: state.goToStructure,
    goToRoom: state.goToRoom,
  }));
  const snapshot = useSimulationStore((state) => state.snapshot);

  if (!snapshot) {
    return null;
  }

  const structure = snapshot.structures.find((item) => item.id === selectedStructureId);
  const room = snapshot.rooms.find((item) => item.id === selectedRoomId);
  const zone = snapshot.zones.find((item) => item.id === selectedZoneId);

  return (
    <nav className="flex items-center gap-2 text-sm text-text-muted" aria-label="Breadcrumb">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-text-muted transition hover:text-text"
        onClick={goToStructures}
      >
        <Icon name="home" size={20} />
        Structures
      </button>
      {structure ? (
        <>
          <span className="opacity-60">/</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-text-muted transition hover:text-text"
            onClick={() => goToStructure(structure.id)}
          >
            <Icon name="domain" size={20} />
            {structure.name}
          </button>
        </>
      ) : null}
      {room ? (
        <>
          <span className="opacity-60">/</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-text-muted transition hover:text-text"
            onClick={() => goToRoom(room.id)}
          >
            <Icon name="meeting_room" size={20} />
            {room.name}
          </button>
        </>
      ) : null}
      {zone ? (
        <>
          <span className="opacity-60">/</span>
          <span className="inline-flex items-center gap-1 text-text">
            <Icon name="spa" size={20} />
            {zone.name}
          </span>
        </>
      ) : null}
      <span className="ml-auto inline-flex items-center gap-2 text-xs">
        <Icon
          name={
            currentView === 'zone'
              ? 'location_searching'
              : currentView === 'room'
                ? 'map'
                : 'account_tree'
          }
          size={18}
        />
        {currentView === 'dashboard' && 'Structure overview'}
        {currentView === 'structure' && structure?.name}
        {currentView === 'room' && room?.name}
        {currentView === 'zone' && zone?.name}
      </span>
    </nav>
  );
};
