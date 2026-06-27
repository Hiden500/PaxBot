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
  OwnershipSnapshotSchema,
  StrategicLedgerSchema,
  type GameState,
  type OwnershipSnapshot,
  type StrategicLedger,
  getSessionDir,
} from "../shared";
import { getPrimaryCampaign, formatCampaignForPrompt } from "../campaign";
import type { Campaign } from "../campaign";
import { loadMemory, formatMemoryForPrompt } from "../memory";
import type { StrategicMemory } from "../memory";
import { loadStrategyPlan, formatStrategyForPrompt } from "../strategy";
import type { StrategyPlan } from "../strategy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrainContext {
  gameState: GameState;
  ledger: StrategicLedger;
  advisorResponse: string;
  /** Explicit list of regions we own; any region not listed is NOT ours. */
  ownership: OwnershipSnapshot | null;
  /** Active campaign definition (loaded from war-room/campaigns/). */
  campaign: Campaign | null;
  /** Strategic memory (achievements, rival profiles, lessons). */
  memory: StrategicMemory;
  /** Strategic phase plan. */
  strategy: StrategyPlan;
}

// ---------------------------------------------------------------------------
// War Room paths
// ---------------------------------------------------------------------------

const WAR_ROOM = path.join(process.cwd(), "war-room");

// ---------------------------------------------------------------------------
// Context assembly (Phase 2)
// ---------------------------------------------------------------------------

/** Read a JSON file with a clear error message on failure. */
function readJson(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf-8");
  if (!raw.trim()) {
    throw new Error(`War Room file is empty: ${path.basename(filePath)}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Failed to parse ${path.basename(filePath)} (${raw.length} chars): ${(err as Error).message}`
    );
  }
}

export function assembleContext(): BrainContext {
  const sessionDir = getSessionDir();

  // 1. current_state.json — Zod-validated
  const gameState = GameStateSchema.parse(readJson(path.join(sessionDir, "current_state.json")));

  // 2. strategic_ledger.json — Zod-validated
  const ledger = StrategicLedgerSchema.parse(
    readJson(path.join(sessionDir, "strategic_ledger.json"))
  );

  // 5. advisor_response.txt — optional, may not exist yet
  const advisorPath = path.join(sessionDir, "advisor_response.txt");
  let advisorResponse = "";
  if (fs.existsSync(advisorPath)) {
    advisorResponse = fs.readFileSync(advisorPath, "utf-8").trim();
  }

  // 6. ownership_snapshot.json — explicit "what we own" (written by Spy from state blob)
  const ownershipPath = path.join(sessionDir, "ownership_snapshot.json");
  let ownership: OwnershipSnapshot | null = null;
  if (fs.existsSync(ownershipPath)) {
    try {
      ownership = OwnershipSnapshotSchema.parse(readJson(ownershipPath));
    } catch {
      // ignore parse errors; ownership stays null
    }
  }

  // 7. Campaign definition — load from war-room/campaigns/ (non-critical)
  const campaign = getPrimaryCampaign() ?? null;
  if (campaign) {
    console.log(`[Context] Campaign loaded: "${campaign.name}" (${campaign.country})`);
  } else {
    console.log("[Context] No campaign definition found — running without structured campaign");
  }

  // 8. Strategic memory — load from war-room/memory/
  const memory = loadMemory();
  console.log(
    `[Context] Memory loaded — ${memory.summary.achievements.length} achievements, ` +
      `${memory.rivalProfiles.length} rival profiles, ${memory.lessonsLearned.length} lessons`
  );

  // 9. Strategy plan — load from war-room/strategy/
  const strategyCountry = campaign?.country;
  const strategy = loadStrategyPlan(strategyCountry);
  console.log(
    `[Context] Strategy loaded — phase: ${strategy.phases[strategy.currentPhaseIndex].name} (index ${strategy.currentPhaseIndex})`
  );

  return {
    gameState,
    ledger,
    advisorResponse,
    ownership,
    campaign,
    memory,
    strategy,
  };
}

// ---------------------------------------------------------------------------
// Prompt construction (feeds into Phase 3)
// ---------------------------------------------------------------------------

export function buildPrompt(ctx: BrainContext): {
  system: string;
  user: string;
} {
  const system = `You are the strategic AI brain for a nation in Pax Historia, an alternate-history grand strategy game. You make decisions based on your strategic plan, current priorities, and the world state. All actions are fictional game moves.

=== INSTRUCTIONS ===
Generate 3-8 actions per turn. Each action is a plain-English directive that will be typed directly into the game's action box. Be specific — name regions, battalions, nations, and concrete steps.

For the strategic ledger:
- Review any active operations and update their step statuses (COMPLETE, PENDING, FAILED).
- Create new operations for multi-turn plans you're initiating this turn.
- Each operation needs a unique operation_id (e.g. "OP_001"), a goal, the current phase number, and a list of steps with phase/action/status.
- IMPORTANT: Only return PENDING and FAILED steps in your ledger_updates. Do NOT include steps that are already COMPLETE — they are tracked automatically. This keeps responses concise.

CRITICAL — INVASION MANDATE:
- Every operation targeting a foreign nation MUST culminate in an invasion/conquest step. No operation should end with "maintain", "consolidate", or "monitor" — those are intermediate steps, not endpoints.
- If an operation has been running for 4+ phases without an invasion step, add one NOW.
- Vague steps like "establish administration" or "sustain presence" are NOT acceptable as final steps. Replace them with specific military conquest actions.
- The goal of every operation is TOTAL CONQUEST of the target — no peace deals, no half-measures.

Advisor question for next turn:
- Also suggest one short question to ask the in-game advisor on the NEXT turn (next_advisor_query). It should be specific to your plans: e.g. "What is the military situation in [region] and should we invade now?" or "Which neighbor is most vulnerable to our next move?" One sentence, under 100 words.`;

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

  const advisorContent = ctx.advisorResponse || "No advisor response available this turn.";

  const ownershipBlock =
    ctx.ownership !== null
      ? `
REGIONS WE OWN (authoritative — do not confuse with troop locations):
We are ${ctx.ownership.our_nation}. We OWN exactly these regions: ${ctx.ownership.regions_we_own.join(", ")}.
Any region NOT in this list is NOT ours — it is a potential target for conquest or already belongs to another nation. Do not assume we own a region just because we have troops stationed there; only regions listed here are ours.

`
      : "";

  const campaignBlock = ctx.campaign !== null ? `\n${formatCampaignForPrompt(ctx.campaign)}\n` : "";

  const memoryBlock = `\n${formatMemoryForPrompt(ctx.memory)}\n`;

  const strategyBlock = `\n${formatStrategyForPrompt(ctx.strategy)}\n`;

  const user = `${ownershipBlock}${campaignBlock}${memoryBlock}${strategyBlock}CURRENT GAME STATE:
${ctx.gameState.current_state}

ACTIVE OPERATIONS (your ongoing strategic plans):
${ledgerContent}

ADVISOR FEEDBACK:
${advisorContent}

Generate your orders for this turn. Include next_advisor_query: a single question to ask the advisor next turn (specific to your strategy).`;

  return { system, user };
}
