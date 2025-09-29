# All JSON configurations file, currently available in `/data`

_Important rule for the consistency_ if in other documents attributes are listed but not in this document, the other document is right and attributes and data has to be added to the following files!
These files are crucial! The blueprinted Objects will be rehidrated from these configuration files, so there is no need, for hardcoded representation!

## /data/blueprints/cultivationMethods/basic_soil_pot.json

```json
{
  "id": "85cc0916-0e8a-495e-af8f-50291abe6855",
  "kind": "CultivationMethod",
  "name": "Basic Soil Pot",
  "laborIntensity": 0.1,
  "laborProfile": {
    "hoursPerPlantPerWeek": 0.35
  },
  "areaPerPlant": 0.5,
  "minimumSpacing": 0.5,
  "maxCycles": 1,
  "compatibleSubstrateTypes": ["soil", "coco"],
  "compatibleContainerTypes": ["pot"],
  "strainTraitCompatibility": {},
  "envBias": {},
  "capacityHints": {
    "plantsPer_m2": 4,
    "canopyHeight_m": 1.2
  },
  "idealConditions": {
    "idealTemperature": [20, 28],
    "idealHumidity": [0.5, 0.7]
  },
  "meta": {
    "description": "Simple cultivation method: one plant per pot in soil. Low setup cost, minimal labor, universally compatible.",
    "advantages": ["Very low initial cost", "Compatible with most strains", "Easy to manage"],
    "disadvantages": ["Moderate space usage", "Lower productivity than advanced methods"]
  }
}
```

## /data/blueprints/cultivationMethods/scrog.json

```json
{
  "id": "41229377-ef2d-4723-931f-72eea87d7a62",
  "kind": "CultivationMethod",
  "name": "Screen of Green",
  "laborIntensity": 0.7,
  "laborProfile": {
    "hoursPerPlantPerWeek": 1.2
  },
  "areaPerPlant": 1.0,
  "minimumSpacing": 0.8,
  "maxCycles": 4,
  "compatibleSubstrateTypes": ["soil", "coco"],
  "compatibleContainerTypes": ["pot"],
  "strainTraitCompatibility": {
    "preferred": {
      "genotype.sativa": {
        "min": 0.5
      }
    },
    "conflicting": {
      "genotype.indica": {
        "min": 0.7
      }
    }
  },
  "envBias": {
    "temp_C": 0.5,
    "co2_ppm": 50
  },
  "capacityHints": {
    "plantsPer_m2": 2,
    "canopyHeight_m": 0.8
  },
  "idealConditions": {
    "idealTemperature": [21, 27],
    "idealHumidity": [0.55, 0.7]
  },
  "meta": {
    "description": "Screen of Green (SCROG) is a low-density cultivation method that uses a screen to train plants to grow horizontally, creating a flat, even canopy. It maximizes light exposure for a smaller number of larger plants.",
    "advantages": [
      "Maximizes yield per plant",
      "Excellent light distribution",
      "Good for limited height spaces"
    ],
    "disadvantages": [
      "Longer vegetative phase required",
      "High training effort (pruning, tucking)",
      "Less suitable for very fast-cycling grows"
    ]
  }
}
```

## /data/blueprints/cultivationMethods/sog.json

```json
{
  "id": "659ba4d7-a5fc-482e-98d4-b614341883ac",
  "kind": "CultivationMethod",
  "name": "Sea of Green",
  "laborIntensity": 0.4,
  "laborProfile": {
    "hoursPerPlantPerWeek": 0.65
  },
  "areaPerPlant": 0.25,
  "minimumSpacing": 0.25,
  "maxCycles": 2,
  "compatibleSubstrateTypes": ["soil", "coco"],
  "compatibleContainerTypes": ["pot"],
  "strainTraitCompatibility": {
    "preferred": {
      "genotype.indica": {
        "min": 0.5
      },
      "photoperiod.vegetationTime": {
        "max": 1814400
      }
    },
    "conflicting": {
      "genotype.sativa": {
        "min": 0.5
      },
      "photoperiod.vegetationTime": {
        "min": 2419200
      }
    }
  },
  "envBias": {
    "vpd_kPa": 0.1,
    "rh_frac": -0.05
  },
  "capacityHints": {
    "plantsPer_m2": 18,
    "canopyHeight_m": 0.6
  },
  "idealConditions": {
    "idealTemperature": [22, 28],
    "idealHumidity": [0.5, 0.65]
  },
  "meta": {
    "description": "Sea of Green (SOG) is a high-density cultivation method where many small plants are grown close together to quickly fill a canopy. It emphasizes short vegetative phases and rapid cycling, ideal for fast-flowering indica-dominant strains.",
    "advantages": ["Shorter grow cycles", "Efficient use of space", "Lower training effort"],
    "disadvantages": [
      "More plants to manage",
      "Legal limitations in plant count (IRL)",
      "Not suitable for large or tall plants"
    ]
  }
}
```

## /data/prices/cultivationMethodPrices.json

```json
{
  "version": "2024-09-01",
  "cultivationMethodPrices": {
    "85cc0916-0e8a-495e-af8f-50291abe6855": {
      "setupCost": 2
    },
    "41229377-ef2d-4723-931f-72eea87d7a62": {
      "setupCost": 15
    },
    "659ba4d7-a5fc-482e-98d4-b614341883ac": {
      "setupCost": 10
    }
  }
}
```

## /data/prices/consumablePrices.json

```json
{
  "version": "2024-09-01",
  "substrates": {
    "soil-single-cycle": {
      "costPerLiter": 0.025
    },
    "soil-multi-cycle": {
      "costPerLiter": 0.035
    },
    "coco-coir": {
      "costPerLiter": 0.55
    }
  },
  "containers": {
    "pot-10l": {
      "costPerUnit": 1.5
    },
    "pot-11l": {
      "costPerUnit": 2
    },
    "pot-25l": {
      "costPerUnit": 4
    }
  }
}
```

## /data/blueprints/substrates/soil_single_cycle.json

```json
{
  "id": "04c8b1a5-09cc-4d86-8dc6-9007a64de6f2",
  "slug": "soil-single-cycle",
  "kind": "Substrate",
  "name": "Single-Cycle Soil Mix",
  "type": "soil",
  "maxCycles": 1,
  "meta": {
    "description": "Pre-charged soil mix formulated for one-and-done harvests; ideal when designers prefer a fresh medium each run.",
    "advantages": [
      "Arrives with a balanced nutrient charge",
      "High buffering capacity smooths pH swings",
      "Familiar handling for soil-focused operators"
    ],
    "disadvantages": [
      "Needs full replacement after a single cycle",
      "Spent media can harbor pests if disposal is delayed"
    ]
  }
}
```

## /data/blueprints/substrates/soil_multi_cycle.json

```json
{
  "id": "ebdb6d5e-fb3d-4db2-90a4-8e6c5be137f4",
  "slug": "soil-multi-cycle",
  "kind": "Substrate",
  "name": "Multi-Cycle Soil Mix",
  "type": "soil",
  "maxCycles": 2,
  "meta": {
    "description": "Reconditionable soil blend that survives two full runs with proper amendment and sterilization between crops.",
    "advantages": [
      "Supports two reuse cycles with consistent structure",
      "Balanced water retention keeps irrigation predictable",
      "Cation exchange capacity stabilizes nutrient delivery"
    ],
    "disadvantages": [
      "Needs re-amendment between harvests",
      "Heavier medium increases handling effort"
    ]
  }
}
```

## /data/blueprints/substrates/coco_coir.json

```json
{
  "id": "285041f1-9586-4b43-b55c-0cb76f343037",
  "slug": "coco-coir",
  "kind": "Substrate",
  "name": "Coco Coir",
  "type": "coco",
  "maxCycles": 4,
  "meta": {
    "description": "Buffered coco coir blend optimized for drain-to-waste or recirculating fertigation systems with multiple reuse cycles.",
    "advantages": [
      "Excellent aeration drives rapid root development",
      "Handles high-frequency fertigation without compaction",
      "Reusable across four cycles with proper flushing"
    ],
    "disadvantages": [
      "Demands precise nutrient and EC management",
      "Dries quickly without automated irrigation"
    ]
  }
}
```

## /data/blueprints/containers/pot_10l.json

```json
{
  "id": "0c48f3e3-2c19-4be4-86ea-4de97f5aa51e",
  "slug": "pot-10l",
  "kind": "Container",
  "name": "10 L Pot",
  "type": "pot",
  "volumeInLiters": 10,
  "footprintArea": 0.25,
  "reusableCycles": 3,
  "packingDensity": 0.9,
  "meta": {
    "description": "Compact 10 L pot tuned for short-cycle soil or coco runs where designers want dense spacing without root binding surprises.",
    "advantages": [
      "Small footprint keeps canopy layouts tight",
      "Lightweight shell is easy to reposition",
      "Medium warms quickly under indoor lighting"
    ],
    "disadvantages": [
      "Limited root volume for extended vegetative phases",
      "Requires tighter irrigation cadence to avoid drybacks"
    ]
  }
}
```

## /data/blueprints/containers/pot_11l.json

```json
{
  "id": "d9267b6f-41f3-4e91-95b8-5bd7be381d3f",
  "slug": "pot-11l",
  "kind": "Container",
  "name": "11 L Pot",
  "type": "pot",
  "volumeInLiters": 11,
  "footprintArea": 0.2,
  "reusableCycles": 6,
  "packingDensity": 0.95,
  "meta": {
    "description": "Balanced 11 L container sized for standard indoor runs; pairs with ebb-and-flow trays or benches without sacrificing root stability.",
    "advantages": [
      "Supports moderate root mass for full-cycle plants",
      "Fits common flood tables and rolling benches",
      "Durable enough for multiple sanitization cycles"
    ],
    "disadvantages": [
      "Heavier to maneuver when saturated",
      "Still undersized for very long veg or mother plants"
    ]
  }
}
```

## /data/blueprints/containers/pot_25l.json

```json
{
  "id": "9fb62d74-df4e-4e74-a0fb-77fa1f21d3ef",
  "slug": "pot-25l",
  "kind": "Container",
  "name": "25 L Pot",
  "type": "pot",
  "volumeInLiters": 25,
  "footprintArea": 0.3,
  "reusableCycles": 6,
  "packingDensity": 0.9,
  "meta": {
    "description": "Large 25 L pot for flagship plants or extended veg; gives roots the headroom needed for heavy-feeding cultivars.",
    "advantages": [
      "High volume supports vigorous, tall plants",
      "Moisture buffer stretches irrigation intervals",
      "Wide base resists tipping in high-canopy rooms"
    ],
    "disadvantages": [
      "Consumes more floor area per plant",
      "Longer dry-down can slow reset between cycles"
    ]
  }
}
```

## /data/blueprints/devices/climate_unit_01.json

```json
{
  "id": "7d3d3f1a-8c6f-4e9c-926d-5a2a4a3b6f1b",
  "kind": "ClimateUnit",
  "name": "CoolAir Split 3000",
  "quality": 0.9,
  "complexity": 0.4,
  "lifespan": 126144000,
  "roomPurposes": ["growroom"],
  "settings": {
    "power": 1.2,
    "coolingCapacity": 1.6,
    "airflow": 350,
    "targetTemperature": 24,
    "targetTemperatureRange": [18, 30],
    "cop": 3.2,
    "hysteresisK": 0.8,
    "fullPowerAtDeltaK": 2
  },
  "meta": {
    "description": "High-performance climate control unit for clean indoor cultivation rooms; targeted cooling with moderate energy usage and solid airflow.",
    "advantages": [
      "Effective cooling for medium-sized rooms",
      "Reliable airflow distribution",
      "Energy-efficient at moderate loads"
    ],
    "disadvantages": [
      "Higher maintenance costs over time",
      "Limited precision for multi-zone systems"
    ],
    "notes": "Recommended for vegetative and early flowering stages in temperate climates."
  }
}
```

## /data/blueprints/devices/co2injector-01.json

```json
{
  "id": "c701efa6-1e90-4f28-8934-ea9c584596e4",
  "kind": "CO2Injector",
  "name": "CO2 Pulse",
  "quality": 0.85,
  "complexity": 0.15,
  "lifespan": 31536000,
  "roomPurposes": ["growroom"],
  "settings": {
    "power": 0.05,
    "targetCO2": 1100,
    "targetCO2Range": [400, 1500],
    "hysteresis": 60,
    "pulsePpmPerTick": 150
  },
  "meta": {
    "description": "Automated CO2 injector for controlled enrichment.",
    "advantages": ["Precise dosing", "Energy efficient"],
    "disadvantages": ["Requires CO2 supply", "Overuse can harm plants"]
  }
}
```

## /data/blueprints/devices/dehumidifier-01.json

```json
{
  "id": "7a639d3d-4750-440a-a200-f90d11dc3c62",
  "kind": "Dehumidifier",
  "name": "DryBox 200",
  "quality": 0.8,
  "complexity": 0.25,
  "lifespan": 94608000,
  "roomPurposes": ["growroom"],
  "settings": {
    "latentRemovalKgPerTick": 0.05,
    "power": 0.3
  },
  "meta": {
    "description": "Compact unit for reducing ambient humidity.",
    "advantages": ["Efficient moisture removal", "Low energy consumption"],
    "disadvantages": ["Limited capacity for large rooms", "Generates heat"]
  }
}
```

## /data/blueprints/devices/exhaust_fan_01.json

```json
{
  "id": "f5d5c5a0-1b2c-4d3e-8f9a-0b1c2d3e4f5a",
  "kind": "Ventilation",
  "name": "Exhaust Fan 4-inch",
  "quality": 0.7,
  "complexity": 0.1,
  "lifespan": 63072000,
  "roomPurposes": ["growroom"],
  "settings": {
    "power": 0.05,
    "airflow": 170
  },
  "meta": {
    "description": "A simple and affordable exhaust fan with an airflow of 170 m³/h, perfect for small tents and grow areas. Effectively removes heat, humidity, and stale air by exchanging it with the ambient environment.",
    "advantages": [
      "Low cost",
      "Low power consumption",
      "Effective for small-scale climate control"
    ],
    "disadvantages": [
      "Not as effective as an AC unit for large heat loads",
      "Relies on ambient temperature for cooling"
    ],
    "notes": "Essential for any small grow setup to prevent heat and humidity buildup without the cost of a full climate unit."
  }
}
```

## /data/blueprints/devices/humidity_control_unit_01.json

```json
{
  "id": "3d762260-88a5-4104-b03c-9860bbac34b6",
  "kind": "HumidityControlUnit",
  "name": "Humidity Control Unit L1",
  "quality": 0.8,
  "complexity": 0.3,
  "lifespan": 31536000,
  "roomPurposes": ["growroom"],
  "settings": {
    "power": 0.35,
    "humidifyRateKgPerTick": 0.1,
    "dehumidifyRateKgPerTick": 0.1,
    "targetHumidity": 0.6,
    "hysteresis": 0.05
  },
  "meta": {
    "description": "A standard unit to control humidity.",
    "advantages": ["Handles both humidification and dehumidification", "Simple to operate"],
    "disadvantages": ["Limited capacity for large rooms", "Requires regular maintenance"]
  }
}
```

## /data/blueprints/devices/veg_light_01.json

```json
{
  "id": "3b5f6ad7-672e-47cd-9a24-f0cc45c4101e",
  "kind": "Lamp",
  "name": "LED VegLight 600",
  "quality": 0.95,
  "complexity": 0.2,
  "lifespan": 189216000,
  "roomPurposes": ["growroom"],
  "settings": {
    "power": 0.6,
    "ppfd": 800,
    "coverageArea": 1.2,
    "spectralRange": [400, 700],
    "heatFraction": 0.3
  },
  "meta": {
    "description": "Full-spectrum LED grow light optimized for the vegetative phase of cannabis plants. Balanced light distribution with low heat generation.",
    "advantages": ["High energy efficiency", "Low heat output", "Ideal for early growth stages"],
    "disadvantages": ["Limited effectiveness for flowering", "Higher upfront cost compared to HPS"],
    "notes": "Best used in enclosed environments with adequate canopy management."
  }
}
```

## /data/blueprints/diseases/anthracnose.json

```json
{
  "id": "83c4447f-8439-44cb-84ab-bbed8725e190",
  "kind": "Disease",
  "name": "Anthracnose",
  "pathogenType": "fungus",
  "targets": ["leaves", "stems"],
  "environmentalRisk": {
    "idealHumidityRange": [0.6, 0.9],
    "temperatureRange": [18, 28],
    "leafWetnessRequired": true
  },
  "transmission": ["splashingWater", "tools"],
  "contagious": true,
  "model": {
    "dailyInfectionIncrement": 0.05,
    "infectionThreshold": 0.25,
    "degenerationRate": 0.025,
    "recoveryRate": 0.015,
    "regenerationRate": 0.012,
    "fatalityThreshold": 0.93
  },
  "detection": {
    "symptoms": ["Dark, sunken lesions on leaves and stems", "Possible spore rings"]
  },
  "treatments": {
    "cultural": ["Avoid overhead irrigation", "Disinfect tools"],
    "mechanical": ["Remove infected shoots"]
  }
}
```

## /data/blueprints/diseases/bacterial_leaf_spot.json

```json
{
  "id": "c1823c46-47df-4106-a039-88e60a6aa5ed",
  "kind": "Disease",
  "name": "Bacterial Leaf Spot",
  "pathogenType": "bacteria",
  "targets": ["leaves"],
  "environmentalRisk": {
    "idealHumidityRange": [0.6, 0.95],
    "temperatureRange": [18, 28],
    "leafWetnessRequired": true
  },
  "transmission": ["splashingWater", "tools", "workers"],
  "contagious": true,
  "model": {
    "dailyInfectionIncrement": 0.06,
    "infectionThreshold": 0.22,
    "degenerationRate": 0.03,
    "recoveryRate": 0.014,
    "regenerationRate": 0.01,
    "fatalityThreshold": 0.9
  },
  "detection": {
    "symptoms": [
      "Water-soaked, later brown spots with yellow halo",
      "Oily sheen, marginal necrosis"
    ]
  },
  "treatments": {
    "cultural": ["Keep foliage dry", "Disinfect tools"],
    "mechanical": ["Remove heavily infected leaves"]
  }
}
```

## /data/blueprints/diseases/bacterial_wilt.json

```json
{
  "id": "01b6d921-88d8-42f0-8009-7111eff56e70",
  "kind": "Disease",
  "name": "Bacterial Wilt (Erwinia-like)",
  "pathogenType": "bacteria",
  "targets": ["stems", "vascular"],
  "environmentalRisk": {
    "idealHumidityRange": [0.5, 0.9],
    "temperatureRange": [20, 30],
    "woundEntryRisk": 0.8
  },
  "transmission": ["tools", "substrate", "splashingWater"],
  "contagious": true,
  "model": {
    "dailyInfectionIncrement": 0.07,
    "infectionThreshold": 0.2,
    "degenerationRate": 0.045,
    "recoveryRate": 0.01,
    "regenerationRate": 0.008,
    "fatalityThreshold": 0.96
  },
  "detection": {
    "symptoms": ["Sudden wilting despite sufficient soil moisture", "Darkened vascular tissue"]
  },
  "treatments": {
    "cultural": ["Avoid wounding", "Increase hygiene", "Maintain low rH"],
    "mechanical": ["Remove heavily infected plants"]
  }
}
```

## /data/blueprints/diseases/botrytis_gray_mold.json

```json
{
  "id": "eaca3c76-875c-4ebe-9ea5-c91dc9651f73",
  "kind": "Disease",
  "name": "Botrytis (Gray Mold / Bud Rot)",
  "pathogenType": "fungus",
  "targets": ["buds", "flowers", "leaves"],
  "environmentalRisk": {
    "idealHumidityRange": [0.6, 0.9],
    "temperatureRange": [15, 22],
    "leafWetnessRequired": true,
    "lowAirflowRisk": 0.8,
    "denseCanopyRisk": 0.85
  },
  "transmission": ["airborneSpores", "wounds"],
  "contagious": true,
  "model": {
    "dailyInfectionIncrement": 0.08,
    "infectionThreshold": 0.15,
    "degenerationRate": 0.05,
    "recoveryRate": 0.01,
    "regenerationRate": 0.008,
    "fatalityThreshold": 0.9
  },
  "yieldImpact": {
    "budLossFractionPerDay": 0.05
  },
  "detection": {
    "symptoms": ["Brown-gray, mushy spots inside buds", "Cottony mold growth with musty smell"]
  },
  "treatments": {
    "cultural": ["Maintain rH < 0.55 in late flowering", "Increase air circulation"],
    "mechanical": ["Remove affected buds"]
  }
}
```

## /data/blueprints/diseases/downy_mildew.json

```json
{
  "id": "645b6253-4692-4396-ab6a-f3b02c9783bf",
  "kind": "Disease",
  "name": "Downy Mildew",
  "pathogenType": "fungus",
  "targets": ["leaves"],
  "environmentalRisk": {
    "idealHumidityRange": [0.7, 0.95],
    "temperatureRange": [15, 24],
    "leafWetnessRequired": true,
    "lowAirflowRisk": 0.7
  },
  "transmission": ["airborneSpores", "splashingWater"],
  "contagious": true,
  "model": {
    "dailyInfectionIncrement": 0.055,
    "infectionThreshold": 0.2,
    "degenerationRate": 0.022,
    "recoveryRate": 0.012,
    "regenerationRate": 0.01,
    "fatalityThreshold": 0.92
  },
  "detection": {
    "symptoms": ["Yellowish angular leaf spots", "Gray-white fungal growth on leaf undersides"]
  },
  "treatments": {
    "cultural": ["Avoid night condensation", "Irrigate during day"],
    "mechanical": ["Remove infected leaves"]
  }
}
```

## /data/blueprints/diseases/hop_latent_viroid.json

```json
{
  "id": "259acd2f-d4af-49dd-8f0e-450c3045aea1",
  "kind": "Disease",
  "name": "Hop Latent Viroid (HpLVd)",
  "pathogenType": "viroid",
  "targets": ["systemic"],
  "environmentalRisk": {
    "temperatureRange": [18, 28]
  },
  "transmission": ["clones", "sap", "tools"],
  "contagious": true,
  "model": {
    "dailyInfectionIncrement": 0.03,
    "infectionThreshold": 0.15,
    "degenerationRate": 0.03,
    "recoveryRate": 0.002,
    "regenerationRate": 0.002,
    "fatalityThreshold": 0.85
  },
  "detection": {
    "symptoms": [
      "General growth suppression ('dudding')",
      "Small, deformed leaves; reduced resin production"
    ]
  },
  "treatments": {
    "cultural": ["Use tested clones only", "Strict tool hygiene"],
    "mechanical": ["Screen and remove infected mother plants"]
  }
}
```

## /data/blueprints/diseases/mosaic_virus.json

```json
{
  "id": "da9b207b-3aeb-4784-875e-bbee1e27ced9",
  "kind": "Disease",
  "name": "Mosaic Virus (TMV/CMV-like)",
  "pathogenType": "virus",
  "targets": ["leaves", "systemic"],
  "environmentalRisk": {
    "temperatureRange": [18, 28]
  },
  "transmission": ["sap", "tools", "pests"],
  "contagious": true,
  "model": {
    "dailyInfectionIncrement": 0.04,
    "infectionThreshold": 0.18,
    "degenerationRate": 0.028,
    "recoveryRate": 0.003,
    "regenerationRate": 0.003,
    "fatalityThreshold": 0.9
  },
  "detection": {
    "symptoms": [
      "Mottled light and dark green leaf patterns (mosaic)",
      "Leaf deformation, stunted growth"
    ]
  },
  "treatments": {
    "cultural": ["Use pathogen-free plant material", "Disinfect tools"],
    "mechanical": ["Remove infected plants"]
  }
}
```

## /data/blueprints/diseases/powdery_mildew.json

```json
{
  "id": "818bc83c-0a18-47c5-b861-c378181b0812",
  "kind": "Disease",
  "name": "Powdery Mildew",
  "pathogenType": "fungus",
  "targets": ["leaves", "stems"],
  "environmentalRisk": {
    "idealHumidityRange": [0.5, 0.7],
    "temperatureRange": [20, 28],
    "leafWetnessRequired": false,
    "lowAirflowRisk": 0.8,
    "overcrowdingRisk": 0.7
  },
  "transmission": ["airborneSpores", "tools", "workers"],
  "contagious": true,
  "model": {
    "dailyInfectionIncrement": 0.06,
    "infectionThreshold": 0.18,
    "degenerationRate": 0.018,
    "recoveryRate": 0.017,
    "regenerationRate": 0.012,
    "fatalityThreshold": 0.9
  },
  "detection": {
    "symptoms": ["White, powdery coating on leaf surfaces", "Yellowish spots leading to necrosis"],
    "scoutingHints": [
      "Inspect leaf surfaces in dense canopies",
      "Check during humidity fluctuations"
    ]
  },
  "treatments": {
    "cultural": ["Increase air circulation", "Prune dense leaves", "Avoid humidity spikes"],
    "biological": ["Bacillus subtilis", "Low-dose sulfur sprays"],
    "mechanical": ["Remove heavily infected leaves"]
  }
}
```

## /data/blueprints/diseases/root_rot.json

```json
{
  "id": "55741064-9052-407f-8fbe-9eb3690ff851",
  "kind": "Disease",
  "name": "Root Rot (Pythium/Fusarium/Rhizoctonia)",
  "pathogenType": "fungus-complex",
  "targets": ["roots", "crown"],
  "environmentalRisk": {
    "idealHumidityRange": [0.4, 0.7],
    "temperatureRange": [18, 26],
    "substrateWaterloggingRisk": 0.9,
    "poorDrainageRisk": 0.85
  },
  "transmission": ["contaminatedWater", "substrate", "tools"],
  "contagious": true,
  "model": {
    "dailyInfectionIncrement": 0.07,
    "infectionThreshold": 0.22,
    "degenerationRate": 0.04,
    "recoveryRate": 0.012,
    "regenerationRate": 0.009,
    "fatalityThreshold": 0.98
  },
  "detection": {
    "symptoms": ["Plants wilting despite wet soil", "Brown, slimy roots with foul smell"]
  },
  "treatments": {
    "cultural": ["Avoid overwatering", "Improve drainage", "Extend irrigation intervals"],
    "biological": ["Trichoderma spp."],
    "mechanical": ["Remove heavily affected plants"]
  }
}
```

## /data/blueprints/personnel/roles/Gardener.json

```json
{
  "id": "Gardener",
  "name": "Gardener",
  "salary": {
    "basePerTick": 24,
    "skillFactor": { "base": 0.85, "perPoint": 0.04, "min": 0.85, "max": 1.45 },
    "randomRange": { "min": 0.9, "max": 1.1 },
    "skillWeights": { "primary": 1.2, "secondary": 0.6, "tertiary": 0.35 }
  },
  "maxMinutesPerTick": 90,
  "roleWeight": 0.35,
  "skillProfile": {
    "primary": {
      "skill": "Gardening",
      "startingLevel": 4,
      "roll": { "min": 3, "max": 5 }
    },
    "secondary": {
      "skill": "Cleanliness",
      "startingLevel": 2,
      "roll": { "min": 1, "max": 4 }
    },
    "tertiary": {
      "chance": 0.25,
      "roll": { "min": 1, "max": 3 },
      "candidates": [
        { "skill": "Logistics", "startingLevel": 1 },
        { "skill": "Administration", "startingLevel": 1 },
        { "skill": "Maintenance", "startingLevel": 1 }
      ]
    }
  }
}
```

## /data/blueprints/personnel/roles/Janitor.json

```json
{
  "id": "Janitor",
  "name": "Janitor",
  "salary": {
    "basePerTick": 18,
    "skillFactor": { "base": 0.85, "perPoint": 0.04, "min": 0.85, "max": 1.45 },
    "randomRange": { "min": 0.88, "max": 1.08 },
    "skillWeights": { "primary": 1.1, "secondary": 0.55, "tertiary": 0.3 }
  },
  "maxMinutesPerTick": 75,
  "preferredShiftId": "shift.night",
  "roleWeight": 0.15,
  "skillProfile": {
    "primary": {
      "skill": "Cleanliness",
      "startingLevel": 4,
      "roll": { "min": 3, "max": 5 }
    },
    "secondary": {
      "skill": "Logistics",
      "startingLevel": 1,
      "roll": { "min": 0, "max": 3 }
    },
    "tertiary": {
      "chance": 0.3,
      "roll": { "min": 1, "max": 3 },
      "candidates": [
        { "skill": "Administration", "startingLevel": 1 },
        { "skill": "Gardening", "startingLevel": 1 },
        { "skill": "Maintenance", "startingLevel": 1 }
      ]
    }
  }
}
```

## /data/blueprints/personnel/roles/Manager.json

```json
{
  "id": "Manager",
  "name": "Manager",
  "salary": {
    "basePerTick": 35,
    "skillFactor": { "base": 0.85, "perPoint": 0.04, "min": 0.85, "max": 1.5 },
    "randomRange": { "min": 0.95, "max": 1.18 },
    "skillWeights": { "primary": 1.3, "secondary": 0.7, "tertiary": 0.45 }
  },
  "maxMinutesPerTick": 60,
  "preferredShiftId": "shift.day",
  "roleWeight": 0.12,
  "skillProfile": {
    "primary": {
      "skill": "Administration",
      "startingLevel": 4,
      "roll": { "min": 3, "max": 5 }
    },
    "secondary": {
      "skill": "Logistics",
      "startingLevel": 2,
      "roll": { "min": 1, "max": 4 }
    },
    "tertiary": {
      "chance": 0.4,
      "roll": { "min": 1, "max": 3 },
      "candidates": [{ "skill": "Cleanliness", "startingLevel": 2, "weight": 2 }]
    }
  }
}
```

## /data/blueprints/personnel/roles/Operator.json

```json
{
  "id": "Operator",
  "name": "Operator",
  "salary": {
    "basePerTick": 22,
    "skillFactor": { "base": 0.85, "perPoint": 0.04, "min": 0.85, "max": 1.45 },
    "randomRange": { "min": 0.9, "max": 1.1 },
    "skillWeights": { "primary": 1.15, "secondary": 0.6, "tertiary": 0.35 }
  },
  "maxMinutesPerTick": 90,
  "preferredShiftId": "shift.day",
  "roleWeight": 0.18,
  "skillProfile": {
    "primary": {
      "skill": "Logistics",
      "startingLevel": 3,
      "roll": { "min": 2, "max": 4 }
    },
    "secondary": {
      "skill": "Administration",
      "startingLevel": 2,
      "roll": { "min": 1, "max": 4 }
    },
    "tertiary": {
      "chance": 0.25,
      "roll": { "min": 1, "max": 3 },
      "candidates": [
        { "skill": "Cleanliness", "startingLevel": 1 },
        { "skill": "Gardening", "startingLevel": 1 },
        { "skill": "Maintenance", "startingLevel": 1 }
      ]
    }
  }
}
```

## /data/blueprints/personnel/roles/Technician.json

```json
{
  "id": "Technician",
  "name": "Technician",
  "salary": {
    "basePerTick": 28,
    "skillFactor": { "base": 0.85, "perPoint": 0.04, "min": 0.85, "max": 1.45 },
    "randomRange": { "min": 0.9, "max": 1.12 },
    "skillWeights": { "primary": 1.25, "secondary": 0.65, "tertiary": 0.4 }
  },
  "maxMinutesPerTick": 120,
  "roleWeight": 0.2,
  "skillProfile": {
    "primary": {
      "skill": "Maintenance",
      "startingLevel": 4,
      "roll": { "min": 3, "max": 5 }
    },
    "secondary": {
      "skill": "Logistics",
      "startingLevel": 2,
      "roll": { "min": 1, "max": 4 }
    },
    "tertiary": {
      "chance": 0.25,
      "roll": { "min": 1, "max": 3 },
      "candidates": [
        { "skill": "Gardening", "startingLevel": 1 },
        { "skill": "Administration", "startingLevel": 1 },
        { "skill": "Cleanliness", "startingLevel": 1 }
      ]
    }
  }
}
```

## /data/blueprints/personnel/skills/Administration.json

```json
{
  "id": "Administration",
  "name": "Administration",
  "description": "Planning, reporting, compliance oversight, and documentation workflows.",
  "tags": ["management", "compliance"]
}
```

## /data/blueprints/personnel/skills/Cleanliness.json

```json
{
  "id": "Cleanliness",
  "name": "Cleanliness",
  "description": "Sanitation, hygiene, and compliance routines across rooms and devices.",
  "tags": ["quality", "safety"]
}
```

## /data/blueprints/personnel/skills/Gardening.json

```json
{
  "id": "Gardening",
  "name": "Gardening",
  "description": "Plant care, canopy management, pruning, and phenology adjustments.",
  "tags": ["cultivation"]
}
```

## /data/blueprints/personnel/skills/Logistics.json

```json
{
  "id": "Logistics",
  "name": "Logistics",
  "description": "Inventory stewardship, material handling, and production scheduling.",
  "tags": ["operations"]
}
```

## /data/blueprints/personnel/skills/Maintenance.json

```json
{
  "id": "Maintenance",
  "name": "Maintenance",
  "description": "Device diagnostics, preventive maintenance, and facility upkeep routines.",
  "tags": ["operations", "technical"]
}
```

## /data/blueprints/pests/aphids.json

```json
{
  "id": "90fd2899-4563-468d-9e32-500a75ce9275",
  "kind": "Pest",
  "name": "Aphids",
  "category": "sap-sucking",
  "targets": ["leaves", "stems"],
  "environmentalRisk": {
    "temperatureRange": [18, 28],
    "humidityRange": [0.4, 0.8]
  },
  "populationDynamics": {
    "dailyReproductionRate": 0.32,
    "dailyMortalityRate": 0.06,
    "carryingCapacity": 1.2
  },
  "damageModel": {
    "photosynthesisReductionPerDay": 0.15,
    "rootUptakeReductionPerDay": 0.0,
    "budLossFractionPerDay": 0.0,
    "diseaseVectorRisk": 0.5,
    "honeydew": true
  },
  "detection": {
    "symptoms": [
      "Clusters on shoot tips and undersides",
      "Sticky honeydew leading to sooty mold",
      "Leaf curling"
    ],
    "monitoring": ["Yellow sticky cards", "Visual scouting on new growth"]
  },
  "controlOptions": {
    "biological": ["Lady beetles (Coccinellidae)", "Aphidius parasitoids"],
    "cultural": ["Remove infested shoots", "Avoid over-fertilizing with N"],
    "mechanical": ["Water jet dislodging", "Pruning"],
    "chemical": ["Soaps and oils", "Azadirachtin (where compliant)"]
  }
}
```

## /data/blueprints/pests/broad_mites.json

```json
{
  "id": "2c574211-0e96-44f1-82ee-327056ac5fcb",
  "kind": "Pest",
  "name": "Broad Mites / Russet Mites",
  "category": "sap-sucking",
  "targets": ["meristems", "flowers", "leaves"],
  "environmentalRisk": {
    "temperatureRange": [20, 28],
    "humidityRange": [0.4, 0.8]
  },
  "populationDynamics": {
    "dailyReproductionRate": 0.33,
    "dailyMortalityRate": 0.07,
    "carryingCapacity": 1.0
  },
  "damageModel": {
    "photosynthesisReductionPerDay": 0.2,
    "rootUptakeReductionPerDay": 0.0,
    "budLossFractionPerDay": 0.0,
    "diseaseVectorRisk": 0.2,
    "honeydew": false
  },
  "detection": {
    "symptoms": [
      "Twisted, hardened new growth",
      "Bronzed, rough leaf surfaces",
      "Flower deformities"
    ],
    "monitoring": ["High-magnification scope (≥60x) on meristems", "Sentinel plants in hotspots"]
  },
  "controlOptions": {
    "biological": ["Predatory mites (Amblyseius swirskii, A. andersoni)"],
    "cultural": ["Quarantine and destroy heavily infested stock", "Strict sanitation"],
    "mechanical": ["Remove infested tips"],
    "chemical": ["Targeted miticides where compliant; rotate modes"]
  }
}
```

## /data/blueprints/pests/caterpillars.json

```json
{
  "id": "2335b750-3c2a-4540-a44c-3d510036bafd",
  "kind": "Pest",
  "name": "Caterpillars",
  "category": "chewing",
  "targets": ["leaves", "buds"],
  "environmentalRisk": {
    "temperatureRange": [18, 30],
    "humidityRange": [0.4, 0.8]
  },
  "populationDynamics": {
    "dailyReproductionRate": 0.2,
    "dailyMortalityRate": 0.1,
    "carryingCapacity": 0.8
  },
  "damageModel": {
    "photosynthesisReductionPerDay": 0.18,
    "rootUptakeReductionPerDay": 0.0,
    "budLossFractionPerDay": 0.05,
    "diseaseVectorRisk": 0.3,
    "honeydew": false
  },
  "detection": {
    "symptoms": [
      "Chewed leaves and frass (droppings)",
      "Holes and tunnels in buds",
      "Secondary bud rot (Botrytis)"
    ],
    "monitoring": ["Blacklight scouting outdoors", "Pheromone traps where available"]
  },
  "controlOptions": {
    "biological": ["Bacillus thuringiensis kurstaki (Btk)", "Trichogramma wasps"],
    "cultural": ["Remove plant debris", "Timing: treat early instars"],
    "mechanical": ["Hand-pick, inspect buds"],
    "chemical": ["Selective stomach poisons (where allowed)"]
  }
}
```

## /data/blueprints/pests/fungus_gnats.json

```json
{
  "id": "33fc7bb4-9ca1-42e8-8d70-8267f8b6abe3",
  "kind": "Pest",
  "name": "Fungus Gnats",
  "category": "soil-dwelling",
  "targets": ["roots", "substrate"],
  "environmentalRisk": {
    "temperatureRange": [18, 26],
    "humidityRange": [0.5, 0.9],
    "overwateringRisk": 0.9
  },
  "populationDynamics": {
    "dailyReproductionRate": 0.27,
    "dailyMortalityRate": 0.08,
    "carryingCapacity": 1.0
  },
  "damageModel": {
    "photosynthesisReductionPerDay": 0.05,
    "rootUptakeReductionPerDay": 0.15,
    "budLossFractionPerDay": 0.0,
    "diseaseVectorRisk": 0.5,
    "honeydew": false
  },
  "detection": {
    "symptoms": [
      "Adults on soil surface and near pots",
      "Larvae feed on roots causing stunting",
      "Algae growth on wet media"
    ],
    "monitoring": ["Yellow sticky cards at substrate level", "Potato slice test for larvae"]
  },
  "controlOptions": {
    "biological": ["Steinernema feltiae (nematodes)", "Bacillus thuringiensis israelensis (Bti)"],
    "cultural": ["Dry-down cycles", "Improve drainage", "Avoid algae"],
    "mechanical": ["Top-dress with sand/perlite layer"],
    "chemical": ["H2O2 drenches (careful), compliant larvicides where allowed"]
  }
}
```

## /data/blueprints/pests/root_aphids.json

```json
{
  "id": "1946a4a4-e2c7-494b-8777-7beffafcffba",
  "kind": "Pest",
  "name": "Root Aphids",
  "category": "sap-sucking",
  "targets": ["roots"],
  "environmentalRisk": {
    "temperatureRange": [18, 26],
    "humidityRange": [0.5, 0.9],
    "overfertilizationRisk": 0.5
  },
  "populationDynamics": {
    "dailyReproductionRate": 0.3,
    "dailyMortalityRate": 0.06,
    "carryingCapacity": 1.0
  },
  "damageModel": {
    "photosynthesisReductionPerDay": 0.08,
    "rootUptakeReductionPerDay": 0.25,
    "budLossFractionPerDay": 0.0,
    "diseaseVectorRisk": 0.4,
    "honeydew": false
  },
  "detection": {
    "symptoms": [
      "Stunted plants resembling nutrient deficiency",
      "White waxy residue on roots",
      "Poor response to fertilization"
    ],
    "monitoring": ["Root inspections during repotting", "Yellow sticky cards at substrate level"]
  },
  "controlOptions": {
    "biological": ["Beneficial nematodes (Steinernema/ Heterorhabditis)"],
    "cultural": ["Avoid overwatering and excess N", "Sterilize media/tools"],
    "mechanical": ["Discard heavily infested media"],
    "chemical": ["Drenches permitted by regulation (jurisdiction-dependent)"]
  }
}
```

## /data/blueprints/pests/spider_mites.json

```json
{
  "id": "7a887ad2-34ed-4284-9c86-b573aadffdb9",
  "kind": "Pest",
  "name": "Spider Mites",
  "category": "sap-sucking",
  "targets": ["leaves", "stems"],
  "environmentalRisk": {
    "temperatureRange": [24, 32],
    "humidityRange": [0.3, 0.6],
    "lowAirflowRisk": 0.6,
    "dustyCanopyRisk": 0.5
  },
  "populationDynamics": {
    "dailyReproductionRate": 0.35,
    "dailyMortalityRate": 0.05,
    "carryingCapacity": 1.0
  },
  "damageModel": {
    "photosynthesisReductionPerDay": 0.18,
    "rootUptakeReductionPerDay": 0.0,
    "budLossFractionPerDay": 0.0,
    "diseaseVectorRisk": 0.2,
    "honeydew": false
  },
  "detection": {
    "symptoms": [
      "Fine yellow stippling on upper leaf surfaces",
      "Webbing under leaves at high density",
      "Leaves bronzing and drying out"
    ],
    "monitoring": ["Use hand lens (≥40x) under leaves", "Sticky traps for presence trends"]
  },
  "controlOptions": {
    "biological": ["Predatory mites (Phytoseiulus persimilis, Amblyseius californicus)"],
    "cultural": ["Increase humidity short-term", "Improve airflow", "Quarantine new plants"],
    "mechanical": ["Rinse undersides, remove heavily infested leaves"],
    "chemical": ["Horticultural oils", "Soaps (rotate actives to avoid resistance)"]
  }
}
```

## /data/blueprints/pests/thrips.json

```json
{
  "id": "4bb767d7-403e-49c9-aa10-b957dfc0e881",
  "kind": "Pest",
  "name": "Thrips",
  "category": "sap-sucking",
  "targets": ["leaves", "flowers"],
  "environmentalRisk": {
    "temperatureRange": [20, 30],
    "humidityRange": [0.3, 0.7]
  },
  "populationDynamics": {
    "dailyReproductionRate": 0.3,
    "dailyMortalityRate": 0.06,
    "carryingCapacity": 1.0
  },
  "damageModel": {
    "photosynthesisReductionPerDay": 0.12,
    "rootUptakeReductionPerDay": 0.0,
    "budLossFractionPerDay": 0.0,
    "diseaseVectorRisk": 0.6,
    "honeydew": false
  },
  "detection": {
    "symptoms": [
      "Silvery streaks and speckling on leaves",
      "Black fecal spots",
      "Distorted new growth"
    ],
    "monitoring": ["Blue sticky cards near canopy", "Tap test over white paper"]
  },
  "controlOptions": {
    "biological": ["Orius spp.", "Amblyseius cucumeris"],
    "cultural": ["Remove weeds/volunteers", "Screen intakes"],
    "mechanical": ["Sticky cards mass-trapping"],
    "chemical": ["Spinosad where allowed", "Soaps and oils (rotate)"]
  }
}
```

## /data/blueprints/pests/whiteflies.json

```json
{
  "id": "ac38b09c-d963-4dd4-b105-54c8f4ba30b6",
  "kind": "Pest",
  "name": "Whiteflies",
  "category": "sap-sucking",
  "targets": ["leaves"],
  "environmentalRisk": {
    "temperatureRange": [22, 30],
    "humidityRange": [0.4, 0.8]
  },
  "populationDynamics": {
    "dailyReproductionRate": 0.28,
    "dailyMortalityRate": 0.06,
    "carryingCapacity": 1.0
  },
  "damageModel": {
    "photosynthesisReductionPerDay": 0.1,
    "rootUptakeReductionPerDay": 0.0,
    "budLossFractionPerDay": 0.0,
    "diseaseVectorRisk": 0.4,
    "honeydew": true
  },
  "detection": {
    "symptoms": [
      "Adults fly up when disturbed",
      "Sticky honeydew, sooty mold",
      "Leaf yellowing and drop"
    ],
    "monitoring": ["Yellow sticky cards just above canopy", "Check leaf undersides for nymphs"]
  },
  "controlOptions": {
    "biological": ["Encarsia formosa", "Eretmocerus spp."],
    "cultural": ["Sanitation, remove lower leaves", "Screen air intakes"],
    "mechanical": ["Vacuum adults routinely"],
    "chemical": ["Soaps/oils (rotate modes)"]
  }
}
```

## /data/blueprints/roomPurposes/breakroom.json

```json
{
  "id": "5ab7d9ac-f14a-45d9-b5f9-908182ca4a02",
  "kind": "breakroom",
  "name": "Break Room",
  "description": "A space for employees to rest and recover energy.",
  "flags": {
    "supportsRest": true,
    "staffOnly": true
  },
  "economy": {
    "areaCost": 280,
    "baseRentPerTick": 1.5
  }
}
```

## /data/blueprints/roomPurposes/growroom.json

```json
{
  "id": "2630459c-fc40-4e91-a69f-b47665b5a917",
  "kind": "growroom",
  "name": "Grow Room",
  "description": "A room designed for cultivating plants under controlled conditions.",
  "flags": {
    "supportsCultivation": true,
    "requiresControlledEnvironment": true
  },
  "economy": {
    "areaCost": 950,
    "baseRentPerTick": 4.8
  }
}
```

## /data/blueprints/roomPurposes/lab.json

```json
{
  "id": "05566944-af3c-40f5-9d22-2cbe701457c7",
  "kind": "lab",
  "name": "Laboratory",
  "description": "A facility for research and breeding new plant strains.",
  "flags": {
    "supportsResearch": true,
    "requiresSterileAccess": true
  },
  "economy": {
    "areaCost": 1200,
    "baseRentPerTick": 5.5
  }
}
```

## /data/blueprints/roomPurposes/salesroom.json

```json
{
  "id": "828aa416-37be-4176-bfa6-9ce847e9dfd5",
  "kind": "salesroom",
  "name": "Sales Room",
  "description": "A commercial space for selling harvested products.",
  "flags": {
    "customerFacing": true,
    "requiresPointOfSale": true
  },
  "economy": {
    "areaCost": 600,
    "baseRentPerTick": 3.2
  }
}
```

## /data/blueprints/strains/ak-47.json

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "ak47",
  "name": "AK-47",
  "lineage": {
    "parents": []
  },
  "genotype": {
    "sativa": 0.65,
    "indica": 0.35,
    "ruderalis": 0.0
  },
  "generalResilience": 0.7,
  "germinationRate": 0.95,
  "chemotype": {
    "thcContent": 0.2,
    "cbdContent": 0.01
  },
  "morphology": {
    "growthRate": 1.0,
    "yieldFactor": 1.0,
    "leafAreaIndex": 3.2
  },
  "growthModel": {
    "maxBiomassDry": 0.18,
    "baseLightUseEfficiency": 0.0009,
    "maintenanceFracPerDay": 0.01,
    "dryMatterFraction": {
      "vegetation": 0.25,
      "flowering": 0.2
    },
    "harvestIndex": {
      "targetFlowering": 0.7
    },
    "phaseCapMultiplier": {
      "vegetation": 0.5,
      "flowering": 1.0
    },
    "temperature": {
      "Q10": 2.0,
      "T_ref_C": 25
    }
  },
  "noise": {
    "enabled": true,
    "pct": 0.02
  },
  "environmentalPreferences": {
    "lightSpectrum": {
      "vegetation": [400, 700],
      "flowering": [300, 650]
    },
    "lightIntensity": {
      "vegetation": [400, 600],
      "flowering": [600, 1000]
    },
    "lightCycle": {
      "vegetation": [18, 6],
      "flowering": [12, 12]
    },
    "idealTemperature": {
      "vegetation": [20, 28],
      "flowering": [22, 30]
    },
    "idealHumidity": {
      "vegetation": [0.6, 0.7],
      "flowering": [0.5, 0.6]
    },
    "phRange": [5.8, 6.2]
  },
  "nutrientDemand": {
    "dailyNutrientDemand": {
      "seedling": {
        "nitrogen": 0.03,
        "phosphorus": 0.02,
        "potassium": 0.03
      },
      "vegetation": {
        "nitrogen": 0.12,
        "phosphorus": 0.06,
        "potassium": 0.1
      },
      "flowering": {
        "nitrogen": 0.07,
        "phosphorus": 0.14,
        "potassium": 0.16
      }
    },
    "npkTolerance": 0.15,
    "npkStressIncrement": 0.04
  },
  "waterDemand": {
    "dailyWaterUsagePerSquareMeter": {
      "seedling": 0.15,
      "vegetation": 0.36,
      "flowering": 0.54
    },
    "minimumFractionRequired": 0.15
  },
  "diseaseResistance": {
    "dailyInfectionIncrement": 0.03,
    "infectionThreshold": 0.4,
    "recoveryRate": 0.01,
    "degenerationRate": 0.01,
    "regenerationRate": 0.005,
    "fatalityThreshold": 0.95
  },
  "photoperiod": {
    "vegetationTime": 2419200,
    "floweringTime": 5443200,
    "transitionTrigger": 43200
  },
  "stageChangeThresholds": {
    "vegetative": {
      "minLightHours": 300,
      "maxStressForStageChange": 0.3
    },
    "flowering": {
      "minLightHours": 600,
      "maxStressForStageChange": 0.2
    }
  },
  "harvestWindow": [5184000, 6480000],
  "harvestProperties": {
    "ripeningTime": 172800,
    "maxStorageTime": 432000,
    "qualityDecayRate": 5.555555555555556e-6
  },
  "meta": {
    "description": "AK-47 is a classic hybrid cannabis strain known for its high THC levels and fast flowering. It combines strong sativa effects with compact indica growth.",
    "advantages": ["High THC potential", "Reliable yields", "Adaptable to indoor systems"],
    "disadvantages": [
      "Humidity-sensitive during flowering",
      "Not ideal for low-light environments"
    ],
    "notes": "Popular choice for both commercial grows and personal use due to its balance."
  }
}
```

## /data/blueprints/strains/northern-lights.json

```json
{
  "id": "3f0f15f4-1b75-4196-b3f3-5f6b6b7cf7a7",
  "slug": "northern_lights",
  "name": "Northern Lights",
  "photoperiodic": true,
  "vegDays": 28,
  "flowerDays": 50,
  "autoFlowerDays": null,
  "light": {
    "ppfdOpt_umol_m2s": 650,
    "ppfdMax_umol_m2s": 1000,
    "dliHalfSat_mol_m2d": 18,
    "dliMax_mol_m2d": 38
  },
  "coeffs": {
    "budGrowthBase_g_per_day": 1.4,
    "tempOptC": 25,
    "tempWidthC": 5.5,
    "co2HalfSat_ppm": 800
  },
  "lineage": {
    "parents": []
  },
  "genotype": {
    "sativa": 0.65,
    "indica": 0.35,
    "ruderalis": 0.0
  },
  "generalResilience": 0.7,
  "germinationRate": 0.98,
  "chemotype": {
    "thcContent": 0.2,
    "cbdContent": 0.01
  },
  "morphology": {
    "growthRate": 1.0,
    "yieldFactor": 1.0,
    "leafAreaIndex": 3.2
  },
  "growthModel": {
    "maxBiomassDry": 0.18,
    "baseLightUseEfficiency": 0.0009,
    "maintenanceFracPerDay": 0.01,
    "dryMatterFraction": {
      "vegetation": 0.25,
      "flowering": 0.2
    },
    "harvestIndex": {
      "targetFlowering": 0.7
    },
    "phaseCapMultiplier": {
      "vegetation": 0.5,
      "flowering": 1.0
    },
    "temperature": {
      "Q10": 2.0,
      "T_ref_C": 25
    }
  },
  "noise": {
    "enabled": true,
    "pct": 0.02
  },
  "environmentalPreferences": {
    "lightSpectrum": {
      "vegetation": [400, 700],
      "flowering": [300, 650]
    },
    "lightIntensity": {
      "vegetation": [400, 600],
      "flowering": [600, 1000]
    },
    "lightCycle": {
      "vegetation": [18, 6],
      "flowering": [12, 12]
    },
    "idealTemperature": {
      "vegetation": [20, 28],
      "flowering": [22, 30]
    },
    "idealHumidity": {
      "vegetation": [0.6, 0.7],
      "flowering": [0.5, 0.6]
    },
    "phRange": [5.8, 6.2]
  },
  "nutrientDemand": {
    "dailyNutrientDemand": {
      "seedling": {
        "nitrogen": 0.03,
        "phosphorus": 0.02,
        "potassium": 0.03
      },
      "vegetation": {
        "nitrogen": 0.12,
        "phosphorus": 0.06,
        "potassium": 0.1
      },
      "flowering": {
        "nitrogen": 0.07,
        "phosphorus": 0.14,
        "potassium": 0.16
      }
    },
    "npkTolerance": 0.15,
    "npkStressIncrement": 0.04
  },
  "waterDemand": {
    "dailyWaterUsagePerSquareMeter": {
      "seedling": 0.15,
      "vegetation": 0.36,
      "flowering": 0.54
    },
    "minimumFractionRequired": 0.15
  },
  "diseaseResistance": {
    "dailyInfectionIncrement": 0.03,
    "infectionThreshold": 0.4,
    "recoveryRate": 0.01,
    "degenerationRate": 0.01,
    "regenerationRate": 0.005,
    "fatalityThreshold": 0.95
  },
  "photoperiod": {
    "vegetationTime": 2419200,
    "floweringTime": 4320000,
    "transitionTrigger": 43200
  },
  "stageChangeThresholds": {
    "vegetative": {
      "minLightHours": 300,
      "maxStressForStageChange": 0.3
    },
    "flowering": {
      "minLightHours": 600,
      "maxStressForStageChange": 0.2
    }
  },
  "harvestWindow": [4147200, 5184000],
  "harvestProperties": {
    "ripeningTime": 172800,
    "maxStorageTime": 432000,
    "qualityDecayRate": 5.555555555555556e-6
  },
  "meta": {
    "description": "Northern Lights is a legendary indica strain prized for its resilience and fast flowering time.",
    "advantages": ["Compact growth", "Resistant to stress", "Classic indica effects"],
    "disadvantages": ["Moderate yields", "Prefers stable climates"],
    "notes": "Often used as a baseline in breeding projects."
  }
}
```

## /data/blueprints/strains/skunk-1.json

```json
{
  "id": "5a6e9e57-0b3a-4f9f-8f19-12f3f8ec3a0e",
  "slug": "skunk_1",
  "name": "Skunk #1",
  "photoperiodic": true,
  "vegDays": 30,
  "flowerDays": 55,
  "autoFlowerDays": null,
  "light": {
    "ppfdOpt_umol_m2s": 700,
    "ppfdMax_umol_m2s": 1100,
    "dliHalfSat_mol_m2d": 21,
    "dliMax_mol_m2d": 41
  },
  "coeffs": {
    "budGrowthBase_g_per_day": 1.7,
    "tempOptC": 26,
    "tempWidthC": 6,
    "co2HalfSat_ppm": 900
  },
  "lineage": {
    "parents": []
  },
  "genotype": {
    "sativa": 0.65,
    "indica": 0.35,
    "ruderalis": 0.0
  },
  "generalResilience": 0.7,
  "germinationRate": 0.96,
  "chemotype": {
    "thcContent": 0.2,
    "cbdContent": 0.01
  },
  "morphology": {
    "growthRate": 1.0,
    "yieldFactor": 1.0,
    "leafAreaIndex": 3.2
  },
  "growthModel": {
    "maxBiomassDry": 0.18,
    "baseLightUseEfficiency": 0.0009,
    "maintenanceFracPerDay": 0.01,
    "dryMatterFraction": {
      "vegetation": 0.25,
      "flowering": 0.2
    },
    "harvestIndex": {
      "targetFlowering": 0.7
    },
    "phaseCapMultiplier": {
      "vegetation": 0.5,
      "flowering": 1.0
    },
    "temperature": {
      "Q10": 2.0,
      "T_ref_C": 25
    }
  },
  "noise": {
    "enabled": true,
    "pct": 0.02
  },
  "environmentalPreferences": {
    "lightSpectrum": {
      "vegetation": [400, 700],
      "flowering": [300, 650]
    },
    "lightIntensity": {
      "vegetation": [400, 600],
      "flowering": [600, 1000]
    },
    "lightCycle": {
      "vegetation": [18, 6],
      "flowering": [12, 12]
    },
    "idealTemperature": {
      "vegetation": [20, 28],
      "flowering": [22, 30]
    },
    "idealHumidity": {
      "vegetation": [0.6, 0.7],
      "flowering": [0.5, 0.6]
    },
    "phRange": [5.8, 6.2]
  },
  "nutrientDemand": {
    "dailyNutrientDemand": {
      "seedling": {
        "nitrogen": 0.03,
        "phosphorus": 0.02,
        "potassium": 0.03
      },
      "vegetation": {
        "nitrogen": 0.12,
        "phosphorus": 0.06,
        "potassium": 0.1
      },
      "flowering": {
        "nitrogen": 0.07,
        "phosphorus": 0.14,
        "potassium": 0.16
      }
    },
    "npkTolerance": 0.15,
    "npkStressIncrement": 0.04
  },
  "waterDemand": {
    "dailyWaterUsagePerSquareMeter": {
      "seedling": 0.15,
      "vegetation": 0.36,
      "flowering": 0.54
    },
    "minimumFractionRequired": 0.15
  },
  "diseaseResistance": {
    "dailyInfectionIncrement": 0.03,
    "infectionThreshold": 0.4,
    "recoveryRate": 0.01,
    "degenerationRate": 0.01,
    "regenerationRate": 0.005,
    "fatalityThreshold": 0.95
  },
  "photoperiod": {
    "vegetationTime": 2592000,
    "floweringTime": 4752000,
    "transitionTrigger": 43200
  },
  "stageChangeThresholds": {
    "vegetative": {
      "minLightHours": 300,
      "maxStressForStageChange": 0.3
    },
    "flowering": {
      "minLightHours": 600,
      "maxStressForStageChange": 0.2
    }
  },
  "harvestWindow": [4752000, 5616000],
  "harvestProperties": {
    "ripeningTime": 172800,
    "maxStorageTime": 432000,
    "qualityDecayRate": 5.555555555555556e-6
  },
  "meta": {
    "description": "Skunk #1 set the standard for modern hybrids with its skunky aroma and balanced growth.",
    "advantages": ["Stable genetics", "Fast flowering", "Classic flavor"],
    "disadvantages": ["Strong odor", "Can stretch in veg"],
    "notes": "Widely used as a benchmark strain since the 1970s."
  }
}
```

## /data/blueprints/strains/sour-diesel.json

```json
{
  "id": "8b9a0b6c-2d6c-4f58-9c37-7a6c9d4aa5c2",
  "slug": "sour_diesel",
  "name": "Sour Diesel",
  "photoperiodic": true,
  "vegDays": 36,
  "flowerDays": 70,
  "autoFlowerDays": null,
  "light": {
    "ppfdOpt_umol_m2s": 850,
    "ppfdMax_umol_m2s": 1250,
    "dliHalfSat_mol_m2d": 27,
    "dliMax_mol_m2d": 48
  },
  "coeffs": {
    "budGrowthBase_g_per_day": 1.9,
    "tempOptC": 26.5,
    "tempWidthC": 6.5,
    "co2HalfSat_ppm": 950
  },
  "lineage": {
    "parents": []
  },
  "genotype": {
    "sativa": 0.65,
    "indica": 0.35,
    "ruderalis": 0.0
  },
  "generalResilience": 0.7,
  "germinationRate": 0.92,
  "chemotype": {
    "thcContent": 0.2,
    "cbdContent": 0.01
  },
  "morphology": {
    "growthRate": 1.0,
    "yieldFactor": 1.0,
    "leafAreaIndex": 3.2
  },
  "growthModel": {
    "maxBiomassDry": 0.18,
    "baseLightUseEfficiency": 0.0009,
    "maintenanceFracPerDay": 0.01,
    "dryMatterFraction": {
      "vegetation": 0.25,
      "flowering": 0.2
    },
    "harvestIndex": {
      "targetFlowering": 0.7
    },
    "phaseCapMultiplier": {
      "vegetation": 0.5,
      "flowering": 1.0
    },
    "temperature": {
      "Q10": 2.0,
      "T_ref_C": 25
    }
  },
  "noise": {
    "enabled": true,
    "pct": 0.02
  },
  "environmentalPreferences": {
    "lightSpectrum": {
      "vegetation": [400, 700],
      "flowering": [300, 650]
    },
    "lightIntensity": {
      "vegetation": [400, 600],
      "flowering": [600, 1000]
    },
    "lightCycle": {
      "vegetation": [18, 6],
      "flowering": [12, 12]
    },
    "idealTemperature": {
      "vegetation": [20, 28],
      "flowering": [22, 30]
    },
    "idealHumidity": {
      "vegetation": [0.6, 0.7],
      "flowering": [0.5, 0.6]
    },
    "phRange": [5.8, 6.2]
  },
  "nutrientDemand": {
    "dailyNutrientDemand": {
      "seedling": {
        "nitrogen": 0.03,
        "phosphorus": 0.02,
        "potassium": 0.03
      },
      "vegetation": {
        "nitrogen": 0.12,
        "phosphorus": 0.06,
        "potassium": 0.1
      },
      "flowering": {
        "nitrogen": 0.07,
        "phosphorus": 0.14,
        "potassium": 0.16
      }
    },
    "npkTolerance": 0.15,
    "npkStressIncrement": 0.04
  },
  "waterDemand": {
    "dailyWaterUsagePerSquareMeter": {
      "seedling": 0.15,
      "vegetation": 0.36,
      "flowering": 0.54
    },
    "minimumFractionRequired": 0.15
  },
  "diseaseResistance": {
    "dailyInfectionIncrement": 0.03,
    "infectionThreshold": 0.4,
    "recoveryRate": 0.01,
    "degenerationRate": 0.01,
    "regenerationRate": 0.005,
    "fatalityThreshold": 0.95
  },
  "photoperiod": {
    "vegetationTime": 3110400,
    "floweringTime": 6048000,
    "transitionTrigger": 43200
  },
  "stageChangeThresholds": {
    "vegetative": {
      "minLightHours": 300,
      "maxStressForStageChange": 0.3
    },
    "flowering": {
      "minLightHours": 600,
      "maxStressForStageChange": 0.2
    }
  },
  "harvestWindow": [5616000, 6912000],
  "harvestProperties": {
    "ripeningTime": 172800,
    "maxStorageTime": 432000,
    "qualityDecayRate": 5.555555555555556e-6
  },
  "meta": {
    "description": "Sour Diesel delivers pungent aromas and energizing effects, popular among sativa enthusiasts.",
    "advantages": ["High vigor", "Strong aroma", "Excellent for daytime use"],
    "disadvantages": ["Long flowering period", "Requires ample light"],
    "notes": "Originates from the U.S. East Coast underground scene."
  }
}
```

## /data/blueprints/strains/white-widow.json

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "slug": "white_widow",
  "name": "White Widow",
  "lineage": {
    "parents": []
  },
  "genotype": {
    "sativa": 0.5,
    "indica": 0.5,
    "ruderalis": 0.0
  },
  "generalResilience": 0.75,
  "germinationRate": 0.97,
  "chemotype": {
    "thcContent": 0.18,
    "cbdContent": 0.02
  },
  "morphology": {
    "growthRate": 0.95,
    "yieldFactor": 1.1,
    "leafAreaIndex": 3.0
  },
  "growthModel": {
    "maxBiomassDry": 0.18,
    "baseLightUseEfficiency": 0.0009,
    "maintenanceFracPerDay": 0.01,
    "dryMatterFraction": {
      "vegetation": 0.25,
      "flowering": 0.2
    },
    "harvestIndex": {
      "targetFlowering": 0.7
    },
    "phaseCapMultiplier": {
      "vegetation": 0.5,
      "flowering": 1.0
    },
    "temperature": {
      "Q10": 2.0,
      "T_ref_C": 25
    }
  },
  "noise": {
    "enabled": true,
    "pct": 0.02
  },
  "environmentalPreferences": {
    "lightSpectrum": {
      "vegetation": [400, 700],
      "flowering": [300, 650]
    },
    "lightIntensity": {
      "vegetation": [350, 550],
      "flowering": [550, 950]
    },
    "lightCycle": {
      "vegetation": [18, 6],
      "flowering": [12, 12]
    },
    "idealTemperature": {
      "vegetation": [21, 27],
      "flowering": [20, 26]
    },
    "idealHumidity": {
      "vegetation": [0.55, 0.65],
      "flowering": [0.45, 0.55]
    },
    "phRange": [5.8, 6.2]
  },
  "nutrientDemand": {
    "dailyNutrientDemand": {
      "seedling": {
        "nitrogen": 0.03,
        "phosphorus": 0.02,
        "potassium": 0.03
      },
      "vegetation": {
        "nitrogen": 0.11,
        "phosphorus": 0.07,
        "potassium": 0.11
      },
      "flowering": {
        "nitrogen": 0.06,
        "phosphorus": 0.15,
        "potassium": 0.15
      }
    },
    "npkTolerance": 0.2,
    "npkStressIncrement": 0.035
  },
  "waterDemand": {
    "dailyWaterUsagePerSquareMeter": {
      "seedling": 0.14,
      "vegetation": 0.34,
      "flowering": 0.51
    },
    "minimumFractionRequired": 0.15
  },
  "diseaseResistance": {
    "dailyInfectionIncrement": 0.025,
    "infectionThreshold": 0.45,
    "recoveryRate": 0.012,
    "degenerationRate": 0.01,
    "regenerationRate": 0.006,
    "fatalityThreshold": 0.95
  },
  "photoperiod": {
    "vegetationTime": 2419200,
    "floweringTime": 5184000,
    "transitionTrigger": 43200
  },
  "stageChangeThresholds": {
    "vegetative": {
      "minLightHours": 320,
      "maxStressForStageChange": 0.35
    },
    "flowering": {
      "minLightHours": 620,
      "maxStressForStageChange": 0.25
    }
  },
  "harvestWindow": [5011200, 6048000],
  "harvestProperties": {
    "ripeningTime": 172800,
    "maxStorageTime": 432000,
    "qualityDecayRate": 5.555555555555556e-6
  },
  "meta": {
    "description": "White Widow is a balanced hybrid strain, a cross between a Brazilian sativa landrace and a resin-heavy South Indian indica. It is known for its resin production and relatively easy growth.",
    "advantages": ["High resin production", "Balanced effects", "Good for beginners"],
    "disadvantages": ["Can be sensitive to nutrients", "Prefers stable temperatures"],
    "notes": "A classic Dutch coffee-shop strain that remains popular worldwide."
  }
}
```

## /data/blueprints/structures/medium_warehouse.json

```json
{
  "id": "59ec5597-42f5-4e52-acb9-cb65d68fd72d",
  "name": "Medium Warehouse",
  "footprint": {
    "length_m": 40,
    "width_m": 60,
    "height_m": 3
  },
  "rentalCostPerSqmPerMonth": 10,
  "upfrontFee": 1500
}
```

## /data/blueprints/structures/shed.json

```json
{
  "id": "d96dd659-4678-4d5d-a97c-a590ab52c2f2",
  "name": "Shed",
  "footprint": {
    "length_m": 6,
    "width_m": 5,
    "height_m": 3
  },
  "rentalCostPerSqmPerMonth": 1,
  "upfrontFee": 50
}
```

## /data/blueprints/structures/small_warehouse.json

```json
{
  "id": "43ee4095-627d-4a0c-860b-b10affbcf603",
  "name": "Small Warehouse",
  "footprint": {
    "length_m": 20,
    "width_m": 20,
    "height_m": 3
  },
  "rentalCostPerSqmPerMonth": 10,
  "upfrontFee": 500
}
```

## configs/difficulty.json

```json
{
  "easy": {
    "name": "Easy",
    "description": "A relaxed experience with more resilient plants, reliable equipment, and favorable economic conditions.",
    "modifiers": {
      "plantStress": {
        "optimalRangeMultiplier": 1.2,
        "stressAccumulationMultiplier": 0.8
      },
      "deviceFailure": {
        "mtbfMultiplier": 1.5
      },
      "economics": {
        "initialCapital": 2000000,
        "itemPriceMultiplier": 0.9,
        "harvestPriceMultiplier": 1.1,
        "rentPerSqmStructurePerTick": 0.1,
        "rentPerSqmRoomPerTick": 0.2
      }
    }
  },
  "normal": {
    "name": "Normal",
    "description": "A balanced simulation reflecting standard conditions.",
    "modifiers": {
      "plantStress": {
        "optimalRangeMultiplier": 1.0,
        "stressAccumulationMultiplier": 1.0
      },
      "deviceFailure": {
        "mtbfMultiplier": 1.0
      },
      "economics": {
        "initialCapital": 1500000,
        "itemPriceMultiplier": 1.0,
        "harvestPriceMultiplier": 1.0,
        "rentPerSqmStructurePerTick": 0.15,
        "rentPerSqmRoomPerTick": 0.3
      }
    }
  },
  "hard": {
    "name": "Hard",
    "description": "A challenging simulation with sensitive plants, less reliable equipment, and tighter economic constraints.",
    "modifiers": {
      "plantStress": {
        "optimalRangeMultiplier": 0.8,
        "stressAccumulationMultiplier": 1.2
      },
      "deviceFailure": {
        "mtbfMultiplier": 0.75
      },
      "economics": {
        "initialCapital": 1000000,
        "itemPriceMultiplier": 1.1,
        "harvestPriceMultiplier": 0.9,
        "rentPerSqmStructurePerTick": 0.2,
        "rentPerSqmRoomPerTick": 0.4
      }
    }
  }
}
```

## configs/disease_balancing.json

```json
{
  "kind": "DiseaseBalancing",
  "version": "1.0.0",
  "notes": "Phase- and environment-level multipliers for disease progression and recovery; values are normalized (0..1) or unitless multipliers.",
  "global": {
    "baseDailyInfectionMultiplier": 1.0,
    "baseRecoveryMultiplier": 1.0,
    "maxConcurrentDiseases": 2,
    "symptomDelayDays": {
      "min": 1,
      "max": 5
    },
    "eventWeights": {
      "emitOnThresholdCross": 1.0,
      "emitOnFatality": 1.0
    }
  },
  "phaseMultipliers": {
    "seedling": {
      "infection": 1.2,
      "degeneration": 1.1,
      "recovery": 0.85
    },
    "vegetation": {
      "infection": 1.0,
      "degeneration": 1.0,
      "recovery": 1.0
    },
    "earlyFlower": {
      "infection": 1.1,
      "degeneration": 1.2,
      "recovery": 0.95
    },
    "lateFlower": {
      "infection": 1.3,
      "degeneration": 1.4,
      "recovery": 0.8
    },
    "ripening": {
      "infection": 1.1,
      "degeneration": 1.5,
      "recovery": 0.75
    }
  },
  "environmentModifiers": {
    "relativeHumidity": {
      "sensitivity": 1.0,
      "optimalRange": [0.5, 0.65],
      "aboveOptimalInfectionMultPer+0.05": 1.1,
      "belowOptimalInfectionMultPer-0.05": 1.05
    },
    "temperature": {
      "sensitivity": 0.8,
      "optimalRange": [22, 26],
      "distanceToOptimalMultPer+2C": 1.05
    },
    "leafWetness": {
      "sensitivity": 1.2,
      "wetnessBonusInfectionMultiplier": 1.25
    },
    "airflow": {
      "lowAirflowRiskMultiplier": 1.15,
      "goodAirflowRecoveryMultiplier": 1.1
    }
  },
  "strainResistanceWeights": {
    "generalResilienceWeight": 0.7,
    "specificResistanceWeight": 0.3
  },
  "treatmentEfficacy": {
    "cultural": {
      "infectionMultiplier": 0.9,
      "degenerationMultiplier": 0.95,
      "recoveryMultiplier": 1.05
    },
    "biological": {
      "infectionMultiplier": 0.85,
      "degenerationMultiplier": 0.9,
      "recoveryMultiplier": 1.1
    },
    "mechanical": {
      "infectionMultiplier": 0.8,
      "degenerationMultiplier": 0.85,
      "recoveryMultiplier": 1.05
    },
    "chemical": {
      "infectionMultiplier": 0.7,
      "degenerationMultiplier": 0.8,
      "recoveryMultiplier": 1.15
    }
  },
  "caps": {
    "minDailyDegeneration": 0.0,
    "maxDailyDegeneration": 0.2,
    "minDailyRecovery": 0.0,
    "maxDailyRecovery": 0.2
  },
  "integrationHints": {
    "applyOrder": [
      "phaseMultipliers",
      "environmentModifiers",
      "strainResistanceWeights",
      "treatmentEfficacy",
      "caps"
    ],
    "mapToDiseaseModel": {
      "dailyInfectionIncrement": "× global.baseDailyInfectionMultiplier × phaseMultipliers.*.infection × environmentModifiers.* × (1 - resistance)",
      "degenerationRate": "× phaseMultipliers.*.degeneration × treatmentEfficacy.*.degenerationMultiplier → clamp caps",
      "recoveryRate": "× phaseMultipliers.*.recovery × treatmentEfficacy.*.recoveryMultiplier → clamp caps"
    }
  }
}
```

## configs/pest_balancing.json

```json
{
  "kind": "PestBalancing",
  "version": "1.0.0",
  "notes": "Population growth, damage and control multipliers for pests; normalized values and unitless multipliers.",
  "global": {
    "baseDailyReproductionMultiplier": 1.0,
    "baseDailyMortalityMultiplier": 1.0,
    "baseDamageMultiplier": 1.0,
    "maxConcurrentPests": 3,
    "economicThresholds": {
      "photosynthesisReductionAlert": 0.08,
      "rootUptakeReductionAlert": 0.12,
      "budLossAlert": 0.02
    },
    "eventWeights": {
      "emitOnOutbreak": 1.0,
      "emitOnControlSuccess": 1.0
    }
  },
  "phaseMultipliers": {
    "seedling": {
      "reproduction": 1.1,
      "damage": 1.15,
      "mortality": 0.95
    },
    "vegetation": {
      "reproduction": 1.0,
      "damage": 1.0,
      "mortality": 1.0
    },
    "earlyFlower": {
      "reproduction": 1.05,
      "damage": 1.15,
      "mortality": 0.95
    },
    "lateFlower": {
      "reproduction": 1.1,
      "damage": 1.3,
      "mortality": 0.9
    },
    "ripening": {
      "reproduction": 0.95,
      "damage": 1.4,
      "mortality": 0.95
    }
  },
  "environmentModifiers": {
    "relativeHumidity": {
      "hotDryBoostForMitesAtRH<0.45": 1.2,
      "wetMediaBoostForGnatsAtRH>0.70": 1.25
    },
    "temperature": {
      "warmBoostForMitesAtT>26": 1.15,
      "coolSlowdownForWhitefliesAtT<20": 0.85
    },
    "substrate": {
      "overwateringBoost": 1.3,
      "goodDrainageMortalityBoost": 1.1
    },
    "airflow": {
      "lowAirflowReproductionBoost": 1.1
    }
  },
  "naturalEnemies": {
    "backgroundPredationPerDay": 0.03,
    "enhancedPredationWithBiocontrol": 0.12
  },
  "controlEfficacy": {
    "biological": {
      "reproductionMultiplier": 0.8,
      "mortalityMultiplier": 1.2,
      "damageMultiplier": 0.9
    },
    "cultural": {
      "reproductionMultiplier": 0.9,
      "mortalityMultiplier": 1.05,
      "damageMultiplier": 0.95
    },
    "mechanical": {
      "reproductionMultiplier": 0.85,
      "mortalityMultiplier": 1.1,
      "damageMultiplier": 0.9
    },
    "chemical": {
      "reproductionMultiplier": 0.7,
      "mortalityMultiplier": 1.3,
      "damageMultiplier": 0.8
    }
  },
  "diseaseInteraction": {
    "vectorRiskToInfectionMultiplier": 1.15,
    "honeydewToMoldRiskMultiplier": 1.2
  },
  "caps": {
    "minDailyReproduction": 0.0,
    "maxDailyReproduction": 0.6,
    "minDailyMortality": 0.0,
    "maxDailyMortality": 0.6,
    "minDailyDamage": 0.0,
    "maxDailyDamage": 0.4
  },
  "integrationHints": {
    "applyOrder": [
      "phaseMultipliers",
      "environmentModifiers",
      "naturalEnemies",
      "controlEfficacy",
      "caps"
    ],
    "mapToPestModel": {
      "populationGrowth": "populationDynamics.dailyReproductionRate × global.baseDailyReproductionMultiplier × phaseMultipliers.*.reproduction × envMods → − mortality",
      "mortality": "populationDynamics.dailyMortalityRate × global.baseDailyMortalityMultiplier × phaseMultipliers.*.mortality × (1 + naturalEnemies.backgroundPredationPerDay)",
      "damage": "damageModel.* × global.baseDamageMultiplier × phaseMultipliers.*.damage × controlEfficacy.*.damageMultiplier → clamp caps"
    }
  }
}
```

## configs/task_definitions.json

```json
{
  "repair_device": {
    "costModel": { "basis": "perAction", "laborMinutes": 90 },
    "priority": 100,
    "requiredRole": "Technician",
    "requiredSkill": "Maintenance",
    "minSkillLevel": 2,
    "description": "Repair {deviceName} in {zoneName}"
  },
  "maintain_device": {
    "costModel": { "basis": "perAction", "laborMinutes": 30 },
    "priority": 30,
    "requiredRole": "Technician",
    "requiredSkill": "Maintenance",
    "minSkillLevel": 4,
    "description": "Maintain {deviceName} in {zoneName}"
  },
  "harvest_plants": {
    "costModel": { "basis": "perPlant", "laborMinutes": 5 },
    "priority": 90,
    "requiredRole": "Gardener",
    "requiredSkill": "Gardening",
    "minSkillLevel": 0,
    "description": "Harvest {plantCount} plants in {zoneName}"
  },
  "refill_supplies_water": {
    "costModel": { "basis": "perAction", "laborMinutes": 15 },
    "priority": 80,
    "requiredRole": "Gardener",
    "requiredSkill": "Gardening",
    "minSkillLevel": 0,
    "description": "Refill water in {zoneName}"
  },
  "refill_supplies_nutrients": {
    "costModel": { "basis": "perAction", "laborMinutes": 15 },
    "priority": 80,
    "requiredRole": "Gardener",
    "requiredSkill": "Gardening",
    "minSkillLevel": 0,
    "description": "Refill nutrients in {zoneName}"
  },
  "clean_zone": {
    "costModel": { "basis": "perSquareMeter", "laborMinutes": 1 },
    "priority": 60,
    "requiredRole": "Janitor",
    "requiredSkill": "Cleanliness",
    "minSkillLevel": 0,
    "description": "Clean {zoneName} ({area}m²)"
  },
  "overhaul_zone_substrate": {
    "costModel": { "basis": "perSquareMeter", "laborMinutes": 5 },
    "priority": 70,
    "requiredRole": "Janitor",
    "requiredSkill": "Cleanliness",
    "minSkillLevel": 2,
    "description": "Overhaul substrate in {zoneName} ({area}m²)"
  },
  "reset_light_cycle": {
    "costModel": { "basis": "perAction", "laborMinutes": 5 },
    "priority": 50,
    "requiredRole": "Gardener",
    "requiredSkill": "Gardening",
    "minSkillLevel": 0,
    "description": "Reset light cycle in {zoneName}"
  },
  "execute_planting_plan": {
    "costModel": { "basis": "perPlant", "laborMinutes": 2 },
    "priority": 40,
    "requiredRole": "Gardener",
    "requiredSkill": "Gardening",
    "minSkillLevel": 0,
    "description": "Plant {plantCount} seedlings in {zoneName}"
  },
  "adjust_light_cycle": {
    "costModel": { "basis": "perAction", "laborMinutes": 5 },
    "priority": 80,
    "requiredRole": "Gardener",
    "requiredSkill": "Gardening",
    "minSkillLevel": 3,
    "description": "Adjust light cycle in {zoneName} for flowering"
  },
  "apply_treatment": {
    "costModel": { "basis": "perPlant", "laborMinutes": 4 },
    "priority": 90,
    "requiredRole": "Gardener",
    "requiredSkill": "Gardening",
    "minSkillLevel": 2,
    "description": "Apply {treatmentName} to affected plants in {zoneName}"
  }
}
```

## configs/treatment_options.json

```json
{
  "kind": "TreatmentOptions",
  "version": "1.1.0",
  "notes": "Unified treatment catalogue for diseases and pests. All efficacy values are multipliers applied on top of blueprint/balancing values. Values <1 reduce infection/reproduction/damage; values >1 increase recovery/mortality. Costs: materialsCost uses a costBasis to scale to the actual application size.",
  "global": {
    "stackingRules": {
      "maxConcurrentTreatmentsPerZone": 3,
      "mechanicalAlwaysStacks": true,
      "chemicalAndBiologicalCantShareSameMoAWithin7Days": true,
      "cooldownDaysDefault": 3
    },
    "sideEffects": {
      "phytotoxicityRiskKeys": ["oilOnBloom", "uvcOnTenderLeaves"],
      "beneficialsHarmRiskKeys": ["broadSpectrumInsecticide", "sulfurHighDose"]
    },
    "costModel": {
      "costBasis": {
        "perZone": "materialsCost applies once per application for the entire zone (scaleFactor=1).",
        "perPlant": "materialsCost is multiplied by the number of plants in the treated zone.",
        "perSquareMeter": "materialsCost is multiplied by the zone area in square meters."
      },
      "totalCostFormula": "totalCost = (materialsCost × scaleFactor) + laborMinutes×wageRate + optionalEnergy + optionalEquipment"
    }
  },
  "options": [
    {
      "id": "defbc266-d4a8-4d1d-bb90-c603ea4574d6",
      "name": "Increase Airflow",
      "category": "cultural",
      "targets": ["disease", "pest"],
      "applicability": ["seedling", "vegetation", "earlyFlower", "lateFlower", "ripening"],
      "efficacy": {
        "disease": {
          "infectionMultiplier": 0.92,
          "degenerationMultiplier": 0.95,
          "recoveryMultiplier": 1.05
        },
        "pest": {
          "reproductionMultiplier": 0.92,
          "damageMultiplier": 0.95,
          "mortalityMultiplier": 1.05
        }
      },
      "costs": {
        "laborMinutes": 45,
        "materialsCost": 0.0
      },
      "cooldownDays": 0,
      "notes": "Pruning lower leaves, repositioning fans, cleaning filters.",
      "costBasis": "perZone"
    },
    {
      "id": "97187f66-817f-4e8a-b0cb-db237b663743",
      "name": "Dehumidify Night Cycle",
      "category": "cultural",
      "targets": ["disease"],
      "applicability": ["earlyFlower", "lateFlower", "ripening"],
      "efficacy": {
        "disease": {
          "infectionMultiplier": 0.85,
          "degenerationMultiplier": 0.9,
          "recoveryMultiplier": 1.1
        }
      },
      "costs": {
        "laborMinutes": 10,
        "energyPerHourKWh": 1.2,
        "materialsCost": 2.0
      },
      "cooldownDays": 0,
      "notes": "Adjust setpoints to prevent condensation; pairs well with defoliation.",
      "costBasis": "perZone"
    },
    {
      "id": "0828046f-3986-456b-9abe-3f35f5a1f9c4",
      "name": "Dry-Down Irrigation Cycle",
      "category": "cultural",
      "targets": ["pest", "disease"],
      "applicability": ["seedling", "vegetation", "earlyFlower"],
      "efficacy": {
        "pest": {
          "reproductionMultiplier": 0.85,
          "mortalityMultiplier": 1.1,
          "damageMultiplier": 0.95
        },
        "disease": {
          "infectionMultiplier": 0.9,
          "recoveryMultiplier": 1.05
        }
      },
      "costs": {
        "laborMinutes": 15,
        "materialsCost": 0.0
      },
      "cooldownDays": 2,
      "notes": "Especially effective against fungus gnats and root pathogens.",
      "costBasis": "perZone"
    },
    {
      "id": "fa328792-9539-4254-bd5d-cbe8233b6289",
      "name": "Predatory Mites (Phytoseiulus/Amblyseius)",
      "category": "biological",
      "targets": ["pest"],
      "applicability": ["vegetation", "earlyFlower", "lateFlower"],
      "efficacy": {
        "pest": {
          "reproductionMultiplier": 0.75,
          "mortalityMultiplier": 1.25,
          "damageMultiplier": 0.9
        }
      },
      "costs": {
        "laborMinutes": 20,
        "materialsCost": 35.0
      },
      "cooldownDays": 7,
      "risks": {
        "beneficialsHarm": false
      },
      "notes": "Best for spider/broad mites; maintain moderate RH.",
      "costBasis": "perPlant"
    },
    {
      "id": "a0e34f90-c9de-4a95-a88d-9a1a615dd747",
      "name": "Bacillus subtilis (foliar)",
      "category": "biological",
      "targets": ["disease"],
      "applicability": ["vegetation", "earlyFlower"],
      "efficacy": {
        "disease": {
          "infectionMultiplier": 0.8,
          "degenerationMultiplier": 0.9,
          "recoveryMultiplier": 1.1
        }
      },
      "costs": {
        "laborMinutes": 30,
        "materialsCost": 18.0
      },
      "cooldownDays": 7,
      "notes": "Preventive + early curative against powdery mildew.",
      "costBasis": "perSquareMeter"
    },
    {
      "id": "80edee83-4577-4063-877c-68f8d6ab35bc",
      "name": "Trichoderma (root drench)",
      "category": "biological",
      "targets": ["disease", "pest"],
      "applicability": ["seedling", "vegetation", "earlyFlower"],
      "efficacy": {
        "disease": {
          "infectionMultiplier": 0.82,
          "degenerationMultiplier": 0.9,
          "recoveryMultiplier": 1.08
        },
        "pest": {
          "reproductionMultiplier": 0.9,
          "mortalityMultiplier": 1.05
        }
      },
      "costs": {
        "laborMinutes": 20,
        "materialsCost": 22.0
      },
      "cooldownDays": 10,
      "notes": "Suppresses root pathogens; slight benefit vs root aphids.",
      "costBasis": "perSquareMeter"
    },
    {
      "id": "26eba5ec-66e0-41e9-98b5-cce64ebbc079",
      "name": "Bti (Bacillus thuringiensis israelensis)",
      "category": "biological",
      "targets": ["pest"],
      "applicability": ["seedling", "vegetation", "earlyFlower"],
      "efficacy": {
        "pest": {
          "reproductionMultiplier": 0.7,
          "mortalityMultiplier": 1.35,
          "damageMultiplier": 0.85
        }
      },
      "costs": {
        "laborMinutes": 20,
        "materialsCost": 15.0
      },
      "cooldownDays": 7,
      "notes": "Highly effective on fungus gnat larvae; drench media.",
      "costBasis": "perSquareMeter"
    },
    {
      "id": "8241536e-1b0e-4f7b-8857-63bca0179c3e",
      "name": "Remove Infected Tissue",
      "category": "mechanical",
      "targets": ["disease"],
      "applicability": ["vegetation", "earlyFlower", "lateFlower"],
      "efficacy": {
        "disease": {
          "infectionMultiplier": 0.85,
          "degenerationMultiplier": 0.8,
          "recoveryMultiplier": 1.05
        }
      },
      "costs": {
        "laborMinutes": 25,
        "materialsCost": 1.5
      },
      "cooldownDays": 0,
      "notes": "Bag and discard; disinfect tools between cuts.",
      "costBasis": "perZone"
    },
    {
      "id": "40d709c5-5cc6-4bbf-92d0-7e172057170c",
      "name": "Sticky Cards (yellow/blue)",
      "category": "mechanical",
      "targets": ["pest"],
      "applicability": ["seedling", "vegetation", "earlyFlower", "lateFlower", "ripening"],
      "efficacy": {
        "pest": {
          "reproductionMultiplier": 0.95,
          "mortalityMultiplier": 1.08,
          "damageMultiplier": 0.97
        }
      },
      "costs": {
        "laborMinutes": 10,
        "materialsCost": 8.0
      },
      "cooldownDays": 0,
      "notes": "Monitoring plus partial mass trapping of flying adults.",
      "costBasis": "perZone"
    },
    {
      "id": "327a4266-caba-4129-8538-0f7f2c12fbd0",
      "name": "Rinse/Jet Wash",
      "category": "mechanical",
      "targets": ["pest"],
      "applicability": ["vegetation"],
      "efficacy": {
        "pest": {
          "reproductionMultiplier": 0.85,
          "mortalityMultiplier": 1.1,
          "damageMultiplier": 0.9
        }
      },
      "costs": {
        "laborMinutes": 30,
        "materialsCost": 0.5
      },
      "cooldownDays": 3,
      "notes": "Effective on aphids/mites early; avoid oversaturation of media.",
      "costBasis": "perZone"
    },
    {
      "id": "91d9ee39-32e5-4d83-9702-1365d171a5ea",
      "name": "Horticultural Oil (foliar)",
      "category": "chemical",
      "targets": ["pest", "disease"],
      "applicability": ["vegetation", "earlyFlower"],
      "efficacy": {
        "pest": {
          "reproductionMultiplier": 0.7,
          "mortalityMultiplier": 1.3,
          "damageMultiplier": 0.85
        },
        "disease": {
          "infectionMultiplier": 0.85,
          "degenerationMultiplier": 0.9
        }
      },
      "costs": {
        "laborMinutes": 35,
        "materialsCost": 12.0
      },
      "cooldownDays": 7,
      "risks": {
        "phytotoxicity": "medium",
        "notes": "Avoid on open flowers; can harm beneficials."
      },
      "costBasis": "perSquareMeter"
    },
    {
      "id": "ba30fafa-3751-4c56-9315-c289c8780dd0",
      "name": "Potassium Bicarbonate (foliar)",
      "category": "chemical",
      "targets": ["disease"],
      "applicability": ["vegetation", "earlyFlower"],
      "efficacy": {
        "disease": {
          "infectionMultiplier": 0.75,
          "degenerationMultiplier": 0.85,
          "recoveryMultiplier": 1.1
        }
      },
      "costs": {
        "laborMinutes": 25,
        "materialsCost": 6.0
      },
      "cooldownDays": 5,
      "notes": "Good knockdown for powdery mildew; pH shock on leaf surface.",
      "costBasis": "perSquareMeter"
    },
    {
      "id": "131fe37b-967b-4ff3-a9fd-d15cab018dc0",
      "name": "Sulfur (vapor/low-dose spray)",
      "category": "chemical",
      "targets": ["disease", "pest"],
      "applicability": ["vegetation"],
      "efficacy": {
        "disease": {
          "infectionMultiplier": 0.7,
          "degenerationMultiplier": 0.85
        },
        "pest": {
          "reproductionMultiplier": 0.9,
          "mortalityMultiplier": 1.08
        }
      },
      "costs": {
        "laborMinutes": 30,
        "materialsCost": 10.0
      },
      "cooldownDays": 10,
      "risks": {
        "phytotoxicity": "medium",
        "beneficialsHarm": "medium"
      },
      "notes": "Do not combine with oils within 10–14 days.",
      "costBasis": "perSquareMeter"
    },
    {
      "id": "b5792994-eb74-4d89-8c50-246308b138a2",
      "name": "Spinosad (where permitted)",
      "category": "chemical",
      "targets": ["pest"],
      "applicability": ["vegetation", "earlyFlower"],
      "efficacy": {
        "pest": {
          "reproductionMultiplier": 0.6,
          "mortalityMultiplier": 1.4,
          "damageMultiplier": 0.8
        }
      },
      "costs": {
        "laborMinutes": 25,
        "materialsCost": 18.0
      },
      "cooldownDays": 10,
      "risks": {
        "beneficialsHarm": "high"
      },
      "notes": "Rotate modes of action to prevent resistance.",
      "costBasis": "perSquareMeter"
    },
    {
      "id": "dfac9a95-ea56-4606-9417-e5e1382892ed",
      "name": "Btk (Bacillus thuringiensis kurstaki)",
      "category": "chemical",
      "targets": ["pest"],
      "applicability": ["vegetation", "earlyFlower", "lateFlower"],
      "efficacy": {
        "pest": {
          "reproductionMultiplier": 0.7,
          "mortalityMultiplier": 1.35,
          "damageMultiplier": 0.85
        }
      },
      "costs": {
        "laborMinutes": 20,
        "materialsCost": 14.0
      },
      "cooldownDays": 7,
      "notes": "Selective for caterpillars; minimal impact on beneficials.",
      "costBasis": "perSquareMeter"
    },
    {
      "id": "5dc92d86-7f0f-4e7f-8577-69b50f71ee78",
      "name": "UV-C Pass (controlled exposure)",
      "category": "physical",
      "targets": ["disease", "pest"],
      "applicability": ["vegetation"],
      "efficacy": {
        "disease": {
          "infectionMultiplier": 0.85,
          "degenerationMultiplier": 0.92
        },
        "pest": {
          "reproductionMultiplier": 0.9,
          "mortalityMultiplier": 1.05
        }
      },
      "costs": {
        "laborMinutes": 20,
        "equipmentRentalEUR": 25.0,
        "materialsCost": 0.0
      },
      "cooldownDays": 14,
      "risks": {
        "phytotoxicity": "high"
      },
      "notes": "Short exposure; high risk for tender tissue. Safety protocols required.",
      "costBasis": "perZone"
    }
  ]
}
```

## personnel/names/firstNamesFemale.json

```json
[
  "Aaliyah",
  "Abigail",
  "Aisha",
  "Alexandra",
  "Alice",
  "Alicia",
  "Amelia",
  "Ana",
  "Andrea",
  "Anna",
  "Aria",
  "Ashley",
  "Astrid",
  "Ava",
  "Beatrice",
  "Camila",
  "Carmen",
  "Chloe",
  "Clara",
  "Elena",
  "Elizabeth",
  "Ella",
  "Emily",
  "Emma",
  "Eva",
  "Evelyn",
  "Fatima",
  "Fiona",
  "Gabriela",
  "Grace",
  "Guadalupe",
  "Hailey",
  "Hana",
  "Hannah",
  "Harper",
  "Helena",
  "Ida",
  "Imani",
  "Ingrid",
  "Irina",
  "Isabella",
  "Isabelle",
  "Isla",
  "Jasmine",
  "Jessica",
  "Julia",
  "Katarina",
  "Kate",
  "Kristina",
  "Laura",
  "Lea",
  "Lila",
  "Lily",
  "Linda",
  "Lotte",
  "Luna",
  "Madison",
  "Maja",
  "Maria",
  "Mariam",
  "Marta",
  "Mary",
  "Mei",
  "Mia",
  "Mila",
  "Natalia",
  "Nora",
  "Olivia",
  "Penelope",
  "Priya",
  "Rosa",
  "Rose",
  "Sakura",
  "Samantha",
  "Sandra",
  "Sara",
  "Sasha",
  "Sofia",
  "Sofie",
  "Sonya",
  "Sophia",
  "Sophie",
  "Stella",
  "Tatiana",
  "Tatyana",
  "Valentina",
  "Valeria",
  "Vera",
  "Victoria",
  "Yara",
  "Ying",
  "Yua",
  "Zoe",
  "Zofia"
]
```

## personnel/names/firstNamesMale.json

```json
[
  "Aaron",
  "Adam",
  "Aditya",
  "Ahmed",
  "Alex",
  "Alexander",
  "Ali",
  "Andrei",
  "Anthony",
  "Anton",
  "Arthur",
  "Atsuki",
  "Benjamin",
  "Carlos",
  "Chen",
  "Cho",
  "Christian",
  "Christopher",
  "Daniel",
  "David",
  "Dmitry",
  "Elijah",
  "Enrique",
  "Eric",
  "Ethan",
  "Felix",
  "Finn",
  "Francisco",
  "Gabriel",
  "George",
  "Gustav",
  "Han",
  "Hassan",
  "Heinrich",
  "Henry",
  "Hiroki",
  "Hiroshi",
  "Hugo",
  "Ibrahim",
  "Igor",
  "Illya",
  "Ivan",
  "Jack",
  "Jacob",
  "Jakub",
  "James",
  "Javier",
  "Jayden",
  "Ji-hoon",
  "Jin",
  "Joao",
  "John",
  "Jose",
  "Joseph",
  "Joshua",
  "Juan",
  "Julian",
  "Jung",
  "Kai",
  "Kaito",
  "Katsumi",
  "Kenji",
  "Khaled",
  "Kim",
  "Klaus",
  "Leon",
  "Li",
  "Liam",
  "Logan",
  "Louis",
  "Lucas",
  "Ludwig",
  "Luka",
  "Luke",
  "Manuel",
  "Marco",
  "Mario",
  "Mark",
  "Martin",
  "Mateo",
  "Matthew",
  "Michael",
  "Miguel",
  "Min-jun",
  "Mohammed",
  "Muhammad",
  "Naoki",
  "Nathan",
  "Nikolai",
  "Nikola",
  "Noah",
  "Omar",
  "Oscar",
  "Owen",
  "Pablo",
  "Park",
  "Patrick",
  "Paul",
  "Peter",
  "Rahul",
  "Raj",
  "Riku",
  "Robert",
  "Rodrigo",
  "Rohan",
  "Ronan",
  "Ruben",
  "Ryan",
  "Samuel",
  "Santiago",
  "Sebastian",
  "Sergei",
  "Shinji",
  "Stefan",
  "Sven",
  "Takashi",
  "Taro",
  "Tatsuo",
  "Thomas",
  "Tom",
  "Tomoya",
  "Victor",
  "Viktor",
  "Vincent",
  "Vladimir",
  "Wei",
  "William",
  "Xin",
  "Yadav",
  "Yamada",
  "Yan",
  "Yuki",
  "Yuri",
  "Yusuf"
]
```

## personnel/names/lastNames.json

```json
[
  "Abbas",
  "Abbott",
  "Abe",
  "Abebe",
  "Abramson",
  "Ackerman",
  "Adams",
  "Adler",
  "Agarwal",
  "Aguilar",
  "Ahmed",
  "Aitken",
  "Akhtar",
  "Al-Farsi",
  "Al-Ghassani",
  "Al-Hamad",
  "Al-Jamil",
  "Al-Rashid",
  "Al-Saeed",
  "Ali",
  "Allen",
  "Almeida",
  "Alonso",
  "Alvarez",
  "Anand",
  "Andersen",
  "Anderson",
  "Andersson",
  "Ando",
  "Andrews",
  "Antonelli",
  "Antonopoulos",
  "Aoki",
  "Araya",
  "Araújo",
  "Arnold",
  "Aronsson",
  "Arora",
  "Ashton",
  "Auer",
  "Baba",
  "Bach",
  "Bae",
  "Baek",
  "Bailey",
  "Baker",
  "Bakker",
  "Balakrishnan",
  "Banerjee",
  "Bang",
  "Baranov",
  "Barbieri",
  "Barnes",
  "Barros",
  "Bauer",
  "Becker",
  "Bell",
  "Ben-David",
  "Bennett",
  "Berendsen",
  "Berg",
  "Berger",
  "Bergman",
  "Bernard",
  "Bernstein",
  "Bhatt",
  "Bianchi",
  "Bibi",
  "Bjork",
  "Black",
  "Blanc",
  "Blanco",
  "Blau",
  "Blom",
  "Böhm",
  "Bondarenko",
  "Bos",
  "Botha",
  "Boucher",
  "Boyko",
  "Braun",
  "Bravo",
  "Breuer",
  "Brooks",
  "Brown",
  "Browne",
  "Brun",
  "Bruno",
  "Bryant",
  "Burke",
  "Burns",
  "Bustos",
  "Byrne",
  "Campbell",
  "Campos",
  "Cardoso",
  "Carlson",
  "Carlsson",
  "Carr",
  "Carroll",
  "Carter",
  "Carvalho",
  "Castillo",
  "Castro",
  "Chae",
  "Chakrabarti",
  "Chan",
  "Chandran",
  "Chang",
  "Chapman",
  "Chaudhari",
  "Chavez",
  "Chen",
  "Cheng",
  "Cheung",
  "Cho",
  "Choi",
  "Chopra",
  "Chow",
  "Christensen",
  "Christiansen",
  "Chu",
  "Chung",
  "Ciobanu",
  "Clark",
  "Clarke",
  "Cohen",
  "Cole",
  "Coleman",
  "Collins",
  "Conti",
  "Cook",
  "Cooper",
  "Correa",
  "Costa",
  "Cox",
  "Craig",
  "Crawford",
  "Cruz",
  "Cullen",
  "Cunningham",
  "Da Silva",
  "Dahl",
  "Dalton",
  "Dam",
  "Das",
  "Dasgupta",
  "Davies",
  "Davis",
  "De Boer",
  "De Haan",
  "De Jong",
  "De Lange",
  "De Luca",
  "De Vries",
  "Deng",
  "Desai",
  "Deshpande",
  "Devi",
  "Dias",
  "Diaz",
  "Dijkstra",
  "Dimitrov",
  "Dixon",
  "Djordjevic",
  "Do",
  "Dominguez",
  "Doshi",
  "Doyle",
  "Dubois",
  "Dunn",
  "Dutta",
  "Edwards",
  "Egorov",
  "Ek",
  "Eliassen",
  "Endo",
  "Eriksson",
  "Espinoza",
  "Estevez",
  "Evans",
  "Fabre",
  "Falk",
  "Fan",
  "Farah",
  "Farrell",
  "Faulkner",
  "Fedorov",
  "Feng",
  "Ferguson",
  "Fernandes",
  "Fernandez",
  "Ferreira",
  "Fiedler",
  "Fischer",
  "Fisher",
  "Fitzgerald",
  "Fleming",
  "Fletcher",
  "Flores",
  "Flynn",
  "Fodor",
  "Foley",
  "Fonseca",
  "Fontaine",
  "Ford",
  "Forster",
  "Foster",
  "Fournier",
  "Fox",
  "Frank",
  "Franke",
  "Fraser",
  "Freeman",
  "Friedman",
  "Friesen",
  "Fu",
  "Fujii",
  "Fujimoto",
  "Fujita",
  "Fukuda",
  "Fung",
  "Gallagher",
  "Gallo",
  "Gao",
  "Garcia",
  "Garg",
  "Gauthier",
  "Geisler",
  "Gentile",
  "Georgiev",
  "Gerber",
  "Ghosh",
  "Gibson",
  "Gillespie",
  "Gimenez",
  "Giri",
  "Gomes",
  "Gomez",
  "Gonçalves",
  "Gonzalez",
  "Goodman",
  "Gorbachev",
  "Gordon",
  "Goto",
  "Gould",
  "Goyal",
  "Graf",
  "Graham",
  "Grant",
  "Gray",
  "Green",
  "Greene",
  "Greer",
  "Griffin",
  "Griffiths",
  "Gruber",
  "Gu",
  "Guan",
  "Guerrero",
  "Guo",
  "Gupta",
  "Gutierrez",
  "Ha",
  "Haas",
  "Hahn",
  "Hall",
  "Hamalainen",
  "Hamid",
  "Hamilton",
  "Han",
  "Hansen",
  "Hansson",
  "Hara",
  "Harb",
  "Harris",
  "Harrison",
  "Hart",
  "Hartmann",
  "Hasan",
  "Hasegawa",
  "Hashimoto",
  "Hassan",
  "Hayashi",
  "Hayes",
  "He",
  "Heikkila",
  "Heinonen",
  "Henderson",
  "Hendriks",
  "Henry",
  "Hernandez",
  "Herrmann",
  "Hertz",
  "Hess",
  "Hill",
  "Hirano",
  "Ho",
  "Hoffman",
  "Hoffmann",
  "Hofmann",
  "Holland",
  "Holm",
  "Holmgren",
  "Hong",
  "Horvath",
  "Hosseini",
  "Howard",
  "Howell",
  "Hsu",
  "Hu",
  "Huang",
  "Huber",
  "Hughes",
  "Huh",
  "Hunt",
  "Hunter",
  "Husain",
  "Hussain",
  "Hwang",
  "Ibrahim",
  "Ichikawa",
  "Iglesias",
  "Iida",
  "Ikeda",
  "Im",
  "Inoue",
  "Ishida",
  "Ishii",
  "Ishikawa",
  "Ito",
  "Ivanov",
  "Ivanova",
  "Iversen",
  "Jackson",
  "Jacobs",
  "Jacobsen",
  "Jaeger",
  "Jain",
  "Jakobsson",
  "Jansen",
  "Janssen",
  "Janssens",
  "Jarvinen",
  "Jensen",
  "Jeong",
  "Jimenez",
  "Jin",
  "Jo",
  "Johansen"
]
```

## personnel/randomSeeds.json

```json
[
  "wb-seed-0001",
  "wb-seed-0002",
  "wb-seed-0003",
  "wb-seed-0004",
  "wb-seed-0005",
  "wb-seed-0006",
  "wb-seed-0007",
  "wb-seed-0008",
  "wb-seed-0009",
  "wb-seed-0010",
  "wb-seed-0011",
  "wb-seed-0012",
  "wb-seed-0013",
  "wb-seed-0014",
  "wb-seed-0015",
  "wb-seed-0016",
  "wb-seed-0017",
  "wb-seed-0018",
  "wb-seed-0019",
  "wb-seed-0020",
  "wb-seed-0021",
  "wb-seed-0022",
  "wb-seed-0023",
  "wb-seed-0024",
  "wb-seed-0025",
  "wb-seed-0026",
  "wb-seed-0027",
  "wb-seed-0028",
  "wb-seed-0029",
  "wb-seed-0030",
  "wb-seed-0031",
  "wb-seed-0032",
  "wb-seed-0033",
  "wb-seed-0034",
  "wb-seed-0035",
  "wb-seed-0036",
  "wb-seed-0037",
  "wb-seed-0038",
  "wb-seed-0039",
  "wb-seed-0040",
  "wb-seed-0041",
  "wb-seed-0042",
  "wb-seed-0043",
  "wb-seed-0044",
  "wb-seed-0045",
  "wb-seed-0046",
  "wb-seed-0047",
  "wb-seed-0048",
  "wb-seed-0049",
  "wb-seed-0050",
  "wb-seed-0051",
  "wb-seed-0052",
  "wb-seed-0053",
  "wb-seed-0054",
  "wb-seed-0055",
  "wb-seed-0056",
  "wb-seed-0057",
  "wb-seed-0058",
  "wb-seed-0059",
  "wb-seed-0060",
  "wb-seed-0061",
  "wb-seed-0062",
  "wb-seed-0063",
  "wb-seed-0064",
  "wb-seed-0065",
  "wb-seed-0066",
  "wb-seed-0067",
  "wb-seed-0068",
  "wb-seed-0069",
  "wb-seed-0070",
  "wb-seed-0071",
  "wb-seed-0072",
  "wb-seed-0073",
  "wb-seed-0074",
  "wb-seed-0075",
  "wb-seed-0076",
  "wb-seed-0077",
  "wb-seed-0078",
  "wb-seed-0079",
  "wb-seed-0080",
  "wb-seed-0081",
  "wb-seed-0082",
  "wb-seed-0083",
  "wb-seed-0084",
  "wb-seed-0085",
  "wb-seed-0086",
  "wb-seed-0087",
  "wb-seed-0088",
  "wb-seed-0089",
  "wb-seed-0090",
  "wb-seed-0091",
  "wb-seed-0092",
  "wb-seed-0093",
  "wb-seed-0094",
  "wb-seed-0095",
  "wb-seed-0096",
  "wb-seed-0097",
  "wb-seed-0098",
  "wb-seed-0099",
  "wb-seed-0100",
  "wb-seed-0101",
  "wb-seed-0102",
  "wb-seed-0103",
  "wb-seed-0104",
  "wb-seed-0105",
  "wb-seed-0106",
  "wb-seed-0107",
  "wb-seed-0108",
  "wb-seed-0109",
  "wb-seed-0110",
  "wb-seed-0111",
  "wb-seed-0112",
  "wb-seed-0113",
  "wb-seed-0114",
  "wb-seed-0115",
  "wb-seed-0116",
  "wb-seed-0117",
  "wb-seed-0118",
  "wb-seed-0119",
  "wb-seed-0120",
  "wb-seed-0121",
  "wb-seed-0122",
  "wb-seed-0123",
  "wb-seed-0124",
  "wb-seed-0125",
  "wb-seed-0126",
  "wb-seed-0127",
  "wb-seed-0128",
  "wb-seed-0129",
  "wb-seed-0130",
  "wb-seed-0131",
  "wb-seed-0132",
  "wb-seed-0133",
  "wb-seed-0134",
  "wb-seed-0135",
  "wb-seed-0136",
  "wb-seed-0137",
  "wb-seed-0138",
  "wb-seed-0139",
  "wb-seed-0140",
  "wb-seed-0141",
  "wb-seed-0142",
  "wb-seed-0143",
  "wb-seed-0144",
  "wb-seed-0145",
  "wb-seed-0146",
  "wb-seed-0147",
  "wb-seed-0148",
  "wb-seed-0149",
  "wb-seed-0150",
  "wb-seed-0151",
  "wb-seed-0152",
  "wb-seed-0153",
  "wb-seed-0154",
  "wb-seed-0155",
  "wb-seed-0156",
  "wb-seed-0157",
  "wb-seed-0158",
  "wb-seed-0159",
  "wb-seed-0160",
  "wb-seed-0161",
  "wb-seed-0162",
  "wb-seed-0163",
  "wb-seed-0164",
  "wb-seed-0165",
  "wb-seed-0166",
  "wb-seed-0167",
  "wb-seed-0168",
  "wb-seed-0169",
  "wb-seed-0170",
  "wb-seed-0171",
  "wb-seed-0172",
  "wb-seed-0173",
  "wb-seed-0174",
  "wb-seed-0175",
  "wb-seed-0176",
  "wb-seed-0177",
  "wb-seed-0178",
  "wb-seed-0179",
  "wb-seed-0180",
  "wb-seed-0181",
  "wb-seed-0182",
  "wb-seed-0183",
  "wb-seed-0184",
  "wb-seed-0185",
  "wb-seed-0186",
  "wb-seed-0187",
  "wb-seed-0188",
  "wb-seed-0189",
  "wb-seed-0190",
  "wb-seed-0191",
  "wb-seed-0192",
  "wb-seed-0193",
  "wb-seed-0194",
  "wb-seed-0195",
  "wb-seed-0196",
  "wb-seed-0197",
  "wb-seed-0198",
  "wb-seed-0199",
  "wb-seed-0200"
]
```

## personnel/traits.json

```json
[
  {
    "id": "trait_green_thumb",
    "name": "Green Thumb",
    "description": "Naturally gifted with plants, providing a slight bonus to all gardening tasks.",
    "type": "positive"
  },
  {
    "id": "trait_night_owl",
    "name": "Night Owl",
    "description": "More energetic and efficient during night shifts.",
    "type": "positive"
  },
  {
    "id": "trait_quick_learner",
    "name": "Quick Learner",
    "description": "Gains skill experience from working and training 15% faster.",
    "type": "positive"
  },
  {
    "id": "trait_optimist",
    "name": "Optimist",
    "description": "Slightly raises the morale of all other employees in the same structure.",
    "type": "positive"
  },
  {
    "id": "trait_gearhead",
    "name": "Gearhead",
    "description": "Has a knack for mechanics, causing devices they maintain to degrade slower.",
    "type": "positive"
  },
  {
    "id": "trait_frugal",
    "name": "Frugal",
    "description": "Accepts a slightly lower salary than their skills would normally demand.",
    "type": "positive"
  },
  {
    "id": "trait_meticulous",
    "name": "Meticulous",
    "description": "Excels at keeping things clean, reducing the chance of random pest or disease outbreaks.",
    "type": "positive"
  },
  {
    "id": "trait_clumsy",
    "name": "Clumsy",
    "description": "Slightly increases the chance of minor errors during maintenance tasks.",
    "type": "negative"
  },
  {
    "id": "trait_slacker",
    "name": "Slacker",
    "description": "Works 10% slower and loses energy more quickly.",
    "type": "negative"
  },
  {
    "id": "trait_pessimist",
    "name": "Pessimist",
    "description": "Slightly lowers the morale of all other employees in the same structure.",
    "type": "negative"
  },
  {
    "id": "trait_forgetful",
    "name": "Forgetful",
    "description": "Takes longer to complete complex tasks and is less efficient at planning.",
    "type": "negative"
  },
  {
    "id": "trait_demanding",
    "name": "Demanding",
    "description": "Expects a higher salary than their skills would normally demand.",
    "type": "negative"
  },
  {
    "id": "trait_slow_learner",
    "name": "Slow Learner",
    "description": "Gains skill experience from working and training 15% slower.",
    "type": "negative"
  }
]
```

## prices/devicePrices.json

```json
{
  "devicePrices": {
    "7d3d3f1a-8c6f-4e9c-926d-5a2a4a3b6f1b": {
      "capitalExpenditure": 1200,
      "baseMaintenanceCostPerTick": 0.004,
      "costIncreasePer1000Ticks": 0.001
    },
    "3b5f6ad7-672e-47cd-9a24-f0cc45c4101e": {
      "capitalExpenditure": 600,
      "baseMaintenanceCostPerTick": 0.002,
      "costIncreasePer1000Ticks": 0.0008
    },
    "3d762260-88a5-4104-b03c-9860bbac34b6": {
      "capitalExpenditure": 250,
      "baseMaintenanceCostPerTick": 0.002,
      "costIncreasePer1000Ticks": 0.1
    },
    "7a639d3d-4750-440a-a200-f90d11dc3c62": {
      "capitalExpenditure": 350,
      "baseMaintenanceCostPerTick": 0.0015,
      "costIncreasePer1000Ticks": 0.0006
    },
    "c701efa6-1e90-4f28-8934-ea9c584596e4": {
      "capitalExpenditure": 220,
      "baseMaintenanceCostPerTick": 0.0008,
      "costIncreasePer1000Ticks": 0.0004
    },
    "f5d5c5a0-1b2c-4d3e-8f9a-0b1c2d3e4f5a": {
      "capitalExpenditure": 75,
      "baseMaintenanceCostPerTick": 0.0005,
      "costIncreasePer1000Ticks": 0.0002
    }
  }
}
```

## prices/strainPrices.json

```json
{
  "strainPrices": {
    "550e8400-e29b-41d4-a716-446655440000": {
      "seedPrice": 0.5,
      "harvestPricePerGram": 4.2
    },
    "550e8400-e29b-41d4-a716-446655440001": {
      "seedPrice": 0.6,
      "harvestPricePerGram": 4.0
    },
    "3f0f15f4-1b75-4196-b3f3-5f6b6b7cf7a7": {
      "seedPrice": 0.7,
      "harvestPricePerGram": 4.5
    },
    "5a6e9e57-0b3a-4f9f-8f19-12f3f8ec3a0e": {
      "seedPrice": 0.55,
      "harvestPricePerGram": 4.3
    },
    "8b9a0b6c-2d6c-4f58-9c37-7a6c9d4aa5c2": {
      "seedPrice": 0.8,
      "harvestPricePerGram": 5.0
    }
  }
}
```

## prices/utilityPrices.json

```json
{
  "pricePerKwh": 0.15,
  "pricePerLiterWater": 0.02,
  "pricePerGramNutrients": 0.1
}
```
