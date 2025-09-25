import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/primitives/Badge';
import { useUIStore } from '@/store/ui';
import type { ApplicantSnapshot } from '@/types/simulation';

interface CandidateCardProps {
  applicant: ApplicantSnapshot;
  className?: string;
}

export const CandidateCard = ({ applicant, className }: CandidateCardProps) => {
  const openModal = useUIStore((state) => state.openModal);

  const skillEntries = Object.entries(applicant.skills).filter(([, level]) => level && level > 0);

  const getSkillColor = (level: number): 'success' | 'warning' | 'danger' | 'default' => {
    if (level >= 8) return 'success';
    if (level >= 6) return 'warning';
    if (level >= 4) return 'default';
    return 'danger';
  };

  const getSkillDescription = (level: number): string => {
    if (level >= 9) return 'Expert';
    if (level >= 7) return 'Advanced';
    if (level >= 5) return 'Proficient';
    if (level >= 3) return 'Intermediate';
    if (level >= 1) return 'Novice';
    return 'No experience';
  };

  const formatSkillLevel = (level: number): string => {
    // Format float skills from 0-10 with 1 decimal place
    return level.toFixed(1);
  };

  const getRoleDisplayName = (role: string): string => {
    // Convert role ID to display name (e.g., "IPMSpecialist" -> "IPM Specialist")
    return role.replace(/([A-Z])/g, ' $1').trim();
  };

  const getGenderIcon = (gender?: string): string => {
    switch (gender?.toLowerCase()) {
      case 'female':
        return 'person_3';
      case 'male':
        return 'person_4';
      default:
        return 'person';
    }
  };

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Icon name={getGenderIcon(applicant.gender)} size={20} />
          {applicant.name}
        </div>
      }
      subtitle={`${getRoleDisplayName(applicant.desiredRole)} • €${applicant.expectedSalary.toLocaleString()}/tick`}
      action={
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="primary"
            icon={<Icon name="person_add" />}
            onClick={() =>
              openModal({
                id: `hire-applicant-${applicant.id}`,
                type: 'hireApplicant',
                title: `Hire ${applicant.name}`,
                subtitle: `Review terms and confirm hiring as ${getRoleDisplayName(applicant.desiredRole)}`,
                context: { applicantId: applicant.id },
              })
            }
          >
            Hire
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<Icon name="close" />}
            onClick={() =>
              openModal({
                id: `reject-applicant-${applicant.id}`,
                type: 'rejectApplicant',
                title: `Reject ${applicant.name}`,
                subtitle: 'Confirm rejection of this applicant',
                context: { applicantId: applicant.id },
              })
            }
          >
            Reject
          </Button>
        </div>
      }
      className={`border-dashed border-primary/30 bg-surface-muted/40 ${className || ''}`}
    >
      <div className="flex flex-col gap-4">
        {/* Traits Section */}
        {applicant.traits.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {applicant.traits.map((trait) => (
              <Badge key={trait} tone="default" className="text-xs">
                <Icon name="psychology" size={12} className="mr-1" />
                {trait}
              </Badge>
            ))}
          </div>
        )}

        {/* Skills Section */}
        {skillEntries.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Icon name="star" size={16} className="text-warning" />
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Skills & Experience
              </span>
            </div>
            <div className="grid gap-2">
              {skillEntries.map(([skill, level]) => (
                <div key={skill} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text">{skill}</span>
                    <span className="text-xs text-text-muted">({getSkillDescription(level)})</span>
                  </div>
                  <Badge tone={getSkillColor(level)} className="font-mono text-xs">
                    {formatSkillLevel(level)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personal Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {applicant.gender && (
            <div className="flex items-center gap-2">
              <Icon name="badge" size={14} className="text-text-muted" />
              <span className="text-text-muted">
                {applicant.gender.charAt(0).toUpperCase() + applicant.gender.slice(1)}
              </span>
            </div>
          )}
          {applicant.personalSeed && (
            <div className="flex items-center gap-2">
              <Icon name="fingerprint" size={14} className="text-text-muted" />
              <span className="font-mono text-xs text-text-muted">
                ID: {applicant.personalSeed.slice(0, 8)}
              </span>
            </div>
          )}
        </div>

        {/* Application Summary */}
        <div className="rounded-lg bg-surface-elevated/50 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Total Skills</span>
            <Badge tone="default">{skillEntries.length}</Badge>
          </div>
          {skillEntries.length > 0 && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-text-muted">Avg. Level</span>
              <Badge
                tone={getSkillColor(
                  skillEntries.reduce((sum, [, level]) => sum + level, 0) / skillEntries.length,
                )}
              >
                {formatSkillLevel(
                  skillEntries.reduce((sum, [, level]) => sum + level, 0) / skillEntries.length,
                )}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
