/**
 * Campaign: Loader
 *
 * Loads and caches campaign definitions from war-room/campaigns/.
 * Supports loading by name or getting the active/default campaign.
 */

import * as fs from "fs";
import * as path from "path";
import type { Campaign } from "./types";
import { validateCampaign, isValidCampaign } from "./validator";
import { PATHS } from "../shared/config";
import { getActiveCampaignName } from "../shared";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CAMPAIGNS_DIR = path.join(process.cwd(), PATHS.WAR_ROOM, "campaigns");

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let campaignsCache: Campaign[] | null = null;

/**
 * Invalidate the campaign cache (useful for testing or hot-reload).
 */
export function invalidateCache(): void {
  campaignsCache = null;
}

/**
 * Load all campaign JSON files from the campaigns directory.
 */
export function loadAllCampaigns(): Campaign[] {
  if (campaignsCache) {
    return campaignsCache;
  }

  if (!fs.existsSync(CAMPAIGNS_DIR)) {
    console.log(`[Campaign] No campaigns directory found at ${CAMPAIGNS_DIR}`);
    campaignsCache = [];
    return [];
  }

  const files = fs
    .readdirSync(CAMPAIGNS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const campaigns: Campaign[] = [];

  for (const file of files) {
    const filePath = path.join(CAMPAIGNS_DIR, file);
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw) as unknown;

      if (!isValidCampaign(parsed)) {
        const result = validateCampaign(parsed);
        console.warn(
          `[Campaign] Skipping ${file}: ${result.errors.join(", ")}` +
            (result.warnings.length > 0 ? ` (warnings: ${result.warnings.join(", ")})` : "")
        );
        continue;
      }

      campaigns.push(parsed);
      console.log(`[Campaign] Loaded "${parsed.name}" from ${file}`);
    } catch (err) {
      console.warn(`[Campaign] Failed to load ${file}: ${(err as Error).message}`);
    }
  }

  console.log(`[Campaign] Loaded ${campaigns.length} campaign(s) from ${CAMPAIGNS_DIR}`);
  campaignsCache = campaigns;
  return campaigns;
}

/**
 * Find a campaign by name (case-insensitive).
 */
export function findCampaign(name: string): Campaign | undefined {
  const campaigns = loadAllCampaigns();
  return campaigns.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get the active campaign.
 * Uses the name from active-campaign.txt, falling back to the first available if not found.
 */
export function getPrimaryCampaign(): Campaign | undefined {
  const campaigns = loadAllCampaigns();
  if (campaigns.length === 0) {
    return undefined;
  }

  const activeName = getActiveCampaignName();
  const active = campaigns.find((c) => c.name === activeName);

  return active ?? campaigns[0];
}

/**
 * Format a campaign as a human-readable string for prompts.
 */
export function formatCampaignForPrompt(campaign: Campaign): string {
  const lines: string[] = [
    `=== CURRENT CAMPAIGN: ${campaign.name} ===`,
    `Country: ${campaign.country}`,
    `Super Goal: ${campaign.superGoal}`,
    `Time Horizon: ${campaign.timeHorizon} years`,
    ``,
    `Priorities:`,
  ];

  for (const p of campaign.priorities) {
    lines.push(`  [${"★".repeat(p.weight)}] ${p.area}: ${p.description}`);
  }

  if (campaign.constraints.length > 0) {
    lines.push(``);
    lines.push(`Constraints:`);
    for (const c of campaign.constraints) {
      const tag = c.severity === "hard" ? "🚫" : "⚠️";
      lines.push(`  ${tag} ${c.rule}`);
    }
  }

  if (campaign.victoryConditions.length > 0) {
    lines.push(``);
    lines.push(`Victory Conditions:`);
    for (const vc of campaign.victoryConditions) {
      const progress =
        vc.current !== undefined ? ` [${String(vc.current)}/${String(vc.target)}]` : "";
      lines.push(`  ✓ ${vc.description}${progress}`);
    }
  }

  return lines.join("\n");
}
