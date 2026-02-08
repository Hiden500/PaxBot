# Project Tracker — Status Scratchpad

**Use this file for progress and checklists.** Do not store these in `CLAUDE.md`.

---

## Folder Purposes (`src/`)

| Folder | Purpose |
|--------|---------|
| **spy/** | Perception: Playwright network intercept, parse `/api/simple-chat` → `current_state.json`. |
| **brain/** | Reasoning: read War Room files, assemble context, call LLM, produce action batch. |
| **hand/** | Execution: UI automation — selectors, action/advisor box, submit; next turn (jump forward + 1 week), Next Event loop, Proceed; used by interactor and by full-loop executor. |
| **shared/** | Shared types, Zod schemas, utilities. |
| **interactor.ts** (root) | Entry point for a *single manual session*: load auth, navigate, test action/advisor, run Spy. Imports from **hand/** and **spy/**. Not a separate folder. |
| **index.ts** (root) | Future entry point for the *full cognitive loop* (Spy → War Room → Brain → Hand). |

---

## Entry points: Interactor vs Index (and how Hand + Spy interact)

**Interactor** (`src/interactor.ts`, run with `npm run interactor`) is the **current entry point** for everything that touches the game: Hand and Spy. It is for **manual or test sessions** (you drive one browser session, maybe run a canned test, then close).

- **What it does:** Loads auth state → launches Playwright → navigates to the game (using **Hand**: `openPresetAndSelectWW2`, etc.) → optionally runs a test (again **Hand**: `enterAction`, `enterAdvisorQuery`) and **Spy** (capture the next `/api/simple-chat` request when the advisor is submitted, then write the game state to `war-room/current_state.json` as `current_state`). Then it waits for you to press Enter and closes.
- **How Hand and Spy interact there:** They don’t call each other. The **interactor** holds the `page` and the flow: it calls Hand to do UI (e.g. `enterAdvisorQuery(page, "what should i do next")`), and it calls Spy to capture the request that *that* action causes. So: **Interactor** = orchestrator; **Hand** = “do UI on this page”; **Spy** = “capture the next simple-chat request on this page and write state.” The interaction is “interactor starts Spy’s capture, then Hand triggers the request, then interactor awaits Spy and writes.”

**Index** (`src/index.ts`, run with `npm start`) is the **future** entry point for the **full autonomous agent**. Right now it’s a stub (no loop, no Brain).

- **Intended flow (when built):** Launch browser with auth → get to the game (or reuse a session) → run the **cognitive loop**: (1) **Spy** — capture game state (e.g. when advisor is queried or on a “new turn” trigger) → write to `current_state.json`; (2) **Brain** — read War Room + `current_state.json`, call LLM, produce action batch; (3) **Hand** — execute the action batch in the UI; (4) repeat or exit.
- So **index** will also use Hand and Spy, but inside an automated loop driven by the Brain. Interactor is “one session, maybe one test”; index will be “loop until we’re done or the human stops.”

**Summary**

| Entry point   | Purpose              | Uses Hand? | Uses Spy? | Uses Brain? |
|---------------|----------------------|------------|-----------|-------------|
| **interactor** | Manual/test session  | Yes        | Yes       | No          |
| **index**      | Full agent loop      | Yes (later)| Yes (later)| Yes (later) |

Hand and Spy are **modules**; they don’t know about each other. The **entry point** (interactor now, index later) is what composes them: same `page`, same browser; interactor runs the sequence you see in `interactor.ts`, index will run Spy → Brain → Hand in a loop.

---

## Current Status (High Level)

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0: Project Init | **Done** | Repo scaffold, Node+TS, Playwright, docs, CLAUDE.md |
| Phase 1: Perception | **Done** | Spy captures `/api/simple-chat` request → `war-room/current_state.json`; optional Zod + full-loop wiring left |
| Phase 2: War Room | **Mostly Done** | Constitution + handbook populated; Zod schemas for ledger + game state in `src/shared/schemas.ts` |
| Phase 2.5: Advisor | Pending | Query advisor chat, scrape response into context |
| Phase 3: Brain | **Done** | Context assembly, Gemini 2.5 Flash reasoning, action batch generation, ledger updates |
| Phase 4: Hand | In Progress | Hand module (`src/hand/`); interactor (`src/interactor.ts`) uses it for manual sessions |

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

## Phase 1: Perception — Done

**Goal:** Intercept `/api/simple-chat` and write game state to `current_state.json`.

**Files:**
- `src/spy/capture.ts` — `captureNextSimpleChatRequestBody(page, timeoutMs)` waits for next request to `/api/simple-chat`, returns request body (POST data)
- `src/spy/state-writer.ts` — `writeGameStateFromPayload(body)` parses JSON, extracts the `prompt` field, **strips advisor-only content** (see below), writes `{ "current_state": "<string>" }` to `war-room/current_state.json`
- `src/spy/index.ts` — barrel export

**Done:**
- [x] Capture `/api/simple-chat` **request** payload when advisor message is submitted (Playwright `page.waitForRequest()`)
- [x] Write only the **`current_state`** field to `war-room/current_state.json` as `{ "current_state": "..." }`
- [x] **Strip advisor-only content** before writing: drop text before `*** Description of the Map in the CURRENT Round: ***` (advisor system prompt) and from `Remember, it is crucially important that you guide the player` onward (respond-to-user tail). Stored prompt is game-state only (map, USA status, event history, diplomacy) so the Brain is not confused by advisor instructions.
- [x] Wired into interactor when `TEST_ENTRY=1`: capture starts before `enterAdvisorQuery`, then we await and write
- [x] **Advisor response:** `writeAdvisorResponse(text)` writes the latest advisor reply to `war-room/advisor_response.txt` (overwritten each turn). Brain will read this in Phase 3 context assembly.

**Remaining (for a new agent):**
- [x] ~~Optional: add Zod schema in `src/shared/schemas.ts` for `current_state.json`~~ — Done (Phase 3 Brain work: `GameStateSchema` in `src/shared/schemas.ts`)
- [ ] When building the full cognitive loop in `src/index.ts`, call spy capture + state writer after advisor submit (or on a dedicated "new turn" trigger)

**How to test:** `TEST_ENTRY=1 npm run interactor` — after advisor submit, check `war-room/current_state.json` for the payload.

---

## Phase 1 handoff (for new agent)

- **Spy is implemented.** No further work required for “capture game state when advisor is used” unless you want to validate with Zod or capture the **response** instead of/in addition to the request (PRD originally said “responses”; we capture request body; both are possible).
- **Stored shape:** Only the **`current_state`** field is written. `war-room/current_state.json` is `{ "current_state": "<string>" }`. The value is **stripped** of advisor-only content (top system prompt and bottom “respond to user” tail); what remains is game-state text (map, battalions, USA status, events, diplomacy). Other request keys (gameID, round, countryID) are not persisted; add in shared schema or Brain if needed.
- **Where to read next:** `docs/PRD.md` (Step 1), `docs/logs/2026-02-07-phase1-spy-handoff.md`, `src/spy/`.

---

## Phase 2: War Room — Mostly Done

**Goal:** Populate the War Room template files with real strategic content and validate the ledger schema.

**Done:**
- [x] Write constitution content (`war-room/constitution.md`)
- [x] Write crisis handbook content (`war-room/crisis_handbook.txt`)
- [x] Define Zod schemas (`src/shared/schemas.ts`): GameState, OperationStep, Operation, StrategicLedger, ActionBatch
- [x] Implement War Room reader as part of Brain context-assembler (`src/brain/context-assembler.ts`)

**Remaining:**
- [ ] `advisor_response.txt` — placeholder exists conceptually but file isn't created until Phase 2.5 wires advisor query

---

## Phase 2.5: Advisor — In Progress

**Goal:** Query the in-game advisor and scrape the response into the Brain's context.

**Done:**
- [x] Advisor query and response capture (Hand: `enterAdvisorQuery`, `getLastAdvisorResponseText`; already in use)
- [x] Store advisor response in `war-room/advisor_response.txt` (Spy: `writeAdvisorResponse`). Overwritten each turn. Standard question for now: "What is our current position and what do you advise for our next actions?"
- [x] Flow diagram updated: Phase 2.5 writes to advisor_response.txt; Phase 2 context assembly reads it

**Sub-tasks remaining:**
- [x] ~~Brain context assembler explicitly reads `advisor_response.txt` when building Phase 3 prompt~~ — Done (`src/brain/context-assembler.ts` lines 66-71)

---

## Phase 3: Brain — Done

**Goal:** Assemble all context, call LLM, generate a validated batch of actions.

**LLM:** Gemini 2.5 Flash via `@google/genai` SDK (1M context window, forced JSON output via `responseSchema`).

**Files created:**
- `src/shared/schemas.ts` — Zod schemas: GameState, OperationStep, Operation, StrategicLedger, ActionBatch
- `src/shared/index.ts` — barrel export
- `src/brain/context-assembler.ts` — reads all 5 War Room files, builds system + user prompts
- `src/brain/llm-client.ts` — Gemini 2.5 Flash wrapper with forced JSON mode (`responseMimeType` + `responseSchema`)
- `src/brain/action-generator.ts` — orchestrator: context → prompt → Gemini → validate → ledger write → return actions
- `src/brain/index.ts` — barrel export

**Done:**
- [x] Define ActionBatch Zod schema
- [x] Implement context assembler (GameState + War Room files + advisor → prompt)
- [x] Implement Gemini API client with forced JSON output
- [x] Implement action generator (prompt → ActionBatch)
- [x] Pre-execution ledger write (merge updates by operation_id)
- [x] Standalone test: `npm run brain` — tested successfully, generates strategic actions + ledger updates

**Remaining (for future phases):**
- [ ] Post-execution ledger write (after Hand executes actions) — belongs in `src/index.ts` orchestrator
- [ ] Wire into full cognitive loop in `src/index.ts`

---

## Phase 4: Hand — In Progress

**Goal:** Execute the action batch by typing each action into the game UI.

**Files:** `src/hand/` — selectors, actions (enterAction, enterAdvisorQuery, clickNextTurn, dismissNextEvents), navigate (openPresetAndSelectWW2), index (barrel export).

**Done:**
- [x] Action/advisor box submit (selectors, enterAction, enterAdvisorQuery)
- [x] Next turn: jump-forward button → 1 week → Next Event loop (with long timeout for first event/LLM) → Proceed &lt;date&gt;

**Sub-tasks remaining:**
- [ ] Implement batch executor (iterate ActionBatch, type + submit each action in `executor.ts`)
- [ ] Final ledger commit after execution
- [ ] Wire full cognitive loop in `src/index.ts`

---

## Interactor behavior (manual session)

- **Action box check:** After navigation completes, we wait **3s** for the game view to render, then wait up to **10s** for the action box to be visible. If not found, we log “Action box not visible yet…” and continue (test entry may still run if you navigate manually).
- **Test entry (`TEST_ENTRY=1`):** 2.5s delay before the test block, then `enterAction` → 2.5s → Spy capture + `enterAdvisorQuery` with standard question ("What is our current position and what do you advise for our next actions?") → write game state to `current_state.json` and advisor reply to `advisor_response.txt`. Then prompt: **Type 'ready' and Enter** to advance to next turn, or Enter to skip. If you type `ready`, Hand runs next turn (jump-forward → 1 week), then dismisses event popups (clicks "Next Event" until none left, then "Proceed &lt;date&gt;" to close the timeline).

---

## Blocking / Human Tasks

These require a human with a browser and DevTools open:

- [x] ~~Capture `/api/simple-chat` JSON payload~~ — Done (request payload captured on advisor submit)
- [x] ~~Identify timeline/jump selector~~ — Done (next-turn button, 1 week, Next Event loop, Proceed &lt;date&gt; in `src/hand/actions.ts`)
- [ ] Confirm/update Hand selectors in `src/hand/selectors.ts` if the game UI changes (action/advisor placeholders, submit: Enter vs button)
- [ ] Identify diplomacy chat selector
- [ ] Determine submit mechanics for each UI element (button? Enter? both?)

---

## Logs

Timestamped writeups go under `docs/logs/` (e.g. `2026-02-07-scaffold.md`).

- `docs/logs/2026-02-07-phase1-spy-handoff.md` — Phase 1 Spy module handoff
- `docs/logs/2026-02-08-phase3-brain-module.md` — Phase 3 Brain module build log (LLM testing, shared schemas, Brain pipeline, cost estimate)
