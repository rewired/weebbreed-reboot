import { useEffect, useMemo } from 'react';
import HireEmployeeModal from '@/views/personnel/modals/HireEmployeeModal';
import FireEmployeeModal from '@/views/personnel/modals/FireEmployeeModal';
import {
  selectIsPaused,
  useAppStore,
  useGameStore,
  usePersonnelStore,
  useZoneStore,
} from '@/store';

const ModalHost = () => {
  const activeModal = useAppStore((state) => state.activeModal);
  const closeModal = useAppStore((state) => state.closeModal);
  const wasRunningBeforeModal = useAppStore((state) => state.wasRunningBeforeModal);
  const setWasRunningBeforeModal = useAppStore((state) => state.setWasRunningBeforeModal);

  const issueControlCommand = useGameStore((state) => state.issueControlCommand);
  const isPaused = useGameStore(selectIsPaused);

  const personnel = usePersonnelStore((state) => state.personnel);
  const hireCandidate = usePersonnelStore((state) => state.hireCandidate);
  const fireEmployee = usePersonnelStore((state) => state.fireEmployee);

  const structures = useZoneStore((state) => state.structures);

  const candidateId = useMemo(() => {
    if (!activeModal || activeModal.kind !== 'hireEmployee') {
      return undefined;
    }
    const payload = activeModal.payload as { candidateId?: unknown } | undefined;
    const raw = payload?.candidateId;
    return typeof raw === 'string' ? raw : undefined;
  }, [activeModal]);

  const employeeId = useMemo(() => {
    if (!activeModal || activeModal.kind !== 'fireEmployee') {
      return undefined;
    }
    const payload = activeModal.payload as { employeeId?: unknown } | undefined;
    const raw = payload?.employeeId;
    return typeof raw === 'string' ? raw : undefined;
  }, [activeModal]);

  const candidate = useMemo(() => {
    if (!candidateId) {
      return undefined;
    }
    return personnel?.applicants?.find((item) => item.id === candidateId);
  }, [candidateId, personnel?.applicants]);

  const employee = useMemo(() => {
    if (!employeeId) {
      return undefined;
    }
    return personnel?.employees?.find((item) => item.id === employeeId);
  }, [employeeId, personnel?.employees]);

  useEffect(() => {
    if (!activeModal) {
      if (wasRunningBeforeModal) {
        issueControlCommand({ action: 'play' });
        setWasRunningBeforeModal(false);
      }
      return;
    }

    if (activeModal.autoPause) {
      if (!isPaused) {
        setWasRunningBeforeModal(true);
        issueControlCommand({ action: 'pause' });
      } else {
        setWasRunningBeforeModal(false);
      }
    }
  }, [activeModal, isPaused, issueControlCommand, setWasRunningBeforeModal, wasRunningBeforeModal]);

  useEffect(() => {
    if (!activeModal) {
      return;
    }
    if (activeModal.kind === 'hireEmployee' && candidateId && !candidate) {
      closeModal();
    }
    if (activeModal.kind === 'fireEmployee' && employeeId && !employee) {
      closeModal();
    }
  }, [activeModal, candidate, candidateId, closeModal, employee, employeeId]);

  if (!activeModal) {
    return null;
  }

  switch (activeModal.kind) {
    case 'hireEmployee':
      if (!candidate) {
        return null;
      }
      return (
        <HireEmployeeModal
          candidate={candidate}
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onConfirm={({ wage, role }) => {
            hireCandidate(candidate.id, { wage, role });
            closeModal();
          }}
        />
      );
    case 'fireEmployee':
      if (!employee) {
        return null;
      }
      return (
        <FireEmployeeModal
          employee={employee}
          structureName={
            employee.assignedStructureId
              ? structures[employee.assignedStructureId]?.name
              : undefined
          }
          title={activeModal.title}
          description={activeModal.description}
          onCancel={closeModal}
          onConfirm={() => {
            fireEmployee(employee.id);
            closeModal();
          }}
        />
      );
    default:
      return null;
  }
};

export default ModalHost;
