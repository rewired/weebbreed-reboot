export interface StrainBlueprint {
  id: string;
  slug?: string;
  name: string;
  generalResilience: number;
  growthModel: {
    maxBiomassDry_g: number;
    baseLUE_gPerMol: number;
    phaseCapMultiplier: Record<string, number>;
    temperature: {
      Q10: number;
      T_ref_C: number;
    };
  };
  environmentalPreferences: {
    idealTemperature: Record<string, [number, number]>;
    idealHumidity: Record<string, [number, number]>;
    lightIntensity: Record<string, [number, number]>;
  };
  nutrientDemand: {
    dailyNutrientDemand: Record<string, {
      nitrogen: number;
      phosphorus: number;
      potassium: number;
    }>;
    dailyWaterDemand_L_m2?: Record<string, number>;
  };
  morphology: {
    leafAreaIndex: number;
  };
  phenology?: {
    stageLengthsDays?: Record<string, number>;
  };
}

export interface DeviceBlueprint {
  id: string;
  slug?: string;
  name: string;
  kind: string;
  settings?: Record<string, unknown>;
  coverageArea_m2?: number;
  airflow_m3_h?: number;
  coolingCapacity_kW?: number;
  power_kW?: number;
  ppfd_umol_m2_s?: number;
}

export interface CultivationMethodBlueprint {
  id: string;
  slug?: string;
  name: string;
  areaPerPlant: number;
  containerSpec?: {
    volumeL: number;
  };
}

export interface BlueprintBundle {
  strains: StrainBlueprint[];
  devices: DeviceBlueprint[];
  cultivationMethods: CultivationMethodBlueprint[];
}
