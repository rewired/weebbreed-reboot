# 01 Principles and Guardrails

- Respect the v1 non-goals by avoiding 3D rendering, multiplayer features, and database persistence, keeping focus on single-user simulation tooling.【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L17-L21】
- Maintain deterministic, swappable physiology modules with SI units, camelCase keys, and centrally managed tunables so designers can recalibrate without code churn.【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L14-L15】【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L55-L90】
- Enforce reliability guardrails through schema validation, tick-end commits, structured logging, and buffered event forwarding over Socket.IO.【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L94-L110】【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L126-L143】
