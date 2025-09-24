import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { ModalFrame } from '@/components/modals/ModalFrame';
import { useUIStore } from '@/store/ui';
import type { ModalDescriptor } from '@/store/ui';

const gameMenuItems = [
  { label: 'Save Game', icon: 'save' },
  { label: 'Load Game', icon: 'folder_open' },
  { label: 'Export Save', icon: 'ios_share' },
  { label: 'Reset Session', icon: 'restart_alt' },
] as const;

const ModalContent = ({ type }: { type: ModalDescriptor['type'] }) => {
  switch (type) {
    case 'gameMenu':
      return (
        <div className="grid gap-3">
          {gameMenuItems.map((item) => (
            <Button key={item.label} variant="secondary" icon={<Icon name={item.icon} />}>
              {item.label}
            </Button>
          ))}
        </div>
      );
    case 'loadGame':
      return (
        <p>
          Load game slots will be populated once the backend exposes deterministic save headers.
          Select a slot to request
          <code className="ml-1 rounded bg-surface-muted/80 px-2 py-1 text-xs">
            systemFacade.loadSave
          </code>
          .
        </p>
      );
    case 'importGame':
      return (
        <p>
          Import a JSON save exported from Weedbreed.AI. Files are validated against the blueprint
          schema before the
          <code className="ml-1 rounded bg-surface-muted/80 px-2 py-1 text-xs">
            sim.restoreSnapshot
          </code>{' '}
          intent is dispatched.
        </p>
      );
    case 'newGame':
      return (
        <p>
          Starting a new game clears the deterministic seed and replays Quick Start provisioning.
          This mirrors the
          <code className="ml-1 rounded bg-surface-muted/80 px-2 py-1 text-xs">
            world.createGame
          </code>{' '}
          facade command.
        </p>
      );
    case 'notifications':
      return (
        <div className="grid gap-3">
          <p className="text-text-muted">
            Notification center groups events from <code>sim.*</code>, <code>world.*</code>, and{' '}
            <code>finance.*</code>. Tabs and pagination are stubbed until real telemetry streams are
            wired.
          </p>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-muted/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <Icon name="warning" className="text-warning" />
                <div className="flex flex-col">
                  <span className="font-semibold text-text">
                    Dehumidifier maintenance approaching
                  </span>
                  <span className="text-xs text-text-muted">
                    Zone North Canopy · 3 ticks remaining
                  </span>
                </div>
              </div>
              <Button size="sm" variant="ghost">
                Acknowledge
              </Button>
            </div>
          </div>
        </div>
      );
    case 'rentStructure':
      return (
        <p>
          Renting a new structure dispatches <code>world.rentStructure</code> with the selected
          blueprint. Costs are quoted in simulated EUR per tick.
        </p>
      );
    case 'duplicateStructure':
      return (
        <p>
          Duplicating a structure prepares a modal summary of footprint, zone count, and CapEx
          estimate before executing
          <code className="ml-1 rounded bg-surface-muted/80 px-2 py-1 text-xs">
            world.duplicateStructure
          </code>
          .
        </p>
      );
    case 'duplicateRoom':
      return (
        <p>
          Room duplication confirms device inventory and zone replication counts before calling
          <code className="ml-1 rounded bg-surface-muted/80 px-2 py-1 text-xs">
            world.duplicateRoom
          </code>
          .
        </p>
      );
    default:
      return null;
  }
};

export const ModalHost = () => {
  const activeModal = useUIStore((state) => state.activeModal);
  const closeModal = useUIStore((state) => state.closeModal);

  if (!activeModal) {
    return null;
  }

  return (
    <ModalFrame title={activeModal.title} subtitle={activeModal.subtitle} onClose={closeModal}>
      <ModalContent type={activeModal.type} />
    </ModalFrame>
  );
};
