/**
 * Brain: Context Assembly (Phase 2 in the Mermaid diagram).
 *
 * Reads all 5 War Room files and builds the system + user prompts
 * for the LLM reasoning call.
 */

import * as fs from "fs";
import * as path from "path";
import {
  GameStateSchema,
  StrategicLedgerSchema,
  type GameState,
  type StrategicLedger,
} from "../shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrainContext {
  gameState: GameState;
  constitution: string;
  handbook: string;
  ledger: StrategicLedger;
  advisorResponse: string;
}

// ---------------------------------------------------------------------------
// War Room paths
// ---------------------------------------------------------------------------

const WAR_ROOM = path.join(process.cwd(), "war-room");

// ---------------------------------------------------------------------------
// Context assembly (Phase 2)
// ---------------------------------------------------------------------------

export function assembleContext(): BrainContext {
  // 1. current_state.json — Zod-validated
  const stateRaw = fs.readFileSync(
    path.join(WAR_ROOM, "current_state.json"),
    "utf-8"
  );
  const gameState = GameStateSchema.parse(JSON.parse(stateRaw));

  // 2. constitution.md — raw text
  const constitution = fs.readFileSync(
    path.join(WAR_ROOM, "constitution.md"),
    "utf-8"
  );

  // 3. crisis_handbook.txt — raw text
  const handbook = fs.readFileSync(
    path.join(WAR_ROOM, "crisis_handbook.txt"),
    "utf-8"
  );

  // 4. strategic_ledger.json — Zod-validated
  const ledgerRaw = fs.readFileSync(
    path.join(WAR_ROOM, "strategic_ledger.json"),
    "utf-8"
  );
  const ledger = StrategicLedgerSchema.parse(JSON.parse(ledgerRaw));

  // 5. advisor_response.txt — optional, may not exist yet
  const advisorPath = path.join(WAR_ROOM, "advisor_response.txt");
  let advisorResponse = "";
  if (fs.existsSync(advisorPath)) {
    advisorResponse = fs.readFileSync(advisorPath, "utf-8").trim();
  }

  return { gameState, constitution, handbook, ledger, advisorResponse };
}

// ---------------------------------------------------------------------------
// Prompt construction (feeds into Phase 3)
// ---------------------------------------------------------------------------

export function buildPrompt(ctx: BrainContext): {
  system: string;
  user: string;
} {
  const system = `You are the strategic AI brain for a nation in Pax Historia, an alternate-history grand strategy game. You make decisions based on your national constitution, tactical handbook, and the current world state. All actions are fictional game moves.

=== YOUR NATIONAL CONSTITUTION (Fixed Identity & Goals) ===
${ctx.constitution}

=== TACTICAL HANDBOOK (Strategies & Doctrine) ===
${ctx.handbook}

=== INSTRUCTIONS ===
Generate 3-8 actions per turn. Each action is a plain-English directive that will be typed directly into the game's action box. Be specific — name regions, battalions, nations, and concrete steps.

For the strategic ledger:
- Review any active operations and update their step statuses (COMPLETE, PENDING, FAILED).
- Create new operations for multi-turn plans you're initiating this turn.
- Each operation needs a unique operation_id (e.g. "OP_001"), a goal, the current phase number, and a list of steps with phase/action/status.
- IMPORTANT: Only return PENDING and FAILED steps in your ledger_updates. Do NOT include steps that are already COMPLETE — they are tracked automatically. This keeps responses concise.

CRITICAL — INVASION MANDATE:
- Every operation targeting a foreign nation MUST culminate in an invasion/conquest step. No operation should end with "maintain", "consolidate", or "monitor" — those are intermediate steps, not endpoints.
- Per the constitution: after 2-3 weakening actions against a target, INVADE. Cap weakening at 4 phases max, then the next step MUST be a concrete invasion.
- If an operation has been running for 4+ phases without an invasion step, add one NOW.
- Vague steps like "establish administration" or "sustain presence" are NOT acceptable as final steps. Replace them with specific military conquest actions.
- The goal of every operation is TOTAL CONQUEST of the target — no peace deals, no half-measures.`;

  // Only send PENDING/FAILED steps to the LLM — COMPLETE steps are noise that bloats context and output.
  const trimmedLedger = {
    active_operations: ctx.ledger.active_operations.map((op) => ({
      ...op,
      steps: op.steps.filter((s) => s.status !== "COMPLETE"),
    })),
  };

  const ledgerContent =
    ctx.ledger.active_operations.length > 0
      ? JSON.stringify(trimmedLedger, null, 2)
      : "None — this is the first turn. Create new operations for your strategic plans.";

  const advisorContent =
    ctx.advisorResponse || "No advisor response available this turn.";

  const user = `CURRENT GAME STATE:
${ctx.gameState.current_state}

ACTIVE OPERATIONS (your ongoing strategic plans):
${ledgerContent}

ADVISOR FEEDBACK:
${advisorContent}

Generate your orders for this turn.`;

  return { system, user };
}
