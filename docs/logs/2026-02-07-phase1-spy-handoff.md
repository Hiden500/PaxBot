# Phase 1 (Spy) handoff — 2026-02-07

Handoff note so a new agent can continue without re-deriving Phase 1.

---

## What was built

1. **Spy module** (`src/spy/`)
   - **Capture:** `captureNextSimpleChatRequestBody(page, timeoutMs?)` — uses Playwright `page.waitForRequest(req => req.url().includes('/api/simple-chat'))`, returns `request.postData()` (request body string).
   - **Write:** `writeGameStateFromPayload(body)` — parses the request body as JSON, extracts the `prompt` field, **strips advisor-only content** (see “What we store” below), and writes `{ "current_state": "<string>" }` to `war-room/current_state.json`. No other keys (gameID, round, etc.) are stored.

2. **When it runs**
   - Triggered from the **interactor** when `TEST_ENTRY=1`: we start the capture promise, call `enterAdvisorQuery(page, "what should i do next")`, await the request body, then call `writeGameStateFromPayload(body)`.

3. **What gets stored**
   - Only the **`prompt`** string from the `/api/simple-chat` request payload, **after stripping advisor-only content**. The raw prompt includes advisor system instructions (top) and a “respond to the user” tail (bottom); we remove those so the Brain sees only game state.

---

## What we store: `current_state` only (stripped)

- The full request payload has many keys (`gameID`, `presetID`, `playerID`, `prompt`, `round`, `countryID`, `jsonSchema`, `stream`, etc.). We read **`prompt`** from the payload, strip it, and **persist it under the key `current_state`** in `war-room/current_state.json` as `{ "current_state": "<string>" }`.
- **Before writing**, we strip:
  - **Top:** Everything before `*** Description of the Map in the CURRENT Round: ***` (advisor persona, roleplay rules, “1000 characters”, “How This Game Works”, etc.).
  - **Bottom:** From `Remember, it is crucially important that you guide the player` onward (respond-to-user instructions and chat-history tail).
- **What remains** is game-state only: map description (polities, regions, battalions), **Status of USA**, current date, event history, recent diplomacy. That is what the Brain uses; no advisor instructions.
- Other fields (e.g. `round`, `countryID`, `gameID`) are not written; add them later in `shared/schemas` or Brain if needed.

---

## How to test

```bash
TEST_ENTRY=1 npm run interactor
```

- Run through to advisor submit; then check `war-room/current_state.json`.
- You should see `{ "current_state": "<huge string>" }` (or `{ "current_state": null }` if parse failed or no prompt in payload).

---

## What’s left (optional / later)

- **Zod schema (CLAUDE.md “Zod at boundaries”):** Define a schema in `src/shared/schemas.ts` for the captured payload and validate in the state-writer or in the Brain when reading `current_state.json`.
- **Full loop:** When implementing `src/index.ts` cognitive loop, call the spy after an advisor submit (or on whatever “new turn” trigger you use): `captureNextSimpleChatRequestBody(page)` then `writeGameStateFromPayload(body)`.
- **Response capture:** PRD says “intercept network **responses**”; we currently capture the **request** body. If the backend returns game state in the response, add `page.waitForResponse(...)` and `response.json()` (or similar) and merge or replace how we populate `current_state.json`.

---

## Files to read

- `docs/PRD.md` — Step 1 (Perception)
- `docs/project-tracker.md` — Phase 1 section and “Phase 1 handoff”
- `src/spy/capture.ts`, `src/spy/state-writer.ts`
- `war-room/current_state.json` — example captured payload
