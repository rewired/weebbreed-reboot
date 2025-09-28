import type {
  DeviceSnapshot,
  SimulationEvent,
  SimulationSnapshot,
  SimulationTimeStatus,
  SimulationUpdateEntry,
  ZoneSnapshot,
} from '@/types/simulation';

const createDevice = (overrides: Partial<DeviceSnapshot>): DeviceSnapshot => ({
  id: 'device-unknown',
  blueprintId: 'generic-blueprint',
  kind: 'device',
  name: 'Device',
  zoneId: 'zone-a',
  status: 'operational',
  efficiency: 1,
  runtimeHours: 0,
  maintenance: {
    lastServiceTick: 0,
    nextDueTick: 8640,
    condition: 0.98,
    degradation: 0.02,
  },
  settings: {},
  ...overrides,
});

const now = new Date();

const baseZone = (overrides: Partial<ZoneSnapshot>): ZoneSnapshot => {
  const zoneId = overrides.id ?? 'zone-a';
  const environment = overrides.environment ?? {
    temperature: 24.2,
    relativeHumidity: 0.62,
    co2: 980,
    ppfd: 540,
    vpd: 1.3,
  };

  const defaultDevices: DeviceSnapshot[] = [
    createDevice({
      id: 'device-light-a1',
      blueprintId: 'grow-light-600w',
      kind: 'lighting',
      name: 'GrowLight A1',
      zoneId,
      settings: { ppfd: 540, power: 0.88, coverageArea: 12 },
    }),
    createDevice({
      id: 'device-light-a2',
      blueprintId: 'grow-light-600w',
      kind: 'lighting',
      name: 'GrowLight A2',
      zoneId,
      settings: { ppfd: 540, power: 0.86, coverageArea: 12 },
    }),
    createDevice({
      id: 'device-climate-a1',
      blueprintId: 'climate-unit-4t',
      kind: 'climate',
      name: 'Climate Unit',
      zoneId,
      settings: { targetTemperature: 24, airflow: 2400 },
    }),
    createDevice({
      id: 'device-dehum-a1',
      blueprintId: 'dehumidifier-xl',
      kind: 'dehumidifier',
      name: 'Dehumidifier',
      zoneId,
      settings: { targetHumidity: 0.6 },
    }),
    createDevice({
      id: 'device-co2-a1',
      blueprintId: 'co2-injector',
      kind: 'co2',
      name: 'CO₂ Injector',
      zoneId,
      settings: { targetCO2: 1000 },
    }),
  ];

  const defaultPlants = [
    {
      id: 'plant-01',
      strainId: 'ak-47',
      strainName: 'AK-47',
      stage: 'vegetation',
      health: 0.94,
      stress: 0.08,
      biomassDryGrams: 142,
      yieldDryGrams: 0,
      zoneId,
      structureId: 'structure-omega',
      roomId: 'room-cultivation',
    },
    {
      id: 'plant-02',
      strainId: 'ak-47',
      strainName: 'AK-47',
      stage: 'vegetation',
      health: 0.92,
      stress: 0.12,
      biomassDryGrams: 135,
      yieldDryGrams: 0,
      zoneId,
      structureId: 'structure-omega',
      roomId: 'room-cultivation',
    },
    {
      id: 'plant-03',
      strainId: 'ak-47',
      strainName: 'AK-47',
      stage: 'vegetation',
      health: 0.9,
      stress: 0.15,
      biomassDryGrams: 137,
      yieldDryGrams: 0,
      zoneId,
      structureId: 'structure-omega',
      roomId: 'room-cultivation',
    },
  ];

  return {
    id: zoneId,
    name: 'Zone Alpha',
    structureId: 'structure-omega',
    structureName: 'Omega Warehouse',
    roomId: 'room-cultivation',
    roomName: 'Cultivation Wing',
    area: 20,
    ceilingHeight: 2.5,
    volume: 50,
    cultivationMethodId: 'method-sog',
    environment,
    resources: {
      waterLiters: 9000,
      nutrientSolutionLiters: 1800,
      nutrientStrength: 1.2,
      substrateHealth: 0.92,
      reservoirLevel: 0.78,
      lastTranspirationLiters: 128,
    },
    metrics: {
      averageTemperature: 24.1,
      averageHumidity: 0.61,
      averageCo2: 972,
      averagePpfd: 538,
      stressLevel: 0.12,
      lastUpdatedTick: 128,
    },
    health: {
      diseases: 0,
      pests: 0,
      pendingTreatments: 0,
      appliedTreatments: 0,
    },
    control: overrides.control ?? {
      setpoints: {
        temperature: environment.temperature,
        humidity: environment.relativeHumidity,
        co2: environment.co2,
        ppfd: environment.ppfd,
        vpd: environment.vpd,
      },
    },
    lighting: {
      photoperiodHours: { on: 18, off: 6 },
      coverageRatio: 0.92,
      averagePpfd: 540,
      dli: 35,
    },
    supplyStatus: {
      dailyWaterConsumptionLiters: 280,
      dailyNutrientConsumptionLiters: 45,
    },
    plantingPlan: {
      id: 'plan-alpha',
      name: 'SOG Rotation',
      strainId: 'ak-47',
      count: 40,
      autoReplant: false,
      enabled: true,
    },
    deviceGroups: [
      {
        id: 'group-lighting',
        kind: 'lighting',
        label: 'Grow Lights',
        deviceIds: defaultDevices
          .filter((device) => device.kind === 'lighting')
          .map((device) => device.id),
        status: 'on',
        supportsScheduling: true,
        supportsTuning: true,
      },
    ],
    ...overrides,
    devices: overrides.devices ?? defaultDevices,
    plants: overrides.plants ?? defaultPlants,
    plantingGroups: overrides.plantingGroups ?? [
      {
        id: 'group-alpha',
        name: 'AK-47 Batch A',
        strainId: 'ak-47',
        stage: 'vegetation',
        harvestReadyCount: 0,
        plantIds: (overrides.plants ?? defaultPlants).map((plant) => plant.id),
      },
    ],
  };
};

export const quickstartSnapshot: SimulationSnapshot = {
  tick: 128,
  clock: {
    tick: 128,
    isPaused: true,
    targetTickRate: 1,
    startedAt: new Date(now.getTime() - 3600_000).toISOString(),
    lastUpdatedAt: now.toISOString(),
  },
  structures: [
    {
      id: 'structure-omega',
      name: 'Omega Warehouse',
      status: 'active',
      footprint: {
        length: 30,
        width: 20,
        height: 6,
        area: 600,
        volume: 3600,
      },
      rentPerTick: 420,
      roomIds: ['room-cultivation', 'room-lab'],
    },
  ],
  rooms: [
    {
      id: 'room-cultivation',
      name: 'Cultivation Wing',
      structureId: 'structure-omega',
      structureName: 'Omega Warehouse',
      purposeId: 'grow-room',
      purposeKind: 'growRoom',
      purposeName: 'Grow Room',
      purposeFlags: { supportsZones: true },
      area: 180,
      height: 5,
      volume: 900,
      cleanliness: 0.86,
      maintenanceLevel: 0.91,
      zoneIds: ['zone-a', 'zone-b', 'zone-c'],
    },
    {
      id: 'room-lab',
      name: 'Breeding Station',
      structureId: 'structure-omega',
      structureName: 'Omega Warehouse',
      purposeId: 'lab-breeding',
      purposeKind: 'lab',
      purposeName: 'Breeding Lab',
      purposeFlags: { supportsBreeding: true },
      area: 60,
      height: 4,
      volume: 240,
      cleanliness: 0.94,
      maintenanceLevel: 0.95,
      zoneIds: [],
    },
  ],
  zones: [
    baseZone({ id: 'zone-a', name: 'North Canopy' }),
    baseZone({
      id: 'zone-b',
      name: 'Central Canopy',
      environment: {
        temperature: 24.6,
        relativeHumidity: 0.6,
        co2: 990,
        ppfd: 545,
        vpd: 1.28,
      },
      metrics: {
        averageTemperature: 24.4,
        averageHumidity: 0.61,
        averageCo2: 986,
        averagePpfd: 543,
        stressLevel: 0.1,
        lastUpdatedTick: 128,
      },
      plants: [
        {
          id: 'plant-04',
          strainId: 'ak-47',
          strainName: 'AK-47',
          stage: 'vegetation',
          health: 0.95,
          stress: 0.07,
          biomassDryGrams: 149,
          yieldDryGrams: 0,
          zoneId: 'zone-b',
          structureId: 'structure-omega',
          roomId: 'room-cultivation',
        },
      ],
      plantingGroups: [
        {
          id: 'group-beta',
          name: 'AK-47 Batch B',
          strainId: 'ak-47',
          stage: 'vegetation',
          harvestReadyCount: 0,
          plantIds: ['plant-04'],
        },
      ],
    }),
    baseZone({
      id: 'zone-c',
      name: 'South Canopy',
      environment: {
        temperature: 23.8,
        relativeHumidity: 0.65,
        co2: 960,
        ppfd: 520,
        vpd: 1.18,
      },
      metrics: {
        averageTemperature: 23.9,
        averageHumidity: 0.64,
        averageCo2: 962,
        averagePpfd: 525,
        stressLevel: 0.16,
        lastUpdatedTick: 128,
      },
      resources: {
        waterLiters: 8700,
        nutrientSolutionLiters: 1600,
        nutrientStrength: 1.1,
        substrateHealth: 0.9,
        reservoirLevel: 0.74,
        lastTranspirationLiters: 120,
      },
    }),
  ],
  personnel: {
    employees: [
      {
        id: 'employee-01',
        name: 'Avery Ramos',
        role: 'Cultivation Lead',
        salaryPerTick: 120,
        morale: 0.88,
        energy: 0.76,
        maxMinutesPerTick: 45,
        status: 'onShift',
        assignedStructureId: 'structure-omega',
      },
      {
        id: 'employee-02',
        name: 'Mira Chen',
        role: 'Irrigation Tech',
        salaryPerTick: 85,
        morale: 0.82,
        energy: 0.68,
        maxMinutesPerTick: 35,
        status: 'onShift',
        assignedStructureId: 'structure-omega',
      },
    ],
    applicants: [
      {
        id: 'applicant-01',
        name: 'Jonas Patel',
        desiredRole: 'Lighting Specialist',
        expectedSalary: 72,
        traits: ['detailOriented', 'nightShiftReady'],
        skills: { lighting: 0.78, maintenance: 0.65 },
      },
    ],
    overallMorale: 0.85,
  },
  finance: {
    cashOnHand: 240_000,
    reservedCash: 15_000,
    totalRevenue: 62_400,
    totalExpenses: 31_800,
    netIncome: 30_600,
    lastTickRevenue: 520,
    lastTickExpenses: 310,
  },
};

export const mockEvents: SimulationEvent[] = [
  {
    type: 'sim.tickCompleted',
    level: 'info',
    message: 'Tick 128 completed in 742 ms.',
    tick: 128,
    ts: now.getTime(),
  },
  {
    type: 'device.maintenanceDue',
    level: 'warning',
    message: 'Dehumidifier due for service in 3 ticks.',
    tick: 128,
    ts: now.getTime(),
    deviceId: 'device-dehum-a1',
    zoneId: 'zone-a',
  },
  {
    type: 'zone.thresholdCrossed',
    level: 'info',
    message: 'Zone South Canopy humidity trending high (65%).',
    tick: 128,
    ts: now.getTime(),
    zoneId: 'zone-c',
  },
];

const timeStatus: SimulationTimeStatus = {
  running: false,
  paused: true,
  speed: 1,
  tick: 128,
  targetTickRate: 1,
};

export const mockUpdate: SimulationUpdateEntry = {
  tick: 128,
  ts: now.getTime(),
  durationMs: 742,
  phaseTimings: {
    applyDevices: {
      startedAt: now.getTime() - 530,
      completedAt: now.getTime() - 480,
      durationMs: 50,
    },
    deriveEnvironment: {
      startedAt: now.getTime() - 480,
      completedAt: now.getTime() - 420,
      durationMs: 60,
    },
    irrigationAndNutrients: {
      startedAt: now.getTime() - 420,
      completedAt: now.getTime() - 350,
      durationMs: 70,
    },
    updatePlants: {
      startedAt: now.getTime() - 350,
      completedAt: now.getTime() - 240,
      durationMs: 110,
    },
    harvestAndInventory: {
      startedAt: now.getTime() - 240,
      completedAt: now.getTime() - 140,
      durationMs: 100,
    },
    accounting: { startedAt: now.getTime() - 140, completedAt: now.getTime() - 60, durationMs: 80 },
    commit: { startedAt: now.getTime() - 60, completedAt: now.getTime(), durationMs: 60 },
  },
  events: mockEvents,
  snapshot: quickstartSnapshot,
  time: timeStatus,
};

export const mockUpdates: SimulationUpdateEntry[] = [mockUpdate];
