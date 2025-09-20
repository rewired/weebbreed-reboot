import { FormEvent, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import type { FacadeIntentCommand } from '../types/simulation';
import styles from './ModalRoot.module.css';

type SubmitHandler = (event: FormEvent<HTMLFormElement>) => void;

type ModalRenderer = (
  t: ReturnType<typeof useTranslation>['t'],
  payload: Record<string, unknown> | undefined,
  onSubmit: SubmitHandler,
  state: ModalRenderState,
) => JSX.Element | null;

interface ModalRenderState {
  defaultZoneId?: string;
}

const parseNumber = (value: FormDataEntryValue | null | undefined): number | undefined => {
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const createIntent = (intent: FacadeIntentCommand, send: (intent: FacadeIntentCommand) => void) => {
  send(intent);
};

const installDeviceModal: ModalRenderer = (t, payload, onSubmit, state) => {
  const zoneId = (payload?.zoneId as string) ?? state.defaultZoneId;
  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label htmlFor="device-blueprint">{t('modals.deviceBlueprint')}</label>
      <input id="device-blueprint" name="blueprintId" required />

      <label htmlFor="device-name">{t('modals.deviceName')}</label>
      <input id="device-name" name="name" required />

      <label htmlFor="device-settings">{t('modals.deviceSettings')}</label>
      <textarea id="device-settings" name="settings" rows={3} placeholder='{ "power": 0.8 }' />

      <input type="hidden" name="zoneId" value={zoneId ?? ''} />

      <footer className={styles.actions}>
        <button type="submit" className={styles.confirm}>
          {t('modals.apply')}
        </button>
      </footer>
    </form>
  );
};

const plantingModal: ModalRenderer = (t, payload, onSubmit, state) => {
  const zoneId = (payload?.zoneId as string) ?? state.defaultZoneId;
  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label htmlFor="planting-strain">{t('modals.strainId')}</label>
      <input id="planting-strain" name="strainId" required />

      <label htmlFor="planting-count">{t('modals.plantCount')}</label>
      <input id="planting-count" name="count" type="number" min={1} defaultValue={4} required />

      <input type="hidden" name="zoneId" value={zoneId ?? ''} />

      <footer className={styles.actions}>
        <button type="submit" className={styles.confirm}>
          {t('modals.apply')}
        </button>
      </footer>
    </form>
  );
};

const automationPlanModal: ModalRenderer = (t, payload, onSubmit, state) => {
  const zoneId = (payload?.zoneId as string) ?? state.defaultZoneId;
  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label htmlFor="plan-strain">{t('modals.defaultStrain')}</label>
      <input id="plan-strain" name="strainId" required />

      <label htmlFor="plan-count">{t('modals.planCount')}</label>
      <input id="plan-count" name="count" type="number" min={1} defaultValue={4} required />

      <label className={styles.checkbox}>
        <input type="checkbox" name="autoReplant" defaultChecked />
        {t('modals.autoReplant')}
      </label>

      <input type="hidden" name="zoneId" value={zoneId ?? ''} />

      <footer className={styles.actions}>
        <button type="submit" className={styles.confirm}>
          {t('modals.apply')}
        </button>
      </footer>
    </form>
  );
};

const treatmentModal: ModalRenderer = (t, payload, onSubmit, state) => {
  const zoneId = (payload?.zoneId as string) ?? state.defaultZoneId;
  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label htmlFor="treatment-option">{t('modals.treatmentOption')}</label>
      <input id="treatment-option" name="optionId" required />

      <label htmlFor="treatment-target">{t('modals.treatmentTarget')}</label>
      <select id="treatment-target" name="target">
        <option value="disease">{t('labels.disease')}</option>
        <option value="pest">{t('labels.pest')}</option>
      </select>

      <input type="hidden" name="zoneId" value={zoneId ?? ''} />

      <footer className={styles.actions}>
        <button type="submit" className={styles.confirm}>
          {t('modals.apply')}
        </button>
      </footer>
    </form>
  );
};

const createEntityModal: ModalRenderer = (t, payload, onSubmit, state) => {
  const entity = payload?.entity as string | undefined;
  if (entity === 'room') {
    return (
      <form className={styles.form} onSubmit={onSubmit}>
        <input type="hidden" name="structureId" value={(payload?.structureId as string) ?? ''} />
        <label htmlFor="room-name">{t('modals.roomName')}</label>
        <input id="room-name" name="name" required />

        <label htmlFor="room-purpose">{t('modals.roomPurpose')}</label>
        <input id="room-purpose" name="purpose" required />

        <label htmlFor="room-area">{t('modals.area')}</label>
        <input
          id="room-area"
          name="area"
          type="number"
          min={1}
          step={0.5}
          defaultValue={40}
          required
        />

        <label htmlFor="room-height">{t('modals.height')}</label>
        <input id="room-height" name="height" type="number" min={1} step={0.1} defaultValue={3} />

        <footer className={styles.actions}>
          <button type="submit" className={styles.confirm}>
            {t('modals.apply')}
          </button>
        </footer>
      </form>
    );
  }

  if (entity === 'zone') {
    return (
      <form className={styles.form} onSubmit={onSubmit}>
        <input
          type="hidden"
          name="roomId"
          value={(payload?.roomId as string) ?? state.defaultZoneId ?? ''}
        />
        <label htmlFor="zone-name">{t('modals.zoneName')}</label>
        <input id="zone-name" name="name" required />

        <label htmlFor="zone-area">{t('modals.area')}</label>
        <input
          id="zone-area"
          name="area"
          type="number"
          min={1}
          step={0.5}
          defaultValue={25}
          required
        />

        <label htmlFor="zone-method">{t('modals.methodId')}</label>
        <input id="zone-method" name="methodId" required />

        <label htmlFor="zone-target">{t('modals.targetPlantCount')}</label>
        <input id="zone-target" name="targetPlantCount" type="number" min={1} defaultValue={8} />

        <footer className={styles.actions}>
          <button type="submit" className={styles.confirm}>
            {t('modals.apply')}
          </button>
        </footer>
      </form>
    );
  }

  if (entity === 'hire') {
    return (
      <form className={styles.form} onSubmit={onSubmit}>
        <label htmlFor="hire-applicant">{t('modals.applicantId')}</label>
        <input
          id="hire-applicant"
          name="applicantId"
          defaultValue={(payload?.applicantId as string) ?? ''}
        />

        <label htmlFor="hire-role">{t('modals.role')}</label>
        <input id="hire-role" name="role" required />

        <label htmlFor="hire-salary">{t('modals.salary')}</label>
        <input
          id="hire-salary"
          name="salaryPerTick"
          type="number"
          min={0}
          step={0.01}
          defaultValue={1}
        />

        <footer className={styles.actions}>
          <button type="submit" className={styles.confirm}>
            {t('modals.apply')}
          </button>
        </footer>
      </form>
    );
  }

  if (entity === 'training') {
    return (
      <form className={styles.form} onSubmit={onSubmit}>
        <label htmlFor="training-role">{t('modals.trainingRole')}</label>
        <input id="training-role" name="role" required />

        <label htmlFor="training-hours">{t('modals.trainingHours')}</label>
        <input id="training-hours" name="hours" type="number" min={1} defaultValue={4} />

        <footer className={styles.actions}>
          <button type="submit" className={styles.confirm}>
            {t('modals.apply')}
          </button>
        </footer>
      </form>
    );
  }

  if (entity === 'sellInventory') {
    return (
      <form className={styles.form} onSubmit={onSubmit}>
        <label htmlFor="inventory-lot">{t('modals.inventoryLot')}</label>
        <input id="inventory-lot" name="lotId" required />

        <label htmlFor="inventory-quantity">{t('modals.quantity')}</label>
        <input id="inventory-quantity" name="quantity" type="number" min={1} required />

        <footer className={styles.actions}>
          <button type="submit" className={styles.confirm}>
            {t('modals.apply')}
          </button>
        </footer>
      </form>
    );
  }

  if (entity === 'setUtilityPrices') {
    return (
      <form className={styles.form} onSubmit={onSubmit}>
        <label htmlFor="utility-energy">{t('labels.utility.energy')}</label>
        <input
          id="utility-energy"
          name="pricePerKwh"
          type="number"
          min={0}
          step={0.01}
          defaultValue={0.15}
        />

        <label htmlFor="utility-water">{t('labels.utility.water')}</label>
        <input
          id="utility-water"
          name="pricePerLiterWater"
          type="number"
          min={0}
          step={0.01}
          defaultValue={0.02}
        />

        <label htmlFor="utility-nutrients">{t('labels.utility.nutrients')}</label>
        <input
          id="utility-nutrients"
          name="pricePerGramNutrients"
          type="number"
          min={0}
          step={0.01}
          defaultValue={0.1}
        />

        <footer className={styles.actions}>
          <button type="submit" className={styles.confirm}>
            {t('modals.apply')}
          </button>
        </footer>
      </form>
    );
  }

  return null;
};

const updateEntityModal: ModalRenderer = (t, payload, onSubmit) => {
  const entity = payload?.entity as string | undefined;
  if (entity === 'room') {
    return (
      <form className={styles.form} onSubmit={onSubmit}>
        <input type="hidden" name="roomId" value={(payload?.roomId as string) ?? ''} />
        <label htmlFor="update-room-name">{t('modals.roomName')}</label>
        <input id="update-room-name" name="name" />

        <label htmlFor="update-room-purpose">{t('modals.roomPurpose')}</label>
        <input id="update-room-purpose" name="purpose" />

        <label htmlFor="update-room-area">{t('modals.area')}</label>
        <input id="update-room-area" name="area" type="number" min={1} step={0.5} />

        <footer className={styles.actions}>
          <button type="submit" className={styles.confirm}>
            {t('modals.apply')}
          </button>
        </footer>
      </form>
    );
  }

  if (entity === 'assignment') {
    return (
      <form className={styles.form} onSubmit={onSubmit}>
        <input type="hidden" name="employeeId" value={(payload?.employeeId as string) ?? ''} />
        <label htmlFor="assignment-structure">{t('modals.structureId')}</label>
        <input id="assignment-structure" name="structureId" />

        <label htmlFor="assignment-zone">{t('modals.zoneId')}</label>
        <input id="assignment-zone" name="zoneId" />

        <footer className={styles.actions}>
          <button type="submit" className={styles.confirm}>
            {t('modals.apply')}
          </button>
        </footer>
      </form>
    );
  }

  return null;
};

const deleteEntityModal: ModalRenderer = (t, payload, onSubmit) => {
  const entity = payload?.entity as string | undefined;
  if (entity === 'employee') {
    return (
      <form className={styles.form} onSubmit={onSubmit}>
        <input type="hidden" name="employeeId" value={(payload?.employeeId as string) ?? ''} />
        <p>{t('modals.terminateEmployeeDescription')}</p>
        <footer className={styles.actions}>
          <button type="submit" className={styles.danger}>
            {t('modals.confirmDelete')}
          </button>
        </footer>
      </form>
    );
  }
  return null;
};

const MODAL_RENDERERS: Record<string, ModalRenderer> = {
  installDevice: installDeviceModal,
  planting: plantingModal,
  automationPlan: automationPlanModal,
  treatment: treatmentModal,
  createEntity: createEntityModal,
  updateEntity: updateEntityModal,
  deleteEntity: deleteEntityModal,
};

export const ModalRoot = () => {
  const { t } = useTranslation('simulation');
  const activeModal = useAppStore((state) => state.activeModal);
  const closeModal = useAppStore((state) => state.closeModal);
  const issueFacadeIntent = useAppStore((state) => state.issueFacadeIntent);
  const issueControlCommand = useAppStore((state) => state.issueControlCommand);
  const timeStatus = useAppStore((state) => state.timeStatus);
  const stateRef = useRef<ModalRenderState>({});
  const shouldResumeRef = useRef(false);

  const renderer = activeModal ? MODAL_RENDERERS[activeModal.kind] : undefined;

  useEffect(() => {
    if (activeModal?.autoPause && timeStatus && !timeStatus.paused) {
      issueControlCommand({ action: 'pause' });
      shouldResumeRef.current = true;
    }

    if (!activeModal && shouldResumeRef.current) {
      issueControlCommand({ action: 'resume' });
      shouldResumeRef.current = false;
    }
  }, [activeModal, issueControlCommand, timeStatus]);

  useEffect(() => {
    if (activeModal?.payload?.zoneId && typeof activeModal.payload.zoneId === 'string') {
      stateRef.current.defaultZoneId = activeModal.payload.zoneId as string;
    }
  }, [activeModal]);

  if (!activeModal || !renderer) {
    return null;
  }

  const handleSubmit: SubmitHandler = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    switch (activeModal.kind) {
      case 'installDevice': {
        const zoneId = formData.get('zoneId') as string;
        createIntent(
          {
            domain: 'devices',
            action: 'installDevice',
            payload: {
              targetId: zoneId,
              deviceId: formData.get('blueprintId'),
              name: formData.get('name'),
              settings: (() => {
                const raw = formData.get('settings');
                if (typeof raw === 'string' && raw.trim().length) {
                  try {
                    return JSON.parse(raw);
                  } catch (error) {
                    console.warn('Invalid device settings JSON', error);
                  }
                }
                return {};
              })(),
            },
          },
          issueFacadeIntent,
        );
        break;
      }
      case 'planting': {
        const zoneId = formData.get('zoneId') as string;
        createIntent(
          {
            domain: 'plants',
            action: 'addPlanting',
            payload: {
              zoneId,
              strainId: formData.get('strainId'),
              count: parseNumber(formData.get('count')) ?? 1,
            },
          },
          issueFacadeIntent,
        );
        break;
      }
      case 'automationPlan': {
        const zoneId = formData.get('zoneId') as string;
        createIntent(
          {
            domain: 'plants',
            action: 'addPlanting',
            payload: {
              zoneId,
              strainId: formData.get('strainId'),
              count: parseNumber(formData.get('count')) ?? 1,
              autoReplant: formData.get('autoReplant') === 'on',
            },
          },
          issueFacadeIntent,
        );
        break;
      }
      case 'treatment': {
        const zoneId = formData.get('zoneId') as string;
        createIntent(
          {
            domain: 'health',
            action: 'applyTreatment',
            payload: {
              zoneId,
              optionId: formData.get('optionId'),
              target: formData.get('target'),
            },
          },
          issueFacadeIntent,
        );
        break;
      }
      case 'createEntity': {
        switch (activeModal.payload?.entity) {
          case 'room':
            createIntent(
              {
                domain: 'world',
                action: 'createRoom',
                payload: {
                  structureId: formData.get('structureId'),
                  room: {
                    name: formData.get('name'),
                    purpose: formData.get('purpose'),
                    area: parseNumber(formData.get('area')) ?? 1,
                    height: parseNumber(formData.get('height')),
                  },
                },
              },
              issueFacadeIntent,
            );
            break;
          case 'zone':
            createIntent(
              {
                domain: 'world',
                action: 'createZone',
                payload: {
                  roomId: formData.get('roomId'),
                  zone: {
                    name: formData.get('name'),
                    area: parseNumber(formData.get('area')) ?? 1,
                    methodId: formData.get('methodId'),
                    targetPlantCount: parseNumber(formData.get('targetPlantCount')),
                  },
                },
              },
              issueFacadeIntent,
            );
            break;
          case 'hire':
            createIntent(
              {
                domain: 'workforce',
                action: 'hire',
                payload: {
                  applicantId: formData.get('applicantId'),
                  role: formData.get('role'),
                  salaryPerTick: parseNumber(formData.get('salaryPerTick')) ?? 1,
                },
              },
              issueFacadeIntent,
            );
            break;
          case 'training':
            createIntent(
              {
                domain: 'workforce',
                action: 'enqueueTask',
                payload: {
                  taskKind: 'training',
                  role: formData.get('role'),
                  hours: parseNumber(formData.get('hours')) ?? 4,
                },
              },
              issueFacadeIntent,
            );
            break;
          case 'sellInventory':
            createIntent(
              {
                domain: 'finance',
                action: 'sellInventory',
                payload: {
                  lotId: formData.get('lotId'),
                  quantity: parseNumber(formData.get('quantity')) ?? 0,
                },
              },
              issueFacadeIntent,
            );
            break;
          case 'setUtilityPrices':
            createIntent(
              {
                domain: 'finance',
                action: 'setUtilityPrices',
                payload: {
                  pricePerKwh: parseNumber(formData.get('pricePerKwh')),
                  pricePerLiterWater: parseNumber(formData.get('pricePerLiterWater')),
                  pricePerGramNutrients: parseNumber(formData.get('pricePerGramNutrients')),
                },
              },
              issueFacadeIntent,
            );
            break;
          default:
            break;
        }
        break;
      }
      case 'updateEntity': {
        switch (activeModal.payload?.entity) {
          case 'room':
            createIntent(
              {
                domain: 'world',
                action: 'updateRoom',
                payload: {
                  roomId: formData.get('roomId'),
                  patch: {
                    name: formData.get('name') || undefined,
                    purpose: formData.get('purpose') || undefined,
                    area: parseNumber(formData.get('area')),
                  },
                },
              },
              issueFacadeIntent,
            );
            break;
          case 'assignment':
            createIntent(
              {
                domain: 'workforce',
                action: 'assignStructure',
                payload: {
                  employeeId: formData.get('employeeId'),
                  structureId: formData.get('structureId') || undefined,
                  zoneId: formData.get('zoneId') || undefined,
                },
              },
              issueFacadeIntent,
            );
            break;
          default:
            break;
        }
        break;
      }
      case 'deleteEntity': {
        if (activeModal.payload?.entity === 'employee') {
          createIntent(
            {
              domain: 'workforce',
              action: 'fire',
              payload: {
                employeeId: formData.get('employeeId'),
              },
            },
            issueFacadeIntent,
          );
        }
        break;
      }
      default:
        break;
    }

    closeModal();
  };

  return (
    <div className={styles.backdrop} role="presentation" onClick={closeModal}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2>{activeModal.title ?? t('modals.defaultTitle')}</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={closeModal}
            aria-label={t('modals.close')}
          >
            ×
          </button>
        </header>
        {activeModal.description ? (
          <p className={styles.description}>{activeModal.description}</p>
        ) : null}
        {renderer(t, activeModal.payload, handleSubmit, stateRef.current)}
      </div>
    </div>
  );
};
