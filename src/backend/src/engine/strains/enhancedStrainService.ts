import type { ZoneEnvironmentState, PlantStage } from '@/state/types.js';
import type { EventCollector } from '@/lib/eventBus.js';
import {
  type EnhancedStrainBlueprint,
  type EnvBand,
  type EnvEvaluation,
  type GrowthPhase,
  mapStageToPhase,
  getEnvBand,
  evaluateEnvironment,
  getMethodAffinity,
  getPhaseDuration,
} from './enhancedStrainInterface.js';
import { vaporPressureDeficit } from '@/engine/physio/vpd.js';

export interface StrainEnvironmentResult {
  temperature: EnvEvaluation;
  humidity: EnvEvaluation;
  co2: EnvEvaluation;
  ppfd: EnvEvaluation;
  vpd: EnvEvaluation;
  overallStress: number;
  phase: GrowthPhase;
  source: string; // For UI tooltips - describes where bands came from
}

export interface YieldCalculationContext {
  strain: EnhancedStrainBlueprint;
  environment: ZoneEnvironmentState;
  stage: PlantStage;
  baseYield: number;
}

export interface CalculatedYield {
  estimatedGrams: number;
  qualityMultiplier: number;
  co2Multiplier: number;
  environmentMultiplier: number;
}

/**
 * Enhanced strain service that provides environmental evaluation and yield calculation
 * based on the new strain blueprint fields
 */
export class EnhancedStrainService {
  /**
   * Evaluates zone environment against strain's environmental bands
   */
  evaluateEnvironment(
    strain: EnhancedStrainBlueprint,
    environment: ZoneEnvironmentState,
    stage: PlantStage,
    applyStressTolerance: boolean = false,
  ): StrainEnvironmentResult {
    const phase = mapStageToPhase(stage);
    const tolerance = strain.stressTolerance;

    // Calculate VPD from temperature and humidity
    const vpd = vaporPressureDeficit(environment.temperature, environment.relativeHumidity);

    // Get environmental bands for each metric
    const tempBand = getEnvBand(strain, 'temp_C', phase);
    const rhBand = getEnvBand(strain, 'rh_frac', phase);
    const co2Band = getEnvBand(strain, 'co2_ppm', phase);
    const ppfdBand = getEnvBand(strain, 'ppfd_umol_m2s', phase);
    const vpdBand = getEnvBand(strain, 'vpd_kPa', phase);

    // Fallback bands if strain doesn't have envBands defined
    const defaultTempBand: EnvBand = { green: [20, 28], yellowLow: 16, yellowHigh: 32 };
    const defaultRhBand: EnvBand = { green: [0.4, 0.7], yellowLow: 0.3, yellowHigh: 0.8 };
    const defaultCo2Band: EnvBand = { green: [800, 1200], yellowLow: 600, yellowHigh: 1600 };
    const defaultPpfdBand: EnvBand = { green: [400, 800], yellowLow: 200, yellowHigh: 1200 };
    const defaultVpdBand: EnvBand = { green: [0.8, 1.4], yellowLow: 0.4, yellowHigh: 2.0 };

    // Evaluate each metric
    const temperature = evaluateEnvironment(
      environment.temperature,
      tempBand || defaultTempBand,
      applyStressTolerance,
      tolerance,
      'temp_C',
    );

    const humidity = evaluateEnvironment(
      environment.relativeHumidity,
      rhBand || defaultRhBand,
      applyStressTolerance,
      tolerance,
      'rh_frac',
    );

    const co2 = evaluateEnvironment(
      environment.co2,
      co2Band || defaultCo2Band,
      applyStressTolerance,
      tolerance,
      'co2_ppm',
    );

    const ppfd = evaluateEnvironment(
      environment.ppfd,
      ppfdBand || defaultPpfdBand,
      applyStressTolerance,
      tolerance,
      'ppfd_umol_m2s',
    );

    const vpdEval = evaluateEnvironment(
      vpd,
      vpdBand || defaultVpdBand,
      applyStressTolerance,
      tolerance,
      'vpd_kPa',
    );

    // Calculate overall stress from individual evaluations
    const stressFactors = [temperature, humidity, co2, ppfd, vpdEval].map((evaluation) => {
      switch (evaluation.status) {
        case 'optimal':
          return 0;
        case 'acceptable':
          return 0.2;
        case 'stress':
          return 0.6;
        case 'critical':
          return 1.0;
      }
    });

    const overallStress = Math.max(...stressFactors);

    // Generate source description for UI tooltips
    const hasEnvBands = !!strain.envBands;
    const hasPhaseOverride = hasEnvBands && !!strain.envBands[phase];
    const hasStressTolerance = applyStressTolerance && !!tolerance;

    let source = `${strain.name}`;
    if (hasPhaseOverride) {
      source += ` (${phase} phase)`;
    } else if (hasEnvBands) {
      source += ' (default)';
    } else {
      source += ' (fallback)';
    }
    if (hasStressTolerance) {
      source += ' + stress tolerance';
    }

    return {
      temperature,
      humidity,
      co2,
      ppfd,
      vpd: vpdEval,
      overallStress,
      phase,
      source,
    };
  }

  /**
   * Calculates expected yield based on enhanced yield model
   */
  calculateYield(context: YieldCalculationContext): CalculatedYield {
    const { strain, environment, stage, baseYield } = context;
    const yieldModel = strain.yieldModel;

    if (!yieldModel) {
      // No enhanced yield model, return base yield
      return {
        estimatedGrams: baseYield,
        qualityMultiplier: 1.0,
        co2Multiplier: 1.0,
        environmentMultiplier: 1.0,
      };
    }

    // Use base yield from strain or provided base
    const strainBaseYield = yieldModel.baseGmPerPlant || baseYield;

    // Evaluate environment for quality multipliers
    const envResult = this.evaluateEnvironment(strain, environment, stage, false);

    // Calculate quality multipliers based on environmental status
    const getQualityMultiplier = (evaluation: EnvEvaluation): number => {
      switch (evaluation.status) {
        case 'optimal':
          return 1.0;
        case 'acceptable':
          return 0.9;
        case 'stress':
          return 0.7;
        case 'critical':
          return 0.4;
      }
    };

    const qualityFactors = yieldModel.qualityFactors || {};
    const weightedQuality =
      (qualityFactors.temp || 0) * getQualityMultiplier(envResult.temperature) +
      (qualityFactors.rh || 0) * getQualityMultiplier(envResult.humidity) +
      (qualityFactors.ppfd || 0) * getQualityMultiplier(envResult.ppfd) +
      (qualityFactors.vpd || 0) * getQualityMultiplier(envResult.vpd);

    const totalWeight = Object.values(qualityFactors).reduce(
      (sum, weight) => sum + (weight || 0),
      0,
    );
    const qualityMultiplier = totalWeight > 0 ? weightedQuality / totalWeight : 1.0;

    // Calculate CO2 response multiplier
    let co2Multiplier = 1.0;
    if (yieldModel.co2Response) {
      const { saturation_ppm, halfMax_ppm } = yieldModel.co2Response;
      const co2Level = environment.co2;

      // Michaelis-Menten-like response curve
      if (co2Level <= halfMax_ppm) {
        co2Multiplier = co2Level / halfMax_ppm;
      } else {
        // Diminishing returns above half-max
        const excessCo2 = co2Level - halfMax_ppm;
        const maxExcess = saturation_ppm - halfMax_ppm;
        const excessFraction = Math.min(excessCo2 / maxExcess, 1.0);
        co2Multiplier = 1.0 + 0.5 * excessFraction; // Up to 50% bonus at saturation
      }
    }

    const environmentMultiplier = qualityMultiplier * co2Multiplier;
    const estimatedGrams = strainBaseYield * environmentMultiplier;

    return {
      estimatedGrams,
      qualityMultiplier,
      co2Multiplier,
      environmentMultiplier,
    };
  }

  /**
   * Gets cultivation method affinity for strain selection UI
   */
  getMethodCompatibility(
    strain: EnhancedStrainBlueprint,
    methodId: string,
  ): {
    affinity: number;
    category: 'excellent' | 'good' | 'neutral' | 'poor' | 'incompatible';
  } {
    const affinity = getMethodAffinity(strain, methodId);

    let category: 'excellent' | 'good' | 'neutral' | 'poor' | 'incompatible';
    if (affinity >= 0.9) category = 'excellent';
    else if (affinity >= 0.7) category = 'good';
    else if (affinity >= 0.5) category = 'neutral';
    else if (affinity >= 0.3) category = 'poor';
    else category = 'incompatible';

    return { affinity, category };
  }

  /**
   * Emits environmental evaluation events for monitoring
   */
  emitEnvironmentalEvents(
    plantId: string,
    zoneId: string,
    strain: EnhancedStrainBlueprint,
    envResult: StrainEnvironmentResult,
    tick: number,
    events: EventCollector,
  ): void {
    // Emit warnings for stressed conditions
    const stressedMetrics: Array<{ metric: string; evaluation: EnvEvaluation }> = [];

    if (envResult.temperature.status === 'stress' || envResult.temperature.status === 'critical') {
      stressedMetrics.push({ metric: 'temperature', evaluation: envResult.temperature });
    }
    if (envResult.humidity.status === 'stress' || envResult.humidity.status === 'critical') {
      stressedMetrics.push({ metric: 'humidity', evaluation: envResult.humidity });
    }
    if (envResult.co2.status === 'stress' || envResult.co2.status === 'critical') {
      stressedMetrics.push({ metric: 'co2', evaluation: envResult.co2 });
    }
    if (envResult.ppfd.status === 'stress' || envResult.ppfd.status === 'critical') {
      stressedMetrics.push({ metric: 'ppfd', evaluation: envResult.ppfd });
    }
    if (envResult.vpd.status === 'stress' || envResult.vpd.status === 'critical') {
      stressedMetrics.push({ metric: 'vpd', evaluation: envResult.vpd });
    }

    for (const { metric, evaluation } of stressedMetrics) {
      events.queue(
        'plant.environmentStress',
        {
          plantId,
          zoneId,
          strainId: strain.id,
          metric,
          status: evaluation.status,
          deviation: evaluation.deviation,
          source: envResult.source,
          phase: envResult.phase,
        },
        tick,
        evaluation.status === 'critical' ? 'error' : 'warning',
      );
    }

    // Emit info event for overall environment status
    if (envResult.overallStress === 0) {
      events.queue(
        'plant.optimalEnvironment',
        {
          plantId,
          zoneId,
          strainId: strain.id,
          source: envResult.source,
          phase: envResult.phase,
        },
        tick,
        'info',
      );
    }
  }

  /**
   * Gets phase duration in ticks for phenology calculations
   */
  getPhaseDurationTicks(
    strain: EnhancedStrainBlueprint,
    phase: keyof typeof strain.phaseDurations,
    tickLengthMinutes: number,
  ): number | undefined {
    const days = getPhaseDuration(strain, phase);
    if (!days) return undefined;

    const minutesPerDay = 24 * 60;
    const ticksPerDay = minutesPerDay / tickLengthMinutes;
    return Math.ceil(days * ticksPerDay);
  }
}

// Export singleton instance
export const enhancedStrainService = new EnhancedStrainService();
