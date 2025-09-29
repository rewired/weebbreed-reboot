export type CatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface CultivationMethodCompatibility {
  compatibleSubstrateTypes?: string[];
  compatibleContainerTypes?: string[];
  strainTraitCompatibility?: Record<string, unknown>;
}

export interface CultivationMethodCatalogEntry {
  id: string;
  name: string;
  laborIntensity: number;
  areaPerPlant: number;
  minimumSpacing: number;
  maxCycles?: number;
  compatibility: CultivationMethodCompatibility;
  envBias?: Record<string, unknown>;
  capacityHints?: Record<string, unknown>;
  laborProfile?: Record<string, unknown>;
  idealConditions?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  price?: { setupCost: number };
}

export interface ContainerCatalogEntry {
  id: string;
  slug: string;
  name: string;
  type: string;
  volumeInLiters?: number;
  footprintArea?: number;
  reusableCycles?: number;
  packingDensity?: number;
  metadata?: Record<string, unknown>;
  price?: { costPerUnit: number };
}

export interface SubstrateCatalogEntry {
  id: string;
  slug: string;
  name: string;
  type: string;
  maxCycles?: number;
  metadata?: Record<string, unknown>;
  price?: { costPerLiter: number };
}
