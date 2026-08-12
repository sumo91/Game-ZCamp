# ZCamp

- When acting as, messaging, handing work to, or recovering the identity of a ZCamp project task, read `docs/production/TEAM_PROTOCOL.md` before proceeding.

- Keep gameplay rules deterministic and platform-independent. Put simulation in `src/core`; keep Phaser, browser, DOM, and platform integration at the boundary.

- Keep gameplay content data-first. Add or change enemies, towers, waves, and upgrades through typed content definitions and validation rather than scattered scene logic.

- Treat player-visible changes as incomplete until relevant checks pass. Changes to gameplay, layout, input, pause, or results should include a reproducible test or visual verification when appropriate.
