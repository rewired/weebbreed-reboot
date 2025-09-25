# User-provided custom instructions

_No additional custom instructions were supplied beyond the repository documentation._

# Product Requirements Document (PRD)

## Detected contradictions across `/docs/**/*.md`

1. **Tick duration is described as both fixed and variable.** The simulation philosophy states that each tick is a fixed hour of game time, while the simulation engine guidance expects systems to recalculate costs when the tick length changes at runtime, implying the duration is adjustable.【F:docs/system/simulation_philosophy.md†L5-L8】【F:docs/system/simulation-engine.md†L175-L186】
2. **Client control over tick length conflicts.** The UI building guide insists the backend keeps tick length immutable to clients, yet the socket protocol documents a `config.update` command that lets clients change `tickLength`, and the component guide still maps a tick-length slider to `time.setTickLength` intents.【F:docs/ui-building_guide.md†L366-L394】【F:docs/system/socket_protocol.md†L423-L455】【F:docs/ui/ui-components-desciption.md†L31-L34】
3. **State management responsibilities diverge.** The UI guide prescribes a snapshot-driven Zustand store that leaves simulation state immutable in the client, but the component documentation still portrays `App.tsx` as owning mutable game data and recomputing state locally for every interaction.【F:docs/ui-building_guide.md†L364-L371】【F:docs/ui/ui-components-desciption.md†L74-L82】
4. **Finance interactions are simultaneously required and absent.** The UI guide claims the dashboard must expose finance intents such as selling inventory and adjusting utility prices, yet the component catalogue declares the finance view read-only with no wired finance intents.【F:docs/ui-building_guide.md†L414-L417】【F:docs/ui/ui-components-desciption.md†L66-L68】
