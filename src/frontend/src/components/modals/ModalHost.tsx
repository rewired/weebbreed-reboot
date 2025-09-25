import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { ModalFrame } from '@/components/modals/ModalFrame';
import { structureBlueprintOptions } from '@/data/structureBlueprints';
import { useUIStore } from '@/store/ui';
import type { ModalDescriptor } from '@/store/ui';
import { useSimulationStore } from '@/store/simulation';
import { useNavigationStore } from '@/store/navigation';
import type { SimulationBridge } from '@/facade/systemFacade';

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
  const [selected, setSelected] = useState(
    structureBlueprintOptions[1]?.id ?? structureBlueprintOptions[0]!.id,
  );
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

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

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Select a deterministic blueprint to rent. The facade validates availability and applies rent
        per tick once the command succeeds.
      </p>
      <div className="grid gap-3">
        {structureBlueprintOptions.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/50 bg-surface-muted/60 p-4 transition hover:border-primary"
          >
            <input
              type="radio"
              className="mt-1 size-4 shrink-0 accent-primary"
              name="structure-blueprint"
              value={option.id}
              checked={selected === option.id}
              onChange={() => setSelected(option.id)}
            />
            <div className="flex flex-col gap-1 text-left">
              <span className="text-sm font-semibold text-text">{option.name}</span>
              <span className="text-xs text-text-muted">
                {option.area.toLocaleString()} m² · Upfront €{option.upfrontFee.toLocaleString()} ·
                Rent €{option.rentalCostPerSqmPerMonth}/m²·month
              </span>
              <span className="text-xs text-text-muted/80">{option.description}</span>
            </div>
          </label>
        ))}
      </div>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleRent}
        confirmLabel={busy ? 'Renting…' : 'Rent structure'}
        confirmDisabled={busy}
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

const HireApplicantModal = ({
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
        Applicant data unavailable. Select an applicant before hiring.
      </p>
    );
  }

  const handleHire = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'workforce',
        action: 'hireApplicant',
        payload: { applicantId },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Hiring rejected by workforce engine.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to hire applicant', error);
      setFeedback('Connection error while hiring applicant.');
    } finally {
      setBusy(false);
    }
  };

  const skillEntries = Object.entries(applicant.skills).filter(([, level]) => level && level > 0);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted">Role</span>
          <span className="font-medium text-text">{applicant.desiredRole}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Expected Salary</span>
          <span className="font-medium text-text">€{applicant.expectedSalary}/tick</span>
        </div>
        {applicant.traits.length > 0 && (
          <div className="flex justify-between">
            <span className="text-text-muted">Traits</span>
            <span className="font-medium text-text">{applicant.traits.join(', ')}</span>
          </div>
        )}
        {skillEntries.length > 0 && (
          <div className="grid gap-2">
            <span className="text-text-muted">Skills</span>
            <div className="grid gap-1">
              {skillEntries.map(([skill, level]) => (
                <div key={skill} className="flex justify-between">
                  <span className="text-text-muted">{skill}</span>
                  <span className="font-medium text-text">Level {level}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-text-muted">
        Hiring will add {applicant.name} to your workforce immediately. Their salary will be
        deducted from company funds each tick.
      </p>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleHire}
        confirmLabel={busy ? 'Hiring…' : `Hire ${applicant.name}`}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};

const FireEmployeeModal = ({
  bridge,
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
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!employee || !employeeId) {
    return (
      <p className="text-sm text-text-muted">
        Employee data unavailable. Select an employee to terminate.
      </p>
    );
  }

  const handleFire = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'workforce',
        action: 'fireEmployee',
        payload: { employeeId },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Termination rejected by workforce engine.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to fire employee', error);
      setFeedback('Connection error while terminating employee.');
    } finally {
      setBusy(false);
    }
  };

  const confirmMatches = confirmation.trim().toLowerCase() === employee.name.toLowerCase();

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <p className="text-sm text-text-muted">
          Terminating <span className="font-semibold text-text">{employee.name}</span> will
          immediately remove them from your workforce. This action cannot be undone.
        </p>
        <div className="rounded-lg bg-surface-muted/40 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Role</span>
            <span className="text-text">{employee.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Current Salary</span>
            <span className="text-text">€{employee.salaryPerTick}/tick</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Status</span>
            <span className="text-text">
              {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
            </span>
          </div>
        </div>
      </div>
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Type the employee's name to confirm
        </span>
        <input
          type="text"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={employee.name}
          className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
        />
      </label>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleFire}
        confirmLabel={busy ? 'Terminating…' : 'Terminate Employee'}
        confirmDisabled={!confirmMatches || busy}
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

const modalRenderers: Record<
  ModalDescriptor['type'],
  (args: {
    bridge: SimulationBridge;
    closeModal: () => void;
    context?: Record<string, unknown>;
  }) => ReactElement | null
> = {
  gameMenu: () => (
    <div className="grid gap-3">
      {[
        { label: 'Save Game', icon: 'save' },
        { label: 'Load Game', icon: 'folder_open' },
        { label: 'Export Save', icon: 'ios_share' },
        { label: 'Reset Session', icon: 'restart_alt' },
      ].map((item) => (
        <Button key={item.label} variant="secondary" icon={<Icon name={item.icon} />}>
          {item.label}
        </Button>
      ))}
    </div>
  ),
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
  newGame: () => (
    <p className="text-sm text-text-muted">
      Starting a new run clears the deterministic seed and provisions the quick start layout via{' '}
      <code>world.createGame</code>.
    </p>
  ),
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
    <HireApplicantModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  fireEmployee: ({ bridge, closeModal, context }) => (
    <FireEmployeeModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  rejectApplicant: ({ bridge, closeModal, context }) => (
    <RejectApplicantModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
  employeeDetails: ({ bridge, closeModal, context }) => (
    <EmployeeDetailsModal bridge={bridge} closeModal={closeModal} context={context} />
  ),
};

export const ModalHost = ({ bridge }: ModalHostProps) => {
  const activeModal = useUIStore((state) => state.activeModal);
  const closeModal = useUIStore((state) => state.closeModal);
  const pauseContext = useRef<{ wasRunning: boolean; speed: number } | null>(null);
  const [pausing, setPausing] = useState(false);

  useEffect(() => {
    if (!activeModal) {
      const context = pauseContext.current;
      pauseContext.current = null;
      if (context?.wasRunning) {
        void bridge.sendControl({ action: 'play', gameSpeed: context.speed }).catch((error) => {
          console.error('Failed to resume simulation after modal close', error);
        });
      }
      return;
    }
    if (pauseContext.current) {
      return;
    }
    const snapshot = useSimulationStore.getState().snapshot;
    const timeStatus = useSimulationStore.getState().timeStatus;
    const wasRunning = timeStatus?.running ?? (snapshot ? !snapshot.clock.isPaused : false);
    const speed = timeStatus?.speed ?? snapshot?.clock.targetTickRate ?? 1;
    pauseContext.current = { wasRunning, speed };
    if (wasRunning) {
      setPausing(true);
      void bridge
        .sendControl({ action: 'pause' })
        .catch((error) => {
          console.error('Failed to pause simulation for modal', error);
        })
        .finally(() => {
          setPausing(false);
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
    return renderer({ bridge, closeModal, context: activeModal.context });
  }, [activeModal, bridge, closeModal]);

  if (!activeModal || !content) {
    return null;
  }

  return (
    <ModalFrame
      title={activeModal.title}
      subtitle={pausing ? 'Pausing simulation…' : activeModal.subtitle}
      onClose={closeModal}
    >
      {content}
    </ModalFrame>
  );
};
