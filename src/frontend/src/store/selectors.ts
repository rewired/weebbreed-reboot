import type { AppStoreState, CultivationMethodOption, DeviceOption, StrainOption } from './types';

export const selectFinanceSummary = (state: AppStoreState) => state.financeSummary;

export const selectCapital = (state: AppStoreState): number => {
  return state.financeSummary?.cashOnHand ?? 0;
};

export const selectCumulativeYield = (state: AppStoreState): number => {
  return Object.values(state.plants).reduce(
    (total, plant) => total + (plant.yieldDryGrams ?? 0),
    0,
  );
};

export const selectCurrentTick = (state: AppStoreState): number => {
  return state.timeStatus?.tick ?? state.lastSnapshot?.tick ?? 0;
};

export const selectTimeStatus = (state: AppStoreState) => state.timeStatus;

export const selectLastTickEvent = (state: AppStoreState) => state.lastTickCompleted;

export const selectIsPaused = (state: AppStoreState): boolean => {
  if (state.timeStatus) {
    return Boolean(state.timeStatus.paused);
  }
  if (state.lastSnapshot?.clock) {
    return state.lastSnapshot.clock.isPaused;
  }
  return true;
};

export const selectTargetTickRate = (state: AppStoreState): number => {
  if (state.timeStatus) {
    return state.timeStatus.targetTickRate;
  }
  if (state.lastSnapshot?.clock) {
    return state.lastSnapshot.clock.targetTickRate;
  }
  return 1;
};

export const selectCurrentSpeed = (state: AppStoreState): number => {
  if (state.timeStatus) {
    return state.timeStatus.speed;
  }
  if (state.lastSnapshot?.clock) {
    return state.lastSnapshot.clock.targetTickRate;
  }
  return 1;
};

export const selectAlertEvents = (state: AppStoreState) => {
  return state.events.filter((event) => event.severity === 'warning' || event.severity === 'error');
};

export const selectRecentEvents = (limit: number) => (state: AppStoreState) => {
  if (limit <= 0) {
    return [];
  }
  return state.events.slice(-limit).reverse();
};

export const selectAlertCount = (state: AppStoreState): number => {
  return state.events.reduce((count, event) => {
    return count + (event.severity === 'warning' || event.severity === 'error' ? 1 : 0);
  }, 0);
};

export const selectSelectedStructure = (state: AppStoreState) => {
  const structureId = state.selectedStructureId;
  return structureId ? state.structures[structureId] : undefined;
};

export const selectSelectedRoom = (state: AppStoreState) => {
  const roomId = state.selectedRoomId;
  return roomId ? state.rooms[roomId] : undefined;
};

export const selectSelectedZone = (state: AppStoreState) => {
  const zoneId = state.selectedZoneId;
  return zoneId ? state.zones[zoneId] : undefined;
};

const matchesRoomPurpose = (
  purposeKind: string | undefined,
  compatibility: DeviceOption['compatibility'],
): boolean => {
  if (!purposeKind || compatibility.mode === 'all') {
    return true;
  }

  return compatibility.roomPurposes?.includes(purposeKind) ?? false;
};

export const selectDeviceOptionsForZone = (zoneId: string) => (state: AppStoreState) => {
  const zone = state.zones[zoneId];
  if (!zone) {
    return [];
  }

  const purposeKind = state.rooms[zone.roomId]?.purposeKind;
  const devices = Object.values(state.blueprintCatalog.devices);

  return devices.filter((device) => matchesRoomPurpose(purposeKind, device.compatibility));
};

const traitValueForKey = (strain: StrainOption, key: string): number | undefined => {
  return key.split('.').reduce<unknown>((current, segment) => {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, strain) as number | undefined;
};

const matchesPreferredTraits = (
  strain: StrainOption,
  compatibility: CultivationMethodOption['strainTraitCompatibility'],
): boolean => {
  if (!compatibility?.preferred) {
    return true;
  }

  return Object.entries(compatibility.preferred).every(([key, threshold]) => {
    const value = traitValueForKey(strain, key);
    if (value === undefined) {
      return true;
    }
    if (typeof threshold.min === 'number' && value < threshold.min) {
      return false;
    }
    if (typeof threshold.max === 'number' && value > threshold.max) {
      return false;
    }
    return true;
  });
};

const violatesConflictingTraits = (
  strain: StrainOption,
  compatibility: CultivationMethodOption['strainTraitCompatibility'],
): boolean => {
  if (!compatibility?.conflicting) {
    return false;
  }

  return Object.entries(compatibility.conflicting).some(([key, threshold]) => {
    const value = traitValueForKey(strain, key);
    if (value === undefined) {
      return false;
    }
    if (typeof threshold.min === 'number' && value >= threshold.min) {
      return true;
    }
    if (typeof threshold.max === 'number' && value <= threshold.max) {
      return true;
    }
    return false;
  });
};

const filterStrainsForMethod = (
  strains: StrainOption[],
  method: CultivationMethodOption | undefined,
): StrainOption[] => {
  if (!method) {
    return strains;
  }

  return strains.filter((strain) => {
    if (violatesConflictingTraits(strain, method.strainTraitCompatibility)) {
      return false;
    }
    return matchesPreferredTraits(strain, method.strainTraitCompatibility);
  });
};

export const selectStrainOptionsForZone = (zoneId: string) => (state: AppStoreState) => {
  const zone = state.zones[zoneId];
  if (!zone) {
    return Object.values(state.blueprintCatalog.strains);
  }

  const strains = Object.values(state.blueprintCatalog.strains);
  const method = zone.cultivationMethodId
    ? state.blueprintCatalog.cultivationMethods[zone.cultivationMethodId]
    : undefined;

  return filterStrainsForMethod(strains, method);
};

export const selectStrainOptions = (state: AppStoreState) => {
  return Object.values(state.blueprintCatalog.strains);
};

export const selectRecommendedPlantCount = (zoneId: string) => (state: AppStoreState) => {
  const zone = state.zones[zoneId];
  if (!zone) {
    return undefined;
  }

  const method = zone.cultivationMethodId
    ? state.blueprintCatalog.cultivationMethods[zone.cultivationMethodId]
    : undefined;

  if (method && typeof zone.area === 'number' && method.areaPerPlant > 0) {
    const recommended = Math.round(zone.area / method.areaPerPlant);
    if (Number.isFinite(recommended) && recommended > 0) {
      return recommended;
    }
  }

  if (zone.plantingPlan?.count) {
    return zone.plantingPlan.count;
  }

  const livePlantCount = zone.plants?.length;
  if (typeof livePlantCount === 'number' && livePlantCount > 0) {
    return livePlantCount;
  }

  return undefined;
};
