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
import { callGemini } from "../brain/llm-client";
import { PATHS } from "../shared/config";
import { getPrimaryCampaign, invalidateCache } from "./loader";

// ---------------------------------------------------------------------------
// Prompt for the LLM
// ---------------------------------------------------------------------------

const BUILDER_SYSTEM_PROMPT = `You are a Campaign Architect for Pax-Automata, an AI agent that plays the grand strategy game Pax Historia.

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

    const rawResponse = await callGemini(BUILDER_SYSTEM_PROMPT, description);

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
