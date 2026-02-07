# Project Tracker — Status Scratchpad

**Use this file for progress and checklists.** Do not store these in `CLAUDE.md`.

---

## Current status (high level)

| Area              | Status   | Notes |
|-------------------|----------|--------|
| Repo / docs setup | Done     | PRD in docs, diagrams in docs/diagrams, CLAUDE.md and this tracker in place. |
| War Room scaffold | Done     | `war-room/` and placeholder files in place. |
| Phase 1: Perception | Pending | Playwright Spy + `/api/simple-chat` → `current_state.json`. |
| Phase 2: War Room  | Pending | constitution.md, crisis_handbook.txt, strategic_ledger.json. |
| Phase 2.5: Advisor | Pending | Query advisor chat, scrape response into context. |
| Phase 3: Brain     | Pending | Assemble context, update ledger, filter by constitution, output batch of actions. |
| Phase 4: Hand      | Pending | Batch execution via Playwright (action box submit). |

---

## Done

- [x] Reorganize repo: PRD → `docs/PRD.md`, diagrams → `docs/diagrams/war-room-flow.{mmd,png}`.
- [x] Add `CLAUDE.md` (constitution), `docs/project-tracker.md`, `docs/logs/`.
- [x] Add scaffold script (see `scripts/scaffold.sh`).
- [x] Initialize Node.js + TypeScript project (Playwright, ts-node, tsconfig, entry point).

---

## Pending

- [x] Run `./scripts/scaffold.sh` to create `war-room/` and placeholders.
- [x] Choose runtime (Node/TS recommended) and add package manager + base deps.
- [ ] Phase 1: Implement Perception layer (Spy + current_state.json).
- [ ] Phase 2: Populate War Room templates (constitution, handbook, ledger schema).
- [ ] Phase 2.5: Implement advisor query + response scrape.
- [ ] Phase 3: Implement Brain (context assembly, ledger update, action batch).
- [ ] Phase 4: Implement Hand (batch execution in browser).

---

## Logs

Timestamped writeups go under `docs/logs/` (e.g. `2026-02-07-scaffold.md`, `2026-02-08-perception-debug.md`).
