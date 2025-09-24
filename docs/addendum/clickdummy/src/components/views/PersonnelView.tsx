/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { GameData, Candidate, Employee } from '../../types/domain';
import { DeleteIcon } from '../common/Icons';

// SUB-COMPONENT: SkillRating
const SkillRating = ({ level }: { level: number }) => (
  <div className="flex space-x-1">
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className={`h-2 w-4 rounded-full ${i < level ? 'bg-lime-500' : 'bg-stone-600'}`}
      />
    ))}
  </div>
);

// SUB-COMPONENT: CandidateCard
const CandidateCard = ({
  candidate,
  onHire,
}: {
  candidate: Candidate;
  onHire: (c: Candidate) => void;
}) => (
  <div className="bg-stone-800/50 rounded-lg p-4 flex flex-col justify-between">
    <div>
      <h4 className="font-bold text-lg text-stone-100">{candidate.name}</h4>
      <p className="text-sm text-lime-400">{candidate.desiredRole}</p>
      <p className="text-sm text-stone-400 mt-1">
        Salary: {candidate.expectedSalary.toLocaleString()} € / year
      </p>

      <div className="my-3 space-y-2">
        <h5 className="text-xs font-semibold text-stone-400">Skills</h5>
        {Object.entries(candidate.skills).map(([skill, level]) => (
          <div key={skill} className="flex justify-between items-center text-sm">
            <span>{skill}</span>
            <SkillRating level={level as number} />
          </div>
        ))}
      </div>

      {candidate.traits.length > 0 && (
        <div className="space-x-2">
          {candidate.traits.map((trait) => (
            <span
              key={trait}
              className="text-xs bg-cyan-900/50 text-cyan-300 px-2 py-1 rounded-full"
            >
              {trait}
            </span>
          ))}
        </div>
      )}
    </div>
    <button
      onClick={() => onHire(candidate)}
      className="mt-4 w-full bg-lime-600 hover:bg-lime-700 text-white font-semibold py-2 rounded-md transition-colors text-sm"
    >
      Hire
    </button>
  </div>
);

// SUB-COMPONENT: EmployeeCard
const EmployeeCard = ({
  employee,
  structureName,
  onFire,
}: {
  employee: Employee;
  structureName: string;
  onFire: (id: string) => void;
}) => (
  <div className="bg-stone-800/50 rounded-lg p-4 flex flex-col justify-between">
    <div>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-lg text-stone-100">{employee.name}</h4>
          <p className="text-sm text-lime-400">{employee.desiredRole}</p>
        </div>
        <button onClick={() => onFire(employee.id)} className="text-stone-500 hover:text-red-400">
          <DeleteIcon />
        </button>
      </div>
      <p className="text-sm text-stone-400 mt-1">
        Salary: {employee.expectedSalary.toLocaleString()} € / year
      </p>
      <p className="text-xs text-stone-500 mt-1">Assigned: {structureName}</p>

      <div className="my-3 space-y-2">
        <h5 className="text-xs font-semibold text-stone-400">Skills</h5>
        {Object.entries(employee.skills).map(([skill, level]) => (
          <div key={skill} className="flex justify-between items-center text-sm">
            <span>{skill}</span>
            <SkillRating level={level as number} />
          </div>
        ))}
      </div>

      {employee.traits.length > 0 && (
        <div className="space-x-2">
          {employee.traits.map((trait) => (
            <span
              key={trait}
              className="text-xs bg-cyan-900/50 text-cyan-300 px-2 py-1 rounded-full"
            >
              {trait}
            </span>
          ))}
        </div>
      )}
    </div>
  </div>
);

// MAIN COMPONENT
interface PersonnelViewProps {
  gameData: GameData;
  onOpenModal: (type: string, props: any) => void;
  onRefreshCandidates: () => void;
  onFireEmployee: (id: string) => void;
}

export const PersonnelView = ({
  gameData,
  onOpenModal,
  onRefreshCandidates,
  onFireEmployee,
}: PersonnelViewProps) => {
  const [activeTab, setActiveTab] = useState('market');

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-stone-100">Personnel Management</h2>

      <div className="flex border-b border-stone-700">
        <button
          onClick={() => setActiveTab('market')}
          className={`px-4 py-2 text-sm font-semibold ${activeTab === 'market' ? 'border-b-2 border-lime-500 text-lime-400' : 'text-stone-400 hover:bg-stone-700/50'}`}
        >
          Job Market ({gameData.candidates.length})
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 text-sm font-semibold ${activeTab === 'staff' ? 'border-b-2 border-lime-500 text-lime-400' : 'text-stone-400 hover:bg-stone-700/50'}`}
        >
          Your Staff ({gameData.employees.length})
        </button>
      </div>

      {activeTab === 'market' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-stone-400">Source: Offline Generator (Weekly Refresh)</p>
            <button
              onClick={onRefreshCandidates}
              className="bg-blue-600/80 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors text-sm"
            >
              Refresh Candidates
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {gameData.candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onHire={(c) => onOpenModal('hireEmployee', { candidate: c })}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {gameData.employees.map((employee) => {
            const structure = gameData.structures.find((s) => s.id === employee.assignment);
            return (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                structureName={structure?.name || 'Unassigned'}
                onFire={onFireEmployee}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
