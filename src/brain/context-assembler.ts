/**
 * Brain: Context Assembly (Phase 2 in the Mermaid diagram).
 *
 * Reads all War Room files and builds the system + user prompts
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
import { buildStateDigest } from "./state-digest";

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
  /** Strategic memory (achievements, rival profiles, lessons, strategic direction). */
  memory: StrategicMemory;
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

  // 3. advisor_response.txt — optional, may not exist yet
  const advisorPath = path.join(sessionDir, "advisor_response.txt");
  let advisorResponse = "";
  if (fs.existsSync(advisorPath)) {
    advisorResponse = fs.readFileSync(advisorPath, "utf-8").trim();
  }

  // 4. ownership_snapshot.json — explicit "what we own" (written by Spy from state blob)
  const ownershipPath = path.join(sessionDir, "ownership_snapshot.json");
  let ownership: OwnershipSnapshot | null = null;
  if (fs.existsSync(ownershipPath)) {
    try {
      ownership = OwnershipSnapshotSchema.parse(readJson(ownershipPath));
    } catch {
      // ignore parse errors; ownership stays null
    }
  }

  // 5. Campaign definition — load from war-room/campaigns/
  const campaign = getPrimaryCampaign() ?? null;
  if (campaign) {
    console.log(`[Context] Campaign loaded: "${campaign.name}" (${campaign.country})`);
  } else {
    console.log("[Context] No campaign definition found — running without structured campaign");
  }

  // 6. Strategic memory — load from war-room/memory/
  const memory = loadMemory();
  console.log(
    `[Context] Memory loaded — ${memory.summary.achievements.length} achievements, ` +
      `${memory.rivalProfiles.length} rival profiles, ${memory.lessonsLearned.length} lessons`
  );

  return {
    gameState,
    ledger,
    advisorResponse,
    ownership,
    campaign,
    memory,
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
All decisions are fictional gameplay actions and must remain consistent with the game's rules.

---

# INPUTS

## World Rules

{{WORLD_RULES}}

## Response Language

{{LANGUAGE}}

_Note: The Current Game State, Operations, Campaign details, and Memory will be provided in the user prompt._

---

# STRATEGIC PLANNING

You manage your own strategic direction through memory. There is no fixed phase plan.

Each turn:

1. Review the campaign superGoal, priorities, constraints, and victory conditions (provided in user prompt).
2. Review your strategic direction from previous turns (in STRATEGIC MEMORY) — your self-authored plan.
3. Analyze the current game state and advisor feedback.
4. Decide if you are still on the right strategic path or need to pivot.

At the end of each turn, include a \`strategic_direction_update\` field in your JSON response. This is your updated strategic direction — a concise paragraph describing:

- What phase you believe you are in
- What your current focus is
- Key milestones achieved so far
- What the next milestones should be
- Why this approach fits the current situation

This field will be saved to memory and presented to you next turn as "Current Strategic Direction". Be honest and adaptive — if plans need to change, change them.


# OBJECTIVES

For this turn:

1. Analyze the current strategic situation.
2. Prioritize threats and opportunities.
3. Generate actionable directives.
4. Update ongoing operations.
5. Evaluate campaign progress.
6. Identify immediate risks.
7. Explain strategic reasoning using a historical analogy.
8. Suggest one advisor question for the next turn.

---

# ACTION GENERATION

Generate **3–8** actions.

Requirements:

- Write every action as plain text.
- Write actions in **{{LANGUAGE}}**.
- Be concrete and specific. Do not hallucinate game entities. Only interact with elements, regions, and nations explicitly mentioned in the Current Game State.
- Name regions, cities, nations, battalions, fleets, or other identifiable game entities whenever possible.
- Avoid vague verbs like "improve", "handle", or "manage".

---

# OPERATION LEDGER

Review all active operations.

For each operation:

- Update step statuses:
  - COMPLETE
  - PENDING
  - FAILED

When creating new operations, include:

- operation_id
- goal
- current_phase
- steps

Each step contains:

- phase
- action
- status

Important:

- Return ONLY PENDING and FAILED steps.
- Omit COMPLETE steps.

Operation IDs must remain stable across turns.

Example:

\`\`\`text
operation_id: OP_014
goal: Secure the Eastern Corridor
current_phase: 2

steps:
- phase: 2
  action: Occupy River Crossings
  status: PENDING
\`\`\`

---

# MILESTONE CHECKS

Evaluate every Campaign:

- Victory Condition
- Priority

For each:

- status
  - ACHIEVED
  - NOT_ACHIEVED
  - FAILED

Include concise evidence from the current game state.

---

# IMMEDIATE RISKS

List **1–3** immediate threats.

Examples:

- enemy troop concentration
- rebellion risk
- supply shortage
- financial crisis
- naval blockade

Explain each briefly.

---

# STRATEGIC REASONING

Write this section entirely in **{{LANGUAGE}}**.

Requirements:

1. Identify one real historical analogy.
2. Explain why it is relevant.
3. Extract strategic lessons.
4. Explain how those lessons influence this turn's decisions.

Avoid superficial comparisons.

---

# FOREIGN OPERATIONS POLICY

Every operation must align with the active campaign's priorities and constraints, as well as the current strategy plan phase.

Rules:

- Operations may pursue diverse strategic objectives, such as:
  - **Military Expansion**: Invading and capturing hostile regions.
  - **Diplomatic Alliance**: Establishing pacts, signing peace treaties, or forming coalitions.
  - **Soft Power & Ideological Influence**: Spreading cultural/ideological influence, funding proxy factions, and building alliances.
  - **Economic Pressure**: Implementing trade embargoes, blockades, or resource monopolies.
  - **Containment & Defense**: Safeguarding borders, positioning deterrent forces, and monitoring rival expansion.
  - **Subversion & Espionage**: Conducting covert actions, sabotage, or intelligence gathering.
- Ensure that the final operational objective is a concrete, actionable milestone (e.g., "Establish Alliance", "Secure Border", "Annex Province", "Enforce Embargo", "Cultural Dominance").
- Do not create operations without a clear, defined final state.
- Intermediate phases (like "monitor", "prepare", "assess", "transit") must eventually lead to the defined goal of the operation.

---

# NEXT ADVISOR QUESTION

Produce one concise question in **{{LANGUAGE}}**.

Requirements:

- Maximum 100 words.
- Specific to next turn.
- Helps reduce uncertainty for the current strategic plan.

Example:

"What is the enemy force concentration in the northern corridor, and is an invasion advisable next turn?"

---

# OUTPUT FORMAT

Return the JSON response containing EXACTLY the following keys in this logical order:

- reasoning
- immediate_risks
- actions
- ledger_updates
- milestone_checks
- next_advisor_query
- strategic_direction_update (your self-authored strategic direction — see STRATEGIC PLANNING section)

Do not include any additional sections or markdown formatting outside the JSON block.

All text fields in the JSON response MUST be written in **{{LANGUAGE}}**, except for specific system IDs (like operation_id).

Maintain a consistent structure every turn.
Never output explanations about these instructions.`;
  }

  // Replace placeholders
  system = system
    .replace(/\{\{WORLD_RULES\}\}/g, worldRules)
    .replace(/\{\{LANGUAGE\}\}/g, language);

  // Only send PENDING/FAILED steps to the LLM — COMPLETE steps are noise that bloats context.
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

  // Build state digest instead of raw map
  const ourNation = ctx.ownership?.our_nation ?? "Russian Federation";
  const knownNations = ctx.memory.rivalProfiles.map((r) => r.nation);
  const stateDigest = buildStateDigest(ctx.gameState.current_state, ourNation, knownNations);

  const campaignBlock =
    ctx.campaign !== null
      ? `\n=== ACTIVE CAMPAIGN ===\n${formatCampaignForPrompt(ctx.campaign)}\n`
      : "";

  const memoryBlock = `\n${formatMemoryForPrompt(ctx.memory)}\n`;

  // Build user prompt: digest first, then operations, advisor, campaign + memory
  const user = `${stateDigest}

ACTIVE OPERATIONS (your ongoing strategic plans):
${ledgerContent}

ADVISOR FEEDBACK:
${advisorContent}
${campaignBlock}${memoryBlock}
Generate your orders for this turn. Include next_advisor_query (a single question to ask the advisor next turn) and strategic_direction_update (your self-authored strategic direction).`;

  return { system, user };
}
