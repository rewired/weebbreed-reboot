import type { PlantState, ZoneEnvironmentState, SimulationTime } from '@/state/models.js';
import type { EventCollector } from '@/lib/eventBus.js';
import { enhancedStrainService, type StrainEnvironmentResult } from './enhancedStrainService.js';
import type { EnhancedStrainBlueprint } from './enhancedStrainInterface.js';

/**
 * Enhanced plant growth computations using the new strain evaluation system
 * This integrates with the existing plant growth engine to provide strain-aware calculations
 */
export class PlantGrowthIntegration {
  /**
   * Evaluates plant health and stress based on strain environmental preferences
   */
  evaluatePlantHealth(
    plant: PlantState,
    strain: EnhancedStrainBlueprint,
    environment: ZoneEnvironmentState,
    events: EventCollector,
    currentTime: SimulationTime,
  ): {
    environmentResult: StrainEnvironmentResult;
    healthMultiplier: number;
    growthMultiplier: number;
    yieldImpact: number;
  } {
    // Apply stress tolerance for mature plants (they can handle more stress)
    const applyStressTolerance = plant.age_days > 14; // After 2 weeks

    const environmentResult = enhancedStrainService.evaluateEnvironment(
      strain,
      environment,
      plant.stage,
      applyStressTolerance,
    );

    // Emit environmental events for monitoring
    enhancedStrainService.emitEnvironmentalEvents(
      plant.id,
      plant.zone_id,
      strain,
      environmentResult,
      currentTime.tick,
      events,
    );

    // Calculate health multiplier based on overall stress
    const healthMultiplier = 1.0 - environmentResult.overallStress * 0.3; // Max 30% health reduction

    // Growth is more sensitive to environment than health
    const growthMultiplier = 1.0 - environmentResult.overallStress * 0.5; // Max 50% growth reduction

    // Yield impact compounds over time - environmental stress during flower is critical
    let yieldImpact = 1.0;
    if (plant.stage === 'flowering' || plant.stage === 'ripening') {
      yieldImpact = 1.0 - environmentResult.overallStress * 0.7; // Up to 70% yield reduction in flower
    } else {
      yieldImpact = 1.0 - environmentResult.overallStress * 0.2; // Smaller impact in veg
    }

    return {
      environmentResult,
      healthMultiplier: Math.max(0.1, healthMultiplier), // Minimum 10% health
      growthMultiplier: Math.max(0.1, growthMultiplier), // Minimum 10% growth
      yieldImpact: Math.max(0.1, yieldImpact), // Minimum 10% yield
    };
  }

  /**
   * Calculates enhanced plant growth rate using strain-specific phase durations
   */
  calculateGrowthRate(
    plant: PlantState,
    strain: EnhancedStrainBlueprint,
    baseGrowthRate: number,
    environmentResult: StrainEnvironmentResult,
    tickLengthMinutes: number,
  ): {
    adjustedGrowthRate: number;
    phaseProgress: number;
    estimatedDaysToNextStage?: number;
  } {
    // Get strain-specific phase duration
    const phaseDurationTicks = enhancedStrainService.getPhaseDurationTicks(
      strain,
      environmentResult.phase,
      tickLengthMinutes,
    );

    // Calculate growth multiplier from environmental evaluation
    const envGrowthMultiplier = this.getEnvironmentGrowthMultiplier(environmentResult);

    const adjustedGrowthRate = baseGrowthRate * envGrowthMultiplier;

    let phaseProgress = 0;
    let estimatedDaysToNextStage: number | undefined;

    if (phaseDurationTicks) {
      // Calculate how far through current phase we are
      const ticksInCurrentPhase = plant.age_ticks; // This would need proper phase tracking
      phaseProgress = Math.min(1.0, ticksInCurrentPhase / phaseDurationTicks);

      // Estimate days to next stage at current growth rate
      if (phaseProgress < 1.0 && adjustedGrowthRate > 0) {
        const remainingTicks = phaseDurationTicks - ticksInCurrentPhase;
        const ticksAtCurrentRate = remainingTicks / adjustedGrowthRate;
        estimatedDaysToNextStage = (ticksAtCurrentRate * tickLengthMinutes) / (24 * 60);
      }
    }

    return {
      adjustedGrowthRate,
      phaseProgress,
      estimatedDaysToNextStage,
    };
  }

  /**
   * Converts environmental evaluation to growth multiplier
   */
  private getEnvironmentGrowthMultiplier(envResult: StrainEnvironmentResult): number {
    // Weight different environmental factors
    const weights = {
      temperature: 0.25,
      humidity: 0.15,
      co2: 0.2,
      ppfd: 0.3, // Light is most important for growth
      vpd: 0.1,
    };

    const getMetricMultiplier = (status: string): number => {
      switch (status) {
        case 'optimal':
          return 1.0;
        case 'acceptable':
          return 0.85;
        case 'stress':
          return 0.6;
        case 'critical':
          return 0.3;
        default:
          return 0.5;
      }
    };

    const weightedMultiplier =
      weights.temperature * getMetricMultiplier(envResult.temperature.status) +
      weights.humidity * getMetricMultiplier(envResult.humidity.status) +
      weights.co2 * getMetricMultiplier(envResult.co2.status) +
      weights.ppfd * getMetricMultiplier(envResult.ppfd.status) +
      weights.vpd * getMetricMultiplier(envResult.vpd.status);

    return Math.max(0.1, weightedMultiplier); // Minimum 10% growth rate
  }

  /**
   * Estimates final yield using enhanced strain yield model
   */
  estimateFinalYield(
    plant: PlantState,
    strain: EnhancedStrainBlueprint,
    environment: ZoneEnvironmentState,
    baseYieldPerPlant: number,
  ): {
    estimatedYield: number;
    yieldBreakdown: {
      baseYield: number;
      qualityMultiplier: number;
      co2Multiplier: number;
      environmentMultiplier: number;
    };
  } {
    const yieldResult = enhancedStrainService.calculateYield({
      strain,
      environment,
      stage: plant.stage,
      baseYield: baseYieldPerPlant,
    });

    return {
      estimatedYield: yieldResult.estimatedGrams,
      yieldBreakdown: {
        baseYield: baseYieldPerPlant,
        qualityMultiplier: yieldResult.qualityMultiplier,
        co2Multiplier: yieldResult.co2Multiplier,
        environmentMultiplier: yieldResult.environmentMultiplier,
      },
    };
  }

  /**
   * Gets cultivation method compatibility for strain selection UI
   */
  evaluateMethodCompatibility(
    strain: EnhancedStrainBlueprint,
    methodId: string,
  ): {
    compatibility: ReturnType<typeof enhancedStrainService.getMethodCompatibility>;
    recommendation: string;
  } {
    const compatibility = enhancedStrainService.getMethodCompatibility(strain, methodId);

    let recommendation: string;
    switch (compatibility.category) {
      case 'excellent':
        recommendation = `${strain.name} is perfectly suited for this cultivation method.`;
        break;
      case 'good':
        recommendation = `${strain.name} performs well with this cultivation method.`;
        break;
      case 'neutral':
        recommendation = `${strain.name} is compatible but may not be optimal for this method.`;
        break;
      case 'poor':
        recommendation = `${strain.name} may struggle with this cultivation method.`;
        break;
      case 'incompatible':
        recommendation = `${strain.name} is not recommended for this cultivation method.`;
        break;
    }

    return { compatibility, recommendation };
  }

  /**
   * Creates environmental tooltip data for UI
   */
  createEnvironmentTooltip(
    environmentResult: StrainEnvironmentResult,
    strain: EnhancedStrainBlueprint,
  ): {
    title: string;
    source: string;
    metrics: Array<{
      name: string;
      status: string;
      deviation?: number;
      description: string;
    }>;
    overallStatus: string;
  } {
    const metrics = [
      {
        name: 'Temperature',
        status: environmentResult.temperature.status,
        deviation: environmentResult.temperature.deviation,
        description: this.getMetricDescription('temperature', environmentResult.temperature.status),
      },
      {
        name: 'Humidity',
        status: environmentResult.humidity.status,
        deviation: environmentResult.humidity.deviation,
        description: this.getMetricDescription('humidity', environmentResult.humidity.status),
      },
      {
        name: 'CO₂',
        status: environmentResult.co2.status,
        deviation: environmentResult.co2.deviation,
        description: this.getMetricDescription('co2', environmentResult.co2.status),
      },
      {
        name: 'Light (PPFD)',
        status: environmentResult.ppfd.status,
        deviation: environmentResult.ppfd.deviation,
        description: this.getMetricDescription('ppfd', environmentResult.ppfd.status),
      },
      {
        name: 'VPD',
        status: environmentResult.vpd.status,
        deviation: environmentResult.vpd.deviation,
        description: this.getMetricDescription('vpd', environmentResult.vpd.status),
      },
    ];

    let overallStatus: string;
    if (environmentResult.overallStress === 0) {
      overallStatus = 'Optimal conditions for healthy growth';
    } else if (environmentResult.overallStress <= 0.3) {
      overallStatus = 'Good conditions with minor stress';
    } else if (environmentResult.overallStress <= 0.6) {
      overallStatus = 'Stressful conditions may impact growth';
    } else {
      overallStatus = 'Critical conditions - immediate attention needed';
    }

    return {
      title: `Environment: ${strain.name} (${environmentResult.phase})`,
      source: environmentResult.source,
      metrics,
      overallStatus,
    };
  }

  private getMetricDescription(metric: string, status: string): string {
    const descriptions: Record<string, Record<string, string>> = {
      temperature: {
        optimal: 'Perfect temperature range for healthy growth',
        acceptable: 'Temperature is within acceptable range',
        stress: 'Temperature stress may slow growth',
        critical: 'Dangerous temperature - risk of damage',
      },
      humidity: {
        optimal: 'Ideal humidity levels for plant health',
        acceptable: 'Humidity is within acceptable range',
        stress: 'Humidity stress may affect transpiration',
        critical: 'Extreme humidity - risk of mold or dehydration',
      },
      co2: {
        optimal: 'Excellent CO₂ levels for photosynthesis',
        acceptable: 'Good CO₂ levels for growth',
        stress: 'Low CO₂ may limit photosynthesis',
        critical: 'CO₂ levels too low for healthy growth',
      },
      ppfd: {
        optimal: 'Perfect light intensity for photosynthesis',
        acceptable: 'Adequate light for healthy growth',
        stress: 'Light stress may reduce growth rate',
        critical: 'Insufficient or excessive light intensity',
      },
      vpd: {
        optimal: 'Ideal vapor pressure deficit',
        acceptable: 'Good VPD for transpiration',
        stress: 'VPD stress may affect water uptake',
        critical: 'Extreme VPD - risk of plant stress',
      },
    };

    return descriptions[metric]?.[status] || 'Status unknown';
  }
}

// Export singleton instance
export const plantGrowthIntegration = new PlantGrowthIntegration();
