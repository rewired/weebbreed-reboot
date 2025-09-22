import type { SimulationPhaseContext } from '@/sim/loop.js';
import type {
  AppliedTreatmentRecord,
  DiseaseState,
  DiseaseTreatmentEffectState,
  HealthTarget,
  PendingTreatmentApplication,
  PestState,
  PestTreatmentEffectState,
  PlantHealthState,
  PlantState,
  ZoneHealthState,
  ZoneState,
} from '@/state/models.js';
import {
  clamp,
  mapStageToHealthPhase,
  type DiseaseBalancingConfig,
  type DiseasePhaseKey,
  type PestBalancingConfig,
  type PestPhaseKey,
  type TreatmentOption,
  type TreatmentOptionIndex,
} from './models.js';

const DISEASE_DETECTION_THRESHOLD = 0.18;
const PEST_DETECTION_THRESHOLD = 0.22;
const DISEASE_SPREAD_THRESHOLD = 0.6;
const PEST_SPREAD_THRESHOLD = 0.6;

interface CombinedDiseaseTreatmentEffect {
  infection: number;
  degeneration: number;
  recovery: number;
}

interface CombinedPestTreatmentEffect {
  reproduction: number;
  mortality: number;
  damage: number;
}

export interface PlantHealthEngineOptions {
  diseaseBalancing: DiseaseBalancingConfig;
  pestBalancing: PestBalancingConfig;
  treatmentOptions: TreatmentOption[] | TreatmentOptionIndex;
}

const DEFAULT_DISEASE_PHASE: Record<
  DiseasePhaseKey,
  { infection: number; degeneration: number; recovery: number }
> = {
  seedling: { infection: 1, degeneration: 1, recovery: 1 },
  vegetation: { infection: 1, degeneration: 1, recovery: 1 },
  earlyFlower: { infection: 1, degeneration: 1, recovery: 1 },
  lateFlower: { infection: 1, degeneration: 1, recovery: 1 },
  ripening: { infection: 1, degeneration: 1, recovery: 1 },
};

const DEFAULT_PEST_PHASE: Record<
  PestPhaseKey,
  { reproduction: number; mortality: number; damage: number }
> = {
  seedling: { reproduction: 1, mortality: 1, damage: 1 },
  vegetation: { reproduction: 1, mortality: 1, damage: 1 },
  earlyFlower: { reproduction: 1, mortality: 1, damage: 1 },
  lateFlower: { reproduction: 1, mortality: 1, damage: 1 },
  ripening: { reproduction: 1, mortality: 1, damage: 1 },
};

const DEFAULT_TREATMENT_DURATION_DAYS = 1;
const MIN_EFFECTIVE_RATE = 0;
const MAX_EFFECTIVE_RATE = 10;

const ensureOptionsIndex = (
  options: TreatmentOption[] | TreatmentOptionIndex,
): TreatmentOptionIndex => {
  if (options instanceof Map) {
    return options;
  }
  const map = new Map<string, TreatmentOption>();
  for (const option of options) {
    map.set(option.id, option);
  }
  return map;
};

export class PlantHealthEngine {
  private readonly diseaseBalancing: DiseaseBalancingConfig;

  private readonly pestBalancing: PestBalancingConfig;

  private readonly treatmentOptions: TreatmentOptionIndex;

  constructor(options: PlantHealthEngineOptions) {
    this.diseaseBalancing = options.diseaseBalancing;
    this.pestBalancing = options.pestBalancing;
    this.treatmentOptions = ensureOptionsIndex(options.treatmentOptions);
  }

  createDetectionPhaseHandler() {
    return (context: SimulationPhaseContext) => {
      this.runDetection(context);
    };
  }

  createProgressionPhaseHandler() {
    return (context: SimulationPhaseContext) => {
      this.runProgression(context);
    };
  }

  createSpreadPhaseHandler() {
    return (context: SimulationPhaseContext) => {
      this.runSpread(context);
    };
  }

  createTreatmentPhaseHandler() {
    return (context: SimulationPhaseContext) => {
      this.runTreatmentApplication(context);
    };
  }

  runDetection(context: SimulationPhaseContext): void {
    const tick = context.tick;

    for (const structure of context.state.structures) {
      for (const room of structure.rooms) {
        for (const zone of room.zones) {
          this.syncZoneHealth(zone);
          const zoneHealth = zone.health;

          for (const plant of zone.plants) {
            const health = this.ensurePlantHealth(zone, plant);

            for (const disease of health.diseases) {
              if (disease.infection <= 0) {
                continue;
              }
              disease.symptomTimerTicks = Math.max(disease.symptomTimerTicks - 1, 0);
              if (disease.detected) {
                continue;
              }
              if (
                disease.symptomTimerTicks <= 0 ||
                disease.severity >= DISEASE_DETECTION_THRESHOLD
              ) {
                disease.detected = true;
                disease.detectionTick = tick;
              }
            }

            for (const pest of health.pests) {
              if (pest.population <= 0) {
                continue;
              }
              pest.symptomTimerTicks = Math.max(pest.symptomTimerTicks - 1, 0);
              if (pest.detected) {
                continue;
              }
              if (pest.symptomTimerTicks <= 0 || pest.population >= PEST_DETECTION_THRESHOLD) {
                pest.detected = true;
                pest.detectionTick = tick;
                context.events.queue(
                  'pest.detected',
                  {
                    zoneId: zone.id,
                    plantId: plant.id,
                    pestId: pest.pestId,
                    infestationId: pest.id,
                  },
                  tick,
                );
              }
            }

            zoneHealth.plantHealth[plant.id] = health;
          }
        }
      }
    }
  }

  runProgression(context: SimulationPhaseContext): void {
    const tickFraction = this.computeTickFractionOfDay(context.tickLengthMinutes);
    if (tickFraction <= 0) {
      return;
    }

    for (const structure of context.state.structures) {
      for (const room of structure.rooms) {
        for (const zone of room.zones) {
          this.syncZoneHealth(zone);

          for (const plant of zone.plants) {
            const health = this.ensurePlantHealth(zone, plant);

            for (const disease of health.diseases) {
              this.cleanupDiseaseTreatments(disease, context.tick);
              this.progressDisease(disease, plant, tickFraction);
            }

            for (const pest of health.pests) {
              this.cleanupPestTreatments(pest, context.tick);
              this.progressPest(pest, plant, tickFraction);
            }
          }
        }
      }
    }
  }

  runSpread(context: SimulationPhaseContext): void {
    const ticksPerDay = this.computeTicksPerDay(context.tickLengthMinutes);
    const diseaseSymptomDelayTicks = this.computeSymptomDelayTicks(ticksPerDay);

    for (const structure of context.state.structures) {
      for (const room of structure.rooms) {
        for (const zone of room.zones) {
          this.syncZoneHealth(zone);
          const zoneHealth = zone.health;

          for (const plant of zone.plants) {
            const health = this.ensurePlantHealth(zone, plant);

            for (const disease of health.diseases) {
              if (disease.infection < DISEASE_SPREAD_THRESHOLD) {
                continue;
              }
              if (
                !this.canSpread(disease.lastSpreadTick, disease.spreadCooldownTicks, context.tick)
              ) {
                continue;
              }
              const target = this.findSpreadTarget(
                zone,
                plant.id,
                zoneHealth,
                'disease',
                this.diseaseBalancing.global.maxConcurrentDiseases,
                (targetHealth) =>
                  targetHealth.diseases.some((item) => item.pathogenId === disease.pathogenId),
              );
              if (!target) {
                continue;
              }
              const targetHealth = this.ensurePlantHealth(zone, target);
              targetHealth.diseases.push({
                id: `${disease.pathogenId}-${target.id}-${context.tick}`,
                pathogenId: disease.pathogenId,
                severity: 0.05,
                infection: 0.12,
                detected: false,
                symptomTimerTicks: diseaseSymptomDelayTicks,
                spreadCooldownTicks: disease.spreadCooldownTicks,
                baseInfectionRatePerDay: disease.baseInfectionRatePerDay,
                baseRecoveryRatePerDay: disease.baseRecoveryRatePerDay,
                baseDegenerationRatePerDay: disease.baseDegenerationRatePerDay,
                phaseOverride: disease.phaseOverride,
                activeTreatments: [],
              });
              disease.lastSpreadTick = context.tick;
            }

            for (const pest of health.pests) {
              if (pest.population < PEST_SPREAD_THRESHOLD) {
                continue;
              }
              if (!this.canSpread(pest.lastSpreadTick, pest.spreadCooldownTicks, context.tick)) {
                continue;
              }
              const target = this.findSpreadTarget(
                zone,
                plant.id,
                zoneHealth,
                'pest',
                this.pestBalancing.global.maxConcurrentPests,
                (targetHealth) => targetHealth.pests.some((item) => item.pestId === pest.pestId),
              );
              if (!target) {
                continue;
              }
              const targetHealth = this.ensurePlantHealth(zone, target);
              targetHealth.pests.push({
                id: `${pest.pestId}-${target.id}-${context.tick}`,
                pestId: pest.pestId,
                population: 0.15,
                damage: 0.05,
                detected: false,
                symptomTimerTicks: Math.max(1, Math.round(ticksPerDay * 0.5)),
                spreadCooldownTicks: pest.spreadCooldownTicks,
                baseReproductionRatePerDay: pest.baseReproductionRatePerDay,
                baseMortalityRatePerDay: pest.baseMortalityRatePerDay,
                baseDamageRatePerDay: pest.baseDamageRatePerDay,
                phaseOverride: pest.phaseOverride,
                activeTreatments: [],
              });
              pest.lastSpreadTick = context.tick;
            }
          }
        }
      }
    }
  }

  runTreatmentApplication(context: SimulationPhaseContext): void {
    const ticksPerDay = this.computeTicksPerDay(context.tickLengthMinutes);

    for (const structure of context.state.structures) {
      for (const room of structure.rooms) {
        for (const zone of room.zones) {
          this.syncZoneHealth(zone);
          const zoneHealth = zone.health;
          const remaining: PendingTreatmentApplication[] = [];

          for (const pending of zoneHealth.pendingTreatments) {
            if (pending.scheduledTick > context.tick) {
              remaining.push(pending);
              continue;
            }
            const option = this.treatmentOptions.get(pending.optionId);
            if (!option) {
              continue;
            }
            if (!option.targets.includes(pending.target)) {
              continue;
            }
            const durationTicks = this.computeEffectDurationTicks(option, ticksPerDay);
            const reentryTicks = pending.reentryIntervalTicks ?? option.reentryIntervalTicks ?? 0;
            const harvestTicks =
              pending.preHarvestIntervalTicks ?? option.preHarvestIntervalTicks ?? 0;

            const treatedPlants = this.applyTreatmentToZone(
              zone,
              pending,
              option,
              durationTicks,
              context.tick,
            );

            if (treatedPlants.length > 0) {
              if (reentryTicks > 0) {
                const until = context.tick + reentryTicks;
                zoneHealth.reentryRestrictedUntilTick = Math.max(
                  zoneHealth.reentryRestrictedUntilTick ?? 0,
                  until,
                );
              }
              if (harvestTicks > 0) {
                const until = context.tick + harvestTicks;
                zoneHealth.preHarvestRestrictedUntilTick = Math.max(
                  zoneHealth.preHarvestRestrictedUntilTick ?? 0,
                  until,
                );
              }

              const record: AppliedTreatmentRecord = {
                optionId: option.id,
                target: pending.target,
                plantIds: treatedPlants,
                appliedTick: context.tick,
                reentryRestrictedUntilTick:
                  reentryTicks > 0 ? context.tick + reentryTicks : undefined,
                preHarvestRestrictedUntilTick:
                  harvestTicks > 0 ? context.tick + harvestTicks : undefined,
              };
              zoneHealth.appliedTreatments.push(record);

              context.events.queue(
                'treatment.applied',
                {
                  zoneId: zone.id,
                  plantIds: treatedPlants,
                  optionId: option.id,
                  target: pending.target,
                  reentryRestrictedUntilTick: zoneHealth.reentryRestrictedUntilTick,
                  preHarvestRestrictedUntilTick: zoneHealth.preHarvestRestrictedUntilTick,
                },
                context.tick,
              );
            }
          }

          zoneHealth.pendingTreatments = remaining;
        }
      }
    }
  }

  private syncZoneHealth(zone: ZoneState): void {
    const zoneHealth = zone.health;
    for (const plant of zone.plants) {
      if (!zoneHealth.plantHealth[plant.id]) {
        zoneHealth.plantHealth[plant.id] = { diseases: [], pests: [] } satisfies PlantHealthState;
      }
    }
  }

  private ensurePlantHealth(zone: ZoneState, plant: PlantState): PlantHealthState {
    const state = zone.health.plantHealth[plant.id];
    if (state) {
      return state;
    }
    const created: PlantHealthState = { diseases: [], pests: [] };
    zone.health.plantHealth[plant.id] = created;
    return created;
  }

  private cleanupDiseaseTreatments(disease: DiseaseState, tick: number): void {
    disease.activeTreatments = disease.activeTreatments.filter(
      (effect) => effect.expiresTick > tick,
    );
  }

  private cleanupPestTreatments(pest: PestState, tick: number): void {
    pest.activeTreatments = pest.activeTreatments.filter((effect) => effect.expiresTick > tick);
  }

  private progressDisease(disease: DiseaseState, plant: PlantState, tickFraction: number): void {
    if (tickFraction <= 0) {
      return;
    }
    const phaseKey =
      (disease.phaseOverride as DiseasePhaseKey | undefined) ?? mapStageToHealthPhase(plant.stage);
    const phase =
      this.diseaseBalancing.phaseMultipliers[phaseKey] ?? DEFAULT_DISEASE_PHASE[phaseKey];
    const treatment = this.combineDiseaseTreatments(disease.activeTreatments);

    const infectionRatePerDay = clamp(
      disease.baseInfectionRatePerDay *
        this.diseaseBalancing.global.baseDailyInfectionMultiplier *
        phase.infection *
        treatment.infection,
      MIN_EFFECTIVE_RATE,
      MAX_EFFECTIVE_RATE,
    );

    const recoveryRatePerDay = clamp(
      disease.baseRecoveryRatePerDay *
        this.diseaseBalancing.global.baseRecoveryMultiplier *
        phase.recovery *
        treatment.recovery,
      this.diseaseBalancing.caps.minDailyRecovery,
      this.diseaseBalancing.caps.maxDailyRecovery,
    );

    const degenerationRatePerDay = clamp(
      disease.baseDegenerationRatePerDay * phase.degeneration * treatment.degeneration,
      this.diseaseBalancing.caps.minDailyDegeneration,
      this.diseaseBalancing.caps.maxDailyDegeneration,
    );

    const infectionGrowth = infectionRatePerDay * (1 - disease.infection);
    const infectionReduction = recoveryRatePerDay * disease.infection;
    const infectionDelta = (infectionGrowth - infectionReduction) * tickFraction;
    disease.infection = clamp(disease.infection + infectionDelta, 0, 1);

    const severityDelta =
      (degenerationRatePerDay * disease.infection - recoveryRatePerDay) * tickFraction;
    disease.severity = clamp(disease.severity + severityDelta, 0, 1);
  }

  private progressPest(pest: PestState, plant: PlantState, tickFraction: number): void {
    if (tickFraction <= 0) {
      return;
    }
    const phaseKey =
      (pest.phaseOverride as PestPhaseKey | undefined) ?? mapStageToHealthPhase(plant.stage);
    const phase = this.pestBalancing.phaseMultipliers[phaseKey] ?? DEFAULT_PEST_PHASE[phaseKey];
    const treatment = this.combinePestTreatments(pest.activeTreatments);

    const reproductionRatePerDay = clamp(
      pest.baseReproductionRatePerDay *
        this.pestBalancing.global.baseDailyReproductionMultiplier *
        phase.reproduction *
        treatment.reproduction,
      this.pestBalancing.caps.minDailyReproduction,
      this.pestBalancing.caps.maxDailyReproduction,
    );

    const mortalityRatePerDay = clamp(
      pest.baseMortalityRatePerDay *
        this.pestBalancing.global.baseDailyMortalityMultiplier *
        phase.mortality *
        treatment.mortality,
      this.pestBalancing.caps.minDailyMortality,
      this.pestBalancing.caps.maxDailyMortality,
    );

    const damageRatePerDay = clamp(
      pest.baseDamageRatePerDay *
        this.pestBalancing.global.baseDamageMultiplier *
        phase.damage *
        treatment.damage,
      this.pestBalancing.caps.minDailyDamage,
      this.pestBalancing.caps.maxDailyDamage,
    );

    const populationGrowth = reproductionRatePerDay * (1 - pest.population);
    const populationReduction = mortalityRatePerDay * pest.population;
    const populationDelta = (populationGrowth - populationReduction) * tickFraction;
    pest.population = clamp(pest.population + populationDelta, 0, 1);

    const damageDelta = damageRatePerDay * pest.population * tickFraction;
    pest.damage = clamp(pest.damage + damageDelta, 0, 1);
  }

  private combineDiseaseTreatments(
    effects: DiseaseTreatmentEffectState[],
  ): CombinedDiseaseTreatmentEffect {
    return effects.reduce<CombinedDiseaseTreatmentEffect>(
      (acc, effect) => ({
        infection: acc.infection * (effect.infectionMultiplier ?? 1),
        degeneration: acc.degeneration * (effect.degenerationMultiplier ?? 1),
        recovery: acc.recovery * (effect.recoveryMultiplier ?? 1),
      }),
      { infection: 1, degeneration: 1, recovery: 1 },
    );
  }

  private combinePestTreatments(effects: PestTreatmentEffectState[]): CombinedPestTreatmentEffect {
    return effects.reduce<CombinedPestTreatmentEffect>(
      (acc, effect) => ({
        reproduction: acc.reproduction * (effect.reproductionMultiplier ?? 1),
        mortality: acc.mortality * (effect.mortalityMultiplier ?? 1),
        damage: acc.damage * (effect.damageMultiplier ?? 1),
      }),
      { reproduction: 1, mortality: 1, damage: 1 },
    );
  }

  private findSpreadTarget(
    zone: ZoneState,
    sourcePlantId: string,
    zoneHealth: ZoneHealthState,
    target: HealthTarget,
    maxConcurrent: number,
    hasMatching: (health: PlantHealthState) => boolean,
  ): PlantState | undefined {
    for (const candidate of zone.plants) {
      if (candidate.id === sourcePlantId) {
        continue;
      }
      const health = zoneHealth.plantHealth[candidate.id] ?? { diseases: [], pests: [] };
      const currentCount = target === 'disease' ? health.diseases.length : health.pests.length;
      if (currentCount >= maxConcurrent) {
        continue;
      }
      if (hasMatching(health)) {
        continue;
      }
      return candidate;
    }
    return undefined;
  }

  private canSpread(
    lastSpreadTick: number | undefined,
    cooldownTicks: number,
    currentTick: number,
  ): boolean {
    if (cooldownTicks <= 0) {
      return true;
    }
    if (lastSpreadTick === undefined) {
      return true;
    }
    return currentTick - lastSpreadTick >= cooldownTicks;
  }

  private applyTreatmentToZone(
    zone: ZoneState,
    pending: PendingTreatmentApplication,
    option: TreatmentOption,
    durationTicks: number,
    tick: number,
  ): string[] {
    const treatedPlantIds: string[] = [];

    for (const plantId of pending.plantIds) {
      const plant = zone.plants.find((item) => item.id === plantId);
      if (!plant) {
        continue;
      }
      const plantHealth = this.ensurePlantHealth(zone, plant);
      let applied = false;
      if (pending.target === 'disease') {
        applied = this.applyTreatmentToDiseases(plantHealth, pending, option, durationTicks, tick);
      } else if (pending.target === 'pest') {
        applied = this.applyTreatmentToPests(plantHealth, pending, option, durationTicks, tick);
      }
      if (applied) {
        treatedPlantIds.push(plant.id);
      }
    }

    return treatedPlantIds;
  }

  private applyTreatmentToDiseases(
    plantHealth: PlantHealthState,
    pending: PendingTreatmentApplication,
    option: TreatmentOption,
    durationTicks: number,
    tick: number,
  ): boolean {
    const diseaseIds = pending.diseaseIds ?? [];
    const targetDiseases =
      diseaseIds.length > 0
        ? plantHealth.diseases.filter(
            (disease) => diseaseIds.includes(disease.id) || diseaseIds.includes(disease.pathogenId),
          )
        : plantHealth.diseases;
    if (targetDiseases.length === 0) {
      return false;
    }

    const balancingEffect = this.diseaseBalancing.treatmentEfficacy[option.category] ?? {};
    const optionEffect = option.efficacy?.disease ?? {};
    const effect: DiseaseTreatmentEffectState = {
      optionId: option.id,
      expiresTick: tick + durationTicks,
      infectionMultiplier:
        (balancingEffect.infectionMultiplier ?? 1) * (optionEffect.infectionMultiplier ?? 1),
      degenerationMultiplier:
        (balancingEffect.degenerationMultiplier ?? 1) * (optionEffect.degenerationMultiplier ?? 1),
      recoveryMultiplier:
        (balancingEffect.recoveryMultiplier ?? 1) * (optionEffect.recoveryMultiplier ?? 1),
    };

    for (const disease of targetDiseases) {
      disease.activeTreatments.push({ ...effect });
    }

    return true;
  }

  private applyTreatmentToPests(
    plantHealth: PlantHealthState,
    pending: PendingTreatmentApplication,
    option: TreatmentOption,
    durationTicks: number,
    tick: number,
  ): boolean {
    const pestIds = pending.pestIds ?? [];
    const targetPests =
      pestIds.length > 0
        ? plantHealth.pests.filter(
            (pest) => pestIds.includes(pest.id) || pestIds.includes(pest.pestId),
          )
        : plantHealth.pests;
    if (targetPests.length === 0) {
      return false;
    }

    const balancingEffect = this.pestBalancing.controlEfficacy[option.category] ?? {};
    const optionEffect = option.efficacy?.pest ?? {};
    const effect: PestTreatmentEffectState = {
      optionId: option.id,
      expiresTick: tick + durationTicks,
      reproductionMultiplier:
        (balancingEffect.reproductionMultiplier ?? 1) * (optionEffect.reproductionMultiplier ?? 1),
      mortalityMultiplier:
        (balancingEffect.mortalityMultiplier ?? 1) * (optionEffect.mortalityMultiplier ?? 1),
      damageMultiplier:
        (balancingEffect.damageMultiplier ?? 1) * (optionEffect.damageMultiplier ?? 1),
    };

    for (const pest of targetPests) {
      pest.activeTreatments.push({ ...effect });
    }

    return true;
  }

  private computeTickFractionOfDay(tickLengthMinutes: number): number {
    const hours = this.computeTickHours(tickLengthMinutes);
    if (hours <= 0) {
      return 0;
    }
    return hours / 24;
  }

  private computeTicksPerDay(tickLengthMinutes: number): number {
    const hours = this.computeTickHours(tickLengthMinutes);
    if (hours <= 0) {
      return 24;
    }
    const ticks = 24 / hours;
    return Math.max(1, Math.round(ticks));
  }

  private computeTickHours(tickLengthMinutes: number): number {
    return Math.max(tickLengthMinutes, 0) / 60;
  }

  private computeEffectDurationTicks(option: TreatmentOption, ticksPerDay: number): number {
    const durationDays =
      option.effectDurationDays ?? option.cooldownDays ?? DEFAULT_TREATMENT_DURATION_DAYS;
    if (ticksPerDay <= 0) {
      return Math.max(1, Math.round(durationDays * 24));
    }
    return Math.max(1, Math.round(durationDays * ticksPerDay));
  }

  private computeSymptomDelayTicks(ticksPerDay: number): number {
    const { min, max } = this.diseaseBalancing.global.symptomDelayDays;
    const averageDays = clamp((min + max) / 2, 0, 30);
    if (ticksPerDay <= 0) {
      return Math.max(1, Math.round(averageDays * 24));
    }
    return Math.max(1, Math.round(averageDays * ticksPerDay));
  }
}
