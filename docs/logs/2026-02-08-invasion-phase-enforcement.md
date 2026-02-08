# Brainstorm: Ensuring Invasion Actually Occurs (Phase Cap)

**Problem:** The constitution says "after 2–3 weakening actions, invade" and "cap at 4 phases," but the LLM may still keep proposing weakening and never invade. How do we make invasion happen?

---

## Option 1: Constitution + handbook only (current)

- Already added: "Cap weakening at 4 phases per target. After 4 phases, invade—do not add more weakening."
- **Pros:** No code change; single source of truth.
- **Cons:** No enforcement; model may ignore or forget.

---

## Option 2: Prompt injection when "weakening at phase 4" is detected

- **Idea:** When building the Brain prompt, scan `strategic_ledger` for operations that look like "weakening [Country]" and have `current_phase >= 4` (or count of weakening steps >= 4).
- **Action:** In `buildPrompt()` (context-assembler), append to the user message:
  - "MANDATORY: The following targets have reached 4 weakening phases. Per constitution, at least one of this turn's actions MUST be an invasion of one of them: [Country1, ...]. Do not propose further weakening for these targets."
- **Convention:** Either (a) infer from goal text (e.g. goal contains "weaken" and a country name), or (b) add an optional `target_country` (and optionally `type: "weakening"`) to the Operation schema so we can reliably detect.
- **Pros:** Strong nudge in the prompt; no change to LLM output schema.
- **Cons:** If we infer from goal text, parsing is brittle. Adding `target_country` is a small schema + instruction change.

---

## Option 3: Dedicated "weakening tracker" in the ledger

- **Idea:** Add a top-level field to strategic_ledger, e.g. `weakening_phases: { "France": 3, "Italy": 1 }`. LLM (or a post-processing step) updates it when it does weakening actions; when any value >= 4, we inject "You must invade [X] this turn."
- **Schema:** Extend `StrategicLedgerSchema` with optional `weakening_phases?: Record<string, number>`. Either the LLM outputs this in a new "ledger_state_updates" field, or we only read it and the LLM is instructed to update it in the ledger file (e.g. via a dedicated operation or convention).
- **Pros:** Explicit, per-country count; easy to inject a mandatory invasion line.
- **Cons:** Schema change; need to teach the LLM to maintain the map (or implement a separate updater that infers from actions, which is harder).

---

## Option 4: Operation-level convention + prompt injection (recommended)

- **Convention:** For any operation whose goal is clearly "Weaken [Country] (then invade)", the operation should have:
  - `goal`: e.g. "Weaken France then invade."
  - `current_phase`: number of weakening phases/turns so far (1–4).
  - Optional (if we extend schema): `target_country: "France"` so we don't parse from text.
- **Logic in `buildPrompt()`:** If any operation has `target_country` (or goal matches something like "weaken ... then invade" / "weaken [Country]") and `current_phase >= 4`, add to user message: "MANDATORY: [Country] has reached 4 weakening phases. One of this turn's actions MUST be an invasion of [Country]. Do not propose further weakening for [Country]."
- **Schema (optional):** Add `target_country?: z.string().optional()` to `OperationSchema`. Instruct the LLM: "When creating a weakening-then-invade operation, set target_country to the target nation and use current_phase as the weakening phase count (1–4)."
- **Pros:** Uses existing operation structure; clear rule; prompt injection is simple.
- **Cons:** Requires the LLM to create/update operations with this convention (or we add `target_country` and document it in the prompt).

---

## Recommendation

1. **Short term:** Keep the constitution phase cap (done). Option 2 or 4: add prompt injection in `context-assembler.ts` that detects "weakening op at phase 4+" and appends the MANDATORY invasion line. Use a simple heuristic first: e.g. if an operation's `goal` contains "weaken" and "invade" (or a country name) and `current_phase >= 4`, inject "You must invade [inferred country] this turn." If that's too brittle, add `target_country` to the operation schema (Option 4) and instruct the LLM to set it for weakening campaigns.
2. **If the model still skips invasion:** Add a post-LLM check: if the prompt contained "MANDATORY: ... invade [X]" and the returned `actions` list has no action mentioning invasion of X, retry once or append a single forced action "Invade [X]." (More invasive; use only if needed.)

---

*Log: 2026-02-08. Brainstorm only; implementation can follow from Option 2 or 4.*
