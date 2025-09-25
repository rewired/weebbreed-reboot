export const getSkillColor = (level: number): 'success' | 'warning' | 'danger' | 'default' => {
  if (level >= 8) return 'success';
  if (level >= 6) return 'warning';
  if (level >= 4) return 'default';
  return 'danger';
};

export const getSkillDescription = (level: number): string => {
  if (level >= 9) return 'Expert';
  if (level >= 7) return 'Advanced';
  if (level >= 5) return 'Proficient';
  if (level >= 3) return 'Intermediate';
  if (level >= 1) return 'Novice';
  return 'No experience';
};

export const formatSkillLevel = (level: number): string => {
  // Format float skills from 0-10 with 1 decimal place
  return level.toFixed(1);
};

export const getRoleDisplayName = (role: string): string => {
  // Convert role ID to display name (e.g., "IPMSpecialist" -> "IPM Specialist")
  return role.replace(/([A-Z])/g, ' $1').trim();
};

export const getGenderIcon = (gender?: string): string => {
  switch (gender?.toLowerCase()) {
    case 'female':
      return 'person_3';
    case 'male':
      return 'person_4';
    default:
      return 'person';
  }
};

export const getMoraleColor = (morale: number): 'success' | 'warning' | 'danger' => {
  if (morale >= 0.75) return 'success';
  if (morale >= 0.5) return 'warning';
  return 'danger';
};

export const getEnergyColor = (energy: number): 'success' | 'warning' | 'danger' => {
  if (energy >= 0.75) return 'success';
  if (energy >= 0.25) return 'warning';
  return 'danger';
};

export const getStatusColor = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
  switch (status.toLowerCase()) {
    case 'working':
      return 'success';
    case 'idle':
      return 'default';
    case 'resting':
      return 'warning';
    case 'offduty':
      return 'warning';
    default:
      return 'default';
  }
};

export const formatStatusDisplay = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};
