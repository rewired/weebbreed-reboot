import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { ModalFrame } from '@/components/modals/ModalFrame';
import type { StructureBlueprint, SimulationBridge } from '@/facade/systemFacade';
import { HireModal } from '@/components/personnel/HireModal';
import { FireModal } from '@/components/personnel/FireModal';
import { useUIStore } from '@/store/ui';
import type { ModalDescriptor } from '@/store/ui';
import { useSimulationStore } from '@/store/simulation';
import { useNavigationStore } from '@/store/navigation';
import { ModifierInputs } from '../modifiers/ModifierInputs';
import { DifficultyModifiers } from '../../types/difficulty';
import { useDifficultyConfig } from '@/hooks/useDifficultyConfig';

interface ModalHostProps {
  bridge: SimulationBridge;
}

const Feedback = ({ message }: { message: string }) => (
  <p className="text-sm text-warning">{message}</p>
);

const ActionFooter = ({
  onCancel,
  onConfirm,
  confirmLabel,
  confirmDisabled,
  cancelDisabled,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmDisabled: boolean;
  cancelDisabled: boolean;
}) => (
  <div className="flex justify-end gap-2">
    <Button variant="ghost" onClick={onCancel} disabled={cancelDisabled}>
      Cancel
    </Button>
    <Button variant="primary" onClick={onConfirm} disabled={confirmDisabled}>
      {confirmLabel}
    </Button>
  </div>
);

const RentStructureModal = ({
  bridge,
  closeModal,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
}) => {
  const [blueprints, setBlueprints] = useState<StructureBlueprint[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load structure blueprints from backend
  useEffect(() => {
    const loadBlueprints = async () => {
      try {
        const response = await bridge.getStructureBlueprints();
        if (response.ok && response.data) {
          setBlueprints(response.data);
          if (response.data.length > 0) {
            setSelected(response.data[0].id);
          }
        } else {
          setFeedback('Failed to load structure blueprints from backend.');
        }
      } catch (error) {
        console.error('Failed to load structure blueprints:', error);
        setFeedback('Connection error while loading structure blueprints.');
      } finally {
        setLoading(false);
      }
    };

    loadBlueprints();
  }, [bridge]);

  const handleRent = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'rentStructure',
        payload: { structureId: selected },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Unable to rent structure.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to rent structure', error);
      setFeedback('Connection error while dispatching rent intent.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-text-muted">Loading structure blueprints...</p>
      </div>
    );
  }

  if (blueprints.length === 0) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-text-muted">No structure blueprints available.</p>
        {feedback ? <Feedback message={feedback} /> : null}
        <ActionFooter
          onCancel={closeModal}
          onConfirm={() => {}}
          confirmLabel="Close"
          confirmDisabled={true}
          cancelDisabled={false}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Select a deterministic blueprint to rent. The facade validates availability and applies rent
        per tick once the command succeeds.
      </p>
      <div className="grid gap-3">
        {blueprints.map((blueprint) => {
          const area = blueprint.footprint.length * blueprint.footprint.width;
          return (
            <label
              key={blueprint.id}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/50 bg-surface-muted/60 p-4 transition hover:border-primary"
            >
              <input
                type="radio"
                className="mt-1 size-4 shrink-0 accent-primary"
                name="structure-blueprint"
                value={blueprint.id}
                checked={selected === blueprint.id}
                onChange={() => setSelected(blueprint.id)}
              />
              <div className="flex flex-col gap-1 text-left">
                <span className="text-sm font-semibold text-text">{blueprint.name}</span>
                <span className="text-xs text-text-muted">
                  {area.toLocaleString()} m² · Upfront €{blueprint.upfrontFee.toLocaleString()} ·
                  Rent €{blueprint.rentalCostPerSqmPerMonth}/m²·month
                </span>
                <span className="text-xs text-text-muted/80">
                  {blueprint.footprint.length}m × {blueprint.footprint.width}m ×{' '}
                  {blueprint.footprint.height}m
                </span>
              </div>
            </label>
          );
        })}
      </div>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleRent}
        confirmLabel={busy ? 'Renting…' : 'Rent structure'}
        confirmDisabled={busy || !selected}
        cancelDisabled={busy}
      />
    </div>
  );
};

const DuplicateStructureModal = ({
  bridge,
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const structureId = typeof context?.structureId === 'string' ? context.structureId : null;
  const structure = useSimulationStore((state) =>
    structureId
      ? (state.snapshot?.structures.find((item) => item.id === structureId) ?? null)
      : null,
  );
  const rooms = useSimulationStore((state) =>
    structureId
      ? (state.snapshot?.rooms.filter((room) => room.structureId === structureId) ?? [])
      : [],
  );
  const zones = useSimulationStore((state) =>
    structureId
      ? (state.snapshot?.zones.filter((zone) => zone.structureId === structureId) ?? [])
      : [],
  );
  const openStructure = useNavigationStore((state) => state.openStructure);
  const [nameOverride, setNameOverride] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!structure || !structureId) {
    return (
      <p className="text-sm text-text-muted">
        Structure data unavailable. Select a structure before duplicating.
      </p>
    );
  }

  const handleDuplicate = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const payload: Record<string, unknown> = { structureId };
      if (nameOverride.trim()) {
        payload.name = nameOverride.trim();
      }
      const response = await bridge.sendIntent<{ structureId?: string }>({
        domain: 'world',
        action: 'duplicateStructure',
        payload,
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Duplication rejected by facade.');
        return;
      }
      const newId = response.data?.structureId;
      if (newId) {
        openStructure(newId);
      }
      closeModal();
    } catch (error) {
      console.error('Failed to duplicate structure', error);
      setFeedback('Connection error while duplicating structure.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-1 text-sm text-text-muted">
        <span className="font-medium text-text">{structure.name}</span>
        <span>
          {rooms.length} rooms · {zones.length} zones · Rent €
          {structure.rentPerTick.toLocaleString()} per tick
        </span>
      </div>
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Duplicate as
        </span>
        <input
          type="text"
          value={nameOverride}
          onChange={(event) => setNameOverride(event.target.value)}
          placeholder="Leave empty to keep generated name"
          className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
        />
      </label>
      <p className="text-xs text-text-muted">
        The facade replicates geometry, rooms, zones, and device placement. Costs are applied on
        commit; no optimistic updates are rendered.
      </p>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleDuplicate}
        confirmLabel={busy ? 'Duplicating…' : 'Duplicate structure'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};

const RenameStructureModal = ({
  bridge,
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const structureId = typeof context?.structureId === 'string' ? context.structureId : null;
  const currentName = typeof context?.currentName === 'string' ? context.currentName : '';
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!structureId) {
    return (
      <p className="text-sm text-text-muted">Select a structure before attempting to rename.</p>
    );
  }

  const handleRename = async () => {
    if (!name.trim()) {
      setFeedback('Name cannot be empty.');
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'renameStructure',
        payload: { structureId, name: name.trim() },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Rename rejected by facade.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to rename structure', error);
      setFeedback('Connection error while renaming structure.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Structure name
        </span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
        />
      </label>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleRename}
        confirmLabel={busy ? 'Renaming…' : 'Rename structure'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};

const DeleteStructureModal = ({
  bridge,
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const structureId = typeof context?.structureId === 'string' ? context.structureId : null;
  const structure = useSimulationStore((state) =>
    structureId
      ? (state.snapshot?.structures.find((item) => item.id === structureId) ?? null)
      : null,
  );
  const goToStructures = useNavigationStore((state) => state.goToStructures);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!structure || !structureId) {
    return (
      <p className="text-sm text-text-muted">
        Structure data unavailable. Select a structure to remove.
      </p>
    );
  }

  const handleDelete = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'deleteStructure',
        payload: { structureId },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Deletion rejected by facade.');
        return;
      }
      goToStructures();
      closeModal();
    } catch (error) {
      console.error('Failed to delete structure', error);
      setFeedback('Connection error while deleting structure.');
    } finally {
      setBusy(false);
    }
  };

  const confirmMatches = confirmation.trim() === structure.name;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Removing <span className="font-semibold text-text">{structure.name}</span> releases all
        rooms and zones. Type the structure name to confirm.
      </p>
      <input
        type="text"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        placeholder={structure.name}
        className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
      />
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleDelete}
        confirmLabel={busy ? 'Removing…' : 'Remove structure'}
        confirmDisabled={!confirmMatches || busy}
        cancelDisabled={busy}
      />
    </div>
  );
};

const CreateRoomModal = ({
  bridge,
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const structureId = typeof context?.structureId === 'string' ? context.structureId : null;
  const structure = useSimulationStore((state) =>
    structureId
      ? (state.snapshot?.structures.find((item) => item.id === structureId) ?? null)
      : null,
  );
  const rooms = useSimulationStore((state) =>
    structureId
      ? (state.snapshot?.rooms.filter((room) => room.structureId === structureId) ?? [])
      : [],
  );
  const [roomName, setRoomName] = useState('');
  const [purpose, setPurpose] = useState('Grow Room');
  const [area, setArea] = useState(50);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!structure || !structureId) {
    return (
      <p className="text-sm text-text-muted">
        Structure data unavailable. Select a structure to add room.
      </p>
    );
  }

  const handleCreate = async () => {
    if (!roomName.trim()) {
      setFeedback('Room name is required.');
      return;
    }
    if (area > availableArea) {
      setFeedback(`Room area (${area} m²) exceeds available space (${availableArea} m²).`);
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'createRoom',
        payload: {
          structureId,
          room: {
            name: roomName.trim(),
            purpose,
            area,
          },
        },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Room creation rejected by facade.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to create room', error);
      setFeedback('Connection error while creating room.');
    } finally {
      setBusy(false);
    }
  };

  const purposeOptions = [
    { id: 'Grow Room', name: 'Grow Room', description: 'Cultivation and plant management' },
    { id: 'Laboratory', name: 'Laboratory', description: 'Breeding and research activities' },
    { id: 'Break Room', name: 'Break Room', description: 'Staff rest and recovery' },
    { id: 'Sales Room', name: 'Sales Room', description: 'Commercial product sales' },
  ];

  const existingRoomArea = rooms.reduce((sum, room) => sum + room.area, 0);
  const availableArea = Math.max(0, structure.footprint.area - existingRoomArea);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Room name
          </span>
          <input
            type="text"
            value={roomName}
            onChange={(event) => setRoomName(event.target.value)}
            placeholder="Enter room name"
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Purpose
          </span>
          <select
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            {purposeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} - {option.description}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Area (m²)
          </span>
          <input
            type="number"
            value={area}
            onChange={(event) => setArea(Number(event.target.value))}
            min="1"
            max={availableArea}
            step="1"
            className={`w-full rounded-lg border px-3 py-2 text-sm text-text focus:outline-none ${
              area > availableArea
                ? 'border-red-500 bg-red-50 focus:border-red-500'
                : 'border-border/60 bg-surface-muted/50 focus:border-primary'
            }`}
          />
          <span className={`text-xs ${area > availableArea ? 'text-red-600' : 'text-text-muted'}`}>
            Available: {availableArea.toFixed(0)} m² (structure footprint:{' '}
            {structure.footprint.area} m²)
          </span>
        </label>
      </div>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleCreate}
        confirmLabel={busy ? 'Creating…' : 'Create room'}
        confirmDisabled={busy || area > availableArea}
        cancelDisabled={busy}
      />
    </div>
  );
};

const DuplicateRoomModal = ({
  bridge,
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const roomId = typeof context?.roomId === 'string' ? context.roomId : null;
  const room = useSimulationStore((state) =>
    roomId ? (state.snapshot?.rooms.find((item) => item.id === roomId) ?? null) : null,
  );
  const zones = useSimulationStore((state) =>
    roomId ? (state.snapshot?.zones.filter((zone) => zone.roomId === roomId) ?? []) : [],
  );
  const openRoom = useNavigationStore((state) => state.openRoom);
  const [nameOverride, setNameOverride] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!room || !roomId) {
    return (
      <p className="text-sm text-text-muted">Room data unavailable. Select a room to duplicate.</p>
    );
  }

  const handleDuplicate = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const payload: Record<string, unknown> = { roomId };
      if (nameOverride.trim()) {
        payload.name = nameOverride.trim();
      }
      const response = await bridge.sendIntent<{ roomId?: string }>({
        domain: 'world',
        action: 'duplicateRoom',
        payload,
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Duplication rejected by facade.');
        return;
      }
      const newRoomId = response.data?.roomId;
      if (newRoomId) {
        openRoom(room.structureId, newRoomId);
      }
      closeModal();
    } catch (error) {
      console.error('Failed to duplicate room', error);
      setFeedback('Connection error while duplicating room.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-1 text-sm text-text-muted">
        <span className="font-medium text-text">{room.name}</span>
        <span>
          {zones.length} zones · {room.area} m² · Purpose {room.purposeName}
        </span>
      </div>
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Duplicate as
        </span>
        <input
          type="text"
          value={nameOverride}
          onChange={(event) => setNameOverride(event.target.value)}
          placeholder="Leave empty to auto-name"
          className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
        />
      </label>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleDuplicate}
        confirmLabel={busy ? 'Duplicating…' : 'Duplicate room'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};

const RecruitStaffModal = ({
  bridge,
  closeModal,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleRecruit = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'workforce',
        action: 'generateApplicants',
        payload: { count: 5 },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Failed to recruit new staff.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to recruit staff', error);
      setFeedback('Connection error while recruiting staff.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Generate new job applicants for available positions. The workforce engine will create
        candidates with randomized skills, traits, and salary expectations based on current company
        needs.
      </p>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleRecruit}
        confirmLabel={busy ? 'Recruiting…' : 'Generate Applicants'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};

const RejectApplicantModal = ({
  bridge,
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const applicantId = typeof context?.applicantId === 'string' ? context.applicantId : null;
  const applicant = useSimulationStore((state) =>
    applicantId
      ? (state.snapshot?.personnel.applicants.find((item) => item.id === applicantId) ?? null)
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!applicant || !applicantId) {
    return (
      <p className="text-sm text-text-muted">
        Applicant data unavailable. Select an applicant to reject.
      </p>
    );
  }

  const handleReject = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'workforce',
        action: 'rejectApplicant',
        payload: { applicantId },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Rejection failed.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to reject applicant', error);
      setFeedback('Connection error while rejecting applicant.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Reject <span className="font-semibold text-text">{applicant.name}</span>'s application for
        the {applicant.desiredRole} position. They will be removed from the applicant pool.
      </p>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleReject}
        confirmLabel={busy ? 'Rejecting…' : 'Reject Applicant'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};

const EmployeeDetailsModal = ({
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const employeeId = typeof context?.employeeId === 'string' ? context.employeeId : null;
  const employee = useSimulationStore((state) =>
    employeeId
      ? (state.snapshot?.personnel.employees.find((item) => item.id === employeeId) ?? null)
      : null,
  );

  if (!employee || !employeeId) {
    return (
      <p className="text-sm text-text-muted">
        Employee data unavailable. Select an employee to view details.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted">Employee ID</span>
          <span className="font-mono text-xs text-text">{employee.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Role</span>
          <span className="font-medium text-text">{employee.role}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Status</span>
          <span className="font-medium text-text">
            {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Salary</span>
          <span className="font-medium text-text">€{employee.salaryPerTick}/tick</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Morale</span>
          <span className="font-medium text-text">{Math.round(employee.morale * 100)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Energy</span>
          <span className="font-medium text-text">{Math.round(employee.energy * 100)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Max Work Time</span>
          <span className="font-medium text-text">{employee.maxMinutesPerTick} min/tick</span>
        </div>
        {employee.assignedStructureId && (
          <div className="flex justify-between">
            <span className="text-text-muted">Assigned Structure</span>
            <span className="font-mono text-xs text-text">{employee.assignedStructureId}</span>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button variant="primary" onClick={closeModal}>
          Close
        </Button>
      </div>
    </div>
  );
};

const CreateZoneModal = ({
  bridge,
  closeModal,
  context,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}) => {
  const roomId = typeof context?.roomId === 'string' ? context.roomId : null;
  const room = useSimulationStore((state) =>
    roomId ? (state.snapshot?.rooms.find((item) => item.id === roomId) ?? null) : null,
  );
  const zones = useSimulationStore((state) =>
    roomId ? (state.snapshot?.zones.filter((zone) => zone.roomId === roomId) ?? []) : [],
  );
  const [zoneName, setZoneName] = useState('');
  const [methodId, setMethodId] = useState('85cc0916-0e8a-495e-af8f-50291abe6855'); // Default to Basic Soil Pot
  const [area, setArea] = useState(10);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!room || !roomId) {
    return (
      <p className="text-sm text-text-muted">Room data unavailable. Select a room to add zone.</p>
    );
  }

  const handleCreate = async () => {
    if (!zoneName.trim()) {
      setFeedback('Zone name is required.');
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
            methodId,
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

  const cultivationMethods = [
    {
      id: '85cc0916-0e8a-495e-af8f-50291abe6855',
      name: 'Basic Soil Pot',
      description: 'Simple cultivation method: one plant per pot in soil',
    },
    {
      id: '41229377-ef2d-4723-931f-72eea87d7a62',
      name: 'Screen of Green',
      description: 'Low-density method using screens to train plants horizontally',
    },
    {
      id: '659ba4d7-a5fc-482e-98d4-b614341883ac',
      name: 'Sea of Green',
      description: 'High-density method with many small plants close together',
    },
  ];

  const existingArea = zones.reduce((sum, zone) => sum + zone.area, 0);
  const availableArea = Math.max(0, room.area - existingArea);

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
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Cultivation Method
          </span>
          <select
            value={methodId}
            onChange={(event) => setMethodId(event.target.value)}
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            {cultivationMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name} - {method.description}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Area (m²)
          </span>
          <input
            type="number"
            value={area}
            onChange={(event) => setArea(Number(event.target.value))}
            min="0.1"
            max={availableArea}
            step="0.1"
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          />
          <span className="text-xs text-text-muted">
            Available: {availableArea.toFixed(1)} m² (room area: {room.area} m²)
          </span>
        </label>
      </div>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleCreate}
        confirmLabel={busy ? 'Creating…' : 'Create zone'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};

const NewGameModal = ({
  bridge,
  closeModal,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'normal' | 'hard'>(
    'normal',
  );
  const [customModifiers, setCustomModifiers] = useState<DifficultyModifiers | null>(null);
  const enterDashboard = useNavigationStore((state) => state.enterDashboard);

  const {
    config: difficultyConfig,
    loading: difficultyLoading,
    error: difficultyError,
    refresh: reloadDifficultyConfig,
  } = useDifficultyConfig();

  const difficultyOptions = useMemo(() => {
    if (!difficultyConfig) {
      return [] as Array<{
        id: 'easy' | 'normal' | 'hard';
        name: string;
        description: string;
        initialCapital: string;
        color: string;
      }>;
    }
    return Object.entries(difficultyConfig).map(([key, config]) => ({
      id: key as 'easy' | 'normal' | 'hard',
      name: config.name,
      description: config.description,
      initialCapital: `€${(config.modifiers.economics.initialCapital / 1_000_000).toFixed(1)}M`,
      color:
        key === 'easy' ? 'text-green-600' : key === 'normal' ? 'text-yellow-600' : 'text-red-600',
    }));
  }, [difficultyConfig]);

  const selectedPreset = difficultyConfig?.[selectedDifficulty];

  useEffect(() => {
    if (selectedPreset) {
      setCustomModifiers(selectedPreset.modifiers);
    }
  }, [selectedPreset]);

  const handleDifficultyChange = (difficultyId: 'easy' | 'normal' | 'hard') => {
    setSelectedDifficulty(difficultyId);
  };

  const handleCreateNewGame = async () => {
    if (!customModifiers) {
      setFeedback('Difficulty presets are still loading. Please try again shortly.');
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      // Stop the simulation if it's running
      await bridge.sendControl({ action: 'pause' });

      // Send the newGame intent with custom modifiers
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'newGame',
        payload: {
          difficulty: selectedDifficulty,
          modifiers: customModifiers,
        },
      });

      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Failed to create new game.');
        return;
      }

      // Navigate to dashboard and close modal
      enterDashboard();
      closeModal();
    } catch (error) {
      console.error('Failed to create new game', error);
      setFeedback('Connection error while creating new game.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Create a completely empty simulation session with no structures or content. Choose your
        difficulty level to set economic conditions and game balance.
      </p>

      <div className="grid gap-3">
        <h4 className="text-sm font-semibold text-text">Difficulty Level</h4>
        {difficultyError ? (
          <div className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
            <p>Failed to load difficulty presets: {difficultyError}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => reloadDifficultyConfig()}
            >
              Retry
            </Button>
          </div>
        ) : difficultyLoading ? (
          <div className="rounded-lg border border-border/40 bg-surface-muted/40 p-4 text-sm text-text-muted">
            Loading difficulty presets…
          </div>
        ) : difficultyOptions.length === 0 ? (
          <div className="rounded-lg border border-border/40 bg-surface-muted/40 p-4 text-sm text-text-muted">
            Difficulty presets are not available yet. Please retry once the backend responds.
          </div>
        ) : (
          <div className="grid gap-3">
            {difficultyOptions.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/50 bg-surface-muted/60 p-3 transition hover:border-primary"
              >
                <input
                  type="radio"
                  className="mt-1 size-4 shrink-0 accent-primary"
                  name="difficulty"
                  value={option.id}
                  checked={selectedDifficulty === option.id}
                  onChange={() => handleDifficultyChange(option.id)}
                />
                <div className="flex flex-col gap-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${option.color}`}>{option.name}</span>
                    <span className="text-xs text-text-muted">
                      {option.initialCapital} starting capital
                    </span>
                  </div>
                  <span className="text-xs text-text-muted">{option.description}</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-2 rounded-lg border border-border/40 bg-surface-muted/30 p-4">
        <h4 className="text-sm font-semibold text-text">Game Modifiers</h4>
        <p className="text-xs text-text-muted mb-2">
          Adjust the game balance by modifying these values. Each difficulty preset provides a
          starting point.
        </p>
        {customModifiers ? (
          <ModifierInputs modifiers={customModifiers} onChange={setCustomModifiers} />
        ) : (
          <div className="rounded border border-border/40 bg-surface-muted/60 p-4 text-sm text-text-muted">
            Difficulty presets are loading…
          </div>
        )}
      </div>

      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleCreateNewGame}
        confirmLabel={busy ? 'Creating…' : 'Create New Game'}
        confirmDisabled={busy || !customModifiers}
        cancelDisabled={busy}
      />
    </div>
  );
};

const GameMenuModal = ({
  bridge,
  closeModal,
}: {
  bridge: SimulationBridge;
  closeModal: () => void;
}) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleResetSession = async () => {
    setBusy('reset');
    setFeedback(null);
    try {
      // Stop the simulation if it's running
      await bridge.sendControl({ action: 'pause' });

      // Send the resetSession intent to the backend
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'resetSession',
        payload: {},
      });

      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Failed to reset session.');
        return;
      }

      // Reset frontend navigation state to return to start screen
      const resetNavigation = useNavigationStore.getState().reset;
      resetNavigation();

      closeModal();
    } catch (error) {
      console.error('Failed to reset session', error);
      setFeedback('Connection error while resetting session.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Game menu actions for the current simulation session.
      </p>
      <div className="grid gap-3">
        {[
          {
            label: 'Save Game',
            icon: 'save',
            disabled: true,
            tooltip: 'Save functionality coming soon',
          },
          {
            label: 'Load Game',
            icon: 'folder_open',
            disabled: true,
            tooltip: 'Load functionality coming soon',
          },
          {
            label: 'Export Save',
            icon: 'ios_share',
            disabled: true,
            tooltip: 'Export functionality coming soon',
          },
          {
            label: 'Reset Session',
            icon: 'restart_alt',
            disabled: busy !== null,
            onClick: handleResetSession,
            tooltip: 'Start a fresh game session',
          },
        ].map((item) => (
          <Button
            key={item.label}
            variant={item.label === 'Reset Session' ? 'primary' : 'secondary'}
            icon={<Icon name={item.icon} />}
            disabled={item.disabled}
            onClick={item.onClick}
            title={item.tooltip}
          >
            {busy === 'reset' && item.label === 'Reset Session' ? 'Resetting…' : item.label}
          </Button>
        ))}
      </div>
      {feedback ? <Feedback message={feedback} /> : null}
    </div>
  );
};

const modalRenderers: Record<
  ModalDescriptor['type'],
  (args: {
    bridge: SimulationBridge;
    closeModal: () => void;
    context?: Record<string, unknown>;
  }) => ReactElement | null
> = {
  gameMenu: ({ bridge, closeModal }) => <GameMenuModal bridge={bridge} closeModal={closeModal} />,
  loadGame: () => (
    <p className="text-sm text-text-muted">
      Load slots will appear once the backend exposes deterministic save headers. Choose a slot to
      dispatch <code>systemFacade.loadSave</code>.
    </p>
  ),
  importGame: () => (
    <p className="text-sm text-text-muted">
      Import a JSON save exported from Weedbreed.AI. Files are validated before{' '}
      <code>sim.restoreSnapshot</code> executes.
    </p>
  ),
  newGame: ({ bridge, closeModal }) => <NewGameModal bridge={bridge} closeModal={closeModal} />,
  notifications: () => (
    <p className="text-sm text-text-muted">
      Notification center groups events from <code>sim.*</code>, <code>world.*</code>, and{' '}
      <code>finance.*</code>. Streaming view arrives with live telemetry.
    </p>
  ),
  rentStructure: ({ bridge, closeModal }) => (
    <RentStructureModal bridge={bridge} closeModal={closeModal} />
  ),
  duplicateStructure: ({ bridge, closeModal, context }) => (
    <DuplicateStructureModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  renameStructure: ({ bridge, closeModal, context }) => (
    <RenameStructureModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  deleteStructure: ({ bridge, closeModal, context }) => (
    <DeleteStructureModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  createRoom: ({ bridge, closeModal, context }) => (
    <CreateRoomModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  duplicateRoom: ({ bridge, closeModal, context }) => (
    <DuplicateRoomModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  deleteRoom: () => (
    <p className="text-sm text-text-muted">
      Room deletion flow is not yet wired. Select a room and confirm via dashboard controls.
    </p>
  ),
  createZone: ({ bridge, closeModal, context }) => (
    <CreateZoneModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  deleteZone: () => (
    <p className="text-sm text-text-muted">
      Zone deletion flow will be wired once zone intent schemas land in the facade.
    </p>
  ),
  recruitStaff: ({ bridge, closeModal }) => (
    <RecruitStaffModal bridge={bridge} closeModal={closeModal} />
  ),
  hireApplicant: ({ bridge, closeModal, context }) => (
    <HireModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  fireEmployee: ({ bridge, closeModal, context }) => (
    <FireModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  rejectApplicant: ({ bridge, closeModal, context }) => (
    <RejectApplicantModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  employeeDetails: ({ bridge, closeModal, context }) => (
    <EmployeeDetailsModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
};

type PauseContext = {
  resumable: boolean;
  speed: number;
  pauseConfirmed: boolean;
};

export const ModalHost = ({ bridge }: ModalHostProps) => {
  const activeModal = useUIStore((state) => state.activeModal);
  const closeModal = useUIStore((state) => state.closeModal);
  const pauseContext = useRef<PauseContext | null>(null);
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [pauseFeedback, setPauseFeedback] = useState<string | null>(null);

  const handleCloseModal = useCallback(() => {
    const context = pauseContext.current;
    if (context?.resumable && context.pauseConfirmed) {
      setPauseFeedback(null);
      setResuming(true);
      void bridge
        .sendControl({ action: 'play', gameSpeed: context.speed })
        .then((response) => {
          if (!response.ok) {
            const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
            setPauseFeedback(
              warning ??
                'Failed to resume simulation after modal actions. Please resume from the toolbar.',
            );
            return;
          }
          pauseContext.current = null;
          closeModal();
        })
        .catch((error) => {
          console.error('Failed to resume simulation after modal close', error);
          setPauseFeedback('Connection error while resuming simulation. Please try again.');
        })
        .finally(() => {
          setResuming(false);
        });
      return;
    }
    pauseContext.current = null;
    closeModal();
  }, [bridge, closeModal]);

  useEffect(() => {
    if (!activeModal) {
      const context = pauseContext.current;
      pauseContext.current = null;
      setPausing(false);
      setResuming(false);
      setPauseFeedback(null);
      if (context?.resumable && context.pauseConfirmed) {
        void bridge.sendControl({ action: 'play', gameSpeed: context.speed }).catch((error) => {
          console.error('Failed to resume simulation after modal close', error);
        });
      }
      return;
    }
    if (pauseContext.current) {
      return;
    }
    setPauseFeedback(null);
    setResuming(false);
    const snapshot = useSimulationStore.getState().snapshot;
    const timeStatus = useSimulationStore.getState().timeStatus;
    const timeStatusPaused = typeof timeStatus?.paused === 'boolean' ? timeStatus.paused : null;
    const snapshotPaused = snapshot ? snapshot.clock.isPaused : null;
    let isPaused = true;

    if (timeStatusPaused !== null && snapshotPaused !== null) {
      isPaused = timeStatusPaused === snapshotPaused ? timeStatusPaused : true;
    } else if (timeStatusPaused !== null) {
      isPaused = timeStatusPaused;
    } else if (snapshotPaused !== null) {
      isPaused = snapshotPaused;
    }

    const resumable = !isPaused;
    const speed = timeStatus?.speed ?? snapshot?.clock.targetTickRate ?? 1;
    const context: PauseContext = { resumable, speed, pauseConfirmed: !resumable };
    pauseContext.current = context;
    if (resumable) {
      setPausing(true);
      void bridge
        .sendControl({ action: 'pause' })
        .then((response) => {
          if (pauseContext.current !== context) {
            return;
          }
          if (!response.ok) {
            const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
            setPauseFeedback(
              warning ??
                'Failed to pause simulation before opening the modal. Simulation will keep running.',
            );
            pauseContext.current = null;
            return;
          }
          pauseContext.current = { ...context, pauseConfirmed: true };
        })
        .catch((error) => {
          if (pauseContext.current !== context) {
            return;
          }
          console.error('Failed to pause simulation for modal', error);
          setPauseFeedback(
            'Connection error while pausing simulation. Simulation will keep running.',
          );
          pauseContext.current = null;
        })
        .finally(() => {
          if (pauseContext.current === context) {
            setPausing(false);
          } else if (!pauseContext.current) {
            setPausing(false);
          }
        });
    }
  }, [activeModal, bridge]);

  const content = useMemo(() => {
    if (!activeModal) {
      return null;
    }
    const renderer = modalRenderers[activeModal.type];
    if (!renderer) {
      return null;
    }
    return renderer({ bridge, closeModal: handleCloseModal, context: activeModal.context });
  }, [activeModal, bridge, handleCloseModal]);

  if (!activeModal || !content) {
    return null;
  }

  const subtitle = pausing
    ? 'Pausing simulation…'
    : resuming
      ? 'Resuming simulation…'
      : activeModal.subtitle;

  return (
    <ModalFrame title={activeModal.title} subtitle={subtitle} onClose={handleCloseModal}>
      {pauseFeedback ? <Feedback message={pauseFeedback} /> : null}
      {content}
    </ModalFrame>
  );
};
