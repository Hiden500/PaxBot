# Pax-Automata

Autonomous agent for **Pax Historia** (browser grand-strategy). Perceives game state, reasons via a local “War Room,” and executes actions through Playwright.

**Before making changes:**

1. Read **`CLAUDE.md`** (constitution: tech stack, paths, git workflow, behavioral rules).
2. Check **`docs/project-tracker.md`** for current status.
3. Create a `feature/` or `fix/` branch; do not commit directly to `main`.

**Design:** `docs/PRD.md` · **Flow:** `docs/diagrams/war-room-flow.mmd` (and `.png`).

**Scaffold:** `./scripts/scaffold.sh` — creates `war-room/` and `src/spy|brain|hand/`.
