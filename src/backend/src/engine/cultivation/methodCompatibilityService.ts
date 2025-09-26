import type { EnhancedStrainBlueprint, EnvMetric } from '../strains/enhancedStrainInterface.js';
import type { CultivationMethodBlueprint } from '@/data/schemas/cultivationMethodSchema.js';
import { getEnvBand, mapStageToPhase } from '../strains/enhancedStrainInterface.js';
import type { PlantStage } from '@/state/models.js';

export interface MethodCompatibilityResult {
  overallScore: number;
  category: 'excellent' | 'good' | 'acceptable' | 'poor' | 'incompatible';
  environmentalFit: number;
  laborFit: number;
  capacityFit: number;
  details: {
    environmental: Record<EnvMetric, { score: number; bias?: number; strain?: number }>;
    labor: { methodHours: number; strainTolerance: number };
    capacity: { methodDensity: number; strainPreference: number };
  };
}

export interface CompatibilityContext {
  strain: EnhancedStrainBlueprint;
  method: CultivationMethodBlueprint;
  stage: PlantStage;
  roomArea_m2?: number;
}

/**
 * Service to calculate compatibility between cultivation methods and strains
 * Uses method envBias vs strain environmental bands to compute scores
 */
export class MethodCompatibilityService {
  /**
   * Calculate overall compatibility between a cultivation method and strain
   */
  calculateCompatibility(context: CompatibilityContext): MethodCompatibilityResult {
    const { strain, method, stage } = context;
    const phase = mapStageToPhase(stage);

    // Calculate environmental fit using method bias vs strain bands
    const environmentalFit = this.calculateEnvironmentalFit(strain, method, phase);

    // Calculate labor fit based on method requirements vs strain characteristics
    const laborFit = this.calculateLaborFit(strain, method);

    // Calculate capacity fit based on method density vs strain characteristics
    const capacityFit = this.calculateCapacityFit(strain, method);

    // Weighted overall score
    const weights = {
      environmental: 0.6, // Environmental fit is most important
      labor: 0.25, // Labor requirements matter for practicality
      capacity: 0.15, // Space efficiency is important but secondary
    };

    const overallScore =
      environmentalFit.score * weights.environmental +
      laborFit.score * weights.labor +
      capacityFit.score * weights.capacity;

    // Categorize the compatibility
    const category = this.categorizeCompatibility(overallScore);

    return {
      overallScore,
      category,
      environmentalFit: environmentalFit.score,
      laborFit: laborFit.score,
      capacityFit: capacityFit.score,
      details: {
        environmental: environmentalFit.details,
        labor: laborFit.details,
        capacity: capacityFit.details,
      },
    };
  }

  /**
   * Calculate environmental fit by comparing method bias with strain preferences
   */
  private calculateEnvironmentalFit(
    strain: EnhancedStrainBlueprint,
    method: CultivationMethodBlueprint,
    phase: 'seedling' | 'veg' | 'flower' | 'ripening',
  ): {
    score: number;
    details: Record<EnvMetric, { score: number; bias?: number; strain?: number }>;
  } {
    const envBias = method.envBias || {};
    const metrics: EnvMetric[] = ['temp_C', 'rh_frac', 'co2_ppm', 'ppfd_umol_m2s', 'vpd_kPa'];

    const details: Record<EnvMetric, { score: number; bias?: number; strain?: number }> =
      {} as Record<EnvMetric, { score: number; bias?: number; strain?: number }>;
    const scores: number[] = [];

    for (const metric of metrics) {
      const methodBias = envBias[metric] || 0;
      const strainBand = getEnvBand(strain, metric, phase);

      let score = 1.0; // Default to perfect fit if no bias or band

      if (methodBias !== 0 && strainBand) {
        // Calculate if method bias pushes conditions into strain's preferred range
        const optimalRange = strainBand.green;
        const acceptableRange = [strainBand.yellowLow, strainBand.yellowHigh];

        // Simple compatibility scoring:
        // - Method bias that keeps within optimal range = 1.0
        // - Method bias that keeps within acceptable range = 0.7
        // - Method bias that pushes outside acceptable range = 0.3

        // For this simplified calculation, we assume method bias represents
        // typical offset from neutral conditions
        if (Math.abs(methodBias) <= (optimalRange[1] - optimalRange[0]) / 4) {
          score = 1.0; // Bias is small relative to optimal range
        } else if (Math.abs(methodBias) <= (acceptableRange[1] - acceptableRange[0]) / 2) {
          score = 0.7; // Bias is moderate but manageable
        } else {
          score = 0.3; // Large bias may create incompatibility
        }
      }

      details[metric] = {
        score,
        bias: methodBias,
        strain: strainBand ? (strainBand.green[0] + strainBand.green[1]) / 2 : undefined,
      };

      scores.push(score);
    }

    // Average environmental fit score
    const environmentalScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    return {
      score: environmentalScore,
      details,
    };
  }

  /**
   * Calculate labor fit based on method labor requirements
   */
  private calculateLaborFit(
    strain: EnhancedStrainBlueprint,
    method: CultivationMethodBlueprint,
  ): { score: number; details: { methodHours: number; strainTolerance: number } } {
    const methodHours = method.laborProfile?.hoursPerPlantPerWeek || 0.5;

    // Estimate strain labor tolerance based on resilience and method affinity
    const strainResilience = strain.generalResilience || 0.7;
    const methodAffinity = strain.methodAffinity?.[method.id] || 0.5;

    // Higher resilience and method affinity = better tolerance for labor-intensive methods
    const strainTolerance = (strainResilience + methodAffinity) / 2;

    // Score based on whether method labor requirements match strain tolerance
    let score: number;
    if (methodHours <= 0.5) {
      // Low labor methods work well with any strain
      score = 0.9 + strainTolerance * 0.1;
    } else if (methodHours <= 1.0) {
      // Moderate labor methods need some strain tolerance
      score = 0.6 + strainTolerance * 0.4;
    } else {
      // High labor methods need high strain tolerance
      score = 0.2 + strainTolerance * 0.8;
    }

    return {
      score: Math.max(0.1, Math.min(1.0, score)),
      details: {
        methodHours,
        strainTolerance,
      },
    };
  }

  /**
   * Calculate capacity fit based on method density vs strain characteristics
   */
  private calculateCapacityFit(
    strain: EnhancedStrainBlueprint,
    method: CultivationMethodBlueprint,
  ): { score: number; details: { methodDensity: number; strainPreference: number } } {
    const methodDensity = method.capacityHints?.plantsPer_m2 || 4;

    // Estimate strain density preference based on genetics
    const indicaRatio = strain.genotype.indica || 0.5;

    // Indica strains generally prefer higher density (SOG), sativa prefers lower (SCROG)
    const strainPreferredDensity = 2 + indicaRatio * 14; // Range: 2-16 plants/m²

    // Score based on how close method density is to strain preference
    const densityDifference = Math.abs(methodDensity - strainPreferredDensity);
    const maxDifference = 16; // Maximum reasonable difference

    const score = Math.max(0.2, 1.0 - densityDifference / maxDifference);

    return {
      score,
      details: {
        methodDensity,
        strainPreference: strainPreferredDensity,
      },
    };
  }

  /**
   * Categorize compatibility score into buckets
   */
  private categorizeCompatibility(
    score: number,
  ): 'excellent' | 'good' | 'acceptable' | 'poor' | 'incompatible' {
    if (score >= 0.85) return 'excellent';
    if (score >= 0.7) return 'good';
    if (score >= 0.5) return 'acceptable';
    if (score >= 0.3) return 'poor';
    return 'incompatible';
  }

  /**
   * Get compatibility recommendations based on the analysis
   */
  getRecommendations(result: MethodCompatibilityResult): string[] {
    const recommendations: string[] = [];

    if (result.environmentalFit < 0.6) {
      recommendations.push('Consider environmental adjustments to better match strain preferences');
    }

    if (result.laborFit < 0.6) {
      recommendations.push('This method may require more labor than optimal for this strain');
    }

    if (result.capacityFit < 0.6) {
      recommendations.push('Plant density may not be ideal for this strain type');
    }

    if (result.category === 'excellent') {
      recommendations.push('Excellent match - this method is ideal for this strain');
    } else if (result.category === 'incompatible') {
      recommendations.push('Not recommended - consider alternative cultivation methods');
    }

    return recommendations;
  }
}

// Export singleton instance
export const methodCompatibilityService = new MethodCompatibilityService();
