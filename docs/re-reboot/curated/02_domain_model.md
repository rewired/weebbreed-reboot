# 02 Domain Model

- The world hierarchy progresses from building to rooms to zones to individual plants, with each zone supplying environment state to its plants every tick.【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L48-L56】
- Geometry utilities track room volume, zone area, lamp coverage, and HVAC airflow to constrain device effects and prepare for richer spatial models later.【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L49-L84】
- Authoritative blueprints cover strains, cultivation methods, devices, and strain prices, each carrying the configuration that drives factory instantiation and downstream economics while keeping price tables separate.【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L94-L101】【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L206-L211】
