const CULTIVATION_METHOD_HINTS: Record<
  string,
  { name: string; areaPerPlant: number; description: string }
> = {
  '85cc0916-0e8a-495e-af8f-50291abe6855': {
    name: 'Basic Soil Pot',
    areaPerPlant: 0.5,
    description: 'One plant per soil pot. Reliable but lower density.',
  },
  '41229377-ef2d-4723-931f-72eea87d7a62': {
    name: 'Screen of Green',
    areaPerPlant: 1,
    description: 'Low-density method using horizontal training screens.',
  },
  '659ba4d7-a5fc-482e-98d4-b614341883ac': {
    name: 'Sea of Green',
    areaPerPlant: 0.25,
    description: 'High-density micro canopy with many small plants.',
  },
};

export const getCultivationMethodHint = (methodId?: string | null) =>
  methodId ? (CULTIVATION_METHOD_HINTS[methodId] ?? null) : null;
