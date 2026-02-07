# Project Tracker — Status Scratchpad

**Use this file for progress and checklists.** Do not store these in `CLAUDE.md`.

---

## Current Status (High Level)

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0: Project Init | **Done** | Repo scaffold, Node+TS, Playwright, docs, CLAUDE.md |
| Phase 1: Perception | **In Progress** | Playwright Spy + `/api/simple-chat` → `current_state.json` |
| Phase 2: War Room | Pending | Populate constitution, handbook, ledger schema |
| Phase 2.5: Advisor | Pending | Query advisor chat, scrape response into context |
| Phase 3: Brain | Pending | Context assembly, LLM reasoning, action batch generation |
| Phase 4: Hand | Pending | Batch execution via Playwright (action box submit) |

---

## Phase 0: Project Init — Done

- [x] Reorganize repo: PRD → `docs/PRD.md`, diagrams → `docs/diagrams/`
- [x] Add `CLAUDE.md` (constitution), `docs/project-tracker.md`, `docs/logs/`
- [x] Add scaffold script (`scripts/scaffold.sh`)
- [x] Initialize Node.js + TypeScript project (Playwright, tsx, Zod, tsconfig)
- [x] Create `war-room/` placeholders (constitution.md, crisis_handbook.txt, strategic_ledger.json, current_state.json)
- [x] Create `src/` skeleton (spy/, brain/, hand/, index.ts)
- [x] Consolidate game research into `docs/pax-historia-research.md`
- [x] Lock CLAUDE.md: tech stack, coding standards, folder structure, data-flow contracts

---

## Phase 1: Perception — In Progress

**Goal:** Intercept `/api/simple-chat` responses and write parsed game state to `current_state.json`.

**Files to create/modify:**
- `src/shared/schemas.ts` — Zod schema for GameState
- `src/shared/index.ts` — barrel export
- `src/spy/interceptor.ts` — Playwright route handler for `/api/simple-chat`
- `src/spy/state-parser.ts` — parse raw API response → validated GameState
- `src/spy/state-writer.ts` — write GameState to `war-room/current_state.json`
- `src/spy/index.ts` — barrel export

**Sub-tasks:**
- [ ] Capture a real `/api/simple-chat` response (need DevTools network tab — human task)
- [ ] Define Zod GameState schema from captured payload
- [ ] Implement route interceptor (Playwright `page.route()`)
- [ ] Implement state parser (raw JSON → Zod-validated GameState)
- [ ] Implement state writer (GameState → `war-room/current_state.json`)
- [ ] Wire into `src/index.ts` entry point
- [ ] Smoke test: launch browser, trigger a game event, verify `current_state.json` is written

---

## Phase 2: War Room — Pending

**Goal:** Populate the War Room template files with real strategic content and validate the ledger schema.

**Files to create/modify:**
- `war-room/constitution.md` — long-term goals (populate with real content)
- `war-room/crisis_handbook.txt` — tactical playbook (populate with real content)
- `src/shared/schemas.ts` — Zod schema for StrategicLedger (add to existing)
- `src/brain/war-room-reader.ts` — read + validate all War Room files

**Sub-tasks:**
- [ ] Write constitution content (long-term goals, identity, constraints)
- [ ] Write crisis handbook content (tactical doctrines, procedures)
- [ ] Define Zod StrategicLedger schema
- [ ] Implement War Room reader (read all files, validate, return typed context)

---

## Phase 2.5: Advisor — Pending

**Goal:** Query the in-game advisor and scrape the response into the Brain's context.

**Files to create/modify:**
- `src/hand/advisor.ts` — type query into advisor box, wait for response, extract text
- `src/hand/index.ts` — barrel export

**Sub-tasks:**
- [ ] Identify advisor box selectors (need DevTools — human task)
- [ ] Implement advisor query function (type → submit → wait → scrape response)
- [ ] Add advisor response to Brain context assembly

---

## Phase 3: Brain — Pending

**Goal:** Assemble all context, call Claude API, generate a validated batch of actions.

**Files to create/modify:**
- `src/brain/context-assembler.ts` — read all inputs, build prompt
- `src/brain/llm-client.ts` — Anthropic Claude API wrapper
- `src/brain/action-generator.ts` — call LLM, parse + validate ActionBatch
- `src/shared/schemas.ts` — Zod schema for ActionBatch (add to existing)
- `src/brain/index.ts` — barrel export

**Sub-tasks:**
- [ ] Define ActionBatch Zod schema
- [ ] Implement context assembler (GameState + War Room files + advisor → prompt)
- [ ] Implement Claude API client
- [ ] Implement action generator (prompt → ActionBatch)
- [ ] Update strategic_ledger.json with new plans after generation

---

## Phase 4: Hand — Pending

**Goal:** Execute the action batch by typing each action into the game UI.

**Files to create/modify:**
- `src/hand/executor.ts` — iterate ActionBatch, type + submit each action
- `src/hand/index.ts` — barrel export (update)

**Sub-tasks:**
- [ ] Identify action box submit selectors/mechanics (need DevTools — human task)
- [ ] Implement batch executor (loop through actions, type + submit)
- [ ] Implement time-jump trigger
- [ ] Final ledger commit after execution
- [ ] Wire full cognitive loop in `src/index.ts`

---

## Blocking / Human Tasks

These require a human with a browser and DevTools open:

- [ ] Capture `/api/simple-chat` JSON payload (Phase 1 blocker)
- [ ] Identify diplomacy chat selector
- [ ] Identify timeline/jump selector
- [ ] Determine submit mechanics for each UI element (button? Enter? both?)

---

## Logs

Timestamped writeups go under `docs/logs/` (e.g. `2026-02-07-scaffold.md`).
