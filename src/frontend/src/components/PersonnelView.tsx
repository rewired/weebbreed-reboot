import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useAppStore } from '../store';
import type { SimulationEvent } from '@/types/simulation';
import styles from './PersonnelView.module.css';

const buildEventKey = (event: SimulationEvent, fallbackIndex: number) => {
  const segments = [event.type];

  if (event.ts !== undefined) {
    segments.push(`ts:${event.ts}`);
  }

  if (event.tick !== undefined) {
    segments.push(`tick:${event.tick}`);
  }

  if (event.deviceId) {
    segments.push(`device:${event.deviceId}`);
  }

  if (event.plantId) {
    segments.push(`plant:${event.plantId}`);
  }

  if (event.zoneId) {
    segments.push(`zone:${event.zoneId}`);
  }

  if (event.message) {
    segments.push(`message:${event.message}`);
  }

  if (segments.length === 1) {
    segments.push(`index:${fallbackIndex}`);
  }

  return segments.join('|');
};

interface EventCardProps {
  event: SimulationEvent;
}

const EventCard = ({ event }: EventCardProps) => {
  return (
    <article className={styles.eventCard}>
      <header>
        <span className={styles.eventType}>{event.type}</span>
        <span className={styles.eventTick}>{event.tick !== undefined ? `#${event.tick}` : ''}</span>
      </header>
      {event.message ? <p>{event.message}</p> : null}
      {event.payload ? (
        <pre className={styles.eventPayload}>{JSON.stringify(event.payload, null, 2)}</pre>
      ) : null}
    </article>
  );
};

export const PersonnelView = () => {
  const { t } = useTranslation('simulation');
  const personnel = useAppStore((state) => state.personnel);
  const hrEvents = useAppStore((state) => state.hrEvents);
  const openModal = useAppStore((state) => state.openModal);

  const employees = personnel?.employees ?? [];
  const applicants = personnel?.applicants ?? [];

  const moraleData = useMemo(() => {
    if (!employees.length) {
      return [];
    }
    return employees
      .slice()
      .sort((a, b) => a.morale - b.morale)
      .map((employee, index) => ({
        index: index + 1,
        morale: Math.round(employee.morale * 100),
        energy: Math.round(employee.energy * 100),
        name: employee.name,
      }));
  }, [employees]);

  const averageMorale = employees.length
    ? employees.reduce((sum, employee) => sum + employee.morale, 0) / employees.length
    : 0;
  const averageEnergy = employees.length
    ? employees.reduce((sum, employee) => sum + employee.energy, 0) / employees.length
    : 0;

  return (
    <section className={styles.personnelView}>
      <header className={styles.header}>
        <div>
          <h2>{t('labels.personnel')}</h2>
          <p className={styles.subheader}>{t('labels.personnelDescription')}</p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() =>
              openModal({
                kind: 'createEntity',
                autoPause: true,
                payload: { entity: 'hire' },
                title: t('modals.hireEmployeeTitle'),
              })
            }
          >
            {t('actions.hireEmployee')}
          </button>
          <button
            type="button"
            onClick={() =>
              openModal({
                kind: 'createEntity',
                autoPause: true,
                payload: { entity: 'training' },
                title: t('modals.scheduleTrainingTitle'),
              })
            }
          >
            {t('actions.scheduleTraining')}
          </button>
        </div>
      </header>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <h3>{t('labels.totalEmployees')}</h3>
          <p className={styles.summaryValue}>{employees.length.toLocaleString()}</p>
          <p className={styles.summaryHint}>
            {t('labels.averageMorale', { value: Math.round(averageMorale * 100) })}
          </p>
        </article>
        <article className={styles.summaryCard}>
          <h3>{t('labels.totalApplicants')}</h3>
          <p className={styles.summaryValue}>{applicants.length.toLocaleString()}</p>
          <p className={styles.summaryHint}>
            {t('labels.averageEnergy', { value: Math.round(averageEnergy * 100) })}
          </p>
        </article>
        <article className={styles.summaryCard}>
          <h3>{t('labels.overallMorale')}</h3>
          <p className={styles.summaryValue}>
            {Math.round((personnel?.overallMorale ?? 0) * 100)}%
          </p>
          <p className={styles.summaryHint}>{t('labels.overallMoraleHint')}</p>
        </article>
      </section>

      <section className={styles.chartSection}>
        <header>
          <h3>{t('labels.moraleDistribution')}</h3>
          <span className={styles.count}>{t('labels.count', { count: employees.length })}</span>
        </header>
        {moraleData.length === 0 ? (
          <p className={styles.emptyState}>{t('labels.noEmployees')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={moraleData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
              <XAxis
                dataKey="index"
                tickFormatter={(value) => `#${value}`}
                stroke="rgba(148,163,184,0.7)"
              />
              <YAxis domain={[0, 100]} stroke="rgba(148,163,184,0.7)" />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(148,163,184,0.2)',
                }}
                formatter={(value: number, key: string) => {
                  if (key === 'morale') {
                    return [`${value}%`, t('labels.morale')];
                  }
                  if (key === 'energy') {
                    return [`${value}%`, t('labels.energy')];
                  }
                  return [value, key];
                }}
              />
              <Bar dataKey="morale" fill="rgba(99, 102, 241, 0.8)" name={t('labels.morale')} />
              <Bar dataKey="energy" fill="rgba(34, 197, 94, 0.7)" name={t('labels.energy')} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className={styles.employeeSection}>
        <header>
          <h3>{t('labels.employeeRoster')}</h3>
        </header>
        {employees.length === 0 ? (
          <p className={styles.emptyState}>{t('labels.noEmployees')}</p>
        ) : (
          <div className={styles.employeeGrid}>
            {employees.map((employee) => (
              <article key={employee.id} className={styles.employeeCard}>
                <header>
                  <h4>{employee.name}</h4>
                  <span className={styles.employeeRole}>{employee.role}</span>
                </header>
                <dl>
                  <div>
                    <dt>{t('labels.morale')}</dt>
                    <dd>{Math.round(employee.morale * 100)}%</dd>
                  </div>
                  <div>
                    <dt>{t('labels.energy')}</dt>
                    <dd>{Math.round(employee.energy * 100)}%</dd>
                  </div>
                  <div>
                    <dt>{t('labels.salary')}</dt>
                    <dd>{employee.salaryPerTick.toFixed(2)} / tick</dd>
                  </div>
                  <div>
                    <dt>{t('labels.assignment')}</dt>
                    <dd>{employee.assignedStructureId ?? t('labels.unassigned')}</dd>
                  </div>
                </dl>
                <div className={styles.employeeActions}>
                  <button
                    type="button"
                    onClick={() =>
                      openModal({
                        kind: 'updateEntity',
                        autoPause: true,
                        payload: { entity: 'assignment', employeeId: employee.id },
                        title: t('modals.assignStructureTitle', { name: employee.name }),
                      })
                    }
                  >
                    {t('actions.assignStructure')}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openModal({
                        kind: 'deleteEntity',
                        autoPause: true,
                        payload: { entity: 'employee', employeeId: employee.id },
                        title: t('modals.terminateEmployeeTitle', { name: employee.name }),
                      })
                    }
                  >
                    {t('actions.terminateEmployee')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.applicantSection}>
        <header>
          <h3>{t('labels.applicants')}</h3>
          <span className={styles.count}>{t('labels.count', { count: applicants.length })}</span>
        </header>
        {applicants.length === 0 ? (
          <p className={styles.emptyState}>{t('labels.noApplicants')}</p>
        ) : (
          <div className={styles.applicantGrid}>
            {applicants.map((applicant) => (
              <article key={applicant.id} className={styles.applicantCard}>
                <header>
                  <h4>{applicant.name}</h4>
                  <span className={styles.employeeRole}>{applicant.desiredRole}</span>
                </header>
                <p>{t('labels.expectedSalary', { value: applicant.expectedSalary.toFixed(2) })}</p>
                <button
                  type="button"
                  onClick={() =>
                    openModal({
                      kind: 'createEntity',
                      autoPause: true,
                      payload: { entity: 'hire', applicantId: applicant.id },
                      title: t('modals.hireEmployeeTitle'),
                    })
                  }
                >
                  {t('actions.hire')}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.eventSection}>
        <header>
          <h3>{t('labels.hrEvents')}</h3>
          <span className={styles.count}>{t('labels.count', { count: hrEvents.length })}</span>
        </header>
        {hrEvents.length === 0 ? (
          <p className={styles.emptyState}>{t('labels.noHrEvents')}</p>
        ) : (
          <div className={styles.eventGrid}>
            {hrEvents
              .slice(-12)
              .reverse()
              .map((event, index) => (
                <EventCard key={buildEventKey(event, hrEvents.length - 1 - index)} event={event} />
              ))}
          </div>
        )}
      </section>
    </section>
  );
};
