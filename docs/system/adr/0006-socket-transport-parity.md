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
