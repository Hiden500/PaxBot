/**
 * Campaign: Builder
 *
 * Converts a natural language strategy description into a structured
 * campaign JSON file using the configured LLM provider.
 */

import * as fs from "fs";
import * as path from "path";
import type { Campaign } from "./types";
import { validateCampaign } from "./validator";
import { callLLM } from "../brain/llm-client";
import { PATHS } from "../shared/config";
import { getPrimaryCampaign, invalidateCache } from "./loader";
import { setActiveCampaignName, getSessionDir } from "../shared/session";
import { buildStrategyPlanFromCampaign } from "../strategy/builder";

// ---------------------------------------------------------------------------
// Prompt for the LLM
// ---------------------------------------------------------------------------

const BUILDER_SYSTEM_PROMPT = `You are a Campaign Architect for PaxBot, an AI agent that plays the grand strategy game Pax Historia.

Your task is to convert a player's natural language strategy description into a structured JSON campaign definition.

The JSON must follow this exact schema:

{
  "name": "Unique campaign name",
  "country": "Starting country",
  "superGoal": "Ultimate strategic goal",
  "timeHorizon": number (years, 10-100),
  "priorities": [
    { "area": "focus area", "description": "what to do", "weight": 1-5 }
  ],
  "constraints": [
    { "rule": "what to avoid", "severity": "soft" | "hard" }
  ],
  "victoryConditions": [
    { "id": "unique_id", "description": "condition", "metric": "metric_name", "target": "value" }
  ],
  "tags": ["tag1", "tag2"]
}

Rules:
1. name must be unique and descriptive
2. country must be a real nation
3. superGoal must be ambitious but achievable
4. timeHorizon should reflect the scope (10-50 for focused, 50-100 for grand)
5. priorities should have weight 1 (highest) to 5 (lowest)
6. Include at least 3 priorities and 2 constraints
7. Include at least 2 victory conditions with measurable targets
8. Return ONLY valid JSON — no markdown, no explanations`;

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export interface BuildResult {
  success: boolean;
  campaign?: Campaign;
  error?: string;
  filePath?: string;
}

/**
 * Build a campaign from a natural language description.
 * Uses the configured LLM to parse the description into a structured campaign.
 *
 * @param description - The user's strategy description in natural language.
 * @returns BuildResult with the generated campaign or error.
 */
export async function buildCampaignFromDescription(description: string): Promise<BuildResult> {
  try {
    console.log(
      `[Campaign Builder] Building campaign from description (${description.length} chars)...`
    );

    const rawResponse = await callLLM(BUILDER_SYSTEM_PROMPT, description);

    // Parse the response
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawResponse) as Record<string, unknown>;
    } catch {
      return {
        success: false,
        error: `Failed to parse LLM response as JSON: ${rawResponse.slice(0, 200)}`,
      };
    }

    // Validate
    const validation = validateCampaign(parsed);
    if (!validation.valid) {
      return {
        success: false,
        error: `Generated campaign failed validation: ${validation.errors.join("; ")}`,
      };
    }

    const campaign = parsed as unknown as Campaign;

    // Generate filename from campaign name
    const filename =
      campaign.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") + ".json";
    const filePath = path.join(process.cwd(), PATHS.WAR_ROOM, "campaigns", filename);

    // Write to file
    fs.writeFileSync(filePath, JSON.stringify(campaign, null, 2), "utf-8");
    console.log(`[Campaign Builder] Campaign saved to ${filePath}`);

    // Invalidate campaign cache so new campaign is picked up
    invalidateCache();

    return {
      success: true,
      campaign,
      filePath,
    };
  } catch (err) {
    return {
      success: false,
      error: `Campaign builder error: ${(err as Error).message}`,
    };
  }
}

/**
 * Parses markdown description of a campaign, validates it, saves the JSON,
 * sets it as active, and builds the strategy plan.
 */
export async function initializeCampaignFromMarkdown(filePath: string): Promise<Campaign> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  console.log(
    `[Campaign Builder] Analyzing campaign description from ${path.basename(filePath)}...`
  );

  const systemPrompt = `You are a strategic AI parser. Parse the user's natural language campaign description into a strict JSON object that matches the Campaign schema.
The JSON must NOT be wrapped in any top-level key like "campaign". The root object must directly contain these fields:
- name: string (generate a cool unique name if none is explicitly provided, e.g. 'Project Vanguard')
- country: string
- superGoal: string
- timeHorizon: number
- priorities: array of { area: string, weight: number (1-5), description: string }
- constraints: array of { rule: string, severity: "hard"|"soft" }
- victoryConditions: array of { id: string, description: string, metric: string, target: number, current: number }

Return ONLY valid JSON without any markdown formatting like \`\`\`json.`;

  const rawResponse = await callLLM(systemPrompt, content, { disableSchema: true });

  let parsed: any;
  try {
    let jsonString = rawResponse;
    const match = rawResponse.match(/\{[\s\S]*\}/);
    if (match) {
      jsonString = match[0];
    } else {
      jsonString = rawResponse.replace(/```json\n?|```/g, "").trim();
    }
    parsed = JSON.parse(jsonString);
    if (parsed.campaign && typeof parsed.campaign === "object") {
      parsed = parsed.campaign;
    }
  } catch (err) {
    throw new Error(`Failed to parse LLM response as JSON: ${rawResponse.slice(0, 200)}`);
  }

  const validation = validateCampaign(parsed);
  if (validation.errors.length > 0) {
    throw new Error(`Validation failed: ${validation.errors.join("; ")}`);
  }

  const campaign = parsed as Campaign;

  // Save the generated JSON
  const jsonName = path.basename(filePath, ".md") + ".json";
  const jsonPath = path.join(process.cwd(), PATHS.WAR_ROOM, "campaigns", jsonName);

  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(campaign, null, 2), "utf-8");
  console.log(`[Campaign Builder] Campaign JSON saved to ${jsonPath}`);

  // Invalidate cache
  invalidateCache();

  // Set active
  setActiveCampaignName(campaign.name);

  // Initialize session
  getSessionDir();

  // Strategy plan
  await buildStrategyPlanFromCampaign(campaign);

  return campaign;
}

/**
 * Generate a campaign suggestion based on the current game state and active campaign.
 * Useful for suggesting strategy pivots mid-game.
 */
export async function suggestCampaignPivot(context: string): Promise<BuildResult> {
  const currentCampaign = getPrimaryCampaign();
  const contextPrompt = currentCampaign
    ? `Current campaign: ${JSON.stringify(currentCampaign, null, 2)}\n\nGame context: ${context}\n\nSuggest an updated or alternative campaign strategy based on the current game situation.`
    : `Game context: ${context}\n\nSuggest a campaign strategy tailored to this game situation.`;

  return buildCampaignFromDescription(contextPrompt);
}

// ---------------------------------------------------------------------------
// CLI entry point (standalone usage)
// ---------------------------------------------------------------------------

/**
 * Run the campaign builder from command line.
 * Usage: npx ts-node src/campaign/builder.ts "description"
 */
async function main(): Promise<void> {
  const description = process.argv[2];
  if (!description) {
    console.error('Usage: npx ts-node src/campaign/builder.ts "Your strategy description"');
    process.exit(1);
  }

  const result = await buildCampaignFromDescription(description);
  if (result.success) {
    console.log("\n=== CAMPAIGN GENERATED SUCCESSFULLY ===");
    console.log(JSON.stringify(result.campaign, null, 2));
    console.log(`\nSaved to: ${result.filePath}`);
  } else {
    console.error("\n=== CAMPAIGN GENERATION FAILED ===");
    console.error(result.error);
    process.exit(1);
  }
}

if (process.argv[1]?.includes("builder")) {
  main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
