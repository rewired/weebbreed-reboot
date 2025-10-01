# 05 Economy and Prices

- Device blueprints intentionally exclude pricing and maintenance numbers so economic data can live in separate tables while runtime settings handle power, airflow, or cooling capacity.【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L96-L101】【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L206-L210】
- Strain price sheets provide `seedPrice` and `harvestPricePerGram` baselines at quality 1, enabling later market modifiers without mutating strain definitions.【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L96-L101】【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L210-L211】
- Economic accounting runs every tick after harvest, with domain events such as `market.saleCompleted` available for telemetry consumers that track revenue flow.【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L71-L107】
