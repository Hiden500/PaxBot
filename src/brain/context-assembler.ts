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
  // Read World Rules from cache if available
  const rulesPath = path.join(getSessionDir(), "world_rules.txt");
  let worldRules = "";
  if (fs.existsSync(rulesPath)) {
    worldRules = "\n=== WORLD RULES & CONTEXT ===\n" + fs.readFileSync(rulesPath, "utf-8") + "\n";
  }

  const language = process.env.AGENT_LANGUAGE || "English";

  const promptPath = path.join(__dirname, "prompts", "system.md");
  let system = "";
  if (fs.existsSync(promptPath)) {
    system = fs.readFileSync(promptPath, "utf-8");
  } else {
    // Fallback containing all vital instruction sections for tests and safety
    system = `# ROLE
You are the Strategic AI for **Pax Historia**, an alternate-history grand strategy simulation.
Your responsibility is to produce strategic decisions for one game turn.
## World Rules
{{WORLD_RULES}}
## Response Language
{{LANGUAGE}}
# ACTION GENERATION
Write actions in **{{LANGUAGE}}**.
# FOREIGN OPERATIONS POLICY
Every operation targeting a foreign nation must eventually culminate in military conquest.
# NEXT ADVISOR QUESTION
Produce one concise question in **{{LANGUAGE}}**.
# OUTPUT FORMAT
Return the JSON response containing EXACTLY the following keys in this logical order: reasoning, immediate_risks, actions, ledger_updates, milestone_checks, next_advisor_query.
All text fields in the JSON response MUST be written in **{{LANGUAGE}}**.`;
  }

  // Replace placeholders
  system = system
    .replace(/\{\{WORLD_RULES\}\}/g, worldRules)
    .replace(/\{\{LANGUAGE\}\}/g, language);

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
