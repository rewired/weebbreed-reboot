# Data/Schema

## Strain Alignment Summary\n\nAll strain configurations have been successfully aligned with the enhanced strain blueprint schema.\n\n## Enhanced Fields Added to All Strains\n\n### ✅ Environmental Bands (`envBands`)\nEach strain now has phase-specific environmental preferences:\n- **Default bands**: Base environmental ranges for all metrics\n- **Veg phase overrides**: Modified preferences during vegetative growth\n- **Flower phase overrides**: Optimized settings for flowering\n\n**Metrics covered:**\n- Temperature (°C)\n- Relative Humidity (fraction)\n- CO2 (ppm)\n- Light Intensity - PPFD (μmol/m²/s)\n- Vapor Pressure Deficit - VPD (kPa)\n\n### ✅ Stress Tolerance (`stressTolerance`)\nTolerance values that widen acceptable environmental ranges for mature plants:\n- Different tolerance per environmental metric\n- Applied after plants reach 14+ days age\n- Allows better adaptation to environmental fluctuations\n\n### ✅ Method Affinity (`methodAffinity`)\nCompatibility scores (0.0-1.0) with cultivation methods:\n- **Basic Soil Pot** (`85cc0916-0e8a-495e-af8f-50291abe6855`)\n- **Sea of Green** (`659ba4d7-a5fc-482e-98d4-b614341883ac`) \n- **Screen of Green** (`41229377-ef2d-4723-931f-72eea87d7a62`)\n\n### ✅ Phase Durations (`phaseDurations`)\nStrain-specific growth phase lengths:\n- Seedling days\n- Vegetative days\n- Flowering days\n- Ripening days\n\n### ✅ Yield Model (`yieldModel`)\nAdvanced yield calculation with environmental factors:\n- Base grams per plant\n- Quality factors weighted by environmental conditions\n- CO2 response curves with diminishing returns\n\n## Strain-Specific Characteristics\n\n### Northern Lights\n- **Type**: Indica-dominant (65% Indica)\n- **Environment**: Lower light requirements, good resilience\n- **Method Affinity**: Excellent for Basic Soil (0.9), Good for SOG (0.8)\n- **Yield**: 35g base yield, balanced environmental factors\n- **Stress Tolerance**: High (2.0°C temp, 0.2 VPD)\n\n### Skunk #1\n- **Type**: Hybrid (65% Sativa, 35% Indica)\n- **Environment**: Moderate requirements, stable genetics\n- **Method Affinity**: Good for Basic Soil (0.8) and SCROG (0.8)\n- **Yield**: 48g base yield, light-focused quality factors\n- **Stress Tolerance**: Moderate (1.5°C temp, 0.18 VPD)\n\n### Sour Diesel\n- **Type**: Sativa-dominant (65% Sativa)\n- **Environment**: High light requirements, longer flowering\n- **Method Affinity**: Excellent for SCROG (0.9), challenging for SOG (0.5)\n- **Yield**: 55g base yield, high light dependency\n- **Stress Tolerance**: Lower (1.0°C temp, 0.15 VPD)\n\n### White Widow\n- **Type**: Balanced hybrid (50/50)\n- **Environment**: Moderate needs, good resilience\n- **Method Affinity**: Excellent for Basic Soil (0.9), good across methods\n- **Yield**: 42g base yield, temp/humidity focused\n- **Stress Tolerance**: Good (1.8°C temp, 0.18 VPD)\n\n### AK-47\n- **Type**: Sativa-dominant hybrid (65% Sativa)\n- **Environment**: Balanced requirements, humidity-sensitive in flower\n- **Method Affinity**: Excellent for SOG (0.9), good for Basic Soil (0.8)\n- **Yield**: 45g base yield, VPD and light focused\n- **Stress Tolerance**: Good (1.0°C temp, 0.15 VPD)\n\n## Validation Results\n\n✅ **All 5 strain files validated successfully**\n- All required enhanced fields present\n- Valid JSON structure\n- Consistent field naming and structure\n- Realistic environmental ranges and values\n\n## Integration Benefits\n\n### For Players\n- **Strategic depth**: Strain selection matters based on equipment\n- **Environmental optimization**: Each strain has unique sweet spots\n- **Method compatibility**: Clear guidance on cultivation approach\n- **Yield predictions**: More accurate forecasting\n\n### For Simulation\n- **Realistic growth**: Strain-specific environmental responses\n- **Dynamic yields**: Environment directly impacts harvest quality\n- **Educational value**: Learn real cannabis cultivation principles\n- **Balanced gameplay**: Different strains excel in different setups\n\n## Technical Implementation\n\nThe enhanced strain system is:\n- **Backward compatible**: Existing strains work with fallback defaults\n- **Extensible**: Easy to add new environmental metrics or methods\n- **Type-safe**: Zod schema validation ensures data integrity\n- **Performance optimized**: Efficient lookup and calculation algorithms\n\n## Files Updated\n\n1. `data/blueprints/strains/northern-lights.json` - Added all enhanced fields\n2. `data/blueprints/strains/skunk-1.json` - Added all enhanced fields\n3. `data/blueprints/strains/sour-diesel.json` - Added all enhanced fields\n4. `data/blueprints/strains/white-widow.json` - Added all enhanced fields\n5. `data/blueprints/strains/ak-47.json` - Already had enhanced fields\n\nAll strain configurations are now fully aligned with the enhanced strain blueprint schema and ready for integration with the simulation engine. (docs/strain-alignment-summary.md)

Source: [`docs/strain-alignment-summary.md`](../docs/strain-alignment-summary.md)

# Strain Alignment Summary\n\nAll strain configurations have been successfully aligned with the enhanced strain blueprint schema.\n\n## Enhanced Fields Added to All Strains\n\n### ✅ Environmental Bands (`envBands`)\nEach strain now has phase-specific environmental preferences:\n- **Default bands**: Base environmental ranges for all metrics\n- **Veg phase overrides**: Modified preferences during vegetative growth\n- **Flower phase overrides**: Optimized settings for flowering\n\n**Metrics covered:**\n- Temperature (°C)\n- Relative Humidity (fraction)\n- CO2 (ppm)\n- Light Intensity - PPFD (μmol/m²/s)\n- Vapor Pressure Deficit - VPD (kPa)\n\n### ✅ Stress Tolerance (`stressTolerance`)\nTolerance values that widen acceptable environmental ranges for mature plants:\n- Different tolerance per environmental metric\n- Applied after plants reach 14+ days age\n- Allows better adaptation to environmental fluctuations\n\n### ✅ Method Affinity (`methodAffinity`)\nCompatibility scores (0.0-1.0) with cultivation methods:\n- **Basic Soil Pot** (`85cc0916-0e8a-495e-af8f-50291abe6855`)\n- **Sea of Green** (`659ba4d7-a5fc-482e-98d4-b614341883ac`) \n- **Screen of Green** (`41229377-ef2d-4723-931f-72eea87d7a62`)\n\n### ✅ Phase Durations (`phaseDurations`)\nStrain-specific growth phase lengths:\n- Seedling days\n- Vegetative days\n- Flowering days\n- Ripening days\n\n### ✅ Yield Model (`yieldModel`)\nAdvanced yield calculation with environmental factors:\n- Base grams per plant\n- Quality factors weighted by environmental conditions\n- CO2 response curves with diminishing returns\n\n## Strain-Specific Characteristics\n\n### Northern Lights\n- **Type**: Indica-dominant (65% Indica)\n- **Environment**: Lower light requirements, good resilience\n- **Method Affinity**: Excellent for Basic Soil (0.9), Good for SOG (0.8)\n- **Yield**: 35g base yield, balanced environmental factors\n- **Stress Tolerance**: High (2.0°C temp, 0.2 VPD)\n\n### Skunk #1\n- **Type**: Hybrid (65% Sativa, 35% Indica)\n- **Environment**: Moderate requirements, stable genetics\n- **Method Affinity**: Good for Basic Soil (0.8) and SCROG (0.8)\n- **Yield**: 48g base yield, light-focused quality factors\n- **Stress Tolerance**: Moderate (1.5°C temp, 0.18 VPD)\n\n### Sour Diesel\n- **Type**: Sativa-dominant (65% Sativa)\n- **Environment**: High light requirements, longer flowering\n- **Method Affinity**: Excellent for SCROG (0.9), challenging for SOG (0.5)\n- **Yield**: 55g base yield, high light dependency\n- **Stress Tolerance**: Lower (1.0°C temp, 0.15 VPD)\n\n### White Widow\n- **Type**: Balanced hybrid (50/50)\n- **Environment**: Moderate needs, good resilience\n- **Method Affinity**: Excellent for Basic Soil (0.9), good across methods\n- **Yield**: 42g base yield, temp/humidity focused\n- **Stress Tolerance**: Good (1.8°C temp, 0.18 VPD)\n\n### AK-47\n- **Type**: Sativa-dominant hybrid (65% Sativa)\n- **Environment**: Balanced requirements, humidity-sensitive in flower\n- **Method Affinity**: Excellent for SOG (0.9), good for Basic Soil (0.8)\n- **Yield**: 45g base yield, VPD and light focused\n- **Stress Tolerance**: Good (1.0°C temp, 0.15 VPD)\n\n## Validation Results\n\n✅ **All 5 strain files validated successfully**\n- All required enhanced fields present\n- Valid JSON structure\n- Consistent field naming and structure\n- Realistic environmental ranges and values\n\n## Integration Benefits\n\n### For Players\n- **Strategic depth**: Strain selection matters based on equipment\n- **Environmental optimization**: Each strain has unique sweet spots\n- **Method compatibility**: Clear guidance on cultivation approach\n- **Yield predictions**: More accurate forecasting\n\n### For Simulation\n- **Realistic growth**: Strain-specific environmental responses\n- **Dynamic yields**: Environment directly impacts harvest quality\n- **Educational value**: Learn real cannabis cultivation principles\n- **Balanced gameplay**: Different strains excel in different setups\n\n## Technical Implementation\n\nThe enhanced strain system is:\n- **Backward compatible**: Existing strains work with fallback defaults\n- **Extensible**: Easy to add new environmental metrics or methods\n- **Type-safe**: Zod schema validation ensures data integrity\n- **Performance optimized**: Efficient lookup and calculation algorithms\n\n## Files Updated\n\n1. `data/blueprints/strains/northern-lights.json` - Added all enhanced fields\n2. `data/blueprints/strains/skunk-1.json` - Added all enhanced fields\n3. `data/blueprints/strains/sour-diesel.json` - Added all enhanced fields\n4. `data/blueprints/strains/white-widow.json` - Added all enhanced fields\n5. `data/blueprints/strains/ak-47.json` - Already had enhanced fields\n\nAll strain configurations are now fully aligned with the enhanced strain blueprint schema and ready for integration with the simulation engine.

## Enhanced Cultivation Methods Summary\n\nAll cultivation methods have been successfully aligned with the new enhanced schema including environmental bias, labor profiles, and capacity hints.\n\n## Enhanced Fields Added to All Methods\n\n### ✅ Environmental Bias (`envBias`)\nPreferred environmental offsets that the cultivation method naturally creates:\n- **Temperature bias** (`temp_C`): Method's tendency to raise/lower temperature\n- **Humidity bias** (`rh_frac`): Method's effect on humidity levels\n- **CO2 bias** (`co2_ppm`): Method's CO2 consumption or retention characteristics\n- **Light bias** (`ppfd_umol_m2s`): Method's light distribution effects\n- **VPD bias** (`vpd_kPa`): Method's impact on vapor pressure deficit\n\n### ✅ Labor Profile (`laborProfile`)\nWork requirements for successful cultivation:\n- **Hours per plant per week** (`hoursPerPlantPerWeek`): Labor intensity measurement\n\n### ✅ Capacity Hints (`capacityHints`)\nSpace utilization characteristics:\n- **Plants per m²** (`plantsPer_m2`): Optimal plant density\n- **Canopy height** (`canopyHeight_m`): Typical final plant height\n\n## Method-Specific Characteristics\n\n### Basic Soil Pot\n- **Environmental Bias**: Neutral (no specific biases)\n- **Labor Profile**: 0.2 hours/plant/week (very low maintenance)\n- **Capacity**: 4 plants/m², 1.2m canopy height\n- **Philosophy**: Simple, beginner-friendly, universally compatible\n\n### Sea of Green (SOG)\n- **Environmental Bias**: \n - `vpd_kPa: +0.1` (higher VPD for dense canopy air circulation)\n - `rh_frac: -0.05` (slightly lower humidity to prevent mold)\n- **Labor Profile**: 0.3 hours/plant/week (moderate plant management)\n- **Capacity**: 18 plants/m², 0.6m canopy height\n- **Philosophy**: High-density, fast-cycling, indica-optimized\n\n### Screen of Green (SCROG)\n- **Environmental Bias**:\n - `temp_C: +0.5` (slightly warmer for enhanced growth)\n - `co2_ppm: +50` (better CO2 utilization with trained canopy)\n- **Labor Profile**: 1.2 hours/plant/week (high training effort)\n- **Capacity**: 2 plants/m², 0.8m canopy height\n- **Philosophy**: Low-density, maximum yield per plant, sativa-optimized\n\n## Compatibility System\n\n### Method vs Strain Compatibility Calculation\nThe new `MethodCompatibilityService` evaluates:\n\n1. **Environmental Fit (60% weight)**\n - Compares method `envBias` against strain environmental bands\n - Calculates if method biases align with strain preferences\n - Accounts for growth phase differences\n\n2. **Labor Fit (25% weight)**\n - Matches method labor requirements with strain resilience\n - Considers existing strain method affinity scores\n - Evaluates strain tolerance for labor-intensive techniques\n\n3. **Capacity Fit (15% weight)**\n - Compares method density with strain genetic preferences\n - Indica strains favor higher density (SOG-style)\n - Sativa strains prefer lower density (SCROG-style)\n\n### Compatibility Categories\n- **Excellent** (0.85+): Method is ideal for this strain\n- **Good** (0.7-0.84): Method performs well with this strain\n- **Acceptable** (0.5-0.69): Method works but may not be optimal\n- **Poor** (0.3-0.49): Method may struggle with this strain\n- **Incompatible** (<0.3): Method not recommended for this strain\n\n## Integration Benefits\n\n### For Players\n- **Smart recommendations**: System suggests optimal method-strain combinations\n- **Environmental insights**: Understand how methods affect growing conditions\n- **Labor planning**: Accurate time estimates for cultivation management\n- **Space optimization**: Realistic density and height planning\n\n### For Simulation\n- **Realistic constraints**: Method biases affect environmental control\n- **Dynamic compatibility**: Scores adapt based on strain and growth phase\n- **Resource planning**: Labor and space requirements drive economic decisions\n- **Educational value**: Learn real cultivation trade-offs and techniques\n\n## Technical Implementation\n\n### Schema Validation\n`typescript\n// Enhanced cultivation method schema with new fields\nenvBias: z.object({\n  temp_C: z.number().optional(),\n  rh_frac: z.number().optional(),\n  co2_ppm: z.number().optional(),\n  ppfd_umol_m2s: z.number().optional(),\n  vpd_kPa: z.number().optional(),\n}).optional(),\n\nlaborProfile: z.object({\n  hoursPerPlantPerWeek: z.number().positive(),\n}).optional(),\n\ncapacityHints: z.object({\n  plantsPer_m2: z.number().positive(),\n  canopyHeight_m: z.number().positive(),\n}).optional()\n`\n\n### Compatibility Service\n- **Weighted scoring**: Environmental fit is most important (60%)\n- **Phase-aware**: Evaluations consider current plant growth stage\n- **Extensible**: Easy to add new compatibility factors\n- **Recommendation engine**: Provides actionable cultivation advice\n\n## Example Usage\n\n`typescript\n// Calculate strain-method compatibility\nconst compatibility = methodCompatibilityService.calculateCompatibility({\n  strain: ak47Strain,\n  method: sogMethod,\n  stage: 'flowering'\n});\n\nconsole.log(compatibility.category); // 'excellent'\nconsole.log(compatibility.overallScore); // 0.87\nconsole.log(compatibility.details.environmental); // Detailed breakdown\n`\n\n## Files Updated\n\n1. **Basic Soil Pot** (`data/blueprints/cultivationMethods/basic_soil_pot.json`)\n - Added neutral environmental bias (no offsets)\n - Low labor requirements (0.2 hours/plant/week)\n - Moderate density (4 plants/m², 1.2m height)\n\n2. **Sea of Green** (`data/blueprints/cultivationMethods/sog.json`)\n - Added VPD and humidity bias for dense canopy management\n - Moderate labor (0.3 hours/plant/week)\n - High density (18 plants/m², 0.6m height)\n\n3. **Screen of Green** (`data/blueprints/cultivationMethods/scrog.json`)\n - Added temperature and CO2 bias for optimal training\n - High labor (1.2 hours/plant/week for screen management)\n - Low density (2 plants/m², 0.8m height)\n\n4. **Schema Validation** (`src/backend/src/data/schemas/cultivationMethodSchema.ts`)\n - Added Zod validation for all new fields\n - Type-safe environmental bias definitions\n - Positive number validation for capacity hints\n\n5. **Compatibility Service** (`src/backend/src/engine/cultivation/methodCompatibilityService.ts`)\n - Comprehensive strain-method compatibility analysis\n - Weighted scoring system with detailed breakdowns\n - Recommendation engine for cultivation decisions\n\nAll cultivation methods are now fully enhanced and ready for advanced strain-method compatibility analysis in the simulation engine! (docs/enhanced-cultivation-methods-summary.md)

Source: [`docs/enhanced-cultivation-methods-summary.md`](../docs/enhanced-cultivation-methods-summary.md)

# Enhanced Cultivation Methods Summary\n\nAll cultivation methods have been successfully aligned with the new enhanced schema including environmental bias, labor profiles, and capacity hints.\n\n## Enhanced Fields Added to All Methods\n\n### ✅ Environmental Bias (`envBias`)\nPreferred environmental offsets that the cultivation method naturally creates:\n- **Temperature bias** (`temp_C`): Method's tendency to raise/lower temperature\n- **Humidity bias** (`rh_frac`): Method's effect on humidity levels\n- **CO2 bias** (`co2_ppm`): Method's CO2 consumption or retention characteristics\n- **Light bias** (`ppfd_umol_m2s`): Method's light distribution effects\n- **VPD bias** (`vpd_kPa`): Method's impact on vapor pressure deficit\n\n### ✅ Labor Profile (`laborProfile`)\nWork requirements for successful cultivation:\n- **Hours per plant per week** (`hoursPerPlantPerWeek`): Labor intensity measurement\n\n### ✅ Capacity Hints (`capacityHints`)\nSpace utilization characteristics:\n- **Plants per m²** (`plantsPer_m2`): Optimal plant density\n- **Canopy height** (`canopyHeight_m`): Typical final plant height\n\n## Method-Specific Characteristics\n\n### Basic Soil Pot\n- **Environmental Bias**: Neutral (no specific biases)\n- **Labor Profile**: 0.2 hours/plant/week (very low maintenance)\n- **Capacity**: 4 plants/m², 1.2m canopy height\n- **Philosophy**: Simple, beginner-friendly, universally compatible\n\n### Sea of Green (SOG)\n- **Environmental Bias**: \n - `vpd_kPa: +0.1` (higher VPD for dense canopy air circulation)\n - `rh_frac: -0.05` (slightly lower humidity to prevent mold)\n- **Labor Profile**: 0.3 hours/plant/week (moderate plant management)\n- **Capacity**: 18 plants/m², 0.6m canopy height\n- **Philosophy**: High-density, fast-cycling, indica-optimized\n\n### Screen of Green (SCROG)\n- **Environmental Bias**:\n - `temp_C: +0.5` (slightly warmer for enhanced growth)\n - `co2_ppm: +50` (better CO2 utilization with trained canopy)\n- **Labor Profile**: 1.2 hours/plant/week (high training effort)\n- **Capacity**: 2 plants/m², 0.8m canopy height\n- **Philosophy**: Low-density, maximum yield per plant, sativa-optimized\n\n## Compatibility System\n\n### Method vs Strain Compatibility Calculation\nThe new `MethodCompatibilityService` evaluates:\n\n1. **Environmental Fit (60% weight)**\n - Compares method `envBias` against strain environmental bands\n - Calculates if method biases align with strain preferences\n - Accounts for growth phase differences\n\n2. **Labor Fit (25% weight)**\n - Matches method labor requirements with strain resilience\n - Considers existing strain method affinity scores\n - Evaluates strain tolerance for labor-intensive techniques\n\n3. **Capacity Fit (15% weight)**\n - Compares method density with strain genetic preferences\n - Indica strains favor higher density (SOG-style)\n - Sativa strains prefer lower density (SCROG-style)\n\n### Compatibility Categories\n- **Excellent** (0.85+): Method is ideal for this strain\n- **Good** (0.7-0.84): Method performs well with this strain\n- **Acceptable** (0.5-0.69): Method works but may not be optimal\n- **Poor** (0.3-0.49): Method may struggle with this strain\n- **Incompatible** (<0.3): Method not recommended for this strain\n\n## Integration Benefits\n\n### For Players\n- **Smart recommendations**: System suggests optimal method-strain combinations\n- **Environmental insights**: Understand how methods affect growing conditions\n- **Labor planning**: Accurate time estimates for cultivation management\n- **Space optimization**: Realistic density and height planning\n\n### For Simulation\n- **Realistic constraints**: Method biases affect environmental control\n- **Dynamic compatibility**: Scores adapt based on strain and growth phase\n- **Resource planning**: Labor and space requirements drive economic decisions\n- **Educational value**: Learn real cultivation trade-offs and techniques\n\n## Technical Implementation\n\n### Schema Validation\n`typescript\n// Enhanced cultivation method schema with new fields\nenvBias: z.object({\n  temp_C: z.number().optional(),\n  rh_frac: z.number().optional(),\n  co2_ppm: z.number().optional(),\n  ppfd_umol_m2s: z.number().optional(),\n  vpd_kPa: z.number().optional(),\n}).optional(),\n\nlaborProfile: z.object({\n  hoursPerPlantPerWeek: z.number().positive(),\n}).optional(),\n\ncapacityHints: z.object({\n  plantsPer_m2: z.number().positive(),\n  canopyHeight_m: z.number().positive(),\n}).optional()\n`\n\n### Compatibility Service\n- **Weighted scoring**: Environmental fit is most important (60%)\n- **Phase-aware**: Evaluations consider current plant growth stage\n- **Extensible**: Easy to add new compatibility factors\n- **Recommendation engine**: Provides actionable cultivation advice\n\n## Example Usage\n\n`typescript\n// Calculate strain-method compatibility\nconst compatibility = methodCompatibilityService.calculateCompatibility({\n  strain: ak47Strain,\n  method: sogMethod,\n  stage: 'flowering'\n});\n\nconsole.log(compatibility.category); // 'excellent'\nconsole.log(compatibility.overallScore); // 0.87\nconsole.log(compatibility.details.environmental); // Detailed breakdown\n`\n\n## Files Updated\n\n1. **Basic Soil Pot** (`data/blueprints/cultivationMethods/basic_soil_pot.json`)\n - Added neutral environmental bias (no offsets)\n - Low labor requirements (0.2 hours/plant/week)\n - Moderate density (4 plants/m², 1.2m height)\n\n2. **Sea of Green** (`data/blueprints/cultivationMethods/sog.json`)\n - Added VPD and humidity bias for dense canopy management\n - Moderate labor (0.3 hours/plant/week)\n - High density (18 plants/m², 0.6m height)\n\n3. **Screen of Green** (`data/blueprints/cultivationMethods/scrog.json`)\n - Added temperature and CO2 bias for optimal training\n - High labor (1.2 hours/plant/week for screen management)\n - Low density (2 plants/m², 0.8m height)\n\n4. **Schema Validation** (`src/backend/src/data/schemas/cultivationMethodSchema.ts`)\n - Added Zod validation for all new fields\n - Type-safe environmental bias definitions\n - Positive number validation for capacity hints\n\n5. **Compatibility Service** (`src/backend/src/engine/cultivation/methodCompatibilityService.ts`)\n - Comprehensive strain-method compatibility analysis\n - Weighted scoring system with detailed breakdowns\n - Recommendation engine for cultivation decisions\n\nAll cultivation methods are now fully enhanced and ready for advanced strain-method compatibility analysis in the simulation engine!

## Logging & Telemetry Configuration (docs/system/logging.md)

Source: [`docs/system/logging.md`](../docs/system/logging.md)

# Logging & Telemetry Configuration

The backend now uses a shared [`pino`](https://github.com/pinojs/pino) logger that powers
startup diagnostics, development utilities, and the simulation telemetry event bus. Logs are
structured JSON by default so they can be indexed easily or piped through tooling such as
`pino-pretty`, `jq`, or your observability stack of choice.

## Environment Variables

| Variable                    | Description                                                                                                     | Default                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `WEEBBREED_LOG_LEVEL`       | Overrides the logger level. Accepts `trace`, `debug`, `info`, `warning`, `warn`, `error`, `fatal`, or `silent`. | `debug` in development, `info` in production |
| `WEEBBREED_LOG_DESTINATION` | Controls where logs are written. Use `stdout`, `stderr`, or `file:/absolute/or/relative/path`.                  | `stdout`                                     |

If `WEEBBREED_LOG_LEVEL` is not provided the logger falls back to `LOG_LEVEL`, allowing the
service to integrate with existing environment conventions.

When `WEEBBREED_LOG_DESTINATION` starts with `file:` the path is resolved relative to the current
working directory (unless an absolute path is provided). Parent directories are created on demand,
so `file:./logs/backend.log` will create the `logs` folder if it is missing.

## Sample `.env`

```dotenv
# Verbose logging with per-tick telemetry details
WEEBBREED_LOG_LEVEL=debug

# Write structured logs to logs/backend.log (relative to the project root)
WEEBBREED_LOG_DESTINATION=file:./logs/backend.log
```

To see a human-readable stream in development, pipe the output through `pino-pretty`:

```bash
pnpm --filter @weebbreed/backend dev | pnpm exec pino-pretty
```

## Telemetry Context

Every event emitted via `runtime/eventBus` is mirrored to the logger with structured context
including the event `type`, originating `tick`, severity (`level`), timestamp, and any tags. UI
stream fan-out packets (Socket.IO, SSE) are also logged at `debug`, exposing batch sizes and tick
information for downstream consumers without disrupting the broadcast path.

## Blueprint Data Validation Workflow (docs/system/data-validation.md)

Source: [`docs/system/data-validation.md`](../docs/system/data-validation.md)

# Blueprint Data Validation Workflow

The simulation depends on curated blueprint bundles (strains, devices,
cultivation methods, room purposes, and price tables). To prevent drift or
accidental schema regressions, use the dedicated validation command before
checking in blueprint changes.

## Command

```bash
pnpm validate:data
```

This command runs the TypeScript tool in `tools/validate-data.ts`, which uses
the shared `loadBlueprintData` pipeline to parse every blueprint collection and
its associated price maps.

### Options

| Flag                                 | Description                                 | Default              |
| ------------------------------------ | ------------------------------------------- | -------------------- |
| `-d`, `--data`, `--data-dir <path>`  | Blueprint data directory to validate.       | `data`               |
| `-o`, `--out`, `--report-dir <path>` | Directory for generated validation reports. | `reports/validation` |
| `-h`, `--help`                       | Print usage information and exit.           | –                    |

The data directory argument can also be supplied as a positional argument.
Exit status is **non-zero** when any error-level issues are found, making the
command suitable for CI/CD gates.

## Output

During execution the tool prints a summary with the number of loaded files,
per-family counts, and a sorted list of warnings/errors. Detailed artifacts are
written to `reports/validation`:

- `latest.json` — machine-readable report (issues, versions, counts).
- `latest.txt` — human-readable summary with the same details.
- Timestamped `YYYY-MM-DDTHH-MM-SSZ.json` snapshots for historical runs.

The directory is tracked in git with an ignore file so generated reports do not
appear as untracked changes.

## Continuous Integration

The `Data Validation` workflow (`.github/workflows/data-validation.yml`) now
executes three independent jobs on every push and pull request:

- `pnpm validate:data` to gate blueprint updates.
- `pnpm audit:run` to surface dependency vulnerabilities via the audit runner.
- `pnpm lint` to keep workspace lint rules enforced in the same gate.

Each job installs dependencies with the pinned pnpm and Node.js versions so a
failure in any command marks the workflow as failed.

## Device Blueprint Strictness

Device blueprints rely on precise casing for control setpoints that the engine
expects (for example `targetTemperature`, `targetHumidity`, and `targetCO2`).
The Zod schema backing `pnpm validate:data` now rejects mis-cased variants such
as `targetCo2` and surfaces a clear suggestion in the validation report. This
keeps blueprint typos from silently disabling device controllers.

In addition to casing hints, the `settings`, `coverage`, `limits`, `meta`, and
top-level device blocks are now **strict objects**. Blueprint authors must stay
within the explicit set of keys encoded in the schema:

- **Settings** — numeric controls such as `power`, `ppfd`,
  `coverageArea`, `spectralRange`, `heatFraction`, `airflow`,
  `coolingCapacity`, `cop`, `hysteresisK`, `fullPowerAtDeltaK`,
  `moistureRemoval`, `targetTemperature`, `targetTemperatureRange`,
  `targetHumidity`, `targetCO2`, `targetCO2Range`, `hysteresis`,
  `pulsePpmPerTick`, `latentRemovalKgPerTick`,
  `humidifyRateKgPerTick`, and `dehumidifyRateKgPerTick`.
- **Coverage** — geometry descriptors limited to
  `maxArea_m2`, `maxVolume_m3`, `effectivePPFD_at_m`, `beamProfile`,
  `airflowPattern`, `distributionPattern`, `ventilationPattern`,
  `removalPattern`, and `controlPattern`.
- **Limits** — operational bounds including `power_W`, `maxPPFD`,
  `minPPFD`, `coolingCapacity_kW`, `airflow_m3_h`, `maxAirflow_m3_h`,
  `minAirflow_m3_h`, `maxStaticPressure_Pa`, `co2Rate_ppm_min`,
  `maxCO2_ppm`, `minCO2_ppm`, `removalRate_kg_h`, `capacity_kg_h`,
  `minTemperature_C`, `maxTemperature_C`, `minHumidity_percent`, and
  `maxHumidity_percent`.
- **Meta** — optional descriptive fields (`description`, `advantages`,
  `disadvantages`, `notes`).

Any new attribute must be added to the schema alongside documentation updates
before it appears in JSON. This keeps validation aligned with the engine's
expectations and makes blueprint errors fail fast during `pnpm validate:data`.

## Weedbreed.AI — Personnel Role Blueprint (docs/system/personnel_roles_blueprint.md)

Source: [`docs/system/personnel_roles_blueprint.md`](../docs/system/personnel_roles_blueprint.md)

# Weedbreed.AI — Personnel Role Blueprint

Personnel role blueprints describe every playable staff role without touching code.
The simulation loads them from JSON during startup and uses them to drive initial
roster creation, applicant synthesis, and persistence validation.

- **Location:** `data/blueprints/personnel/roles/*.json`
- **Schema owner:** Workforce systems (job market + personnel initialization)
- **Validation:** `loadPersonnelRoleBlueprints()` (`zod`) scans the directory,
  normalizes every file, and falls back to
  `DEFAULT_PERSONNEL_ROLE_BLUEPRINTS` when files are missing or invalid.

---

## Directory Layout

Each role lives in its own JSON file. Designers add, edit, or remove roles by
dropping files into the directory — no manifest editing required.

```text
data/blueprints/personnel/roles/
  Gardener.json
  Janitor.json
  Manager.json
  Technician.json
  Operator.json
  Specialist.json        ← custom role example
```

Files are loaded in lexicographical order, but the resulting role map is keyed
by `id`, so later files override earlier ones with the same identifier.

---

## PersonnelRoleBlueprint Fields

| Field | Type/Range | Notes
|
| ------------------- | ------------------------------- | ----------------------------------------------------------------------
--------------------- |
| `id` | `string` | Canonical role identifier (`EmployeeRole`).
|
| `name` | `string?` | Display name in UI. Defaults to `id` when omitted.
|
| `description` | `string?` | Optional flavor text for dashboards.
|
| `preferredShiftId` | `string?` | Matches IDs from `SHIFT_TEMPLATES` (e.g. `shift.day`).
|
| `maxMinutesPerTick` | `number? (> 0)` | Per-tick labor cap; defaults to 90 minutes.
|
| `roleWeight` | `number? (>= 0)` | Relative applicant generation weight. When missing or zero the default
role weight is used. |
| `salary` | [Salary config](#salary-config) | Optional. Inherits the fallback/default salary when omitted (20 if no fallback exists).
|
| `skillProfile` | [Skill profile](#skill-profile) | Required for new roles. Primary skills must be present; secondary/tertiary data inherits defaults when omitted.
|

### Salary Config

```jsonc
{
  "basePerTick": 24, // recommended base salary per tick
  "skillFactor": {
    // optional scaling by rolled skills
    "base": 0.85,
    "perPoint": 0.04,
    "min": 0.85,
    "max": 1.45,
  },
  "randomRange": {
    // optional salary noise multiplier
    "min": 0.9,
    "max": 1.1,
  },
  "skillWeights": {
    // optional contribution weights for salary score
    "primary": 1.2,
    "secondary": 0.6,
    "tertiary": 0.35,
  },
}
```

- Omitted fields inherit the default blueprint values.
- `skillFactor.*` values let designers tweak how aggressively skill points affect pay.
- `randomRange` controls per-applicant salary noise; `min`/`max` are clamped and swapped if misordered.
- `skillWeights` tune how primary/secondary/tertiary skills contribute to the salary multiplier. Missing entries fall back to defaults (1.2 / 0.6 / 0.35).

### Skill Profile

```jsonc
{
  "primary": {
    "skill": "Gardening",       // required, must be one of EMPLOYEE_SKILL_NAMES
    "startingLevel": 4,
    "roll": { "min": 3, "max": 5 },
    "weight": 2                 // optional, used when picking tertiary candidates
  },
  "secondary": { ... },          // optional second guaranteed skill
  "tertiary": {                  // optional pool of probabilistic skills
    "chance": 0.25,              // probability (0..1) of rolling a tertiary skill
    "roll": { "min": 1, "max": 3 },
    "candidates": [
      { "skill": "Logistics", "startingLevel": 1, "weight": 1 },
      { "skill": "Administration", "startingLevel": 1 }
    ]
  }
}
```

- Primary skills are mandatory for every role. Secondary and tertiary blocks are optional but inherit rolls/weights from defaults when omitted.
- `roll` bounds are clamped and swapped automatically if `min > max`.
- `weight` biases candidate selection when multiple tertiary skills exist.
- Unknown skills are rejected during validation—only `EMPLOYEE_SKILL_NAMES` (`Gardening`, `Maintenance`, `Logistics`, `Cleanliness`, `Administration`) are allowed.

---

## Normalization & Fallbacks

`normalizePersonnelRoleBlueprints()` merges user-provided data with the shipped
defaults. Key behaviours:

1. **Missing roles inherit defaults.** Every default role is always present even
   if the directory omits the file.
2. **New roles are allowed.** Any role with an unknown `id` is accepted and will
   be surfaced to the job market and personnel factory.
3. **Graceful roll handling.** Invalid or missing roll bounds are coerced to
   non-negative integer ranges (0–5).
4. **Probability clamping.** Tertiary `chance` values are clamped to `[0, 1]`.
5. **Salary guards.** Missing base salaries inherit the fallback role’s value,
   otherwise a generic `20` is used. Random ranges are sanitized so
   `min <= max` when both are provided.

Example file (`data/blueprints/personnel/roles/Specialist.json`):

```jsonc
{
  "id": "Specialist",
  "name": "IPM Specialist",
  "roleWeight": 0.05,
  "salary": { "basePerTick": 30 },
  "skillProfile": {
    "primary": {
      "skill": "Cleanliness",
      "startingLevel": 4,
      "roll": { "min": 2, "max": 4 },
    },
  },
}
```

Unknown fields are ignored but preserved during normalization so designers can
keep notes or tracking metadata alongside the required properties.

## Runtime Consumers

- `state/initialization/personnel.ts` — seeds the starting roster and exposes the loader/normalizer used in tests and factories.
- `engine/workforce/jobMarketService.ts` — draws applicant roles, rolls skills, and computes salary expectations directly from the blueprints.
- `persistence/schemas.ts` — derives the `EmployeeRole` enum and skill schema for save-game validation.

Refer to [Job Market Population](./job_market_population.md) for the applicant pipeline and to this document when authoring new role definitions.

## Simulation Audit Runner (docs/system/audit.md)

Source: [`docs/system/audit.md`](../docs/system/audit.md)

# Simulation Audit Runner

The audit runner executes deterministic backend simulations and collects KPI
time-series suitable for CI regression tracking and artifact review. It lives in
`scripts/run_audit.ts` and is exposed via the workspace script
`pnpm audit:run`.

## Running an audit

```bash
pnpm audit:run --days 7 --seed wb-nightly --output reports/audit --run-id nightly
```

Key options:

- `--seed <value>` — deterministic RNG seed (default: `audit-default`).
- `--days <n>` / `--ticks <n>` — simulation horizon. `--ticks` overrides
  `--days`.
- `--tick-length <minutes>` — override the initial state's tick length.
- `--output <dir>` — base directory for artifacts. A timestamped subdirectory is
  created automatically unless `--run-id` is provided.
- `--baseline <file>` — JSON or JSONL metrics file to compare against.
- `--baseline-mode <tick|day>` — choose the granularity for comparisons
  (default: `day`).
- `--tolerance-default <ε>` — global numeric tolerance used during comparisons.
- `--tolerance <metric=ε>` — repeatable flag for per-metric tolerances.
- `--overrun-threshold <ms>` / `--overrun-consecutive <n>` — configure the tick
  duration watchdog that marks the `throttled` flag when sustained overruns are
  detected.

### Output structure

Every run produces JSONL and CSV streams for both tick-level and aggregated
(day-level) KPIs under the resolved output directory:

```
reports/audit/<run-id>/
  metrics-ticks.jsonl
  metrics-ticks.csv
  metrics-days.jsonl
  metrics-days.csv
  summary.json
```

The files contain the required audit KPIs (biomass delta, stress, quality,
energy/water/nutrient use, opex/capex, task drops, throttling flags). The
`summary.json` payload also records blueprint metadata, runtime settings, totals
and comparison results, making it a single artifact to publish from CI.

### Baseline comparisons

When `--baseline` is provided the runner parses the referenced metrics file,
performs ε-tolerance comparisons and exits with status `1` if regressions are
found. The tolerance map accepts numeric deviations and treats booleans as
0/1 flags. Example:

```bash
pnpm audit:run \
  --days 14 \
  --seed wb-nightly \
  --baseline reports/audit/golden/metrics-days.jsonl \
  --baseline-mode day \
  --tolerance-default 0.05 \
  --tolerance quality_avg=0.75 \
  --tolerance tasks_dropped=0
```

### CI integration

Use `pnpm audit:run` inside CI pipelines with a fixed seed and explicit
`--run-id` to produce stable artifact paths (e.g. `reports/audit/nightly`). The
resulting directory can be uploaded as a build artifact for dashboards or manual
inspection. Because the runner relies on the backend's state factory and
`SimulationLoop`, it honours deterministic seeds and blueprint data validation
exactly as the production backend does.

## ADR 0001 — Backend TypeScript Toolchain Stabilization (docs/system/adr/0001-typescript-toolchain.md)

Source: [`docs/system/adr/0001-typescript-toolchain.md`](../docs/system/adr/0001-typescript-toolchain.md)

# ADR 0001 — Backend TypeScript Toolchain Stabilization

- **Status:** Accepted (initial decision 2025-01-22, updated 2025-02-04)
- **Owner:** Simulation Platform
- **Context:** Backend service

## Context

The backend had been relying on `ts-node` and custom loader flags to execute
TypeScript directly. The approach created friction when running on modern Node
(>20), complicated debugging (custom loaders), and made it hard to ship a clean
Node-compatible bundle for operations teams. The TypeScript configuration also
mixed multiple source roots (`src/`, `data/`, `facade/`, `server/`), complicating
analysis and bundling. After consolidating the service into `src/backend`, the
workspace adopted `type: module` semantics, but the documentation still pointed
to CommonJS build outputs, leading to confusion about the canonical runtime
artifact. A dedicated `typecheck` command was missing because `tsc --noEmit`
surfaced hundreds of issues under the old layout.

## Decision

- Keep TypeScript as the implementation language for the backend runtime and
  supporting tooling.
- Keep all backend sources under `src/backend/src` and expose internal modules
  via the `@/` alias (`@runtime/` for shared runtime helpers) so refactors do not
  rely on brittle relative imports.
- Replace `ts-node` with [`tsx`](https://tsx.is/) for the development server
  (`pnpm --filter @weebbreed/backend dev` ⇒ `tsx --watch src/index.ts`). `tsx`
  offers a fast feedback loop without experimental ESM loader flags.
- Build production artifacts with [`tsup`](https://tsup.egoist.dev/) targeting an
  ESM bundle in `dist/` (`pnpm build` ⇒ `dist/index.js` + sourcemaps) that aligns
  with the package’s `type: module` contract.
- Run the packaged server through plain Node (`pnpm start` ⇒ `node dist/index.js`).
- Ship a strict `tsconfig.json` that uses Node resolution, enforces modern
  TypeScript safety nets (isolated modules, exact optional property types, no
  unchecked indexed access), and declares the `@/`/`@runtime/` path aliases.
- Introduce a `typecheck` script (`tsc -p tsconfig.json --noEmit`) and wire it
  into the workspace-level `pnpm typecheck` target so CI can enforce the
  settings.
- Document the workflow in `src/backend/README.md`, link the changelog in the
  workspace `README.md`, and capture the rationale in this ADR to keep the tool
  choice visible for future audits.

## Consequences

- Development and production runtimes no longer require experimental loaders or
  custom flags; Node 20–23 runs the compiled ESM output directly under the
  standard loader.
- `tsup` produces deterministic ESM bundles (and, when enabled, declaration
  files), reducing drift between local development and production deploys while
  matching the `type: module` expectation of downstream tooling.
- The stricter compiler settings surface previously hidden issues; teams must
  address outstanding errors before the CI `typecheck` gate can be flipped to
  “required”.
- Shared runtime utilities continue to live in `src/runtime`, but they are
  consumed through the explicit `@runtime/` alias to keep module boundaries
  obvious.
- Path updates touched many files; downstream branches must rebase to adopt the
  consolidated layout and the new import conventions.

## Alternatives Considered

1. **Stay on `ts-node`.** Rejected because modern Node has native ESM support;
   custom loaders add startup overhead and platform-specific instability.
2. **Keep emitting CommonJS bundles.** Rejected because the package already
   declares `"type": "module"`, and forcing a CommonJS artifact would reintroduce
   dual-module resolution issues for downstream tooling and deployment targets.
3. **Use `esbuild` CLI instead of `tsup`.** `tsup` wraps `esbuild` but adds
   sensible defaults (bundle splitting, declaration emit) with less manual
   wiring.

## Rollback Plan

If the ESM bundle introduces blocking regressions, reconfigure the backend to
emit CommonJS again:

- Update `src/backend/package.json` to set `"type": "commonjs"`, point `main`
  to `dist/index.cjs`, and adjust `start` to `node dist/index.cjs`.
- Change the `tsup` build target to `--format cjs` and rename the output file to
  `dist/index.cjs`.
- Re-introduce any compatibility shims required by downstream consumers that
  rely on CommonJS semantics.

If loader issues persist even after reverting to CommonJS, fall back to the
pre-toolchain-migration stack (`ts-node` + legacy directory layout) by restoring
commit `2ec8852` and reapplying the historical scripts.

## ADR 0010 — Blueprint Schema Naming Alignment (docs/system/adr/0010-blueprint-schema-naming.md)

Source: [`docs/system/adr/0010-blueprint-schema-naming.md`](../docs/system/adr/0010-blueprint-schema-naming.md)

# ADR 0010 — Blueprint Schema Naming Alignment

- **Status:** Accepted (2025-10-03)
- **Owner:** Simulation Platform
- **Context:** Naming consistency for substrate/container blueprint schemas

## Context

The blueprint loader recently introduced dedicated substrate and container
schemas to replace inline validation. The files were initially published as
`substrateBlueprintSchema.ts` and `containerBlueprintSchema.ts`, exporting
`substrateBlueprintSchema` and `containerBlueprintSchema` constants. While this
mirrored the historic "Blueprint" naming of the JSON data, it broke the
convention used elsewhere in `@/data/schemas` where schema modules export a
`<resource>Schema` symbol (for example `strainSchema`, `deviceSchema`, and
`roomPurposeSchema`). The inconsistency caused import ordering drift in
`@/data/dataLoader` and increased the risk of duplicate re-exports as future
contributors add schema helpers.

## Decision

- Rename the modules to `substrateSchema.ts` and `containerSchema.ts` and export
  `substrateSchema` / `containerSchema` constants to match the folder’s naming
  conventions.
- Retain the public type aliases `SubstrateBlueprint` and `ContainerBlueprint`
  so downstream code continues to consume blueprint-shaped data without churn.
- Update imports and barrel re-exports in
  `src/backend/src/data/dataLoader.ts` and
  `src/backend/src/data/schemas/index.ts` to reference the new module names,
  keeping downstream type-only consumers (for example
  `src/backend/src/testing/fixtures.ts`) unchanged.

## Consequences

- Schema imports across the backend now follow a single `<resource>Schema`
  convention, improving readability and searchability for contributors.
- Blueprint type names remain unchanged, so no blueprint JSON files or tests
  require adjustments beyond the schema references.
- Future schema additions can reuse the established naming pattern without
  special casing the substrate and container modules.

## References

- `src/backend/src/data/schemas/substrateSchema.ts`
- `src/backend/src/data/schemas/containerSchema.ts`
- `src/backend/src/data/dataLoader.ts`
- `src/backend/src/data/schemas/index.ts`
- `src/backend/src/testing/fixtures.ts`

## ADR 0007 — Physiology Modules Collocate with the Engine (docs/system/adr/0007-physio-module-relocation.md)

Source: [`docs/system/adr/0007-physio-module-relocation.md`](../docs/system/adr/0007-physio-module-relocation.md)

# ADR 0007 — Physiology Modules Collocate with the Engine

- **Status:** Accepted (2025-09-23)
- **Owner:** Simulation Platform
- **Context:** Backend physiology helpers and path aliases

## Context

The simplified canopy physiology formulas (VPD, PPFD integration, CO₂ response,
transpiration, etc.) originally lived in a root-level `src/physio` folder. The
backend accessed them through a bespoke `@/physio` alias while the engine's own
packages (`@/engine/...`) remained under `src/backend/src/engine`. The split
introduced several problems:

- The helpers appeared to be a workspace-level shared module even though only
  the backend consumed them.
- The duplicated alias required extra configuration (`tsconfig`, Vitest) and
  complicated editor IntelliSense compared to the existing `@` alias rooted at
  `src/backend/src`.
- Docs and onboarding materials had drifted, making it unclear where new
  physiology work should live and why the helpers were not beside the engine
  code that orchestrates them.

## Decision

- Move all physiology helpers (`co2.ts`, `ppfd.ts`, `rh.ts`, `temp.ts`,
  `transpiration.ts`, `vpd.ts`, and their `index.ts` barrel) into
  `src/backend/src/engine/physio/` so they sit next to the engine subsystems
  that use them.
- Update backend imports to use `@/engine/physio/...` and re-export the barrel
  from `src/backend/src/engine/index.ts` for consistency with other engine
  modules.
- Drop the custom `@/physio` alias from `tsconfig.json` and `vitest.config.ts`
  in favour of the existing `@` base alias.
- Remove the unused `@/engine` alias from the frontend `vite.config.ts` to avoid
  future confusion now that the helpers are collocated with the backend engine.
- Refresh AGENTS.md, the physiology system note, and the outstanding tasks entry
  to point at the new location and record the change history.

## Consequences

- Physiology helpers travel with the engine when it is refactored or packaged,
  reducing the risk of stale imports and simplifying code navigation.
- Backend build and test tooling no longer carries redundant alias wiring,
  which shortens configuration files and eliminates a class of path resolution
  bugs.
- Documentation, tasks, and onboarding materials now agree on where physiology
  work belongs, making it easier for contributors to extend or replace the
  formulas.
- Frontend tooling no longer advertises a non-existent `@/engine` path, avoiding
  accidental imports that would break at runtime.

## Alternatives Considered

1. **Leave the helpers at the repository root.** Rejected because it perpetuates
   the alias drift and keeps physiology logic detached from the engine domain.
2. **Promote the helpers to a dedicated workspace package.** Deferred until we
   have a second consumer. Today the backend is the only user, so a package
   boundary would add publishing overhead without improving reuse.

## Rollback Plan

If the relocation causes unforeseen coupling issues, restore the previous
`src/physio` directory via git history, reinstate the `@/physio` alias in the
backend config, and revert the documentation changes. No data migrations are
needed because the move only touches source files.

## Status Updates

- 2025-09-24 — Confirmed the frontend Vite and TypeScript configs no longer
  expose the unused `@/engine` alias, and the outstanding task tracker entry was
  closed to document the cleanup.

## ADR 0006 — Socket Transport Version Parity (docs/system/adr/0006-socket-transport-parity.md)

Source: [`docs/system/adr/0006-socket-transport-parity.md`](../docs/system/adr/0006-socket-transport-parity.md)

# ADR 0006 — Socket Transport Version Parity

- **Status:** Accepted (2025-02-28)
- **Owner:** Simulation Platform
- **Context:** Real-time telemetry transports

## Context

The backend exposes both Socket.IO and server-sent events (SSE) gateways to fan
out the simulation telemetry stream. While the backend and shared workspace
already depend on `socket.io@^4.8.1`, the frontend still referenced
`socket.io-client@^4.7.5`. The mismatch was survivable for basic messaging but
risked subtle protocol differences (e.g., handshake headers, ping/pong cadence,
namespace negotiation) that are only covered by integration tests on the newest
minor release. We need an explicit decision to keep the transports aligned so
future upgrades cannot regress the dashboard connection behaviour.

## Decision

- Pin both the backend (`socket.io`) and frontend (`socket.io-client`) packages
  to the **same minor version**, currently `4.8.x`.
- Update the `frontend` workspace package.json, regenerate the pnpm lockfile,
  and verify that the dependency tree now resolves to `socket.io-client@4.8.1`.
- Document the parity rule in `AGENTS.md`, the root `README`, and the socket
  protocol reference so contributors have a single source of truth.

## Consequences

- Future dependency updates must bump both sides together; Renovate/Dependabot
  PRs should be merged as a pair instead of individually.
- QA can rely on consistent handshake semantics when testing the React bridge
  and the SSE fallback because both transports share the latest server features.
- The ADR provides an audit trail for why cross-package version bumps are
  required, avoiding accidental downgrades during targeted fixes.
- Configuration guidance now points to
  `src/frontend/src/config/socket.ts`, which derives `SOCKET_URL` from
  `VITE_SOCKET_URL` (defaulting to `http://localhost:7331/socket.io`) so ops and
  developers have a single knob for non-proxied deployments.

## Alternatives Considered

1. **Allow independent version drift.** Rejected because the protocol-level
   behaviour can diverge subtly (e.g., new reserved event names or transport
   negotiation) even within a major version.
2. **Vendor the Socket.IO client.** Deferred — bundling the client manually would
   complicate build tooling and make it harder to adopt upstream fixes.

## Rollback Plan

If a future Socket.IO release introduces a regression that affects one side
only:

- Revert both packages to the last known compatible minor version and note the
  issue in the changelog until an upstream fix ships.
- Gate upgrades behind end-to-end telemetry tests to catch regressions earlier.

## ADR 0004 — Zone Setpoint Routing (docs/system/adr/0004-zone-setpoint-routing.md)

Source: [`docs/system/adr/0004-zone-setpoint-routing.md`](../docs/system/adr/0004-zone-setpoint-routing.md)

# ADR 0004 — Zone Setpoint Routing

- **Status:** Accepted (2025-09-23)
- **Owner:** Simulation Platform
- **Context:** Zone control + device coordination

## Context

The dashboard exposes temperature, humidity, VPD, CO₂, and lighting setpoints
per zone and has been emitting `config.update` commands with `{ type: 'setpoint',
zoneId, metric, value }`. Until now the backend rejected these updates with
`ERR_INVALID_STATE`, leaving UI controls in limbo and forcing designers to tweak
devices manually. We needed a deterministic mapping between a zone-level target,
the devices capable of regulating that metric, and the control state emitted to
telemetry so frontends and automation scripts have a single contract.

## Decision

- Teach `SimulationFacade.setZoneSetpoint` to validate and route setpoints based
  on the metric:
  - `temperature` programs `targetTemperature` on HVAC devices.
  - `relativeHumidity` programs `targetHumidity` on humidifier/dehumidifier
    devices and clears any VPD override.
  - `vpd` converts the target VPD (using the zone control reference temperature)
    into a humidity target, applies it to humidity devices, and persists both
    humidity and VPD setpoints.
  - `co2` programs `targetCO2` on enrichment/scrubber devices.
  - `ppfd` programs the dimmable lighting `ppfd` setting and scales power when a
    finite value is present.
- Reject non-finite values and clamp invalid ranges (`< 0` for PPFD/CO₂/VPD,
  humidity constrained to `[0,1]`). Any clamp emits a warning string in the
  `CommandResult` so the UI can surface the adjustment.
- Zones lacking the required device capability return `ERR_INVALID_STATE` to the
  caller.
- Successful updates raise an `env.setpointUpdated` domain event that includes
  the updated control snapshot plus an `effectiveHumidity` field when the target
  was expressed as VPD.

## Consequences

- Frontend controls now operate against a stable backend contract with explicit
  warnings and failure semantics.
- Device settings stay the single source of truth for climate control while zone
  control state mirrors the last requested targets for telemetry and save/load.
- Translating VPD to humidity in the façade keeps device logic unchanged and
  avoids pushing psychrometric math into the UI.
- Future control strategies (PID, predictive) can consume the same zone control
  record without reworking socket payloads.

## Alternatives Considered

1. **Expose direct device updates over the socket.** Rejected because it would
   bypass zone invariants, require the UI to understand per-device settings, and
   fragment validation logic.
2. **Store setpoints only in zone state and let devices poll it.** Rejected to
   keep device settings authoritative and avoid introducing a polling loop or
   duplicated clamps.
3. **Interpret VPD in the UI.** Rejected to keep physics-derived conversions on
   the backend where the reference temperature and psychrometric helpers already
   exist.

## Rollback Plan

Revert `SimulationFacade.setZoneSetpoint` to the previous stub that rejected
setpoint updates and mark the ADR as superseded. UI controls should then be
hidden or disabled until a new contract is negotiated.

## ADR 0003 — Facade Messaging Overhaul (docs/system/adr/0003-facade-messaging-overhaul.md)

Source: [`docs/system/adr/0003-facade-messaging-overhaul.md`](../docs/system/adr/0003-facade-messaging-overhaul.md)

# ADR 0003 — Facade Messaging Overhaul

- **Status:** Accepted (2025-09-23)
- **Owner:** Simulation Platform
- **Context:** Backend facade & transport gateways

## Context

Frontend stores were emitting intents such as `world.duplicateRoom`,
`devices.toggleDeviceGroup`, and `plants.togglePlantingPlan`, but the backend
facade only exposed the legacy CRUD surface. Socket commands were scattered
across bespoke handlers and the documentation still described the pre-facade
command set, leaving UI teams to guess which actions were safe. The gap meant
that duplication workflows and automation toggles silently failed even though
the UI exposed them. We needed a unified contract that the backend, socket
layer, and documentation could share.

## Decision

- Introduce a modular intent registry inside `SimulationFacade`. Domains such as
  `world`, `devices`, and `plants` register actions with a `{ schema, handler }`
  pair so validation, execution, and cataloguing live together.
- Generalise the Socket.IO command surface behind a single
  `facade.intent` envelope (`{ domain, action, payload?, requestId? }`).
  Responses are emitted on `<domain>.intent.result` and follow
  `CommandResult<T>`.
- Codify the telemetry contract (event levels, queue helpers) in the runtime
  shared module `@runtime/eventBusCore` so gateway transports and headless
  consumers reuse the same implementation without depending on backend source
  paths.
- Expand the façade to cover the missing workflows:
  - World: `renameStructure`, `deleteStructure`, `duplicateStructure`,
    `duplicateRoom`, `duplicateZone` (optional name overrides, new IDs returned).
  - Devices: `toggleDeviceGroup` returning affected `deviceIds`.
  - Plants: `togglePlantingPlan` returning `{ enabled }`.
- Update the socket protocol, façade reference docs, and UI interaction spec so
  duplication flows, structure renames, and automation toggles are captured as
  first-class, supported actions.

## Consequences

- UI teams now have an authoritative catalogue of façade intents and matching
  documentation; Socket clients only need to learn one envelope instead of
  bespoke events per command.
- New domains/actions can be added by registering them with the façade builders,
  guaranteeing schema validation and catalogue updates without touching the
  gateway.
- Automated workflows (duplication, group toggles, planting plan automation) now
  return structured data, enabling optimistic UI updates and easier testing.
- Documentation drift is reduced because ADRs and protocol references are tied
  directly to the registry.
- Shared runtime contracts remove the brittle runtime→backend import, making it
  easier to package the gateway separately or embed the facade into tooling
  without bundling backend internals.

## Alternatives Considered

1. **Add ad-hoc socket events per workflow.** Rejected because each new command
   would need bespoke validation and documentation; the catalogue would still be
   fragmented across files.
2. **Expose engine services directly over the socket.** Rejected to avoid
   leaking internal state mutations and to preserve the façade’s invariants
   (determinism, validation, atomic commits).
3. **Keep the legacy CRUD surface and emulate missing workflows in the UI.**
   Rejected because cloning/automation logic belongs in the engine, not the
   client, and it would break determinism.

## Rollback Plan

If the unified `facade.intent` envelope blocks critical flows:

- Re-enable the previous discrete socket events (`simulationControl`,
  bespoke duplication handlers) while keeping the registry for validation.
- Update the UI bridge to call the legacy events and mark the registry-backed
  domains as experimental until parity is restored.
- As a last resort, revert to commit prior to the registry introduction and
  restore the CRUD-only façade methods while keeping this ADR in “superseded”
  state for auditability.

## ADR 0002 — Frontend Real-Time Dashboard Stack (docs/system/adr/0002-frontend-realtime-stack.md)

Source: [`docs/system/adr/0002-frontend-realtime-stack.md`](../docs/system/adr/0002-frontend-realtime-stack.md)

# ADR 0002 — Frontend Real-Time Dashboard Stack

- **Status:** Accepted (2025-02-17)
- **Owner:** Simulation Platform
- **Context:** Frontend dashboard

## Context

The dashboard needs to visualise live simulation ticks, accept control commands,
and expose operational summaries without blocking future UI experiments. Earlier
iterations relied on the default Vite template docs and ad-hoc styling guidance,
leaving new contributors uncertain about the canonical state management pattern
and the styling/tooling guarantees. We must document the frontend stack so teams
can build features confidently and know which abstractions are stable.

## Decision

- Keep React + Vite as the application foundation, using the TypeScript entry
  point under `src/frontend`.
- Adopt [`socket.io-client`](https://socket.io/) with the bespoke
  `useSimulationBridge` hook as the integration point to the simulation gateway.
  The hook owns connection lifecycle, event fan-out, and exposes command helpers
  to the stores. Telemetry contracts (event levels, buffering rules) now live in
  the shared runtime module `@runtime/eventBusCore`, keeping the frontend bridge
  aligned with backend semantics even when packages are consumed individually.
- Use [`zustand`](https://github.com/pmndrs/zustand) as the global state
  container. Store slices are organised by domain (`game`, `zone`, `personnel`)
  plus lightweight UI state (`useAppStore`), enabling selective subscription and
  derived selectors.
- Standardise Tailwind CSS as the styling layer, backed by CSS design tokens to
  keep the look & feel consistent with the Weed Breed visual language.
- Document the expected workspace scripts for the frontend package and link this
  ADR from contributor-facing docs (`src/frontend/README.md`, docs changelog) so
  the rationale stays visible.

## Consequences

- Contributors can rely on the Socket.IO bridge hook and Zustand stores as the
  supported extension points for real-time data instead of rolling bespoke
  wiring per view. The shared runtime event bus contract ensures downstream
  clients observe the same event typing whether the backend is bundled with the
  dashboard or deployed separately.
- Styling guidance is now explicit: Tailwind + design tokens is the baseline,
  which shortens onboarding and avoids drift toward inline styles or ad-hoc
  component libraries.
- Tests and linting integrate cleanly with the shared workspace scripts because
  the documented commands match `package.json`.
- Any future state management or styling swap must come with a new ADR because
  the current approach is now an accepted decision.

## Alternatives Considered

1. **Keep React Context for global state.** Rejected because the volume of
   real-time updates makes reducer/context solutions chatty and harder to
   optimise compared with Zustand's selectors and store slices.
2. **Adopt a component library instead of Tailwind.** Deferred: Tailwind paired
   with design tokens provides enough velocity while allowing us to build bespoke
   simulation widgets without fighting component overrides.
3. **Use the raw Socket.IO client per component.** Rejected to avoid duplicated
   connection logic and ensure consistent command routing back to the backend.

## Rollback Plan

If the combination of Tailwind, Zustand, or the Socket.IO bridge proves
untenable:

- Replace the bridge hook with a thinner wrapper around `socket.io-client`,
  update stores to connect directly, and document the new responsibilities.
- Swap Zustand for an alternative (e.g. Redux Toolkit) by introducing a parallel
  store implementation, migrating consumers incrementally, and updating this ADR
  once complete.
- Substitute Tailwind with another styling approach by refactoring the build
  pipeline (PostCSS/Vite config) and replacing utility classes in components.
  Document the new baseline in both the ADR series and the frontend README.

## ADR 0009 — Simulation Constant Governance & Documentation Loop (docs/system/adr/0009-simulation-constants-governance.md)

Source: [`docs/system/adr/0009-simulation-constants-governance.md`](../docs/system/adr/0009-simulation-constants-governance.md)

# ADR 0009 — Simulation Constant Governance & Documentation Loop

- **Status:** Accepted (2025-09-26)
- **Owner:** Simulation Platform
- **Context:** Canonical definition, review, and documentation of simulation constants

## Context

Simulation constants (environmental coefficients, physiology clamps, balance
factors, etc.) have accumulated across the backend in ad-hoc modules while their
narrative explanations live under `docs/constants/**`. Contributors have been
adding new tunables in whichever module happened to be nearby, occasionally
duplicating values, misaligning units, or forgetting to update the public
reference docs. As the physiology and economic models become more modular, the
lack of a single stewardship workflow risks drift between the runtime behaviour
and the documentation relied on by designers and QA.

## Decision

- Declare `src/backend/src/constants/` as the sole source of truth for
  simulation-wide constants that are intended for tuning or cross-module reuse.
- Require each exported constant to carry an inline JSDoc summary that mirrors
  and links to its documentation entry.
- Pair every constant change with an update to the corresponding page under
  `docs/constants/`, ensuring the prose remains synchronized with the code.
- Introduce a lightweight review checklist for pull requests that touch
  simulation constants, covering location, naming, documentation, and tests when
  applicable.

## Scope

- **In scope:** Physical/environmental coefficients, physiology tunables,
  balance knobs, and any other values surfaced to simulation designers via JSON
  or documentation.
- **Out of scope:** One-off helper constants scoped to a single module (retain
  them in place) and frontend-only presentation constants.
- **Stakeholders:** Simulation platform engineers, gameplay engineers, QA, and
  tuning/design staff who rely on documented constants.

## Consequences

- Centralizing constants reduces duplication and provides predictable discovery
  for new contributors, reinforcing determinism and replaceability targets.
- JSDoc + documentation pairing keeps designers and engineers aligned on the
  intent and acceptable ranges of tunables, lowering onboarding overhead.
- The review checklist formalizes stewardship expectations, enabling QA to audit
  constant changes and catch unsynchronized updates before release.
- Future tooling (lint rules, doc generators) can target the shared constants
  directory to automate drift detection.

## References

- `docs/constants/*`
- Simulation Platform Coding Standards (`AGENTS.md`)

## Telemetry and UI Views [ # Source: docs/system/socket_protocol.md § UI Stream (`uiStream$`); docs/system/socket_protocol.md § Connection & Handshake; docs/ui-building_guide.md § Guiding Principles; docs/ui-building_guide.md § Layout & Navigation; docs/ui-building_guide.md § Dashboard & Global Chrome ] (docs/\_final/09-telemetry-and-ui-views.md)

Source: [`docs/_final/09-telemetry-and-ui-views.md`](../docs/_final/09-telemetry-and-ui-views.md)

# Telemetry and UI Views [ # Source: docs/system/socket_protocol.md § UI Stream (`uiStream$`); docs/system/socket_protocol.md § Connection & Handshake; docs/ui-building_guide.md § Guiding Principles; docs/ui-building_guide.md § Layout & Navigation; docs/ui-building_guide.md § Dashboard & Global Chrome ]

- **Shared UI stream.** The backend exposes a hot observable that batches simulation updates, tick-completion notices, and domain events with bounded buffers; all transports subscribe to the same stream so Socket.IO and SSE clients receive identical JSON payloads in SI units.【F:docs/system/socket_protocol.md†L3-L31】
- **Handshake cadence.** On connect the gateway emits protocol metadata, current time status (tick, speed, pause state), and an initial `simulationUpdate` snapshot before continuing with batched updates that include phase timings, telemetry, and UUID-referenced entities.【F:docs/system/socket_protocol.md†L33-L145】
- **UI contract.** The dashboard renders read-only snapshots, routes every intent through the System Facade, and keeps unidirectional dataflow (render → intent → commit → event → re-render) so the engine remains authoritative.【F:docs/ui-building_guide.md†L1-L27】
- **Navigation model.** The application shells persist header controls, breadcrumbs, sidebar, and content area, supporting a structure → room → zone drill-down with responsive layouts, modal pauses, and consistent design-system primitives across breakpoints.【F:docs/ui-building_guide.md†L5-L111】
- **Global controls.** The dashboard header surfaces capital, cumulative yield, plant capacity, and tick progress, with play/pause, multi-speed presets, finance and personnel shortcuts, notification popovers, and menu actions that mirror telemetry events.【F:docs/ui-building_guide.md†L49-L127】

## Simulation Lifecycle [ # Source: docs/system/simulation-engine.md § Timebase & Core Loop (fixed-step, scheduler-agnostic); docs/system/simulation-engine.md § Environment Model (per Zone; well-mixed, delta-based); docs/system/simulation-engine.md § Plant Growth, Stress, Health (per Planting/Plant); docs/system/simulation-engine.md § Tasks & Agentic Employees (utility-based; overtime-aware); docs/system/simulation-engine.md § Economics (currency-neutral) ] (docs/\_final/04-simulation-lifecycle.md)

Source: [`docs/_final/04-simulation-lifecycle.md`](../docs/_final/04-simulation-lifecycle.md)

# Simulation Lifecycle [ # Source: docs/system/simulation-engine.md § Timebase & Core Loop (fixed-step, scheduler-agnostic); docs/system/simulation-engine.md § Environment Model (per Zone; well-mixed, delta-based); docs/system/simulation-engine.md § Plant Growth, Stress, Health (per Planting/Plant); docs/system/simulation-engine.md § Tasks & Agentic Employees (utility-based; overtime-aware); docs/system/simulation-engine.md § Economics (currency-neutral) ]

- **Fixed-step scheduler.** Wall-time deltas accumulate until they exceed `tickIntervalMs / gameSpeed`; each loop consumes the budget, runs one full tick, reduces the accumulator, and then publishes committed snapshots and batched events, ensuring deterministic pacing even when catch-up frames occur.【F:docs/system/simulation-engine.md†L12-L25】
- **Environment phase.** Every tick starts from the previous zone state, applies device deltas (lighting heat and PPFD, HVAC cooling/heating, humidity control, CO₂ injection), folds in plant-driven transpiration and photosynthesis, normalises toward ambient with airflow-scaled exponential pull, clamps to safety limits, and emits environmental anomaly events as needed.【F:docs/system/simulation-engine.md†L35-L66】
- **Plant phase.** Phenology advances by tick, resource requirements convert NPK and water curves to per-plant, per-tick demand, stress aggregates weighted penalties across climate and resource drivers, health adjusts via stress thresholds, potential growth factors (light, temperature, CO₂) combine with health to yield actual biomass gains, and quality tracking respects harvest windows.【F:docs/system/simulation-engine.md†L80-L105】
- **Health and workforce phases.** Pests and diseases progress through detect → progress → spread → treat steps with blueprint-driven risk and safety gates, while employees pull tasks by maximising utility functions, execute until `progressTicks ≥ durationTicks`, and accrue overtime per policy when energy dips below zero.【F:docs/system/simulation-engine.md†L115-L170】
- **Accounting phase.** CapEx posts immediately, OpEx aggregates maintenance, energy, and inputs using tick-hour scaling, rent multiplies hourly rates by tick length, labour costs respect overtime policies, and revenue applies quality-modified harvest pricing before finance events are emitted.【F:docs/system/simulation-engine.md†L173-L190】

## Plant Growth Defaults (docs/constants/plants.md)

Source: [`docs/constants/plants.md`](../docs/constants/plants.md)

# Plant Growth Defaults

> See [ADR 0009](../system/adr/0009-simulation-constants-governance.md) for the
> stewardship policy that governs these constants and their documentation.

## Light & CO₂ Response

`PLANT_DEFAULT_LIGHT_HALF_SATURATION = 350`
Fallback PPFD half-saturation (µmol·m⁻²·s⁻¹) for strains without stage targets.

`PLANT_LIGHT_HALF_SATURATION_MIN = 50`
Minimum PPFD half-saturation allowed when averaging blueprint ranges.

`PLANT_LIGHT_HALF_SATURATION_MAX = 1200`
Maximum PPFD half-saturation allowed when averaging blueprint ranges.

`PLANT_DEFAULT_CO2_HALF_SATURATION = 600`
Fallback CO₂ half-saturation (ppm) prior to growth-rate scaling.

`PLANT_CO2_HALF_SATURATION_MIN = 350`
Minimum CO₂ half-saturation after applying growth-rate scaling.

`PLANT_CO2_HALF_SATURATION_MAX = 900`
Maximum CO₂ half-saturation after applying growth-rate scaling.

`PLANT_DEFAULT_GROWTH_RATE = 1`
Morphology growth-rate multiplier assumed when a strain omits the field.

`PLANT_MIN_GROWTH_RATE = 0.3`
Lower clamp for morphology growth-rate multipliers.

`PLANT_MAX_GROWTH_RATE = 2`
Upper clamp for morphology growth-rate multipliers.

## Temperature & VPD Response

`PLANT_DEFAULT_TEMPERATURE_GAUSSIAN_MEAN_C = 25`
Fallback Gaussian mean (°C) when a strain lacks ideal temperature bands.

`PLANT_DEFAULT_TEMPERATURE_GAUSSIAN_SIGMA_C = 6`
Fallback Gaussian sigma (°C) for temperature response when no band is provided.

`PLANT_MIN_TEMPERATURE_GAUSSIAN_SIGMA_C = 3`
Minimum sigma (°C) used when computing Gaussians from blueprint ranges.

`PLANT_DEFAULT_VPD_GAUSSIAN_MEAN_KPA = 1.1`
Fallback VPD mean (kPa) when a strain omits humidity preferences.

`PLANT_DEFAULT_VPD_GAUSSIAN_SIGMA_KPA = 0.6`
Fallback VPD sigma (kPa) applied without humidity preferences.

`PLANT_VPD_RELATIVE_HUMIDITY_MIN = 0.2`
Minimum relative humidity accepted when interpreting strain humidity bands.

`PLANT_VPD_RELATIVE_HUMIDITY_LOW_MAX = 0.95`
Upper clamp for the low-end humidity bound before enforcing span.

`PLANT_VPD_RELATIVE_HUMIDITY_MIN_SPAN = 0.05`
Minimum relative humidity width enforced between low and high bounds.

`PLANT_VPD_RELATIVE_HUMIDITY_MAX = 0.98`
Upper clamp for the high-end humidity bound.

`PLANT_VPD_TOLERANCE_FACTOR = 0.5`
Fraction of the VPD deviation window used as Gaussian sigma.

## Canopy Geometry

`PLANT_LEAF_AREA_INDEX_MIN = 0.2`
Lowest leaf area index permitted when estimating canopy interception.

`PLANT_LEAF_AREA_INDEX_MAX = 6`
Highest leaf area index permitted when estimating canopy interception.

`PLANT_DEFAULT_LEAF_AREA_INDEX = 2.5`
Fallback leaf area index when morphology data is missing.

`PLANT_CANOPY_AREA_MIN = 0.05`
Minimum canopy area (m²) enforced when computing interception and transpiration.

`PLANT_DEFAULT_CANOPY_COVER = 0.1`
Fallback canopy cover (m²) applied when the plant state lacks the value.

`PLANT_CANOPY_LIGHT_EXTINCTION_COEFFICIENT = 0.7`
Beer-Lambert extinction coefficient for canopy light interception.

## Health & Quality Response

`PLANT_DEFAULT_RESILIENCE = 0.5`
Fallback resilience applied when a strain omits the trait.

`PLANT_RESILIENCE_STRESS_RELIEF_FACTOR = 0.3`
Stress relief factor multiplied by the resilience delta from the baseline.

`PLANT_HEALTH_BASE_RECOVERY_RATE = 0.6`
Base proportion of the health recovery rate applied per tick.

`PLANT_HEALTH_RESILIENCE_RECOVERY_BONUS = 0.4`
Additional health recovery per point of resilience.

`PLANT_QUALITY_STRESS_FACTOR = 0.4`
Stress-to-quality penalty multiplier.

`PLANT_QUALITY_BASE_ADJUSTMENT_RATE = 0.5`
Base rate nudging quality toward the health-implied target each tick.

`PLANT_HEALTH_ALERT_THRESHOLDS = [{ threshold: 0.5, severity: "warning" }, { threshold: 0.3, severity: "critical" }]`
Ordered health alert triggers emitted when a plant crosses the thresholds.

## Yield & Morphology

`PLANT_DEFAULT_HARVEST_INDEX = 0.65`
Fallback fraction of biomass routed to yield during flowering/ripening.

`PLANT_HEIGHT_PER_GRAM_MULTIPLIER = 0.002`
Meters of height gained per gram of positive biomass growth.

## Blueprint Unit Migration (SI Base Units) (docs/releases/2025-02-si-blueprint-migration.md)

Source: [`docs/releases/2025-02-si-blueprint-migration.md`](../docs/releases/2025-02-si-blueprint-migration.md)

# Blueprint Unit Migration (SI Base Units)

**Release date:** 2025-02-XX  
**Audience:** Blueprint authors, content integrators, backend engineers

## Summary

Blueprint schemas for devices and strains now require SI base units without encoding the unit in the property name. Duration fields are provided in **seconds**, masses in **kilograms**, and decay/flux rates in their base SI equivalents.

## Renamed Fields & Unit Changes

| Blueprint                             | Old property                 | New property                 | Conversion                            |
| ------------------------------------- | ---------------------------- | ---------------------------- | ------------------------------------- |
| Device                                | `lifespanInHours`            | `lifespan`                   | hours → seconds (`value * 3600`)      |
| Strain → `growthModel`                | `maxBiomassDry_g`            | `maxBiomassDry`              | grams → kilograms (`value / 1000`)    |
| Strain → `growthModel`                | `baseLUE_gPerMol`            | `baseLightUseEfficiency`     | g/mol → kg/mol (`value / 1000`)       |
| Strain → `photoperiod`                | `vegetationDays`             | `vegetationTime`             | days → seconds (`value * 86400`)      |
| Strain → `photoperiod`                | `floweringDays`              | `floweringTime`              | days → seconds                        |
| Strain → `photoperiod`                | `transitionTriggerHours`     | `transitionTrigger`          | hours → seconds (`value * 3600`)      |
| Strain                                | `harvestWindowInDays`        | `harvestWindow`              | days → seconds                        |
| Strain → `harvestProperties`          | `ripeningTimeInHours`        | `ripeningTime`               | hours → seconds                       |
| Strain → `harvestProperties`          | `maxStorageTimeInHours`      | `maxStorageTime`             | hours → seconds                       |
| Strain → `harvestProperties`          | `qualityDecayPerHour`        | `qualityDecayRate`           | 1/hour → 1/second (`value / 3600`)    |
| Cultivation method compatibility keys | `photoperiod.vegetationDays` | `photoperiod.vegetationTime` | Apply days → seconds before comparing |

## Authoring Guidance

- Provide all duration values in seconds. Example: a 48-hour ripening window becomes `172800`.
- Provide dry mass limits in kilograms. Example: `180 g` → `0.18`.
- Provide light-use efficiency in kilograms per mol of photons. Example: `0.9 g/mol` → `0.0009`.
- Provide exponential decay constants per second. Example: `0.02 per hour` → `5.555555555555556e-6`.
- Update any cultivation method trait thresholds that referenced `photoperiod.vegetationDays` to the new `photoperiod.vegetationTime` key, converting bounds to seconds.

## Runtime Implications

- Internal simulation logic continues to operate on hours and grams where appropriate, so loaders now convert from seconds/kilograms back to the expected runtime units.
- Harvest quality decay now interprets the per-second rate directly, so test expectations and downstream calculations should use seconds when deriving analytic values.

## Migration Checklist

1. Rename the affected fields in custom blueprints and convert their values using the table above.
2. Update any scripts or tooling that reference the previous keys (e.g., editors, validators).
3. Re-run schema validation to confirm compliance with the updated device and strain Zod schemas.
4. Review cultivation method compatibility rules for the renamed photoperiod key.

## Frontend Migration Notes (docs/ui/migration-notes.md)

Source: [`docs/ui/migration-notes.md`](../docs/ui/migration-notes.md)

# Frontend Migration Notes

## Summary

- `src/frontend` now hosts the rebuilt Weedbreed.AI dashboard scaffolded with React, Vite, TypeScript, and Tailwind CSS. The
  layout follows the structure → room → zone drill-down defined in the UI building guide and wires navigation, breadcrumbs,
  modal handling, and telemetry mocks via a dedicated Zustand store and facade bridge.
- Die vorherige Implementierung wurde am 2025-09-25 entfernt. Sie kann bei Bedarf weiterhin über den Git-Tag
  `legacy-frontend-final` eingesehen werden.
- Type-only contracts (`src/frontend/src/types/simulation.ts`) and faceless utilities were copied from the legacy codebase to
  retain authoritative domain schemas without duplicating layout logic.

## Omitted Legacy Elements

- Legacy layout containers, routing constructs, and bespoke component styling were not migrated because the new dashboard shell
  aligns directly with the guide’s layout, Tailwind token system, and navigation semantics.
- The legacy simulation bridge, query clients, and bespoke stores were excluded; the new facade mock provides the required
  telemetry snapshots without reintroducing business logic into the UI layer.
- Stateful UI flows that depended on engine-specific logic (e.g., market, workforce) were postponed until the rebuilt facade is
  connected to real telemetry and intents.

## Follow-up Tasks

1. ✅ Replace the mock facade (`src/frontend/src/facade/systemFacade.ts`) with live Socket.IO wiring once the backend exposes the
   deterministic streams documented in `/docs/system`. The bridge now connects to the real gateway, manages reconnection, routes
   intent ACKs, and hydrates the global simulation store without optimistic updates.
2. ✅ Reintegrate analytics-heavy components (Recharts time-series expansions, TanStack Table virtualisation) using live data when
   telemetry volume warrants it. Zone telemetry respects the 5 000-point budget via dynamic downsampling and virtualised plant
   tables render efficiently beyond 100 rows.
3. ✅ Port modal workflows for rent/duplicate/delete actions to real facade intents, including optimistic UI feedback and command
   acknowledgements. Rent, duplicate, rename, and delete flows pause the simulation, await façade ACKs, and resume only after
   modal closure.
4. ✅ Extend automated tests for navigation, modal focus trapping, and responsive sidebar behaviour once the UI stabilises. Added
   Vitest suites cover navigation reducers, ModalFrame focus trapping, sidebar toggling, and telemetry history retention as a
   performance smoke test.

## Connectivity

The dashboard now reads Socket.IO endpoints from `src/frontend/.env.development.local`, using `VITE_BACKEND_HTTP_URL`,
`VITE_SOCKET_URL`, and `VITE_SOCKET_PATH` to keep the client aligned with whichever backend host is running locally. Vite’s dev
server proxies both `/socket.io` and `/api` to that origin so browser requests remain same-origin while still reaching the Node
runtime. When the socket has not finished connecting, Quick Start surfaces an actionable help link instead of firing a failing
intent.

## Retirement

- **Datum:** 2025-09-25 (UTC)
- **Tag:** `legacy-frontend-final`
- **Gründe:** Das neue Frontend in `src/frontend` erfüllt sämtliche Akzeptanzkriterien aus dem UI Building Guide sowie den
  Migration Notes. Die Legacy-Implementierung stellte nur noch redundante Layout- und Store-Konstrukte bereit, deren Pflege
  zusätzliche CI-Laufzeit und Sicherheitsupdates erfordert hätte.
- **Übernommene Artefakte:** Keine neuen Übernahmen im Zuge der Stilllegung. Typdefinitionen und Hilfsfunktionen wurden bereits
  während der Migration in `src/frontend` konsolidiert.
- **Verbleibende Referenzen:** Keine. Workspace-Konfiguration, Linting-Setup und Dokumentation verweisen nicht mehr auf
  `src/frontend-legacy`.

## Create tasks to fix the issues: (docs/tasks/20250923-todo-findings.md)

Source: [`docs/tasks/20250923-todo-findings.md`](../docs/tasks/20250923-todo-findings.md)

Create tasks to fix the issues:
Critical: tools/validate-data.ts imports ../src/backend/data/dataLoader.js, but the file lives at src/backend/src/data/dataLoader.ts; the relative path is wrong (breaks “pnpm validate:data” and CI).
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.
Status: ✅ Completed 2025-09-24 — Snapshot/time documentation aligned with ADR 0005; protocol guide, README, and AGENTS updated.

Create tasks to fix the issues:
Event naming mismatch: backend emits SimulationEvent.level while frontend types/selectors use severity; alert counts and filters won’t work—map level->severity in useSimulationBridge or align types/selectors. Which ever comes handier and is less hardcoded.
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.
Status: ✅ Duplicate of snapshot/time documentation update (2025-09-24).

Create tasks to fix the issues:
Unsupported intents: frontend sends world.updateStructure, world.duplicateRoom, world.duplicateZone, world.deleteStructure, devices.toggleDeviceGroup, plants.togglePlantingPlan, etc., but backend facade only supports rent/create/update/delete (room/zone) and lacks these; calls will be rejected. Overhaul the messaging system used and create an open and modular one, which handles later needs.
Status: ✅ Completed 2025-09-23 — façade registry now exposes duplication, rename, and toggle intents; socket docs updated alongside ADR 0003 and AGENTS.md.
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.
Status: ✅ Duplicate of snapshot/time documentation update (2025-09-24).

Create tasks to fix the issues:
Setpoints not implemented: frontend emits config.update {type:'setpoint', ...}, but backend explicitly returns ERR_INVALID_STATE; implement setpoint handling. check for other devices, which can handle settings.
Status: ✅ Completed 2025-09-23 — façade now routes zone setpoints to device targets, clamps invalid values, and emits env.setpointUpdated events.
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.
Status: ✅ Duplicate of snapshot/time documentation update (2025-09-24).

Create tasks to fix the issues:
Snapshot shape mismatch: frontend types require snapshot.clock, backend snapshot omits it; runtime is guarded but typings are inaccurate—either add clock to snapshot or relax the type.
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.
Status: ✅ Duplicate of snapshot/time documentation update (2025-09-24).

Create tasks to fix the issues:
Version drift: socket.io-client is ^4.7.5 in frontend vs ^4.8.1 server; align to avoid subtle protocol issues.
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.
Status: ✅ Duplicate of snapshot/time documentation update (2025-09-24).

Create tasks to fix the issues:
Unused config: src/frontend/src/config/socket.ts isn’t used by useSimulationBridge (hardcodes '/socket.io'); wire it up so VITE_SOCKET_URL works in non-proxied deployments.
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.
Status: ✅ Completed 2025-09-25 — SOCKET_URL is now documented across AGENTS, READMEs, ADR 0006, and the socket protocol after wiring the shared config helper.

Create tasks to fix the issues:
Schema vs usage: deviceSchema.settings defines targetCo2 (camel) but code/JSON use targetCO2 (caps) plus other fields (targetTemperature, targetHumidity, targetCO2Range) not in schema; it’s allowed via .passthrough but consider documenting or extending zod for stronger validation.
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.

Create tasks to fix the issues:
Minor ergonomics: rent/maintenance costs are per “tick” assuming 1h; if tick length changes at runtime, economic rates don’t scale—clarify or normalize per real-time.
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.

Create tasks to fix the issues:
Declutter the sourcecode: move /src/physio/_ to /src/backend/src/engine/physio/_ to match other engine subsystems; remove dead alias @/engine from vite.config.ts (points to non-existent /engine at project root).
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.
Status: ✅ Completed 2025-09-23 — Physio utilities now live under the engine, docs updated, and the unused @/engine Vite alias was removed.

## Backend Development (src/backend/README.md)

Source: [`src/backend/README.md`](../src/backend/README.md)

# Backend Development

## Development server

The backend uses [`tsx`](https://tsx.is/) for local development. `tsx`
executes TypeScript directly with native ESM resolution, so the source tree
mirrors the compiled layout without experimental Node flags.

```bash
pnpm --filter @weebbreed/backend dev
# runs:
#   tsx --watch src/index.ts
```

The CLI entry point starts the blueprint loader, seeds the initial game state,
attaches the Socket.IO and SSE gateways, and starts the simulation clock. Use
`WEEBBREED_BACKEND_PORT` and `WEEBBREED_BACKEND_SEED` to override the defaults.
The frontend resolves its Socket.IO endpoint from the `SOCKET_URL` export in
`src/frontend/src/config/socket.ts`, which inspects
`import.meta.env.VITE_SOCKET_URL` and otherwise defaults to
`http://localhost:7331/socket.io`. Keep the backend port and the frontend env
variable aligned when running the packages separately.

## Production build

Create an optimized ESM bundle and definition files with [`tsup`](https://tsup.egoist.dev/):

```bash
pnpm --filter @weebbreed/backend build
```

The bundle lives in `dist/`. Declaration output is temporarily paused until
`tsc --noEmit` is clean; start the bundle with Node (23+):

```bash
pnpm --filter @weebbreed/backend start
# runs:
#   node dist/index.js
```

## Quality checks

```bash
pnpm --filter @weebbreed/backend lint
pnpm --filter @weebbreed/backend typecheck
pnpm --filter @weebbreed/backend test
```

`pnpm typecheck` runs `tsc --noEmit` with the strict ESM config. The
workspace-level script `pnpm typecheck` fans out to all packages.

## Path aliases

The backend resolves internal modules through the `@/` prefix, e.g.
`import { bootstrap } from '@/bootstrap.js'`. Runtime helpers that still live in
`src/runtime` are available via `@runtime/…`. Both aliases are supported by the
development tooling (`tsx`, `vitest`) and the build pipeline (`tsup`).
