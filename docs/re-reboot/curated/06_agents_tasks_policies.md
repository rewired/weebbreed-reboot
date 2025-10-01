# 06 Agents, Tasks, and Policies

- Simulation engineers iterate on plant and environment models, gameplay engineers build the dashboard, and tuners adjust runtime setpoints and blueprints without code changes, so workflows must honor all three personas.【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L27-L36】
- Testing policy spans unit checks for VPD, coverage, and conversions plus integration cases like dark runs and dry air shocks to verify controllers and telemetry.【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L121-L125】【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L221-L225】
- The engine runs as a state machine with buffered event bus output, ensuring policies around determinism and observability are upheld during collaboration and QA.【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L68-L143】
