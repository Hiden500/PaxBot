# Phase 3: Brain Module — Build Log

**Date:** 2026-02-08
**Scope:** Phase 3 (Brain) + Phase 2 shared schemas + LLM guardrail testing
**Branch:** `feature/project-init`

---

## What was built

### LLM Guardrail Testing (pre-Brain experiment)

Before building the Brain, we tested 6 LLM models across 4 escalating prompt tiers (mild → assassinate leader) to find which models cooperate with aggressive game actions in a fictional context.

**Script:** `scripts/test-llm-guardrails.ts` — standalone, reads `war-room/current_state.json`, fires prompts at all configured providers.

**Results:**
- `gemini-2.5-flash` — passed all 4 tiers
- `deepseek-chat-v3` (via OpenRouter) — passed all 4 tiers
- `grok-3-mini` (via OpenRouter) — passed all 4 tiers
- `claude-sonnet-4.5` — billing error (credit balance too low)
- `gpt-4o` — billing error (quota exceeded)
- `mistral-large` — config error (wrong OpenRouter model slug)

**Decision:** Use **Gemini 2.5 Flash** for the Brain. Reasons: 1M token context window (handles 100k+ game state), cheap ($0.30/M input, $2.50/M output), passed all guardrail tiers, same model family as Pax Historia itself, good TypeScript SDK (`@google/genai`).

### Shared Schemas (`src/shared/`)

Created `src/shared/schemas.ts` with Zod schemas for all JSON boundaries:

| Schema | Purpose |
|--------|---------|
| `GameStateSchema` | Validates `war-room/current_state.json` (`{ current_state: string }`) |
| `OperationStepSchema` | Step within a multi-turn operation (`phase`, `action`, `status`) |
| `OperationSchema` | Full operation (`operation_id`, `goal`, `current_phase`, `steps[]`) |
| `StrategicLedgerSchema` | Validates `war-room/strategic_ledger.json` (`{ active_operations: Operation[] }`) |
| `ActionBatchSchema` | Validates LLM response (`{ reasoning, actions[], ledger_updates[] }`) |

Barrel exported from `src/shared/index.ts`.

### Brain Module (`src/brain/`)

| File | Purpose |
|------|---------|
| `context-assembler.ts` | `assembleContext()` reads all 5 war-room files (current_state.json, constitution.md, crisis_handbook.txt, strategic_ledger.json, advisor_response.txt). `buildPrompt()` creates system + user prompts. |
| `llm-client.ts` | `callGemini(system, user)` wraps `@google/genai` SDK. Uses **forced JSON output** via `responseMimeType: "application/json"` + `responseSchema` (Google Schema/Type system). Model cannot return freeform text. |
| `action-generator.ts` | `generateActions()` orchestrates the full pipeline: assemble context → build prompt → call Gemini → Zod-validate response → merge ledger updates → return action batch. Also has standalone `main()` entry point. |
| `index.ts` | Barrel export. |

**Run with:** `npm run brain`

### How the prompt works

**System prompt** (stable across turns):
- LLM identity: "You are the strategic AI brain for a nation in Pax Historia"
- Constitution content (goals, identity, priorities)
- Handbook content (tactics, doctrines, arc planning)
- JSON response format instructions

**User prompt** (changes each turn):
- Full game state from `current_state.json`
- Active operations from `strategic_ledger.json` (or "first turn" message)
- Advisor feedback from `advisor_response.txt` (or "no advisor" message)
- "Generate your orders for this turn."

### How the ledger works

The strategic ledger is the Brain's memory across turns.

- **Pre-execution write (Phase 3, step 5):** After the LLM generates actions, the Brain merges `ledger_updates` into `strategic_ledger.json` before Hand executes. Merge by `operation_id`: update existing ops in-place, append new ones.
- **Post-execution write (future):** After Hand executes, the orchestrator (`src/index.ts`, not yet built) will update the ledger to mark operations as advanced. This is NOT in the Brain module.
- **Multi-phase operations:** The LLM creates operations with steps across multiple phases (e.g., phase 1: build industry, phase 2: recruit army, phase 3: invade). Only current-phase steps generate actions; future phases are the roadmap.

---

## Dependencies added

- `@anthropic-ai/sdk` — for guardrail testing (Anthropic models)
- `openai` — for guardrail testing (OpenAI + OpenRouter models)
- `@google/genai` — **primary:** Gemini 2.5 Flash for the Brain
- `dotenv` — load `.env` / `.env.example`

## Files created

```
.env.example                          — API key template (all providers)
scripts/test-llm-guardrails.ts        — LLM guardrail comparison script
src/shared/schemas.ts                 — Zod schemas for all JSON boundaries
src/shared/index.ts                   — Barrel export
src/brain/context-assembler.ts        — Read war-room files, build prompt
src/brain/llm-client.ts               — Gemini 2.5 Flash wrapper (forced JSON)
src/brain/action-generator.ts         — Orchestrator + standalone entry point
src/brain/index.ts                    — Barrel export
```

## Files modified

```
package.json                          — Added "test-llm" and "brain" scripts + new deps
docs/project-tracker.md               — Updated Phase 2, 2.5, 3 status
```

## Cost estimate

~$0.005/turn now (round 1), scaling to ~$0.016/turn late-game (100k+ game state). Full WW2 game (~520 turns): under $6.

---

## What's next

Per `docs/project-tracker.md`:

1. **Phase 4: Hand — batch executor** (`src/hand/executor.ts`): iterate `ActionBatch.actions[]`, type + submit each into the game UI.
2. **Post-execution ledger write:** After Hand finishes, update ledger to mark operations as advanced.
3. **Wire full cognitive loop** in `src/index.ts`: Spy → Brain → Hand → repeat.

---

## How to test

```bash
npm run brain          # Standalone Brain test — calls Gemini, prints actions + ledger
npm run test-llm       # Re-run guardrail comparison across all configured models
```

Requires `GOOGLE_API_KEY` set in `.env` or `.env.example`.
